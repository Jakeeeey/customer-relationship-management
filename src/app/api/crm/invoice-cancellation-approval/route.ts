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

interface DirectusCustomer {
  customer_code: string;
  customer_name: string;
}

interface DirectusInvoice {
  invoice_id: number;
  invoice_no: string;
  customer_code: string;
  total_amount: number;
}

interface RawRequest {
  request_id: number;
  invoice_id: number;
  sales_order_id: string;
  reason_code: string;
  remarks: string;
  status: string;
  date_approved: string | null;
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vos_access_token")?.value;

  if (!token) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch all cancellation requests first
    const requestRes = await fetch(`${DIRECTUS_BASE}/items/invoice_cancellation_requests?limit=1000`, {
      headers: directusHeaders(),
      cache: "no-store",
    });
    if (!requestRes.ok) throw new Error(`Cancellation requests fetch failed: ${await requestRes.text()}`);
    const requestData = await requestRes.json();
    const rawReports: RawRequest[] = requestData.data || [];

    // 2. Fetch only the sales invoices that are linked in the requests
    const invoiceIds = Array.from(new Set(rawReports.map((r) => Number(r.invoice_id)).filter(Boolean)));
    const invoiceMap = new Map<number, DirectusInvoice>();
    const customerCodes: string[] = [];

