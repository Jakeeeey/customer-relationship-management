import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function directusHeaders() {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    return h;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        
        const orderNo = searchParams.get("orderNo");
        const poNo = searchParams.get("poNo");
        const customerSearch = searchParams.get("customer");
        const salesman = searchParams.get("salesman");
        const supplier = searchParams.get("supplier");
        const branch = searchParams.get("branch");
        const fromDate = searchParams.get("fromDate");
        const toDate = searchParams.get("toDate");

        // Build Sales Order Query
        let filterParams = "filter[order_status][_eq]=For Invoicing";
        if (orderNo) filterParams += `&filter[order_no][_icontains]=${orderNo}`;
        if (poNo) filterParams += `&filter[po_no][_icontains]=${poNo}`;
        if (customerSearch) filterParams += `&filter[customer_code][_eq]=${customerSearch}`;
        if (salesman) filterParams += `&filter[salesman_id][_eq]=${salesman}`;
        if (supplier) filterParams += `&filter[supplier_id][_eq]=${supplier}`;
        if (branch) filterParams += `&filter[branch_id][_eq]=${branch}`;
        if (fromDate) filterParams += `&filter[order_date][_gte]=${fromDate}`;
        if (toDate) filterParams += `&filter[order_date][_lte]=${toDate}`;

        const fields = [
            "order_id",
            "order_date",
            "order_no",
            "po_no",
            "receipt_type.id",
            "receipt_type.type",
            "receipt_type.isOfficial",
            "supplier_id.supplier_shortcut",
            "supplier_id.supplier_name",
            "customer_code", // Fetch as raw string
            "salesman_id.id",
            "salesman_id.salesman_name",
            "salesman_id.salesman_code",
            "salesman_id.price_type",
            "salesman_id.division_id",
            "branch_id.id",
            "branch_id.branch_name",
            "payment_terms",
            "payment_terms.*",
            "due_date",
            "sales_type",
            "created_date",
            "total_amount",
            "net_amount",
            "discount_amount",
            "allocated_amount",
            "remarks",
            "for_approval_at",
            "for_consolidation_at",
            "for_picking_at",
            "for_invoicing_at",
            "for_loading_at",
            "for_shipping_at",
            "delivered_at",
            "not_fulfilled_at"
        ].join(",");

        const url = `${DIRECTUS_BASE}/items/sales_order?${filterParams}&fields=${fields}&limit=-1`;
        
        const response = await fetch(url, {
            cache: "no-store",
            headers: directusHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: "Failed to fetch sales orders", details: errorText }, { status: response.status });
        }

        const data = await response.json();
        const orders = data.data || [];

        if (orders.length === 0) return NextResponse.json([]);

        // ── 1. Manual Join for Customers ──────────────────────────────────────
        const uniqueCustomerCodes = Array.from(new Set(orders.map((o: { customer_code: string }) => o.customer_code).filter(Boolean)));
        
        const customersRes = await fetch(`${DIRECTUS_BASE}/items/customer?filter[customer_code][_in]=${uniqueCustomerCodes.join(",")}&fields=customer_code,customer_name`, {
            headers: directusHeaders(),
        });

        const customerMap = new Map<string, { customer_code: string; customer_name: string }>();
        if (customersRes.ok) {
            const customersData = await customersRes.json();
            customersData.data.forEach((c: { customer_code: string; customer_name: string }) => {
                customerMap.set(c.customer_code, c);
            });
        }

        // ── 2. Batch-fetch invoices for all orders to detect recycled & void ─
        const allOrderNos = orders.map((o: { order_no: string }) => o.order_no).join(",");
        const recycledInvoiceMap = new Map<string, { invoice_id: number; invoice_no: string }[]>();
        const voidInvoiceMap = new Map<string, { invoice_id: number; invoice_no: string }[]>();
        if (allOrderNos) {
            const invoiceRes = await fetch(
                `${DIRECTUS_BASE}/items/sales_invoice?filter[order_id][_in]=${encodeURIComponent(allOrderNos)}&filter[isReplaced][_neq]=1&fields=invoice_id,order_id,invoice_no,transaction_status&limit=-1`,
                { headers: directusHeaders() }
            );
            if (invoiceRes.ok) {
                const invoiceData = await invoiceRes.json();
                for (const inv of (invoiceData.data || [])) {
                    if (inv.transaction_status?.toUpperCase() === "VOID") {
                        // Void takes priority — it's a re-invoicing situation
                        const list = voidInvoiceMap.get(inv.order_id) || [];
                        list.push({ invoice_id: inv.invoice_id, invoice_no: inv.invoice_no });
                        voidInvoiceMap.set(inv.order_id, list);
                    } else {
                        // Non-void existing invoices — used for recycled orders
                        const list = recycledInvoiceMap.get(inv.order_id) || [];
                        list.push({ invoice_id: inv.invoice_id, invoice_no: inv.invoice_no });
                        recycledInvoiceMap.set(inv.order_id, list);
                    }
                }
            }
        }

        // ── 3. Build enriched response ────────────────────────────────────────
        const enrichedOrders = orders.map((o: { order_no: string; customer_code: string; not_fulfilled_at?: string } & Record<string, unknown>) => {
            const voidInvoices = voidInvoiceMap.get(o.order_no) || [];
            const existingInvoices = voidInvoices.length === 0 && o.not_fulfilled_at
                ? recycledInvoiceMap.get(o.order_no) || []
                : [];

            return {
                ...o,
                customer_code: customerMap.get(o.customer_code) || {
                    customer_code: o.customer_code,
                    customer_name: "Unknown Customer"
                },
                // Recycled order fields (legacy support + new array)
                existing_invoice_no: existingInvoices[0]?.invoice_id ?? null,
                existing_invoice_display_no: existingInvoices[0]?.invoice_no ?? null,
                existing_invoices: existingInvoices.map(inv => ({ id: inv.invoice_id, display_no: inv.invoice_no })),
                // Void invoice fields
                void_invoices: voidInvoices.map(inv => ({ id: inv.invoice_id, display_no: inv.invoice_no })),
            };
        });

        return NextResponse.json(enrichedOrders);
    } catch (err: unknown) {
        return NextResponse.json({ error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}


