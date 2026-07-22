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

/** Shape of a raw `sales_invoice_details` row returned by Directus */
interface SalesInvoiceDetailRow {
    detail_id: number;
    invoice_no: number | string;
    order_id: string | null;
    product_id: number;
    unit: number | null;
    unit_price: number;
    quantity: number;
    discount_type: number | null;
    discount_amount: number;
    gross_amount: number;
    total_amount: number;
    created_date: string | null;
    [key: string]: unknown; // allow extra Directus metadata fields
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        
        const orderStr = formData.get("order") as string;
        const receiptsStr = formData.get("receipts") as string;
        const receipt_type_id = parseInt(formData.get("receipt_type_id") as string);
        
        const file = formData.get("file") as File;
        const receiptNumbers = formData.get("receipt_numbers") as string;
        const widthMm = formData.get("width_mm") as string;
        const heightMm = formData.get("height_mm") as string;

        const order = orderStr ? JSON.parse(orderStr) : null;
        const receipts = receiptsStr ? JSON.parse(receiptsStr) : null;

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

        const newlyCreatedInvoiceIds: number[] = [];
        const updatedSalesOrderDetails: { detailId: number; originalQty: number }[] = [];
        const updatedConsolidatorDetails: { cdRecordId: number; originalQty: number }[] = [];
        let salesOrderWasUpdated = false;
        
        const recycledInvoicesBackedUp: { id: number; originalPayload: Record<string, unknown>; originalDetails: SalesInvoiceDetailRow[] }[] = [];
        const voidInvoicesReplaced: number[] = [];
        const originalSalesOrderReceiptType = order.receipt_type?.id || null;
        let uploadedFileId: string | null = null;

