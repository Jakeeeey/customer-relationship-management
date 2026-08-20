import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function directusHeaders() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

interface DirectusInvoice {
  invoice_id: number;
  invoice_no: string;
  customer_code: string;
  total_amount: number;
  transaction_status: string;
  order_id: string;
}

interface DirectusCustomer {
  customer_code: string;
  customer_name: string;
}

interface DirectusRequest {
  invoice_id: number;
  status: string;
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vos_access_token")?.value;

  if (!token) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch all pending cancellation requests
    const requestRes = await fetch(`${DIRECTUS_BASE}/items/invoice_cancellation_requests?filter[status][_eq]=PENDING&fields=invoice_id&limit=1000`, {
      headers: directusHeaders(),
      cache: "no-store",
    });
    if (!requestRes.ok) throw new Error(`Cancellation requests fetch failed: ${await requestRes.text()}`);
    const requestData = await requestRes.json();
    const pendingInvoiceIds = new Set<number>(
      (requestData.data || []).map((r: DirectusRequest) => Number(r.invoice_id))
    );

    // 2. Fetch active invoices (transaction_status is Prepared)
    const invoiceRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice?filter[transaction_status][_eq]=Prepared&fields=invoice_id,invoice_no,total_amount,transaction_status,order_id,customer_code&limit=1000`, {
      headers: directusHeaders(),
      cache: "no-store",
    });
    if (!invoiceRes.ok) throw new Error(`Sales invoice fetch failed: ${await invoiceRes.text()}`);
    const invoiceData = await invoiceRes.json();
    const rawInvoices: DirectusInvoice[] = invoiceData.data || [];

    // 3. Filter in-memory: exclude invoices with pending cancellation requests
    const eligibleInvoices = rawInvoices.filter((inv) => !pendingInvoiceIds.has(Number(inv.invoice_id)));

    // 4. Fetch customer details only for the eligible invoices
    const customerMap = new Map<string, string>();
    const customerCodes = Array.from(new Set(eligibleInvoices.map((inv) => inv.customer_code).filter(Boolean)));

    if (customerCodes.length > 0) {
      const customerRes = await fetch(`${DIRECTUS_BASE}/items/customer?filter[customer_code][_in]=${customerCodes.join(",")}&fields=customer_code,customer_name&limit=1000`, {
        headers: directusHeaders(),
        cache: "no-store",
      });
      if (!customerRes.ok) throw new Error(`Customer fetch failed: ${await customerRes.text()}`);
      const customerData = await customerRes.json();
      (customerData.data || []).forEach((c: DirectusCustomer) => {
        customerMap.set(c.customer_code, c.customer_name);
      });
    }

    // 5. Map fields for Data Table
    const formattedInvoices = eligibleInvoices.map((inv) => ({
      invoice_id: inv.invoice_id,
      invoice_no: inv.invoice_no || "N/A",
      customer_code: inv.customer_code || "N/A",
      customer_name: customerMap.get(inv.customer_code) || "Unknown Customer",
      total_amount: inv.total_amount || 0,
      transaction_status: inv.transaction_status || "Prepared",
      order_id: inv.order_id || "N/A",
    }));

    return NextResponse.json(formattedInvoices);

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("🔥 BFF Network Error (Eligible):", errorMessage);
    return NextResponse.json({ ok: false, message: "BFF Network Error", detail: errorMessage }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("vos_access_token")?.value;

  if (!token) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Decode requested_by ID from JWT token
    let requested_by = 1; // Default fallback
    if (token) {
      try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8')) as { sub: string };
        if (decoded && decoded.sub) {
          requested_by = parseInt(decoded.sub) || 1;
        }
      } catch (e) {
        console.warn("Failed to decode token for requested_by mapping:", e);
      }
    }

    const payload = {
      invoice_id: Number(body.invoice_id || body.invoiceId),
      sales_order_id: String(body.sales_order_id || body.salesOrderId || body.order_id),
      reason_code: String(body.reason_code || body.reasonCode),
      remarks: String(body.remarks || ""),
      status: "PENDING",
      requested_by: requested_by,
      created_at: new Date().toISOString()
    };

    const directusRes = await fetch(`${DIRECTUS_BASE}/items/invoice_cancellation_requests`, {
      method: "POST",
      headers: directusHeaders(),
      body: JSON.stringify(payload),
    });

    if (!directusRes.ok) {
      const errText = await directusRes.text();
      console.error("🔥 Directus Error (Create Request):", errText);
      return NextResponse.json(
        { ok: false, message: "Failed to create cancellation request", detail: errText },
        { status: directusRes.status }
      );
    }

    const data = await directusRes.json();
    return NextResponse.json({ ok: true, data: data.data });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("🔥 BFF Network Error (Create Request):", errorMessage);
    return NextResponse.json({ ok: false, message: "BFF Network Error", detail: errorMessage }, { status: 502 });
  }
}
