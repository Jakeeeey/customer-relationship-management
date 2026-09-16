import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            if (res.ok) return res;
        } catch (err) {
            if (i === retries - 1) throw err;
        }
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
    throw new Error("Fetch failed after retries");
}

function decodeUserIdFromJwt(token: string): number | null {
	try {
		const parts = token.split(".");
		if (parts.length < 2) return null;
		const payloadPart = parts[1];
		const pad = "=".repeat((4 - (payloadPart.length % 4)) % 4);
		const b64 = (payloadPart + pad).replace(/-/g, "+").replace(/_/g, "/");
		const jsonStr = Buffer.from(b64, "base64").toString("utf8");
		const payload = JSON.parse(jsonStr);
		const userId = Number(payload.sub);
		return Number.isFinite(userId) ? userId : null;
	} catch {
		return null;
	}
}

async function getCurrentUserId(): Promise<number | null> {
	const cookieStore = await cookies();
	const token = cookieStore.get("vos_access_token")?.value;
	if (!token) return null;
	return decodeUserIdFromJwt(token);
}

interface DirectusDetail {
    product_id?: number;
    [key: string]: unknown;
}

interface DirectusProduct {
    product_id: number;
    product_name: string;
}

interface DirectusOrder {
    order_id: number;
    order_no: string;
    order_status: string;
    not_fulfilled_at: string;
}

interface DirectusInvoice {
    invoice_id: number;
    order_id: string;
    invoice_no: string;
    transaction_status: string;
    invoice_date: string;
    total_amount: number;
    customer_code: string;
}

interface DirectusCustomer {
    customer_code: string;
    customer_name: string;
}

interface PendingRequestItem {
    invoice_id: number;
}

