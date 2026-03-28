import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

// Define a more specific type for the raw invoice data from the backend
interface RawInvoice {
  invoiceId?: string;
  invoice_id?: string;
  invoiceNo?: string;
  invoice_no?: string;
  customer?: { customerCode?: string };
  customerCode?: string;
  customer_code?: string;
  totalAmount?: number;
  total_amount?: number;
  transactionStatus?: string;
  transaction_status?: string;
  salesOrder?: { orderNo?: string };
  orderId?: string;
  order_id?: string;
  orderNo?: string;
  order_no?: string;
}

const getSpringBaseUrl = () => {
  const url = process.env.SPRING_API_BASE_URL;
  if (!url) {
    console.warn("⚠️ WARNING: SPRING_API_BASE_URL is undefined in .env.local!");
  }
  return (url || "http://localhost:8080").replace(/\/$/, "");
};

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vos_access_token")?.value;

  if (!token) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const targetUrl = `${getSpringBaseUrl()}/api/defective-invoicing/eligible?page=0&size=1000`;

  try {
    const springRes = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      cache: "no-store",
    });

    if (!springRes.ok) {
      const errText = await springRes.text();
      console.error("🔥 Spring Boot Error (Eligible):", errText);
      return NextResponse.json(
          { ok: false, message: "Failed to fetch eligible invoices from server", detail: errText },
          { status: springRes.status }
      );
    }

    const data = await springRes.json();

    // Spring Boot Page wraps lists in 'content'. Fallback to 'data' if it's a raw list.
    const rawInvoices = data.content || data || [];

    // 🚀 THE FIX: Map the Spring Boot payload to perfectly match the Next.js Data Table
    const formattedInvoices = rawInvoices.map((inv: RawInvoice) => ({
      invoice_id: inv.invoiceId || inv.invoice_id,
      invoice_no: inv.invoiceNo || inv.invoice_no || "N/A",
      customer_code: inv.customer?.customerCode || inv.customerCode || inv.customer_code || "N/A",
      total_amount: inv.totalAmount || inv.total_amount || 0,
      transaction_status: inv.transactionStatus || inv.transaction_status || "Unknown",
      order_id: inv.salesOrder?.orderNo || inv.orderId || inv.order_id || inv.orderNo || inv.order_no || "N/A",
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
    const targetUrl = `${getSpringBaseUrl()}/api/defective-invoicing/request`;

    // 🚀 THE FIX: Map the Next.js snake_case payload to Spring Boot's camelCase DTO
    const springPayload = {
      invoiceId: body.invoice_id || body.invoiceId,
      salesOrderId: body.sales_order_id || body.salesOrderId || body.order_id,
      reasonCode: body.reason_code || body.reasonCode,
      remarks: body.remarks || ""
    };

    const springRes = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(springPayload),
    });

    if (!springRes.ok) {
      const errText = await springRes.text();
      console.error("🔥 Spring Boot Error (Request):", errText);
      return NextResponse.json(
          { ok: false, message: "Failed to create request", detail: errText },
          { status: springRes.status }
      );
    }

    const data = await springRes.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("🔥 BFF Network Error (Request):", errorMessage);
    return NextResponse.json({ ok: false, message: "BFF Network Error", detail: errorMessage }, { status: 502 });
  }
}
