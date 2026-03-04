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

            // 1. Fetch Sales Orders
            let url = `${DIRECTUS_URL}/items/sales_order?sort=-for_approval_at,-modified_date,-order_id&limit=-1`;

            if (statusFilter !== "All") {
                url = `${DIRECTUS_URL}/items/sales_order?filter[order_status][_eq]=${encodeURIComponent(statusFilter)}&sort=-for_approval_at,-modified_date,-order_id&limit=-1`;
            }

            const ordersRes = await fetch(url, {
                headers: fetchHeaders,
            });

            if (!ordersRes.ok) return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
            const ordersJson = await ordersRes.json();
            const orders = ordersJson.data || [];

            if (orders.length === 0) return NextResponse.json({ data: [] });

            // 2. Extract unique customer_codes
            const customerCodes = Array.from(new Set(orders.map((o: any) => o.customer_code).filter(Boolean)));
            let customersDict: Record<string, string> = {};

            // 3. Fetch Customers
            if (customerCodes.length > 0) {
                const codesStr = customerCodes.join(',');
                const cRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[customer_code][_in]=${encodeURIComponent(codesStr)}&limit=-1`, {
                    headers: fetchHeaders,
                });
                if (cRes.ok) {
                    const cJson = await cRes.json();
                    const customers = cJson.data || [];
                    customers.forEach((c: any) => {
                        customersDict[c.customer_code] = c.customer_name;
                    });
                }
            }

            // 4. Map names and group by customer
            const enrichedOrders = orders.map((o: any) => ({
                ...o,
                customer_name: customersDict[o.customer_code] || o.customer_code || "Unknown Customer"
            }));

            // Grouping logic is typically better handled on the frontend so we have raw data to search,
            // but we will return the raw enriched array.
            return NextResponse.json({ data: enrichedOrders });
        }

        if (type === "payment-summary") {
            const orderIds = req.nextUrl.searchParams.get("orderIds"); // comma separated
            const orderNos = req.nextUrl.searchParams.get("orderNos"); // comma separated
            console.log("\n[Payment Summary] Requested orderIds:", orderIds);
            console.log("[Payment Summary] Requested orderNos:", orderNos);
            if (!orderIds) return NextResponse.json({ error: "orderIds required" }, { status: 400 });

            // 1. Fetch Invoices - First attempt with numeric IDs
            let invUrl = `${DIRECTUS_URL}/items/sales_invoice?filter[order_id][_in]=${encodeURIComponent(orderIds)}&fields=invoice_id,total_amount,net_amount,order_id&limit=-1`;
            console.log("[Payment Summary] Fetching invoices (Attempt 1):", invUrl);
            let invRes = await fetch(invUrl, { headers: fetchHeaders });
            if (!invRes.ok) return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
            let invJson = await invRes.json();
            let invoices = invJson.data || [];

            // Fallback attempt with orderNos
            if (invoices.length === 0 && orderNos) {
                invUrl = `${DIRECTUS_URL}/items/sales_invoice?filter[order_id][_in]=${encodeURIComponent(orderNos)}&fields=invoice_id,total_amount,net_amount,order_id&limit=-1`;
                console.log("[Payment Summary] Fetching invoices (Attempt 2 - Fallback):", invUrl);
                invRes = await fetch(invUrl, { headers: fetchHeaders });
                if (invRes.ok) {
                    invJson = await invRes.json();
                    invoices = invJson.data || [];
                }
            }

            console.log(`[Payment Summary] Found ${invoices.length} invoices.`, invoices);

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
                console.log("[Payment Summary] Fetching payments:", payUrl);
                const payRes = await fetch(payUrl, { headers: fetchHeaders });
                if (payRes.ok) {
                    const payJson = await payRes.json();
                    const payments = payJson.data || [];
                    console.log(`[Payment Summary] Found ${payments.length} payments.`, payments);
                    for (const payment of payments) {
                        paidTotal += Number(payment.paid_amount ?? 0);
                    }
                }
            } else {
                console.log("[Payment Summary] No invoice IDs found to fetch payments.");
            }

            let unpaidTotal = invoiceTotal - paidTotal;
            if (unpaidTotal < 0) unpaidTotal = 0; // Safety check

            console.log(`[Payment Summary] Calculated totals => Invoice: ${invoiceTotal}, Paid: ${paidTotal}, Unpaid: ${unpaidTotal}`);

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
        const { orderIds, action } = body; // action = "approve" | "reject"

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