    if (invoiceIds.length > 0) {
      const invoiceRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice?filter[invoice_id][_in]=${invoiceIds.join(",")}&fields=invoice_id,invoice_no,total_amount,customer_code&limit=1000`, {
        headers: directusHeaders(),
        cache: "no-store",
      });
      if (!invoiceRes.ok) throw new Error(`Sales invoice fetch failed: ${await invoiceRes.text()}`);
      const invoiceData = await invoiceRes.json();
      const rawInvoices: DirectusInvoice[] = invoiceData.data || [];
      rawInvoices.forEach((i) => {
        invoiceMap.set(Number(i.invoice_id), i);
        if (i.customer_code) customerCodes.push(i.customer_code);
      });
    }

    // 3. Fetch only the customers that are linked to the fetched invoices
    const customerMap = new Map<string, string>();
    const uniqueCustomerCodes = Array.from(new Set(customerCodes));

    if (uniqueCustomerCodes.length > 0) {
      const customerRes = await fetch(`${DIRECTUS_BASE}/items/customer?filter[customer_code][_in]=${uniqueCustomerCodes.join(",")}&fields=customer_code,customer_name&limit=1000`, {
        headers: directusHeaders(),
        cache: "no-store",
      });
      if (!customerRes.ok) throw new Error(`Customer fetch failed: ${await customerRes.text()}`);
      const customerData = await customerRes.json();
      (customerData.data || []).forEach((c: DirectusCustomer) => {
        customerMap.set(c.customer_code, c.customer_name);
      });
    }

    // 4. Map and join in-memory
    const formattedReports = rawReports.map((req) => {
      const invoiceObj = invoiceMap.get(Number(req.invoice_id)) || {
        invoice_no: "N/A",
        customer_code: "N/A",
        total_amount: 0
      };

      return {
        id: req.request_id,
        invoice_id: req.invoice_id,
        sales_order_id: req.sales_order_id || "N/A",
        reason_code: req.reason_code || "N/A",
        remarks: req.remarks || "",
        status: req.status || "PENDING",
        date_approved: req.date_approved || null,
        invoice_no: invoiceObj.invoice_no || "N/A",
        customer_code: invoiceObj.customer_code || "N/A",
        customer_name: customerMap.get(invoiceObj.customer_code) || "Unknown Customer",
        total_amount: invoiceObj.total_amount || 0,
      };
    });

    const pendingCount = formattedReports.filter((r) => r.status === "PENDING").length;

    return NextResponse.json({ data: formattedReports, count: pendingCount });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("🔥 BFF Network Error (Reports):", errorMessage);
    return NextResponse.json({ ok: false, message: "BFF Network Error", detail: errorMessage }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("vos_access_token")?.value;

  if (!token) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, updates } = body;

    if (!action || !updates || !Array.isArray(updates)) {
      return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 });
    }

    const results = [];
    const now = new Date().toISOString();

    for (const update of updates) {
      const requestId = update.requestId || update.id;
      const auditorId = update.auditorId || 1;

      try {
        // 1. Fetch details of the request
        const requestDetailRes = await fetch(`${DIRECTUS_BASE}/items/invoice_cancellation_requests/${requestId}?fields=invoice_id,sales_order_id`, {
          headers: directusHeaders(),
          cache: "no-store"
        });
        if (!requestDetailRes.ok) throw new Error(`Failed to fetch cancellation request detail: ${await requestDetailRes.text()}`);
        const requestDetail = await requestDetailRes.json();
        const { invoice_id, sales_order_id } = requestDetail.data || {};

        if (action === "APPROVE") {
          // A. Update cancellation request status
          const requestPatchRes = await fetch(`${DIRECTUS_BASE}/items/invoice_cancellation_requests/${requestId}`, {
            method: "PATCH",
            headers: directusHeaders(),
            body: JSON.stringify({
              status: "APPROVED",
              approved_by: auditorId,
              date_approved: now,
              action_date: now
            })
          });
          if (!requestPatchRes.ok) throw new Error(`Failed to approve request: ${await requestPatchRes.text()}`);

          // B. Void the sales invoice
          if (invoice_id) {
            const invoicePatchRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice/${invoice_id}`, {
              method: "PATCH",
              headers: directusHeaders(),
              body: JSON.stringify({
                transaction_status: "VOID"
              })
            });
            if (!invoicePatchRes.ok) throw new Error(`Failed to void invoice: ${await invoicePatchRes.text()}`);
          }

          // C. Reset sales order status to "For Invoicing"
          if (sales_order_id) {
            const orderQueryRes = await fetch(`${DIRECTUS_BASE}/items/sales_order?filter[order_no][_eq]=${sales_order_id}&fields=order_id`, {
              headers: directusHeaders(),
              cache: "no-store"
            });
            if (orderQueryRes.ok) {
              const orderData = await orderQueryRes.json();
              if (orderData.data && orderData.data.length > 0) {
                const orderId = orderData.data[0].order_id;
                const orderPatchRes = await fetch(`${DIRECTUS_BASE}/items/sales_order/${orderId}`, {
                  method: "PATCH",
                  headers: directusHeaders(),
                  body: JSON.stringify({
                    order_status: "For Invoicing"
                  })
                });
                if (!orderPatchRes.ok) console.warn(`Failed to reset sales order status: ${await orderPatchRes.text()}`);
              }
            }
          }

        } else if (action === "REJECT") {
          // Update request status to REJECTED
          const requestPatchRes = await fetch(`${DIRECTUS_BASE}/items/invoice_cancellation_requests/${requestId}`, {
            method: "PATCH",
            headers: directusHeaders(),
            body: JSON.stringify({
              status: "REJECTED",
              approved_by: auditorId,
              action_date: now,
              rejection_reason: update.rejectionReason || "Rejected via Audit UI"
            })
          });
          if (!requestPatchRes.ok) throw new Error(`Failed to reject request: ${await requestPatchRes.text()}`);
        }

        results.push({ id: requestId, status: "success" });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`🔥 Directus Batch Error Action (${action}) on Request ID ${requestId}:`, errorMessage);
        results.push({ id: requestId, status: "failed", error: errorMessage });
      }
    }

    const hasFailures = results.some(r => r.status === "failed");
    if (hasFailures) {
      return NextResponse.json({ ok: false, message: "Some requests failed", results }, { status: 207 });
    }

    return NextResponse.json({ ok: true, message: "Batch processed successfully" });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("🔥 BFF Network Error (Action):", errorMessage);
    return NextResponse.json({ ok: false, message: "BFF Network Error", detail: errorMessage }, { status: 502 });
  }
}
