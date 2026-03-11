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
                // Since customer_name isn't natively on sales_order, we need to find matching customers first
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

            // Remove empty _and array if no filters applied so we don't send `_and: []`
            const filterParam = filter._and.length > 0 ? `&filter=${encodeURIComponent(JSON.stringify(filter))}` : "";

            // 2. Fetch lightweight list of matches to extract unique customer_codes
            // We use sorting so the most recent orders pull their customers to the top of the list
            const codesUrl = `${DIRECTUS_URL}/items/sales_order?fields=customer_code${filterParam}&sort=-for_approval_at,-modified_date,-order_id&limit=-1`;

            const codesRes = await fetch(codesUrl, { headers: fetchHeaders });
            if (!codesRes.ok) {
                const errText = await codesRes.text();
                return NextResponse.json({ error: "Failed to fetch customer codes", details: errText }, { status: 500 });
            }

            const codesJson = await codesRes.json();
            const rawItems = codesJson.data || [];

            // Maintain sorting order by using a Set (which keeps insertion order for unique items natively in JS)
            const uniqueCodesSet = new Set<string>();
            for (const item of rawItems) {
                if (item.customer_code) {
                    uniqueCodesSet.add(item.customer_code);
                }
            }

            const allUniqueCodes = Array.from(uniqueCodesSet);
            const totalCustomers = allUniqueCodes.length;
            const hasMore = page * limit < totalCustomers;

            // 3. Paginate the Customer Codes
            const paginatedCodes = allUniqueCodes.slice((page - 1) * limit, page * limit);

            if (paginatedCodes.length === 0) {
                return NextResponse.json({
                    data: [],
                    metadata: { page, limit, total_customers: totalCustomers, hasMore: false }
                });
            }

            // 4. Fetch the full orders for THESE specific paginated customers AND that match the original search/status
            filter._and.push({ customer_code: { _in: paginatedCodes } });
            const finalFilterParam = `&filter=${encodeURIComponent(JSON.stringify(filter))}`;

            const ordersUrl = `${DIRECTUS_URL}/items/sales_order?${finalFilterParam}&sort=-for_approval_at,-modified_date,-order_id&limit=-1`;
            const ordersRes = await fetch(ordersUrl, { headers: fetchHeaders });
            if (!ordersRes.ok) {
                const errText = await ordersRes.text();
                return NextResponse.json({ error: "Failed to fetch paginated orders", details: errText }, { status: 500 });
            }

            const ordersJson = await ordersRes.json();
            const orders = ordersJson.data || [];

            // 5. Fetch Customer Names for these paginated codes
            const customersDict: Record<string, string> = {};
            const cRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[customer_code][_in]=${encodeURIComponent(paginatedCodes.join(','))}&limit=-1`, {
                headers: fetchHeaders,
            });
            if (cRes.ok) {
                const cJson = await cRes.json();
                const customers = cJson.data || [];
                customers.forEach((c: { customer_code: string, customer_name: string }) => {
                    customersDict[c.customer_code] = c.customer_name;
                });
            }

            // 6. Group the orders by customer perfectly
            const groupsMap = new Map<string, { customer_code: string, customer_name: string, orders: Record<string, unknown>[], total_net_amount: number }>();

            orders.forEach((order: Record<string, unknown>) => {
                const code = (order.customer_code as string) || "UNKNOWN";
                if (!groupsMap.has(code)) {
                    groupsMap.set(code, {
                        customer_code: code,
                        customer_name: (customersDict[code] as string) || (order.customer_name as string) || "Unknown Customer",
                        orders: [],
                        total_net_amount: 0
                    });
                }
                const group = groupsMap.get(code)!;
                // Enforce name on order object too just in case UI uses it
                order.customer_name = group.customer_name;

                group.orders.push(order);
                group.total_net_amount += (Number(order.net_amount) || 0);
            });

            // Re-sort the groups based on the paginatedCodes array to retain original time-based sorting
            const groupedData = paginatedCodes.map(code => groupsMap.get(code)).filter(Boolean);

            return NextResponse.json({
                data: groupedData,
                metadata: { page, limit, total_customers: totalCustomers, hasMore }
            });
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

        if (type === "invoice-details") {
            const orderId = req.nextUrl.searchParams.get("orderId");
            const orderNo = req.nextUrl.searchParams.get("orderNo");
            if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

            // 1. Fetch Invoice
            // Check both numeric ID and formatted No as order_id in sales_invoice table
            let invUrl = `${DIRECTUS_URL}/items/sales_invoice?fields=*&limit=1`;
            const orFilters = [{ order_id: { _eq: orderId } }];
            if (orderNo) orFilters.push({ order_id: { _eq: orderNo } });
            invUrl += `&filter=${encodeURIComponent(JSON.stringify({ _or: orFilters }))}`;

            const invRes = await fetch(invUrl, { headers: fetchHeaders });
            if (!invRes.ok) return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 });

            const invJson = await invRes.json();
            const invoice = invJson.data?.[0];

            if (!invoice) return NextResponse.json({ data: null, message: "No invoice found" });

            // 2. Fetch Invoice Details using the numeric invoice_id as the FK (invoice_no field in schema)
            const detUrl = `${DIRECTUS_URL}/items/sales_invoice_details?filter[invoice_no][_eq]=${invoice.invoice_id}&fields=*&limit=-1`;
            const detRes = await fetch(detUrl, { headers: fetchHeaders });
            if (!detRes.ok) return NextResponse.json({ error: "Failed to fetch invoice details" }, { status: 500 });

            const detJson = await detRes.ok ? await detRes.json() : { data: [] };
            const details = detJson.data || [];

            // 3. Manual Product Join
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
                                d.product_id = pMap.get(pid);
                            }
                        });
                    }
                }
            }

            return NextResponse.json({
                data: {
                    invoice,
                    details
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
        const { orderIds } = body; // action = "approve" | "reject"

        // We only implement Approve -> For Consolidation right now, based on instructions:
        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return NextResponse.json({ error: "orderIds array required" }, { status: 400 });
        }

        const now = new Date().toISOString();

        // Execute bulk PATCH 
        // Directus allows bulk updates if we send an array of objects to the collection endpoint, 
        // BUT each object must contain the primary key. If order_id is the primary key:

        const payload = orderIds.map(id => ({
            order_id: id,
            order_status: "For Consolidation",
            for_consolidation_at: now,
            modified_date: now
            // modified_by: "..." // optional, skip if not available in token securely
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
