import { NextResponse } from "next/server";
import { syncEmployeeStockPurchases } from "@/modules/customer-relationship-management/employee-stock-purchase/creation/services/employee-stock-purchase";

export const dynamic = "force-dynamic";

export async function POST() {
    try {
        const result = await syncEmployeeStockPurchases();
        return NextResponse.json(result, { status: 200 });
    } catch (e) {
        console.error("Employee Stock Purchase Sync error:", e);
        return NextResponse.json(
            { error: "Failed to sync employee stock purchases", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}
