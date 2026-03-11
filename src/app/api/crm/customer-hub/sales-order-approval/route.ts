import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

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
                // Find matching customers first to search by customer name
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

            // 2. Fetch total count for pagination
            const countUrl = `${DIRECTUS_URL}/items/sales_order?aggregate[count]=*${filterParam}`;
            console.log("[Approval] Count URL:", countUrl);
            const countRes = await fetch(countUrl, { headers: fetchHeaders });
            const countJson = countRes.ok ? await countRes.json() : null;
            let totalCount = 0;
            if (countJson?.data?.[0]?.count) {
                const c = countJson.data[0].count;
                // Directus might return count as a number or as an object { "*": 123 }
                totalCount = typeof c === "object" ? (Number(c['*']) || Number(c.order_id) || 0) : (Number(c) || 0);
            }

            // 3. Fetch flat orders list
            const fields = [
                "order_id", "order_no", "po_no", "customer_code", "salesman_id",
                "supplier_id", "branch_id", "receipt_type",
                "sales_type", "order_date", "order_status", "due_date",
                "delivery_date", "total_amount", "discount_amount", "net_amount",
                "allocated_amount", "remarks", "created_by", "created_date", "for_approval_at"
            ].join(",");

            const ordersUrl = `${DIRECTUS_URL}/items/sales_order?fields=${fields}${filterParam}&sort=-for_approval_at,-order_id&page=${page}&limit=${limit}`;
            console.log("[Approval] Orders URL:", ordersUrl);
            const ordersRes = await fetch(ordersUrl, { headers: fetchHeaders });

            if (!ordersRes.ok) {
                const errText = await ordersRes.text();
                console.error("[Approval] Fetch Error:", errText);
                return NextResponse.json({ error: "Failed to fetch orders", details: errText }, { status: 500 });
            }

            const ordersJson = await ordersRes.json();
            const rawOrders = ordersJson.data || [];

            // 4. Fetch Customer Names to enrich the data
            const codesToFetch = Array.from(new Set(rawOrders.map((o: any) => o.customer_code))).filter(Boolean);
            const customersDict: Record<string, string> = {};

            if (codesToFetch.length > 0) {
                const cRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[customer_code][_in]=${encodeURIComponent(codesToFetch.join(','))}&fields=customer_code,customer_name&limit=-1`, {
                    headers: fetchHeaders,
                });
                if (cRes.ok) {
                    const cJson = await cRes.json();
                    (cJson.data || []).forEach((c: { customer_code: string, customer_name: string }) => {
                        customersDict[c.customer_code] = c.customer_name;
                    });
                }
            }

            const data = rawOrders.map((o: any) => ({
                ...o,
                customer_name: customersDict[o.customer_code] || o.customer_name || "Unknown Customer"
            }));

            return NextResponse.json({
                data,
                metadata: {
                    page,
                    limit,
                    totalCount: totalCount,
                    hasMore: (page * limit) < totalCount
                }
            });
        }

        if (type === "order-details") {
            const orderId = req.nextUrl.searchParams.get("orderId");
            if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

            // 1. Fetch Basic Details
            const detailsUrl = `${DIRECTUS_URL}/items/sales_order_details?filter[order_id][_eq]=${orderId}&fields=*&limit=-1`;
            const dRes = await fetch(detailsUrl, { headers: fetchHeaders });
            if (!dRes.ok) return NextResponse.json({ error: "Failed to fetch order details" }, { status: 500 });

            const dJson = await dRes.json();
            const details = dJson.data || [];

            // 2. Perform Manual Join if there are details
            if (details.length > 0) {
                const productIds = Array.from(new Set(details.map((d: any) => d.product_id))).filter(Boolean);
                if (productIds.length > 0) {
                    const pUrl = `${DIRECTUS_URL}/items/products?filter[product_id][_in]=${productIds.join(',')}&fields=product_id,product_name,product_code,description&limit=-1`;
                    const pRes = await fetch(pUrl, { headers: fetchHeaders });
                    if (pRes.ok) {
                        const pJson = await pRes.json();
                        const pMap = new Map((pJson.data || []).map((p: any) => [Number(p.product_id), p]));

                        details.forEach((d: any) => {
                            const pid = Number(d.product_id);
                            if (pMap.has(pid)) {
                                d.product_id = pMap.get(pid); // Replace ID with object
                            }
                        });
                    }
                }
            }

            return NextResponse.json({ data: details });
        }

        if (type === "payment-summary") {
            const orderIds = req.nextUrl.searchParams.get("orderIds"); // comma separated
            const orderNos = req.nextUrl.searchParams.get("orderNos"); // comma separated

            if (!orderIds) return NextResponse.json({ error: "orderIds required" }, { status: 400 });

            // 1. Fetch Invoices - First attempt with numeric IDs
            let invUrl = `${DIRECTUS_URL}/items/sales_invoice?filter[order_id][_in]=${encodeURIComponent(orderIds)}&fields=invoice_id,total_amount,net_amount,order_id&limit=-1`;
            let invRes = await fetch(invUrl, { headers: fetchHeaders });
            if (!invRes.ok) return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
            let invJson = await invRes.json();
            let invoices = invJson.data || [];

            // Fallback attempt with orderNos
            if (invoices.length === 0 && orderNos) {
                invUrl = `${DIRECTUS_URL}/items/sales_invoice?filter[order_id][_in]=${encodeURIComponent(orderNos)}&fields=invoice_id,total_amount,net_amount,order_id&limit=-1`;
                invRes = await fetch(invUrl, { headers: fetchHeaders });
                if (invRes.ok) {
                    invJson = await invRes.json();
                    invoices = invJson.data || [];
                }
            }

            let invoiceTotal = 0;
            const invoiceIds: number[] = [];

            for (const inv of invoices) {
                if (inv.invoice_id) invoiceIds.push(inv.invoice_id);
                invoiceTotal += Number(inv.total_amount ?? inv.net_amount ?? 0);
            }

            let paidTotal = 0;

            // 2. Fetch Payments
            if (invoiceIds.length > 0) {
                const idsStr = invoiceIds.join(',');
                const payUrl = `${DIRECTUS_URL}/items/sales_invoice_payments?filter[invoice_id][_in]=${encodeURIComponent(idsStr)}&fields=paid_amount&limit=-1`;
                const payRes = await fetch(payUrl, { headers: fetchHeaders });
                if (payRes.ok) {
                    const payJson = await payRes.json();
                    const payments = payJson.data || [];
                    for (const payment of payments) {
                        paidTotal += Number(payment.paid_amount ?? 0);
                    }
                }
            }

            let unpaidTotal = invoiceTotal - paidTotal;
            if (unpaidTotal < 0) unpaidTotal = 0; // Safety check

            return NextResponse.json({
                data: {
                    invoiceTotal,
                    paidTotal,
                    unpaidTotal
                }
            });
        }

        return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
    } catch (e) {
        console.error("API error", e);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { orderIds, action, type, orderId, header, lineItems } = body;

        const now = new Date().toISOString();

        // 1. Handle Complex Order Detail Update
        if (type === "order-update" && orderId) {
            // Update Header
            if (header) {
                await fetch(`${DIRECTUS_URL}/items/sales_order/${orderId}`, {
                    method: "PATCH",
                    headers: fetchHeaders,
                    body: JSON.stringify({
                        ...header,
                        modified_date: now
                    })
                });
            }

            // Update Line Items
            if (lineItems && Array.isArray(lineItems)) {
                // Directus bulk update for details
                const detailPayload = lineItems.map(li => ({
                    order_detail_id: li.order_detail_id,
                    allocated_quantity: li.allocated_quantity,
                    net_amount: li.net_amount
                }));

                await fetch(`${DIRECTUS_URL}/items/sales_order_details`, {
                    method: "PATCH",
                    headers: fetchHeaders,
                    body: JSON.stringify(detailPayload)
                });
            }

            return NextResponse.json({ success: true });
        }

        // 2. Handle Status Actions (Approve, Hold, Cancel)
        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return NextResponse.json({ error: "orderIds array required" }, { status: 400 });
        }

        let status = "For Consolidation";
        let dateField = "for_consolidation_at";
        let extraFields = {};

        if (action === "hold") {
            status = "On Hold";
            dateField = "on_hold_at";
        } else if (action === "cancel") {
            status = "Cancelled";
            dateField = "cancelled_at";
            extraFields = { isCancelled: 1 };
        }

        const payload = orderIds.map(id => ({
            order_id: id,
            order_status: status,
            [dateField]: now,
            modified_date: now,
            ...extraFields
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
    } catch (e) {
        console.error("API POST error", e);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
