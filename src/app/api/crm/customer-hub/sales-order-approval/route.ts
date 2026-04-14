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

interface RawDetailRow {
    detail_id?: number | string;
    order_detail_id?: number | string;
    id: number | string;
    product_id: number | string;
    allocated_quantity?: number | string | null;
    discount_amount?: number | string | null;
    net_amount?: number | string | null;
    gross_amount?: number | string | null;
    ordered_quantity?: number | string | null;
    unit_price?: number | string | null;
    [key: string]: unknown;
}

export async function GET(req: NextRequest) {
    const type = req.nextUrl.searchParams.get("type");

    try {
        if (type === "order-header") {
            const orderId = req.nextUrl.searchParams.get("orderId");
            if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });
            
            const url = `${DIRECTUS_URL}/items/sales_order/${orderId}?fields=*`;
            const res = await fetch(url, { headers: fetchHeaders, cache: 'no-store' });
            if (!res.ok) return NextResponse.json({ error: "Failed to fetch order header" }, { status: 500 });
            
            const json = await res.json();
            const order = json.data;

            // Enrich with Customer Name
            if (order && order.customer_code) {
                try {
                    const cRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[customer_code][_eq]=${encodeURIComponent(order.customer_code)}&fields=customer_name&limit=1`, {
                        headers: fetchHeaders,
                    });
                    if (cRes.ok) {
                        const cJson = await cRes.json();
                        if (cJson.data && cJson.data.length > 0) {
                            order.customer_name = cJson.data[0].customer_name;
                        } else {
                            order.customer_name = "Unknown Customer";
                        }
                    } else {
                        order.customer_name = "Unknown Customer";
                    }
                } catch (e) {
                    console.error("Failed to fetch customer name for header:", e);
                    order.customer_name = "Unknown Customer";
                }
            }

            // Enrich with Price Type Name
            if (order && order.salesman_id) {
                try {
                    // 1. Fetch Salesman to get price_type_id
                    const sRes = await fetch(`${DIRECTUS_URL}/items/salesman/${order.salesman_id}?fields=price_type_id`, {
                        headers: fetchHeaders,
                    });
                    if (sRes.ok) {
                        const sJson = await sRes.json();
                        const ptId = sJson.data?.price_type_id;
                        if (ptId) {
                            // 2. Fetch Price Type Name
                            const ptRes = await fetch(`${DIRECTUS_URL}/items/price_types/${ptId}?fields=price_type_name`, {
                                headers: fetchHeaders,
                            });
                            if (ptRes.ok) {
                                const ptJson = await ptRes.json();
                                order.price_type_name = ptJson.data?.price_type_name || "Standard";
                            } else {
                                order.price_type_name = "Standard";
                            }
                        } else {
                            order.price_type_name = "Standard";
                        }
                    } else {
                        order.price_type_name = "Standard";
                    }
                } catch (e) {
                    console.error("Failed to fetch price type for header:", e);
                    order.price_type_name = "Standard";
                }
            }
            
            return NextResponse.json({ data: order });
        }

        if (type === "orders") {
            const statusFilter = req.nextUrl.searchParams.get("status") || "For Approval";
            const search = req.nextUrl.searchParams.get("search") || "";
            const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
            const limit = parseInt(req.nextUrl.searchParams.get("limit") || "30", 10);
            const startDate = req.nextUrl.searchParams.get("startDate");
            const endDate = req.nextUrl.searchParams.get("endDate");
            let matchingCustomerCodes: string[] = [];

            // 1. Build Directus Filter (Legacy logic)
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

            const trimmedSearch = (search || "").trim();
            if (trimmedSearch) {
                // Find matching customer codes for the search term
                try {
                    const cMatchRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[customer_name][_icontains]=${encodeURIComponent(trimmedSearch)}&fields=customer_code&limit=100`, {
                        headers: fetchHeaders
                    });
                    if (cMatchRes.ok) {
                        const cMatchJson = await cMatchRes.json();
                        matchingCustomerCodes = (cMatchJson.data || [])
                            .map((c: { customer_code: string }) => c.customer_code)
                            .filter(Boolean)
                            .slice(0, 100); // Limit to 100 to prevent URI Too Long
                        console.log(`[ApprovalAPI] Search '${trimmedSearch}' matched ${matchingCustomerCodes.length} customers.`);
                    }
                } catch (e) {
                    console.error("Search customer match error:", e);
                }

                const orConditions: Record<string, unknown>[] = [
                    { customer_code: { _icontains: trimmedSearch } },
                    { order_no: { _icontains: trimmedSearch } },
                    { po_no: { _icontains: trimmedSearch } }
                ];

                if (matchingCustomerCodes.length > 0) {
                    orConditions.push({ customer_code: { _in: matchingCustomerCodes } });
                }

                filter._and.push({ _or: orConditions });
            }

            // 2. Build Query Parameters using Indexed AND Filtering
            const ordersParams = new URLSearchParams();
            let andIndex = 0;

            if (statusFilter !== "All") {
                ordersParams.set(`filter[_and][${andIndex}][order_status][_eq]`, statusFilter);
                andIndex++;
            }

            if (startDate && endDate) {
                ordersParams.set(`filter[_and][${andIndex}][order_date][_between]`, `${startDate},${endDate}`);
                andIndex++;
            } else if (startDate) {
                ordersParams.set(`filter[_and][${andIndex}][order_date][_gte]`, startDate);
                andIndex++;
            } else if (endDate) {
                ordersParams.set(`filter[_and][${andIndex}][order_date][_lte]`, endDate);
                andIndex++;
            }

            if (trimmedSearch) {
                ordersParams.set(`filter[_and][${andIndex}][_or][0][customer_code][_icontains]`, trimmedSearch);
                ordersParams.set(`filter[_and][${andIndex}][_or][1][order_no][_icontains]`, trimmedSearch);
                ordersParams.set(`filter[_and][${andIndex}][_or][2][po_no][_icontains]`, trimmedSearch);
                
                if (matchingCustomerCodes.length > 0) {
                    ordersParams.set(`filter[_and][${andIndex}][_or][3][customer_code][_in]`, matchingCustomerCodes.join(','));
                }
                andIndex++;
            }

            // 3. Fetch Total Count for pagination
            const countUrl = `${DIRECTUS_URL}/items/sales_order?aggregate[count]=*&${ordersParams.toString()}`;
            const countRes = await fetch(countUrl, { 
                headers: fetchHeaders,
                cache: 'no-store'
            });
            
            let totalCount = 0;
            if (countRes.ok) {
                const countJson = await countRes.json();
                const countData = countJson.data?.[0]?.count;
                if (typeof countData === 'number') {
                    totalCount = countData;
                } else if (typeof countData === 'string') {
                    totalCount = parseInt(countData, 10);
                } else if (typeof countData === 'object' && countData !== null) {
                    const val = countData['*'] || countData[Object.keys(countData)[0]];
                    totalCount = parseInt(String(val || "0"), 10);
                }
            }

            // 4. Fetch Paginated Flat Orders
            ordersParams.set("sort", "-created_date,-order_id,-modified_date");
            ordersParams.set("page", page.toString());
            ordersParams.set("limit", limit.toString());
            ordersParams.set("fields", "*");
            
            const ordersUrl = `${DIRECTUS_URL}/items/sales_order?${ordersParams.toString()}`;
            const ordersRes = await fetch(ordersUrl, { 
                headers: fetchHeaders,
                cache: 'no-store'
            });
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
            console.log(`[ApprovalAPI] Fetching details from: ${detUrl}`);
            
            const detRes = await fetch(detUrl, { 
                headers: fetchHeaders,
                cache: 'no-store' // Absolute fresh fetch!🛡️
            });

            if (!detRes.ok) return NextResponse.json({ error: "Failed to fetch order details" }, { status: 500 });
            
            const detJson = await detRes.json();
            const rawRows = detJson.data || [];
            console.log(`[ApprovalAPI] Raw rows from DB: ${rawRows.length} for Order: ${orderId}`);

            const details = rawRows.map((d: RawDetailRow) => {
                const pk = d.detail_id || d.order_detail_id || d.id;
                // Log the exact values entering the mapper
                console.log(` -> Row PK=${pk}, ProductID=${d.product_id}, DBAlloc=${d.allocated_quantity}, DBDisc=${d.discount_amount}, DBNet=${d.net_amount}`);
                
                return {
                    ...d,
                    detail_id: pk,
                    order_detail_id: pk,
                    id: pk,
                    // Direct mapped values from DB types
                    allocated_quantity: d.allocated_quantity !== null && d.allocated_quantity !== undefined ? Number(d.allocated_quantity) : 0,
                    allocated_amount: d.allocated_amount !== null && d.allocated_amount !== undefined ? Number(d.allocated_amount) : 0,
                    discount_amount: d.discount_amount !== null && d.discount_amount !== undefined ? Number(d.discount_amount) : 0,
                    net_amount: d.net_amount !== null && d.net_amount !== undefined ? Number(d.net_amount) : 0,
                    gross_amount: d.gross_amount !== null && d.gross_amount !== undefined ? Number(d.gross_amount) : 0,
                    ordered_quantity: d.ordered_quantity !== null && d.ordered_quantity !== undefined ? Number(d.ordered_quantity) : 0,
                    unit_price: d.unit_price !== null && d.unit_price !== undefined ? Number(d.unit_price) : 0,
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

            // Fetch Discount Types for mapping
            const dtUrl = `${DIRECTUS_URL}/items/discount_type?fields=id,discount_type&limit=-1`;
            const dtRes = await fetch(dtUrl, { headers: fetchHeaders });
            const dtMap = new Map<number, string>();
            if (dtRes.ok) {
                const dtJson = await dtRes.ok ? await dtRes.json() : { data: [] };
                (dtJson.data || []).forEach((dt: { id: number; discount_type: string }) => {
                    dtMap.set(Number(dt.id), dt.discount_type);
                });
            }

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
                    details.forEach((d: { product_id: number | string | Record<string, unknown>, discount_type?: number | string | null }) => {
                        const pid = Number(d.product_id);
                        if (pMap.has(pid)) {
                            d.product_id = pMap.get(pid) as Record<string, unknown>;
                        }

                        // Map discount type ID to name
                        if (d.discount_type && dtMap.has(Number(d.discount_type))) {
                            d.discount_type = dtMap.get(Number(d.discount_type));
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

            return NextResponse.json({ data: details }, {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                    "Pragma": "no-cache"
                }
            });
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

            // 4. Fetch PDF info for this invoice
            let pdfData = null;
            if (invoice?.invoice_id) {
                const pdfRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice_pdf?filter[sales_invoice_id][_eq]=${invoice.invoice_id}&fields=pdf_file,sales_invoice_id,width_mm,height_mm&limit=1`, { headers: fetchHeaders });
                const pdfJson = await pdfRes.json();
                const record = pdfJson.data?.[0];
                if (record) {
                    pdfData = {
                        ...record,
                        url: `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${record.pdf_file}`
                    };
                }
            }

            return NextResponse.json({ data: { invoice, details, pdf: pdfData } });
        }

        if (type === "discount-types") {
            const res = await fetch(`${DIRECTUS_URL}/items/discount_type?fields=id,discount_type&limit=-1`, { headers: fetchHeaders });
            if (!res.ok) return NextResponse.json({ error: "Failed to fetch discount types" }, { status: 500 });
            return NextResponse.json((await res.json()).data || []);
        }

        if (type === "attachments") {
            const orderId = req.nextUrl.searchParams.get("orderId");
            const orderNo = req.nextUrl.searchParams.get("orderNo");
            if (!orderId && !orderNo) return NextResponse.json({ error: "orderId or orderNo required" }, { status: 400 });

            const filter: { _or: Record<string, unknown>[] } = { _or: [] };
            if (orderId) filter._or.push({ sales_order_id: { _eq: orderId } });
            if (orderNo) filter._or.push({ sales_order_no: { _eq: orderNo } });

            const url = `${DIRECTUS_URL}/items/sales_order_attachment?filter=${encodeURIComponent(JSON.stringify(filter))}&fields=*&limit=-1`;
            const res = await fetch(url, { headers: fetchHeaders });
            const data = (await res.json()).data || [];
            return NextResponse.json({ data });
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
                    body: JSON.stringify(lineItems.map((li: { detail_id?: number | string; order_detail_id?: number | string; id?: number | string; allocated_quantity: number; allocated_amount: number; discount_amount?: number; gross_amount?: number }) => {
                        const pkValue = li.detail_id || li.order_detail_id || li.id;
                        return {
                            id: pkValue,
                            detail_id: pkValue,
                            order_detail_id: pkValue,
                            allocated_quantity: li.allocated_quantity,
                            allocated_amount: li.allocated_amount,
                            discount_amount: li.discount_amount ?? 0,
                            gross_amount: li.gross_amount ?? 0
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
