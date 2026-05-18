import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function directusHeaders() {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    return h;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { order, receipts, receipt_type_id } = body;

        if (!order || !receipts || receipts.length === 0) {
            return NextResponse.json({ error: "Missing order or receipts data" }, { status: 400 });
        }

        // Get created_by from JWT token
        let createdBy = null;
        const cookieStore = await cookies();
        const token = cookieStore.get('vos_access_token');
        if (token && token.value) {
            try {
                const payload = token.value.split('.')[1];
                const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8')) as { sub: string };
                if (decoded && decoded.sub) {
                    createdBy = parseInt(decoded.sub);
                }
            } catch (e) {
                console.warn("Failed to decode token for created_by mapping:", e);
            }
        }

        const now = new Date().toISOString();

        // Transaction simulation: We will collect all requests and execute them sequentially
        const results = {
            orderUpdated: false,
            invoicesCreated: 0,
            invoiceDetailsCreated: 0,
            orderDetailsUpdated: 0,
            consolidatorDetailsUpdated: 0,
            createdInvoices: [] as { id: number; receipt_no: string }[],
            errors: [] as { step: string; product_id?: unknown; receipt_no?: string; error: string }[]
        };

        // 1. Update sales_order
        // - order_status = "For Loading"
        // - for_loading_at = timestamp
        try {
            const orderUpdateRes = await fetch(`${DIRECTUS_BASE}/items/sales_order/${order.order_id}`, {
                method: 'PATCH',
                headers: directusHeaders(),
                body: JSON.stringify({
                    order_status: "For Loading",
                    for_loading_at: now,
                    receipt_type: receipt_type_id || (order.receipt_type?.id) || null
                })
            });
            if (!orderUpdateRes.ok) throw new Error(await orderUpdateRes.text());
            results.orderUpdated = true;
        } catch (err: unknown) {
            results.errors.push({ step: "update_sales_order", error: err instanceof Error ? err.message : String(err) });
            return NextResponse.json({ error: "Failed to update sales order", details: results }, { status: 500 });
        }

        // 1b. Resolve consolidator_id for this order (Always get the NEWEST dispatch)
        // Chain: order.order_id → dispatch_plan_details → dispatch_plan (sort by dispatch_date) → consolidator_dispatches → consolidator
        let consolidatorId: number | null = null;
        try {
            // Step 1: Get ALL dispatch_id from dispatch_plan_details
            const dpdRes = await fetch(`${DIRECTUS_BASE}/items/dispatch_plan_details?filter[sales_order_id][_eq]=${order.order_id}&fields=dispatch_id`, {
                headers: directusHeaders()
            });
            
            if (dpdRes.ok) {
                const dpdData = await dpdRes.json();
                
                // Robust ID normalization
                const dispatchIds = Array.from(new Set(
                    (dpdData.data || [])
                        .map((d: { dispatch_id: number | string | { id?: number; dispatch_id?: number } | null }) => {
                            const id = d.dispatch_id;
                            if (typeof id === 'number') return id;
                            if (typeof id === 'string') return parseInt(id);
                            if (id && typeof id === 'object') return id.id || id.dispatch_id;
                            return null;
                        })
                        .filter(Boolean)
                )) as number[];

                if (dispatchIds.length > 0) {
                    // Step 2: Fetch dispatch details to find the NEWEST one based on dispatch_date
                    const dispatches = await Promise.all(dispatchIds.map(async (dId) => {
                        const dpRes = await fetch(`${DIRECTUS_BASE}/items/dispatch_plan/${dId}?fields=dispatch_no,dispatch_date`, {
                            headers: directusHeaders()
                        });
                        if (dpRes.ok) {
                            const dpData = await dpRes.json();
                            return dpData.data;
                        }
                        return null;
                    }));

                    // Filter valid and sort by dispatch_date descending (newest first)
                    const validDispatches = dispatches.filter(d => d && d.dispatch_no);
                    validDispatches.sort((a, b) => {
                        const dateA = a.dispatch_date ? new Date(a.dispatch_date).getTime() : 0;
                        const dateB = b.dispatch_date ? new Date(b.dispatch_date).getTime() : 0;
                        return dateB - dateA; // Descending (Newest first)
                    });

                    if (validDispatches.length > 0) {
                        const newestDispatchNo = validDispatches[0].dispatch_no;

                        // Step 3: Get consolidator_id from consolidator_dispatches using the newest dispatch
                        const cdpRes = await fetch(`${DIRECTUS_BASE}/items/consolidator_dispatches?filter[dispatch_no][_eq]=${newestDispatchNo}&limit=1`, {
                            headers: directusHeaders()
                        });
                        if (cdpRes.ok) {
                            const cdpData = await cdpRes.json();
                            if (cdpData.data && cdpData.data.length > 0) {
                                consolidatorId = cdpData.data[0].consolidator_id;
                            }
                        }
                    }
                }
            }
        } catch (err: unknown) {
            console.warn("Could not resolve consolidator_id for order:", err instanceof Error ? err.message : String(err));
            results.errors.push({ step: "resolve_consolidator_id", error: err instanceof Error ? err.message : String(err) });
        }

        // 1c. Resolve isOfficial status for the selected receipt type
        let isOfficial = String(order.receipt_type?.isOfficial ?? 1) === "1";
        if (receipt_type_id) {
            try {
                const rtRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_type/${receipt_type_id}?fields=isOfficial`, {
                    headers: directusHeaders()
                });
                if (rtRes.ok) {
                    const rtData = await rtRes.json();
                    isOfficial = String(rtData.data?.isOfficial) === "1";
                }
            } catch (e) {
                console.warn("Could not resolve isOfficial for receipt type:", e);
            }
        }

        // 1d. Resolve payment_days from source of truth (DB)
        let verifiedPaymentDays = 0;
        const pt = order.payment_terms;
        const paymentTermsId = pt && typeof pt === "object" ? (pt.id || null) : (pt || null);

        if (paymentTermsId) {
            try {
                const ptRes = await fetch(`${DIRECTUS_BASE}/items/payment_terms/${paymentTermsId}?fields=payment_days`, {
                    headers: directusHeaders()
                });
                if (ptRes.ok) {
                    const ptData = await ptRes.json();
                    verifiedPaymentDays = ptData.data?.payment_days || 0;
                } else {
                    console.warn(`[PaymentTerms] Failed to fetch terms for ID ${paymentTermsId}, falling back to payload.`);
                    verifiedPaymentDays = pt && typeof pt === "object" ? (pt.payment_days || 0) : 0;
                }
            } catch (e) {
                console.warn("[PaymentTerms] Error resolving payment_days from DB, falling back to payload:", e);
                verifiedPaymentDays = pt && typeof pt === "object" ? (pt.payment_days || 0) : 0;
            }
        }

        // Iterate through each receipt generated
        for (const receipt of receipts) {
            // ── Skip Void Reference Receipt ──
            if (receipt.is_void_reference) {
                continue;
            }

            // Calculate totals for this invoice based on receipt items
            const grossAmount = receipt.items.reduce((sum: number, item: { qty: number; unit_price: number }) => sum + (item.qty * item.unit_price), 0);
            const discountAmount = receipt.items.reduce((sum: number, item: { discount_amount: number }) => sum + item.discount_amount, 0);
            const netAmount = receipt.items.reduce((sum: number, item: { net_amount: number }) => sum + item.net_amount, 0);
            const totalAmount = grossAmount - discountAmount;

            // Receipt logic
            const isReceipt = isOfficial ? 1 : 0;
            const vatAmount = isOfficial ? (netAmount / 1.12) * 0.12 : 0;

            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + verifiedPaymentDays);

            // 2. Create or Update sales_invoice
            let targetInvoiceId = null;
            try {
                const invoicePayload: Record<string, unknown> = {
                    order_id: order.order_no,
                    customer_code: order.customer_code?.customer_code || null,
                    invoice_no: receipt.receipt_no,
                    salesman_id: order.salesman_id?.id || null,
                    branch_id: order.branch_id?.id || null,
                    invoice_date: now,
                    due_date: dueDate.toISOString(),
                    payment_terms: paymentTermsId,
                    transaction_status: "Prepared", 
                    payment_status: "Unpaid",
                    total_amount: totalAmount,
                    invoice_type: receipt_type_id || (order.receipt_type?.id) || null,
                    price_type: order.salesman_id?.price_type || null,
                    sales_type: order.sales_type || null,
                    gross_amount: grossAmount,
                    discount_amount: discountAmount,
                    net_amount: netAmount,
                    isReceipt: isReceipt,
                    vat_amount: vatAmount,
                    modified_by: createdBy,
                    modified_date: now,
                    isPosted: 0,
                    isDispatched: 0,
                    isRemitted: 0
                };

                const targetId = receipt.target_id || order.existing_invoice_no;
                let isVoidReplacement = false;

                if (targetId) {
                    // ── Check if this is a VOID replacement (Immutable History Rule) ──
                    try {
                        const checkRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice/${targetId}?fields=transaction_status`, {
                            headers: directusHeaders()
                        });
                        if (checkRes.ok) {
                            const checkData = await checkRes.json();
                            if (checkData.data?.transaction_status?.toUpperCase() === "VOID") {
                                isVoidReplacement = true;
                                console.log(`[VOID] Detected void status for invoice ${targetId}. Tagging as replaced.`);

                                // Tag the old invoice as replaced
                                await fetch(`${DIRECTUS_BASE}/items/sales_invoice/${targetId}`, {
                                    method: 'PATCH',
                                    headers: directusHeaders(),
                                    body: JSON.stringify({ isReplaced: 1 })
                                });
                            }
                        }
                    } catch (e) {
                        console.warn("[VOID Check] Failed to verify status of targetId:", e);
                    }

                    if (!isVoidReplacement) {
                        // ── B. Update existing invoice (Non-Void/Recycled) ──
                        const patchRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice/${targetId}`, {
                            method: 'PATCH',
                            headers: directusHeaders(),
                            body: JSON.stringify(invoicePayload)
                        });
                        if (!patchRes.ok) throw new Error(await patchRes.text());
                        targetInvoiceId = targetId;
                        
                        // Clear old details for this invoice before adding new ones
                        await fetch(`${DIRECTUS_BASE}/items/sales_invoice_details?filter[invoice_no][_eq]=${targetInvoiceId}`, {
                            method: 'DELETE',
                            headers: directusHeaders()
                        });
                    }
                }
                
                if (!targetInvoiceId) {
                    // ── Create new invoice (Normal or VOID Replacement) ──
                    invoicePayload.created_by = createdBy;
                    invoicePayload.created_date = now;
                    
                    const invoiceRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice`, {
                        method: 'POST',
                        headers: directusHeaders(),
                        body: JSON.stringify(invoicePayload)
                    });
                    if (!invoiceRes.ok) throw new Error(await invoiceRes.text());
                    const invoiceData = await invoiceRes.json();
                    targetInvoiceId = invoiceData.data.invoice_id;
                }
                
                results.invoicesCreated++;
                if (targetInvoiceId) {
                    results.createdInvoices.push({
                        id: typeof targetInvoiceId === 'string' ? parseInt(targetInvoiceId) : targetInvoiceId,
                        receipt_no: receipt.receipt_no
                    });
                }
            } catch (err: unknown) {
                results.errors.push({ step: "process_sales_invoice", receipt_no: receipt.receipt_no, error: err instanceof Error ? err.message : String(err) });
                continue;
            }

            // 3. Process items for this receipt
            for (const item of receipt.items) {
                // 3a. Update sales_order_details (served_quantity)
                try {
                    const podRes = await fetch(`${DIRECTUS_BASE}/items/sales_order_details?filter[order_id][_eq]=${order.order_id}&filter[product_id][_eq]=${item.product_id}`, {
                        headers: directusHeaders()
                    });
                    if (podRes.ok) {
                        const podData = await podRes.json();
                        if (podData.data && podData.data.length > 0) {
                            const detailId = podData.data[0].detail_id;
                            const currentServed = podData.data[0].served_quantity || 0;
                            const newServedQty = currentServed + item.qty;

                            const updatePodRes = await fetch(`${DIRECTUS_BASE}/items/sales_order_details/${detailId}`, {
                                method: 'PATCH',
                                headers: directusHeaders(),
                                body: JSON.stringify({ served_quantity: newServedQty })
                            });
                            if (updatePodRes.ok) results.orderDetailsUpdated++;
                        }
                    }
                } catch (err: unknown) {
                    results.errors.push({ step: "update_sales_order_details", product_id: item.product_id, error: err instanceof Error ? err.message : String(err) });
                }

                // 3b. Create sales_invoice_details
                if (targetInvoiceId) {
                    try {
                        const grossAmtItem = item.qty * item.unit_price;
                        const totalAmtItem = grossAmtItem - item.discount_amount;
                        
                        let unitOfMeasurement = item.unit_of_measurement || null;
                        if (!unitOfMeasurement) {
                            try {
                                const prodRes = await fetch(`${DIRECTUS_BASE}/items/products/${item.product_id}?fields=unit_of_measurement`, {
                                    headers: directusHeaders()
                                });
                                if (prodRes.ok) {
                                    const prodData = await prodRes.json();
                                    unitOfMeasurement = prodData.data?.unit_of_measurement || null;
                                }
                            } catch {
                                console.warn(`Could not fetch product ${item.product_id} for unit mapping`);
                            }
                        }

                        const detailPayload = {
                            order_id: order.order_no,
                            invoice_no: targetInvoiceId,
                            discount_type: item.discount_type,
                            product_id: item.product_id,
                            unit: unitOfMeasurement,
                            unit_price: item.unit_price,
                            quantity: item.qty,
                            discount_amount: item.discount_amount,
                            gross_amount: grossAmtItem,
                            total_amount: totalAmtItem,
                            created_date: now
                        };

                        const detailRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_details`, {
                            method: 'POST',
                            headers: directusHeaders(),
                            body: JSON.stringify(detailPayload)
                        });
                        
                        if (detailRes.ok) results.invoiceDetailsCreated++;
                        else throw new Error(await detailRes.text());
                    } catch (err: unknown) {
                        results.errors.push({ step: "create_sales_invoice_details", product_id: item.product_id, error: err instanceof Error ? err.message : String(err) });
                    }
                }

                // 4. Update consolidator_details.applied_quantity (accumulate)
                if (consolidatorId) {
                    try {
                        // Find the consolidator_details record by consolidator_id + product_id
                        const cdRes = await fetch(
                            `${DIRECTUS_BASE}/items/consolidator_details?filter[consolidator_id][_eq]=${consolidatorId}&filter[product_id][_eq]=${item.product_id}&limit=1`,
                            { headers: directusHeaders() }
                        );
                        if (cdRes.ok) {
                            const cdData = await cdRes.json();
                            if (cdData.data && cdData.data.length > 0) {
                                const cdRecord = cdData.data[0];
                                const currentApplied = cdRecord.applied_quantity || 0;
                                const newApplied = currentApplied + item.qty;

                                const updateCdRes = await fetch(`${DIRECTUS_BASE}/items/consolidator_details/${cdRecord.id}`, {
                                    method: 'PATCH',
                                    headers: directusHeaders(),
                                    body: JSON.stringify({ applied_quantity: newApplied })
                                });
                                if (updateCdRes.ok) results.consolidatorDetailsUpdated++;
                            }
                        }
                    } catch (err: unknown) {
                        results.errors.push({ step: "update_consolidator_details", product_id: item.product_id, error: err instanceof Error ? err.message : String(err) });
                    }
                }
            }
        }

        if (results.errors.length > 0) {
            return NextResponse.json({ warning: "Completed with errors", details: results }, { status: 207 }); // Multi-status
        }

        return NextResponse.json({ success: true, details: results });

    } catch (err: unknown) {
        return NextResponse.json({ error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
