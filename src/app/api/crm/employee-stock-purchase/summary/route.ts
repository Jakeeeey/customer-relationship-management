import { NextRequest, NextResponse } from "next/server";
import { fetchEmployeeStockPurchaseSummary, SummaryFilters } from "@/modules/customer-relationship-management/employee-stock-purchase/summary/services/employee-stock-purchase-summary";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const filters: SummaryFilters = {
            date_from: searchParams.get("date_from") || undefined,
            date_to: searchParams.get("date_to") || undefined,
            company_id: searchParams.get("company_id") ? Number(searchParams.get("company_id")) : undefined,
            user_id: searchParams.get("user_id") ? Number(searchParams.get("user_id")) : undefined,
        };

        const summary = await fetchEmployeeStockPurchaseSummary(filters);
        return NextResponse.json(summary);
    } catch (e) {
        console.error("Employee Stock Purchase Summary GET error:", e);
        return NextResponse.json(
            { error: "Failed to fetch employee stock purchase summary", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}
