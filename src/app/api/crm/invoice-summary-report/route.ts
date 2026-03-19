import { InvoiceService } from "@/modules/invoice-management/invoice-cancellation/services/invoice-service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await InvoiceService.getReportViewData();
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Failed to fetch report view", error: error.message },
      { status: 500 },
    );
  }
}
