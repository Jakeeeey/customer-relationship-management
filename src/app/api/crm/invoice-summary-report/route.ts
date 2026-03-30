import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

// Define a type for the raw data coming from the Spring Boot backend
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
}

// Helper to safely get the Spring Boot base URL from environment variables
const getSpringBaseUrl = () => {
  const url = process.env.SPRING_API_BASE_URL;
  if (!url) {
    // A warning is useful for developers during local setup
    console.warn("⚠️ WARNING: SPRING_API_BASE_URL is not defined. Using http://localhost:8080 as a fallback.");
  }
  // Default to localhost and remove any trailing slash to prevent double slashes
  return (url || "http://localhost:8080").replace(/\/$/, "");
};

/**
 * BFF Route: Fetches the cancellation report data from the Spring Boot backend.
 * It handles authentication, pagination, and data transformation.
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("vos_access_token")?.value;

  // 1. Authentication: Ensure the user is logged in.
  if (!token) {
    return NextResponse.json({ message: "Unauthorized: Missing access token" }, { status: 401 });
  }

  // 2. Pagination: Get page and size from the incoming request.
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") || "0";
  const size = searchParams.get("size") || "10";

  // 3. Backend URL Construction: Build the target URL for the Spring service.
  const targetUrl = `${getSpringBaseUrl()}/api/defective-invoicing/reports?page=${page}&size=${size}`;

  try {
    // 4. Fetch from Backend: Make the authenticated call to the Spring Boot API.
    const springRes = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      cache: "no-store", // Ensure fresh data is fetched every time
    });

    // 5. Backend Error Handling: Check if the backend responded with an error.
    if (!springRes.ok) {
      const errorBody = await springRes.text();
      console.error("🔥 Spring Boot API Error:", errorBody);
      return NextResponse.json(
        { message: "Failed to fetch report data from the backend service", detail: errorBody },
        { status: springRes.status }
      );
    }

    // 6. Data Transformation: Map the backend's `camelCase` DTO to the frontend's expected format.
    const pageData = await springRes.json();

    // The actual data is typically in the 'content' property of a Spring Page object.
    const rawItems: RawReportItem[] = pageData.content || [];

    // Map fields to maintain consistency across the frontend application.
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
    }));

    // 7. Send Response: Return the transformed data along with pagination details.
    return NextResponse.json({
      content: formattedContent,
      totalElements: pageData.totalElements,
      totalPages: pageData.totalPages,
      number: pageData.number,
      size: pageData.size,
    });

  } catch (err: unknown) {
    // 8. Network/BFF Error Handling: Catch errors in the BFF itself.
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("🔥 BFF Network Error:", errorMessage);
    return NextResponse.json(
      { message: "An unexpected network error occurred in the BFF", detail: errorMessage },
      { status: 502 } // 502 Bad Gateway is appropriate for a proxy error
    );
  }
}
