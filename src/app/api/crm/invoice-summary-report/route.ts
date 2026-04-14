import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

// 🚀 FIX: Added approverName to the interface
interface RawReportItem {
  requestId: number;
  invoiceId: number;
  salesOrderId: string;
  reasonCode: string;
  remarks: string;
  status: string;
  dateApproved?: string;
  invoiceNo: string;
  totalAmount: number;
  customerCode: string;
  approverName?: string;
}

const getSpringBaseUrl = () => {
  const url = process.env.SPRING_API_BASE_URL;
  if (!url) {
    console.warn("⚠️ WARNING: SPRING_API_BASE_URL is not defined. Using http://localhost:8080 as a fallback.");
  }
  return (url || "http://localhost:8080").replace(/\/$/, "");
};

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("vos_access_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized: Missing access token" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") || "0";
  const size = searchParams.get("size") || "10";

  const targetUrl = `${getSpringBaseUrl()}/api/defective-invoicing/reports?page=${page}&size=${size}`;

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
      const errorBody = await springRes.text();
      console.error("🔥 Spring Boot API Error:", errorBody);
      return NextResponse.json(
          { message: "Failed to fetch report data from the backend service", detail: errorBody },
          { status: springRes.status }
      );
    }

    const pageData = await springRes.json();
    const rawItems: RawReportItem[] = pageData.content || [];

    const formattedContent = rawItems.map((item) => ({
      request_id: item.requestId,
      invoice_id: item.invoiceId,
      sales_order_id: item.salesOrderId,
      reason_code: item.reasonCode,
      remarks: item.remarks,
      status: item.status,
      date_approved: item.dateApproved,
      invoice_no: item.invoiceNo,
      total_amount: item.totalAmount,
      customer_code: item.customerCode,
      approver_name: item.approverName || null, // 🚀 FIX: Map it here!
    }));

    return NextResponse.json({
      content: formattedContent,
      totalElements: pageData.totalElements,
      totalPages: pageData.totalPages,
      number: pageData.number,
      size: pageData.size,
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("🔥 BFF Network Error:", errorMessage);
    return NextResponse.json(
        { message: "An unexpected network error occurred in the BFF", detail: errorMessage },
        { status: 502 }
    );
  }
}