export async function GET(req: NextRequest) {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
        const { searchParams } = new URL(req.url);
        const invoiceId = searchParams.get("invoiceId");

        // If fetching details for a specific invoice
        if (invoiceId) {
            const detailsUrl = `${DIRECTUS_URL}/items/sales_invoice_details?filter[invoice_no][_eq]=${invoiceId}`;
            const detailsRes = await fetchWithRetry(detailsUrl, { headers, cache: "no-store" });
            const detailsJson = await detailsRes.json();
            const details: DirectusDetail[] = detailsJson.data || [];

            const productIds = Array.from(new Set(details.map((d) => d.product_id).filter(Boolean))) as number[];
            const productMap: Record<number, string> = {};
            if (productIds.length > 0) {
                try {
                    const prodUrl = `${DIRECTUS_URL}/items/products?filter[product_id][_in]=${productIds.join(',')}&fields=product_id,product_name`;
                    const prodRes = await fetchWithRetry(prodUrl, { headers, cache: "no-store" });
                    const prodJson = await prodRes.json();
                    const products: DirectusProduct[] = prodJson.data || [];
                    products.forEach((p) => {
                        productMap[p.product_id] = p.product_name;
                    });
                } catch {
                    // Ignore error if fetching products fails
                }
            }

            const enrichedDetails = details.map((d) => ({
                ...d,
                product_name: d.product_id ? productMap[d.product_id] || null : null
            }));

            return NextResponse.json({ data: enrichedDetails });
        }

        // Fetch sales orders: order_status == For Invoicing and not_fulfilled_at is not null
        const ordersUrl = `${DIRECTUS_URL}/items/sales_order?filter[order_status][_eq]=For Invoicing&filter[not_fulfilled_at][_nnull]=true&fields=order_id,order_no,not_fulfilled_at,order_status`;
        const ordersRes = await fetchWithRetry(ordersUrl, { headers, cache: "no-store" });
        const ordersJson = await ordersRes.json();
        const orders: DirectusOrder[] = ordersJson.data || [];

        if (orders.length === 0) {
            return NextResponse.json({ data: [] });
        }

        const orderNos = orders.map((o) => o.order_no);

        // Fetch sales invoices linked to these orders
        const invoicesUrl = `${DIRECTUS_URL}/items/sales_invoice?filter[order_id][_in]=${orderNos.join(',')}&filter[transaction_status][_in]=Not Delivered,Not Fulfilled&fields=invoice_id,order_id,invoice_no,transaction_status,invoice_date,total_amount,customer_code`;
        const invoicesRes = await fetchWithRetry(invoicesUrl, { headers, cache: "no-store" });
        const invoicesJson = await invoicesRes.json();
        const invoices: DirectusInvoice[] = invoicesJson.data || [];

        // Fetch customer names
        const customerCodes = Array.from(new Set(invoices.map((i) => i.customer_code).filter(Boolean)));
        const customerMap: Record<string, string> = {};
        if (customerCodes.length > 0) {
            const custUrl = `${DIRECTUS_URL}/items/customer?filter[customer_code][_in]=${customerCodes.join(',')}&fields=customer_code,customer_name`;
            try {
                const custRes = await fetchWithRetry(custUrl, { headers, cache: "no-store" });
                const custJson = await custRes.json();
                const customers: DirectusCustomer[] = custJson.data || [];
                customers.forEach((c) => {
                    if (c.customer_code && c.customer_name) {
                        customerMap[c.customer_code] = c.customer_name;
                    }
                });
            } catch {
                // fallback to ignoring if customer fetch fails
            }
        }

        // Fetch existing pending requests so we can disable the button if already requested
        const requestsUrl = `${DIRECTUS_URL}/items/normalize_recycled_invoice_requests?filter[status][_eq]=Pending`;
        let pendingRequests: PendingRequestItem[] = [];
        try {
            const reqsRes = await fetchWithRetry(requestsUrl, { headers, cache: "no-store" });
            const reqsJson = await reqsRes.json();
            pendingRequests = reqsJson.data || [];
        } catch {
            // Ignore if collection doesn't exist yet
        }
        
        const pendingInvoiceIds = new Set(pendingRequests.map(r => r.invoice_id));

        const enrichedInvoices = invoices.map((inv) => {
            const order = orders.find((o) => o.order_no === inv.order_id);
            return {
                ...inv,
                sales_order_id: order?.order_id,      // numeric PK for FK
                order_status: order?.order_status,
                not_fulfilled_at: order?.not_fulfilled_at,
                is_pending_request: pendingInvoiceIds.has(inv.invoice_id),
                customer_name: customerMap[inv.customer_code] || inv.customer_code || "Unknown Customer"
            };
        });

        return NextResponse.json({ data: enrichedInvoices });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    try {
        const body = await req.json();
        const { invoice_id, invoice_no, order_id, remarks } = body;
        const userId = await getCurrentUserId();

        if (!invoice_id) {
            return NextResponse.json({ error: "invoice_id is required" }, { status: 400 });
        }
        if (!invoice_no || !order_id) {
            return NextResponse.json({ error: "invoice_no and order_id are required" }, { status: 400 });
        }

        // Get exact PH Time (UTC+8) literal in YYYY-MM-DD HH:mm:ss format
        const utcNow = new Date();
        const phTime = new Date(utcNow.getTime() + (8 * 60 * 60 * 1000));
        const phLiteral = `${phTime.getUTCFullYear()}-${String(phTime.getUTCMonth() + 1).padStart(2, '0')}-${String(phTime.getUTCDate()).padStart(2, '0')} ${String(phTime.getUTCHours()).padStart(2, '0')}:${String(phTime.getUTCMinutes()).padStart(2, '0')}:${String(phTime.getUTCSeconds()).padStart(2, '0')}`;

        const payload = {
            invoice_id,
            invoice_no,
            order_id,
            requested_by: userId,
            requested_date: phLiteral,
            status: "Pending",
            remarks: remarks || ""
        };

        const createRes = await fetchWithRetry(`${DIRECTUS_URL}/items/normalize_recycled_invoice_requests`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        });

        if (!createRes.ok) {
            const errText = await createRes.text();
            throw new Error(`Failed to create request: ${errText}`);
        }

        const json = await createRes.json();
        return NextResponse.json({ data: json.data });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