        try {
            const nonVoidReceipts = receipts.filter((receipt: { is_void_reference?: boolean }) => !receipt.is_void_reference);
            const expectedReceiptCount = nonVoidReceipts.length;
            const expectedItemCount = nonVoidReceipts.reduce((sum: number, receipt: { items?: unknown[] }) => sum + (receipt.items?.length || 0), 0);

            // ─────────────────────────────────────────────────────────────────────
            // STEP 1: READ-ONLY Pre-flight Checks (No mutations yet)
            // Resolve consolidator_id for this order (Always get the NEWEST dispatch)
            // NOTE: sales_order PATCH (order_status → "For Loading") is intentionally
            // deferred to the VERY LAST STEP. This way, if any invoice/item/PDF step
            // fails, the order status never changes and no rollback is needed for it.
            // ─────────────────────────────────────────────────────────────────────

            // 1. Resolve consolidator_id for this order (Always get the NEWEST dispatch)
            // Chain: order.order_id → dispatch_plan_details → dispatch_plan (sort by dispatch_date) → consolidator_dispatches → consolidator
            let consolidatorId: number | null = null;
            
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

            if (expectedItemCount > 0 && !consolidatorId) {
                throw new Error("Failed to resolve consolidator record for this order. Printing cancelled to prevent incomplete applied quantity updates.");
            }

            // 1c. Resolve isOfficial status for the selected receipt type
            let isOfficial = String(order.receipt_type?.isOfficial ?? 1) === "1";
            if (receipt_type_id) {
                const rtRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_type/${receipt_type_id}?fields=isOfficial`, {
                    headers: directusHeaders()
                });
                if (rtRes.ok) {
                    const rtData = await rtRes.json();
                    isOfficial = String(rtData.data?.isOfficial) === "1";
                }
            }

            // 1d. Resolve payment_days from source of truth (DB)
            let verifiedPaymentDays = 0;
            const pt = order.payment_terms;
            const paymentTermsId = pt && typeof pt === "object" ? (pt.id || null) : (pt || null);

            if (paymentTermsId) {
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
            }

            let expectedOrderUpdatesCount = 0;
            let expectedConsolidatorUpdatesCount = 0;

            // Iterate through each receipt generated
            for (const receipt of receipts) {
                const existingItemsMap = new Map<number, SalesInvoiceDetailRow>();
                const processedDetailIds = new Set<number>();

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
                    const checkRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice/${targetId}?fields=transaction_status`, {
                        headers: directusHeaders()
                    });
                    if (checkRes.ok) {
                        const checkData = await checkRes.json();
                        if (checkData.data?.transaction_status?.toUpperCase() === "VOID") {
                            isVoidReplacement = true;
                            console.log(`[VOID] Detected void status for invoice ${targetId}. Tagging as replaced.`);

                            // Tag the old invoice as replaced
                            const voidReplaceRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice/${targetId}`, {
                                method: 'PATCH',
                                headers: directusHeaders(),
                                body: JSON.stringify({ isReplaced: 1 })
                            });
                            if (!voidReplaceRes.ok) throw new Error(`Failed to mark old void invoice ${targetId} as replaced.`);
                            voidInvoicesReplaced.push(typeof targetId === 'string' ? parseInt(targetId) : targetId);
                        }
                    }

                    if (!isVoidReplacement) {
                        // ── BACKUP BEFORE OVERWRITE (For Recycled Rollback) ──
                        const numericTargetId = typeof targetId === 'string' ? parseInt(targetId) : targetId;
                        if (!recycledInvoicesBackedUp.some(b => b.id === numericTargetId)) {
                            const backupRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice/${targetId}?fields=*`, {
                                headers: directusHeaders()
                            });
                            const oldDetailsRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_details?filter[invoice_no][_eq]=${targetId}`, {
                                headers: directusHeaders()
                            });
                            if (backupRes.ok && oldDetailsRes.ok) {
                                const backupData = await backupRes.json();
                                const oldDetailsData = await oldDetailsRes.json();
                                recycledInvoicesBackedUp.push({
                                    id: numericTargetId,
                                    originalPayload: backupData.data,
                                    originalDetails: oldDetailsData.data || []
                                });
                            }
                        }

                        // ── B. Update existing invoice (Non-Void/Recycled) ──
                        const patchRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice/${targetId}`, {
                            method: 'PATCH',
                            headers: directusHeaders(),
                            body: JSON.stringify(invoicePayload)
                        });
                        if (!patchRes.ok) throw new Error(`Failed to patch existing sales invoice ${targetId}: ${await patchRes.text()}`);
                        targetInvoiceId = targetId;
                        
                        const getDetailsRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_details?filter[invoice_no][_eq]=${targetInvoiceId}&fields=*`, {
                            headers: directusHeaders(),
                            cache: 'no-store'
                        });
                        if (getDetailsRes.ok) {
                            const detailsData = await getDetailsRes.json();
                            const existingDetailsData = detailsData.data || [];
                            existingDetailsData.forEach((d: SalesInvoiceDetailRow) => existingItemsMap.set(Number(d.product_id), d));
                        }
                    }
                }
                
                const isRecycledInvoice = targetId && !isVoidReplacement;

                if (!isVoidReplacement) {
                    expectedConsolidatorUpdatesCount += receipt.items.length;
                }
                if (!isRecycledInvoice) {
                    expectedOrderUpdatesCount += receipt.items.length;
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
                    if (!invoiceRes.ok) throw new Error(`Failed to create sales invoice: ${await invoiceRes.text()}`);
                    const invoiceData = await invoiceRes.json();
                    targetInvoiceId = invoiceData.data.invoice_id;
                    
                    // Track newly created invoice ID for rollback
                    if (targetInvoiceId) {
                        newlyCreatedInvoiceIds.push(typeof targetInvoiceId === 'string' ? parseInt(targetInvoiceId) : targetInvoiceId);
                    }
                }
                
                results.invoicesCreated++;
                if (targetInvoiceId) {
                    results.createdInvoices.push({
                        id: typeof targetInvoiceId === 'string' ? parseInt(targetInvoiceId) : targetInvoiceId,
                        receipt_no: receipt.receipt_no
                    });
                }

                // 3. Process items for this receipt
                for (const item of receipt.items) {
                    if (!isRecycledInvoice) {
                        // 3a. Update sales_order_details (served_quantity)
                        const podRes = await fetch(`${DIRECTUS_BASE}/items/sales_order_details?filter[order_id][_eq]=${order.order_id}&filter[product_id][_eq]=${item.product_id}`, {
                            headers: directusHeaders()
                        });
                        if (!podRes.ok) throw new Error(`Failed to fetch sales order details for product ${item.product_id}`);
                        const podData = await podRes.json();
                        if (!podData.data || podData.data.length === 0) {
                            throw new Error(`Missing sales_order_details row for order ${order.order_id}, product ${item.product_id}`);
                        }
                        const detailId = podData.data[0].detail_id;
                        const currentServed = podData.data[0].served_quantity || 0;
                        const newServedQty = currentServed + item.qty;

                        // Track original served quantity for rollback
                        updatedSalesOrderDetails.push({ detailId, originalQty: currentServed });

                        const updatePodRes = await fetch(`${DIRECTUS_BASE}/items/sales_order_details/${detailId}`, {
                            method: 'PATCH',
                            headers: directusHeaders(),
                            body: JSON.stringify({ served_quantity: newServedQty })
                        });
                        if (!updatePodRes.ok) throw new Error(`Failed to update served quantity for detail ${detailId}: ${await updatePodRes.text()}`);
                        results.orderDetailsUpdated++;
                    }

                    // 3b. Create sales_invoice_details
                    if (targetInvoiceId) {
                        const grossAmtItem = item.qty * item.unit_price;
                        const totalAmtItem = grossAmtItem - item.discount_amount;
                        
                        let unitOfMeasurement: number | null = null;
                        try {
                            const prodRes = await fetch(`${DIRECTUS_BASE}/items/products/${item.product_id}?fields=unit_of_measurement`, {
                                headers: directusHeaders()
                            });
                            if (prodRes.ok) {
                                const prodData = await prodRes.json();
                                // Use ?? (nullish coalescing) NOT || (OR) to preserve 0 as a valid integer value.
                                // products.unit_of_measurement defaults to 0 in the DB — using || would
                                // incorrectly coerce 0 to null, causing a NOT NULL violation in sales_invoice_details.unit.
                                unitOfMeasurement = prodData.data?.unit_of_measurement ?? null;
                            }
                        } catch {
                            console.warn(`Could not fetch product ${item.product_id} for unit mapping`);
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

                        const existingDetail = existingItemsMap.get(Number(item.product_id));
                        if (existingDetail) {
                            // PATCH existing detail
                            const detailRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_details/${existingDetail.detail_id}`, {
                                method: 'PATCH',
                                headers: directusHeaders(),
                                body: JSON.stringify(detailPayload)
                            });
                            if (!detailRes.ok) {
                                throw new Error(`Failed to update invoice details for product ${item.product_id}: ${await detailRes.text()}`);
                            }
                            processedDetailIds.add(existingDetail.detail_id);
                        } else {
                            // POST new detail
                            const detailRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_details`, {
                                method: 'POST',
                                headers: directusHeaders(),
                                body: JSON.stringify(detailPayload)
                            });
                            if (!detailRes.ok) {
                                throw new Error(`Failed to create invoice details for product ${item.product_id}: ${await detailRes.text()}`);
                            }
                            const createdData = await detailRes.json();
                            if (createdData.data?.detail_id) {
                                processedDetailIds.add(createdData.data.detail_id);
                            }
                        }
                        results.invoiceDetailsCreated++;
                    }
                }

                // 3c. Delete any details that were removed from the recycled invoice
                // ⚠️ This MUST run AFTER the entire items loop, NOT inside it.
                // Running it inside would try to delete items that haven't been processed yet.
                for (const [productId, detail] of existingItemsMap.entries()) {
                    if (!processedDetailIds.has(detail.detail_id)) {
                        const clearRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_details/${detail.detail_id}`, {
                            method: 'DELETE',
                            headers: directusHeaders()
                        });
                        if (!clearRes.ok) {
                            const errTxt = await clearRes.text();
                            throw new Error(`Cannot remove product ${productId} from the invoice because it is referenced in an unfulfilled transaction. (detail_id: ${detail.detail_id}): ${errTxt}`);
                        }
                    }
                }

                // 4. Update consolidator_details.applied_quantity (accumulate) — re-enter item loop for consolidator only - Skip if Void Replacement
                if (!isVoidReplacement) {
                    for (const item of receipt.items) {
                        if (consolidatorId) {
                            // Find the consolidator_details record by consolidator_id + product_id
                            const cdRes = await fetch(
                                `${DIRECTUS_BASE}/items/consolidator_details?filter[consolidator_id][_eq]=${consolidatorId}&filter[product_id][_eq]=${item.product_id}&limit=1`,
                                { headers: directusHeaders() }
                            );
                            if (!cdRes.ok) throw new Error(`Failed to fetch consolidator details for product ${item.product_id}`);
                            const cdData = await cdRes.json();
                            if (!cdData.data || cdData.data.length === 0) {
                                throw new Error(`Missing consolidator_details row for consolidator ${consolidatorId}, product ${item.product_id}`);
                            }

                            const cdRecord = cdData.data[0];
                            const currentApplied = cdRecord.applied_quantity || 0;
                            const newApplied = currentApplied + item.qty;

                            // Track original applied quantity for rollback
                            updatedConsolidatorDetails.push({ cdRecordId: cdRecord.id, originalQty: currentApplied });

                            const updateCdRes = await fetch(`${DIRECTUS_BASE}/items/consolidator_details/${cdRecord.id}`, {
                                method: 'PATCH',
                                headers: directusHeaders(),
                                body: JSON.stringify({ applied_quantity: newApplied })
                            });
                            if (!updateCdRes.ok) throw new Error(`Failed to update consolidator detail ${cdRecord.id}: ${await updateCdRes.text()}`);
                            results.consolidatorDetailsUpdated++;
                        }
                    }
                }
            }

            if (results.invoicesCreated !== expectedReceiptCount) {
                throw new Error(`Invoice write count mismatch. Expected ${expectedReceiptCount}, wrote ${results.invoicesCreated}.`);
            }
            if (results.createdInvoices.length !== expectedReceiptCount) {
                throw new Error(`Created invoice ID count mismatch. Expected ${expectedReceiptCount}, got ${results.createdInvoices.length}.`);
            }
            if (results.invoiceDetailsCreated !== expectedItemCount) {
                throw new Error(`Invoice detail count mismatch. Expected ${expectedItemCount}, wrote ${results.invoiceDetailsCreated}.`);
            }
            if (results.orderDetailsUpdated !== expectedOrderUpdatesCount) {
                throw new Error(`Sales order detail update count mismatch. Expected ${expectedOrderUpdatesCount}, updated ${results.orderDetailsUpdated}.`);
            }
            if (results.consolidatorDetailsUpdated !== expectedConsolidatorUpdatesCount) {
                throw new Error(`Consolidator detail update count mismatch. Expected ${expectedConsolidatorUpdatesCount}, updated ${results.consolidatorDetailsUpdated}.`);
            }

            // ==========================================
            // NEW: Atomic PDF Upload & Archiving
            // ==========================================
            if (file && newlyCreatedInvoiceIds.length > 0) {
                console.log(`[Atomic Transaction] Archiving PDF for Invoice IDs: ${newlyCreatedInvoiceIds.join(", ")}`);
                
                // 1. Upload to Directus
                const directusFormData = new FormData();
                directusFormData.append("file", file);
                directusFormData.append("title", `Invoices PDF (${receiptNumbers})`);

                const uploadRes = await fetch(`${DIRECTUS_BASE}/files`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${process.env.DIRECTUS_STATIC_TOKEN || ""}` },
                    body: directusFormData,
                });

                if (!uploadRes.ok) {
                    throw new Error(`Directus File Upload failed: ${await uploadRes.text()}`);
                }

                const uploadData = await uploadRes.json();
                uploadedFileId = uploadData.data.id;

                // 2. Resolve Folder
                const folderName = process.env.DIRECTUS_INVOICE_PDF_FOLDER_NAME || "sales_invoice_pdf";
                const targetFolderId = await getOrCreateFolderId(folderName);

                if (targetFolderId) {
                    await fetch(`${DIRECTUS_BASE}/files/${uploadedFileId}`, {
                        method: "PATCH",
                        headers: directusHeaders(),
                        body: JSON.stringify({ folder: targetFolderId }),
                    }).catch(err => console.warn("[Atomic Transaction] Folder patch failed:", err));
                }

                // 3. Insert sales_invoice_pdf (sequential, NOT Promise.all)
                // Sequential ensures that if one insert fails, subsequent ones are never
                // attempted — making rollback precise and minimal.
                for (let index = 0; index < newlyCreatedInvoiceIds.length; index++) {
                    const id = newlyCreatedInvoiceIds[index];
                    const recordRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_pdf`, {
                        method: "POST",
                        headers: directusHeaders(),
                        body: JSON.stringify({
                            sales_invoice_id: id,
                            receipt_numbers: receiptNumbers,
                            pdf_file: uploadedFileId,
                            page: index + 1,
                            width_mm: widthMm ? parseInt(widthMm as string) : null,
                            height_mm: heightMm ? parseInt(heightMm as string) : null,
                            created_at: now,
                            created_by: createdBy,
                            updated_at: now,
                            updated_by: createdBy
                        }),
                    });
                    if (!recordRes.ok) {
                        throw new Error(`Failed to create sales_invoice_pdf record for ID ${id}: ${await recordRes.text()}`);
                    }
                }
            }

            // ─────────────────────────────────────────────────────────────────────
            // STEP 7 (FINAL): Update sales_order status → "For Loading"
            // This is intentionally the LAST mutation. All invoice records, item
            // details, inventory quantity updates, and PDF archiving are fully
            // committed before we touch the order status. If we reach this point,
            // the entire transaction is guaranteed to be consistent.
            // ─────────────────────────────────────────────────────────────────────
            const orderUpdateRes = await fetch(`${DIRECTUS_BASE}/items/sales_order/${order.order_id}`, {
                method: 'PATCH',
                headers: directusHeaders(),
                body: JSON.stringify({
                    order_status: "For Loading",
                    for_loading_at: now,
                    // Guard against NaN from parseInt() — fall back to the order's existing receipt_type
                    receipt_type: (!isNaN(receipt_type_id) && receipt_type_id) ? receipt_type_id : (order.receipt_type?.id || null)
                })
            });
            if (!orderUpdateRes.ok) throw new Error(`Failed to update sales order status: ${await orderUpdateRes.text()}`);
            results.orderUpdated = true;
            salesOrderWasUpdated = true;

            return NextResponse.json({ success: true, details: results }, { status: 200 });

        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error("[Invoicing Transaction Failed] Starting rollback...", errorMessage);

            // SAFETY NET: Rollback sales_order status only if it was updated.
            // Since the order PATCH is now the LAST step, this block will only
            // activate in the rare scenario where everything else succeeded but
            // the final sales_order PATCH itself threw an error.
            if (salesOrderWasUpdated) {
                try {
                    await fetch(`${DIRECTUS_BASE}/items/sales_order/${order.order_id}`, {
                        method: 'PATCH',
                        headers: directusHeaders(),
                        body: JSON.stringify({
                            order_status: order.order_status, // restore original status
                            for_loading_at: order.for_loading_at || null,
                            receipt_type: originalSalesOrderReceiptType
                        })
                    });
                    console.log("[Rollback] Restored sales_order status to:", order.order_status);
                } catch (e) {
                    console.error("[Rollback Failed] sales_order status restore:", e);
                }
            }

            // 2. Rollback sales_invoice_pdf records (Must happen BEFORE deleting sales_invoice due to FK constraint)
            if (newlyCreatedInvoiceIds.length > 0) {
                try {
                    const idsString = newlyCreatedInvoiceIds.join(',');
                    const getPdfRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_pdf?filter[sales_invoice_id][_in]=${idsString}&fields=id`, {
                        headers: directusHeaders(),
                        cache: 'no-store'
                    });
                    if (getPdfRes.ok) {
                        const pdfData = await getPdfRes.json();
                        const pdfIdsToDelete = pdfData.data?.map((d: { id: number }) => d.id) || [];
                        for (const pid of pdfIdsToDelete) {
                            await fetch(`${DIRECTUS_BASE}/items/sales_invoice_pdf/${pid}`, {
                                method: 'DELETE',
                                headers: directusHeaders()
                            });
                        }
                        console.log("[Rollback] Deleted sales_invoice_pdf records tied to:", idsString);
                    }
                } catch (e) {
                    console.error("[Rollback Failed] sales_invoice_pdf deletion:", e);
                }
            }

            // 3. Delete Orphaned PDF File from Storage
            if (uploadedFileId) {
                try {
                    await fetch(`${DIRECTUS_BASE}/files/${uploadedFileId}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${process.env.DIRECTUS_STATIC_TOKEN || ""}` }
                    });
                    console.log("[Rollback] Deleted orphaned PDF file from storage:", uploadedFileId);
                } catch (e) {
                    console.error("[Rollback Failed] Orphaned PDF file deletion:", e);
                }
            }

            // 4. Rollback newly created sales_invoice records (delete details first)
            if (newlyCreatedInvoiceIds.length > 0) {
                for (const invId of newlyCreatedInvoiceIds) {
                    try {
                        // Delete details first
                        const getDetailsRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_details?filter[invoice_no][_eq]=${invId}&fields=*`, {
                            headers: directusHeaders(),
                            cache: 'no-store'
                        });
                        if (getDetailsRes.ok) {
                            const detailsData = await getDetailsRes.json();
                            const idsToDelete = detailsData.data?.map((d: SalesInvoiceDetailRow) => d.detail_id) || [];
                            if (idsToDelete.length > 0) {
                                for (const idToDelete of idsToDelete) {
                                    if (!idToDelete) continue;
                                    await fetch(`${DIRECTUS_BASE}/items/sales_invoice_details/${idToDelete}`, {
                                        method: 'DELETE',
                                        headers: directusHeaders()
                                    });
                                }
                            }
                        }
                        
                        // Delete invoice
                        await fetch(`${DIRECTUS_BASE}/items/sales_invoice/${invId}`, {
                            method: 'DELETE',
                            headers: directusHeaders()
                        });
                        console.log("[Rollback] Deleted sales_invoice and details for ID:", invId);
                    } catch (e) {
                        console.error("[Rollback Failed] sales_invoice deletion for ID:", invId, e);
                    }
                }
            }

            // 2b. Restore Recycled (Existing) Invoices
            if (recycledInvoicesBackedUp.length > 0) {
                for (const backup of recycledInvoicesBackedUp) {
                    try {
                        // Restore header
                        await fetch(`${DIRECTUS_BASE}/items/sales_invoice/${backup.id}`, {
                            method: 'PATCH',
                            headers: directusHeaders(),
                            body: JSON.stringify(backup.originalPayload)
                        });
                        
                        // Restore original details by matching detail_id
                        const getDetailsRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_details?filter[invoice_no][_eq]=${backup.id}&fields=*`, {
                            headers: directusHeaders(),
                            cache: 'no-store'
                        });
                        if (getDetailsRes.ok) {
                            const detailsData = await getDetailsRes.json();
                            const currentDetails = detailsData.data || [];
                            const originalDetailsMap = new Map(backup.originalDetails.map((d: SalesInvoiceDetailRow) => [d.detail_id, d]));
                            
                            // Delete any details that were newly inserted during the failed transaction
                            for (const current of currentDetails) {
                                if (!originalDetailsMap.has(current.detail_id)) {
                                    await fetch(`${DIRECTUS_BASE}/items/sales_invoice_details/${current.detail_id}`, {
                                        method: 'DELETE',
                                        headers: directusHeaders()
                                    });
                                }
                            }
                            
                            // Patch back original values
                            for (const original of backup.originalDetails) {
                                const { detail_id, ...rest } = original;
                                await fetch(`${DIRECTUS_BASE}/items/sales_invoice_details/${detail_id}`, {
                                    method: 'PATCH',
                                    headers: directusHeaders(),
                                    body: JSON.stringify(rest)
                                });
                            }
                        }
                        console.log("[Rollback] Restored recycled invoice and details for ID:", backup.id);
                    } catch (e) {
                        console.error("[Rollback Failed] Restore recycled invoice for ID:", backup.id, e);
                    }
                }
            }
            
            // 2c. Restore Void Replacement Tags
            if (voidInvoicesReplaced.length > 0) {
                for (const voidId of voidInvoicesReplaced) {
                    try {
                        await fetch(`${DIRECTUS_BASE}/items/sales_invoice/${voidId}`, {
                            method: 'PATCH',
                            headers: directusHeaders(),
                            body: JSON.stringify({ isReplaced: 0 })
                        });
                        console.log("[Rollback] Untagged void replacement for ID:", voidId);
                    } catch (e) {
                        console.error("[Rollback Failed] Untag void replacement for ID:", voidId, e);
                    }
                }
            }

            // 3. Rollback sales_order_details served_quantity updates
            if (updatedSalesOrderDetails.length > 0) {
                updatedSalesOrderDetails.reverse(); // Process LIFO
                for (const detail of updatedSalesOrderDetails) {
                    try {
                        await fetch(`${DIRECTUS_BASE}/items/sales_order_details/${detail.detailId}`, {
                            method: 'PATCH',
                            headers: directusHeaders(),
                            body: JSON.stringify({ served_quantity: detail.originalQty })
                        });
                        console.log("[Rollback] Restored sales_order_details ID:", detail.detailId, "served_quantity to:", detail.originalQty);
                    } catch (e) {
                        console.error("[Rollback Failed] sales_order_details served_quantity restore for ID:", detail.detailId, e);
                    }
                }
            }

            // 4. Rollback consolidator_details applied_quantity updates
            if (updatedConsolidatorDetails.length > 0) {
                updatedConsolidatorDetails.reverse(); // Process LIFO
                for (const cdDetail of updatedConsolidatorDetails) {
                    try {
                        await fetch(`${DIRECTUS_BASE}/items/consolidator_details/${cdDetail.cdRecordId}`, {
                            method: 'PATCH',
                            headers: directusHeaders(),
                            body: JSON.stringify({ applied_quantity: cdDetail.originalQty })
                        });
                        console.log("[Rollback] Restored consolidator_details ID:", cdDetail.cdRecordId, "applied_quantity to:", cdDetail.originalQty);
                    } catch (e) {
                        console.error("[Rollback Failed] consolidator_details applied_quantity restore for ID:", cdDetail.cdRecordId, e);
                    }
                }
            }

            results.errors.push({ step: "transaction_rollback", error: errorMessage });
            return NextResponse.json({ error: errorMessage, details: results }, { status: 500 });
        }
    } catch (err: unknown) {
        return NextResponse.json({ error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}

/**
 * Directus Folder Utility
 */
async function getOrCreateFolderId(folderName: string): Promise<string | null> {
    const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    if (!DIRECTUS_URL || !DIRECTUS_TOKEN) {
        console.error("[Directus Folders] Missing API URL or Static Token.");
        return null;
    }

    try {
        const searchUrl = `${DIRECTUS_URL}/folders?filter[name][_eq]=${encodeURIComponent(folderName)}&fields=id`;
        const searchRes = await fetch(searchUrl, {
            headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
            cache: "no-store",
        });

        if (!searchRes.ok) return null;

        const searchResult = await searchRes.json();
        if (searchResult.data && searchResult.data.length > 0) {
            return searchResult.data[0].id;
        }

        const createRes = await fetch(`${DIRECTUS_URL}/folders`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${DIRECTUS_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: folderName }),
        });

        if (!createRes.ok) return null;

        const createdResult = await createRes.json();
        return createdResult.data?.id || null;
    } catch (error) {
        console.error(`[Directus Folders] Error for '${folderName}':`, error);
        return null;
    }
}
