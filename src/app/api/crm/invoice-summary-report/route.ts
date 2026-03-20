import { InvoiceService } from "@/modules/customer-relationship-management/invoice-cancellation/services/invoice-service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await InvoiceService.getReportViewData();
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to fetch report view", error: errorMessage },
      { status: 500 },
    );
  }
}
