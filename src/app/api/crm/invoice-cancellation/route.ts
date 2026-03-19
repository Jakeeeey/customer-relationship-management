import { InvoiceService } from "@/modules/invoice-management/invoice-cancellation/services/invoice-service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Phase A: Discovery - Fetch invoices eligible for cancellation
    const data = await InvoiceService.getInvoicesForCancellation();
    console.log("📦 API Route sending data to frontend:", data.length);
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("GET Invoice Cancellation Error:", error);
    console.error("🔥 API Route Crash:", error.message);
    return NextResponse.json(
      { message: "Failed to fetch invoices", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Basic validation before passing to service
    if (!body.invoice_id || !body.reason_code) {
      return NextResponse.json(
        { message: "Missing required fields: invoice_id or reason_code" },
        { status: 400 }
      );
    }

    // Phase A: Submission - Create request and lock invoice status
    const result = await InvoiceService.requestCancellation(body);

    return NextResponse.json(
      { message: "Cancellation request submitted successfully", data: result },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST Invoice Cancellation Error:", error);
    return NextResponse.json(
      { message: "Failed to submit request", error: error.message },
      { status: 500 }
    );
  }
}
