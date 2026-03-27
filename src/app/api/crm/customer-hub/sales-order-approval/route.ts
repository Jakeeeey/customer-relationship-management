import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";
const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const SPRING_API_BASE_URL = process.env.SPRING_API_BASE_URL || "";

const fetchHeaders = {
    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    "Content-Type": "application/json",
};

export async function GET(req: NextRequest) {
    const type = req.nextUrl.searchParams.get("type");

    try {
        if (type === "orders") {
            const statusFilter = req.nextUrl.searchParams.get("status") || "For Approval";
            const search = req.nextUrl.searchParams.get("search") || "";
            const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
            const limit = parseInt(req.nextUrl.searchParams.get("limit") || "30", 10);
            const startDate = req.nextUrl.searchParams.get("startDate");
            const endDate = req.nextUrl.searchParams.get("endDate");

            // 1. Build Directus Filter
            const filter: { _and: Record<string, unknown>[] } = { _and: [] };

            if (statusFilter !== "All") {
                filter._and.push({ order_status: { _eq: statusFilter } });
            }

            if (startDate && endDate) {
                filter._and.push({ order_date: { _between: [startDate, endDate] } });
            } else if (startDate) {
                filter._and.push({ order_date: { _gte: startDate } });
            } else if (endDate) {
                filter._and.push({ order_date: { _lte: endDate } });
            }

            if (search) {
                // Find matching customer codes for the search term
                let matchingCustomerCodes: string[] = [];
                try {
                    const cMatchRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[customer_name][_icontains]=${encodeURIComponent(search)}&fields=customer_code&limit=-1`, {
                        headers: fetchHeaders
                    });
                    if (cMatchRes.ok) {
                        const cMatchJson = await cMatchRes.json();
                        matchingCustomerCodes = (cMatchJson.data || []).map((c: { customer_code: string }) => c.customer_code).filter(Boolean);
                    }
                } catch (e) {
                    console.error("Search customer match error:", e);
                }

                const orConditions: Record<string, unknown>[] = [
                    { customer_code: { _icontains: search } },
                    { order_no: { _icontains: search } },
                    { po_no: { _icontains: search } }
                ];

                if (matchingCustomerCodes.length > 0) {
                    orConditions.push({ customer_code: { _in: matchingCustomerCodes } });
                }

                filter._and.push({ _or: orConditions });
            }

            const filterParam = filter._and.length > 0 ? `&filter=${encodeURIComponent(JSON.stringify(filter))}` : "";

            // 2. Fetch Total Count for pagination
            const countUrl = `${DIRECTUS_URL}/items/sales_order?aggregate[count]=*${filterParam}`;
            const countRes = await fetch(countUrl, { headers: fetchHeaders });
            let totalCount = 0;
            if (countRes.ok) {
                const countJson = await countRes.json();
                totalCount = parseInt(countJson.data?.[0]?.count || "0", 10);
            }

            // 3. Fetch Paginated Flat Orders
            const ordersUrl = `${DIRECTUS_URL}/items/sales_order?${filterParam}&sort=-modified_date,-created_date,-order_id&page=${page}&limit=${limit}&fields=*`;
            const ordersRes = await fetch(ordersUrl, { headers: fetchHeaders });
            if (!ordersRes.ok) {
                const errText = await ordersRes.text();
                return NextResponse.json({ error: "Failed to fetch orders", details: errText }, { status: 500 });
            }

            const ordersJson = await ordersRes.json();
            const orders = ordersJson.data || [];

            // 4. Enrich with Customer Names
            if (orders.length > 0) {
                const customerCodes = Array.from(new Set(orders.map((o: { customer_code: string }) => o.customer_code))).filter(Boolean);
                const customersDict: Record<string, string> = {};
                const cRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[customer_code][_in]=${encodeURIComponent(customerCodes.join(','))}&limit=-1`, {
                    headers: fetchHeaders,
                });
                if (cRes.ok) {
                    const cJson = await cRes.json();
                    const customers = cJson.data || [];
                    customers.forEach((c: { customer_code: string, customer_name: string }) => {
                        customersDict[c.customer_code] = c.customer_name;
                    });
                }
                orders.forEach((o: { customer_code: string, customer_name?: string }) => {
                    o.customer_name = customersDict[o.customer_code] || "Unknown Customer";
                });
            }

            return NextResponse.json({
                data: orders,
                metadata: {
                    page,
                    limit,
                    totalCount,
                    hasMore: (page * limit) < totalCount
                }
            });
        }

        if (type === "order-details") {
            const orderId = req.nextUrl.searchParams.get("orderId");
            const branchId = req.nextUrl.searchParams.get("branchId");
            if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

            const detUrl = `${DIRECTUS_URL}/items/sales_order_details?filter[order_id][_eq]=${orderId}&fields=*&limit=-1`;
            const detRes = await fetch(detUrl, { headers: fetchHeaders });
            if (!detRes.ok) return NextResponse.json({ error: "Failed to fetch order details" }, { status: 500 });
            const detJson = await detRes.json();
            const details = (detJson.data || []).map((d: any) => {
                const pk = d.detail_id || d.order_detail_id || d.id;
                return {
                    ...d,
                    detail_id: pk,
                    order_detail_id: pk,
                    id: pk
                };
            });

            // Fetch all units for mapping uom
            const unitsRes = await fetch(`${DIRECTUS_URL}/items/units?limit=-1`, { headers: fetchHeaders });
            const unitsData = (await unitsRes.json()).data || [];
            const unitMap: Record<number, { uom_name: string; uom_shortcut: string }> = {};
            unitsData.forEach((u: { unit_id: number | string; unit_name?: string; unit_shortcut?: string }) => {
                unitMap[Number(u.unit_id)] = {
                    uom_name: u.unit_name || "",
                    uom_shortcut: u.unit_shortcut || ""
                };
            });

            // Fetch products for descriptions
            let productIds: number[] = [];
            if (details.length > 0) {
                productIds = Array.from(new Set(details.map((d: { product_id: number | string }) => Number(d.product_id)))).filter(Boolean) as number[];
                const pRes = await fetch(`${DIRECTUS_URL}/items/products?filter[product_id][_in]=${productIds.join(',')}&fields=product_id,product_name,product_code,description,unit_of_measurement&limit=-1`, {
                    headers: fetchHeaders
                });
                if (pRes.ok) {
                    const pJson = await pRes.json();
                    const pMap = new Map((pJson.data || []).map((p: { product_id: number | string; product_name: string; product_code: string; description: string; unit_of_measurement: number | string }) => {
                        const pid = Number(p.product_id);
                        const uomId = Number(p.unit_of_measurement);
                        const uomInfo = uomId && unitMap[uomId] ? unitMap[uomId] : { uom_name: "", uom_shortcut: "" };
                        return [pid, { ...p, uom: uomInfo }];
                    }));
                    details.forEach((d: { product_id: number | string | Record<string, unknown> }) => {
                        const pid = Number(d.product_id);
                        if (pMap.has(pid)) {
                            d.product_id = pMap.get(pid) as Record<string, unknown>;
                        }
                    });
                }
            }

            // --- SPRING BOOT INVENTORY SYNC ---
            if (branchId && SPRING_API_BASE_URL && productIds.length > 0) {
                try {
                    const cookieStore = await cookies();
                    const token = (await cookieStore).get(COOKIE_NAME)?.value;
                    const invUrl = `${SPRING_API_BASE_URL.replace(/\/$/, "")}/api/view-running-inventory-by-unit/all?startDate=2025-01-01&endDate=2026-12-30`;
                    
                    const invRes = await fetch(invUrl, {
                        headers: {
                            "Accept": "application/json",
                            ...(token ? { "Authorization": `Bearer ${token}` } : {})
                        },
                        cache: 'no-store',
                    });

                    if (invRes.ok) {
                        const invJson = await invRes.json();
                        const invData = Array.isArray(invJson) ? invJson : (invJson.data || []);
                        
                        // Map inventory for this specific branch
                        const inventoryMap: Record<number, number> = {};
                        invData.forEach((item: { branchId?: string | number, branch_id?: string | number, productId?: string | number, product_id?: string | number, runningInventoryUnit?: number | string }) => {
                            const itemBId = item.branchId ?? item.branch_id;
                            if (itemBId && Number(itemBId) === Number(branchId)) {
                                const pid = item.productId ?? item.product_id;
                                if (pid) {
                                    inventoryMap[Number(pid)] = Number(item.runningInventoryUnit || 0);
                                }
                            }
                        });

                        // Enrich details with inventory
                        details.forEach((d: { product_id?: { product_id?: number }, available_qty?: number }) => {
                            const pid = Number(d.product_id?.product_id);
                            if (pid && inventoryMap[pid] !== undefined) {
                                d.available_qty = inventoryMap[pid];
                            } else {
                                d.available_qty = 0;
                            }
                        });
                    }
                } catch (e) {
                    console.error("[InventorySyncError]", e);
                }
            }
            // --- END SYNC ---

            return NextResponse.json({ data: details });
        }

        if (type === "payment-summary") {
            const orderIds = req.nextUrl.searchParams.get("orderIds");
            const orderNos = req.nextUrl.searchParams.get("orderNos");
            if (!orderIds) return NextResponse.json({ error: "orderIds required" }, { status: 400 });

            let invUrl = `${DIRECTUS_URL}/items/sales_invoice?filter[order_id][_in]=${encodeURIComponent(orderIds)}&fields=invoice_id,total_amount,net_amount,order_id&limit=-1`;
            let invRes = await fetch(invUrl, { headers: fetchHeaders });
            const invJson = await invRes.json();
            let invoices = invJson.data || [];

            if (invoices.length === 0 && orderNos) {
                invUrl = `${DIRECTUS_URL}/items/sales_invoice?filter[order_id][_in]=${encodeURIComponent(orderNos)}&fields=invoice_id,total_amount,net_amount,order_id&limit=-1`;
                invRes = await fetch(invUrl, { headers: fetchHeaders });
                const invJsonAlt = await invRes.json();
                invoices = invJsonAlt.data || [];
            }

            let invoiceTotal = 0;
            const invoiceIds: number[] = [];
            for (const inv of invoices) {
                if (inv.invoice_id) invoiceIds.push(inv.invoice_id);
                invoiceTotal += Number(inv.total_amount ?? inv.net_amount ?? 0);
            }

            let paidTotal = 0;
            if (invoiceIds.length > 0) {
                const payUrl = `${DIRECTUS_URL}/items/sales_invoice_payments?filter[invoice_id][_in]=${encodeURIComponent(invoiceIds.join(','))}&fields=paid_amount&limit=-1`;
                const payRes = await fetch(payUrl, { headers: fetchHeaders });
                if (payRes.ok) {
                    const payJson = await payRes.json();
                    (payJson.data || []).forEach((p: { paid_amount: number }) => {
                        paidTotal += Number(p.paid_amount ?? 0);
                    });
                }
            }

            return NextResponse.json({
                data: { invoiceTotal, paidTotal, unpaidTotal: Math.max(0, invoiceTotal - paidTotal) }
            });
        }

        if (type === "invoice-details") {
            const orderId = req.nextUrl.searchParams.get("orderId");
            const orderNo = req.nextUrl.searchParams.get("orderNo");
            if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

            const invFilter = { _or: [{ order_id: { _eq: orderId } }, { order_id: { _eq: orderNo } }] };
            const invUrl = `${DIRECTUS_URL}/items/sales_invoice?filter=${encodeURIComponent(JSON.stringify(invFilter))}&fields=*&limit=1`;
            const invRes = await fetch(invUrl, { headers: fetchHeaders });
            const invJson = await invRes.json();
            const invoice = invJson.data?.[0];

            if (!invoice) return NextResponse.json({ data: null, message: "No invoice found" });

            const detFilter = { _or: [{ invoice_no: { _eq: invoice.invoice_id } }, { invoice_no: { _eq: invoice.invoice_no } }] };
            const detUrl = `${DIRECTUS_URL}/items/sales_invoice_details?filter=${encodeURIComponent(JSON.stringify(detFilter))}&fields=*&limit=-1`;
            const detRes = await fetch(detUrl, { headers: fetchHeaders });
            const detJson = await detRes.json();
            const details = detJson.data || [];

            // Fetch all units for mapping uom
            const unitsRes = await fetch(`${DIRECTUS_URL}/items/units?limit=-1`, { headers: fetchHeaders });
            const unitsData = (await unitsRes.json()).data || [];
            const unitMap: Record<number, { uom_name: string; uom_shortcut: string }> = {};
            unitsData.forEach((u: { unit_id: number | string; unit_name?: string; unit_shortcut?: string }) => {
                unitMap[Number(u.unit_id)] = {
                    uom_name: u.unit_name || "",
                    uom_shortcut: u.unit_shortcut || ""
                };
            });

            if (details.length > 0) {
                const pIds = Array.from(new Set(details.map((d: { product_id: number | string }) => d.product_id))).filter(Boolean);
                const pRes = await fetch(`${DIRECTUS_URL}/items/products?filter[product_id][_in]=${pIds.join(',')}&fields=product_id,product_name,product_code,description,unit_of_measurement&limit=-1`, {
                    headers: fetchHeaders
                });
                if (pRes.ok) {
                    const pJson = await pRes.json();
                    const pMap = new Map((pJson.data || []).map((p: { product_id: number | string; product_name: string; product_code: string; description: string; unit_of_measurement: number | string }) => {
                        const pid = Number(p.product_id);
                        const uomId = Number(p.unit_of_measurement);
                        const uomInfo = uomId && unitMap[uomId] ? unitMap[uomId] : { uom_name: "", uom_shortcut: "" };
                        return [pid, { ...p, uom: uomInfo }];
                    }));
                    details.forEach((d: { product_id: number | string | Record<string, unknown> }) => {
                        const pid = Number(d.product_id);
                        if (pMap.has(pid)) {
                            d.product_id = pMap.get(pid) as Record<string, unknown>;
                        }
                    });
                }
            }

            return NextResponse.json({ data: { invoice, details } });
        }

        if (type === "discount-types") {
            const res = await fetch(`${DIRECTUS_URL}/items/discount_type?fields=id,discount_type&limit=-1`, { headers: fetchHeaders });
            if (!res.ok) return NextResponse.json({ error: "Failed to fetch discount types" }, { status: 500 });
            return NextResponse.json((await res.json()).data || []);
        }

        return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
    } catch (error: unknown) {
        console.error("API error", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { orderIds, action, orderId, header, lineItems, type } = body;

        // Individual Update (Order Header & Line Items)
        if (type === "order-update") {
            const now = new Date().toISOString();

            // 1. Update Header
            const hRes = await fetch(`${DIRECTUS_URL}/items/sales_order/${orderId}`, {
                method: "PATCH",
                headers: fetchHeaders,
                body: JSON.stringify({
                    ...header,
                    modified_date: now
                })
            });
            if (!hRes.ok) throw new Error("Failed to update order header");

            // 2. Update Line Items
            if (lineItems && lineItems.length > 0) {
                const patchRes = await fetch(`${DIRECTUS_URL}/items/sales_order_details`, {
                    method: "PATCH",
                    headers: fetchHeaders,
                    body: JSON.stringify(lineItems.map((li: { detail_id?: number | string; order_detail_id?: number | string; id?: number | string; allocated_quantity: number; net_amount: number; discount_amount?: number }) => {
                        const pkValue = li.detail_id || li.order_detail_id || li.id;
                        return {
                            id: pkValue,
                            detail_id: pkValue,
                            order_detail_id: pkValue,
                            allocated_quantity: li.allocated_quantity,
                            net_amount: li.net_amount,
                            allocated_amount: li.net_amount,
                            discount_amount: li.discount_amount ?? 0
                        };
                    }))
                });
                
                if (!patchRes.ok) {
                    const errDetail = await patchRes.text();
                    console.error("Directus Details Patch Error:", errDetail);
                    throw new Error(`Failed to update line items: ${errDetail}`);
                }
            }
            return NextResponse.json({ success: true });
        }

        // Bulk Actions (Approve, Hold, Cancel)
        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return NextResponse.json({ error: "orderIds array required" }, { status: 400 });
        }

        const now = new Date().toISOString();
        let status = "For Consolidation";
        const updateObj: Record<string, string | number | boolean | null | undefined> = { modified_date: now };

        if (action === "approve") {
            status = "For Consolidation";
            updateObj.for_consolidation_at = now;
            updateObj.approved_at = now;
        } else if (action === "submit_for_approval") {
            status = "For Approval";
            updateObj.for_approval_at = now;
        } else if (action === "hold") {
            status = "On Hold";
            updateObj.on_hold_at = now;
        } else if (action === "cancel") {
            status = "Cancelled";
            updateObj.isCancelled = true;
            updateObj.cancelled_at = now;
        }

        const payload = orderIds.map(id => ({
            order_id: id,
            order_status: status,
            ...updateObj
        }));

        const patchRes = await fetch(`${DIRECTUS_URL}/items/sales_order`, {
            method: "PATCH",
            headers: fetchHeaders,
            body: JSON.stringify(payload)
        });

        if (!patchRes.ok) {
            const errBody = await patchRes.text();
            console.error("Directus PATCH error:", errBody);
            return NextResponse.json({ error: "Failed to update orders" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: `Successfully updated ${orderIds.length} order(s).` });
    } catch (error: unknown) {
        console.error("API POST error", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
