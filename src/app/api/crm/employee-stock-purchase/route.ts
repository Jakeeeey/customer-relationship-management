import { NextRequest, NextResponse } from "next/server";
import { fetchAllEmployeeStockPurchases, createEmployeeStockPurchase } from "@/modules/customer-relationship-management/employee-stock-purchase/creation/services/employee-stock-purchase";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function decodeUserIdFromJwt(token: string): number | null {
	try {
		const parts = token.split(".");
		if (parts.length < 2) return null;

		const payloadPart = parts[1];
		const pad = "=".repeat((4 - (payloadPart.length % 4)) % 4);
		const b64 = (payloadPart + pad).replace(/-/g, "+").replace(/_/g, "/");
		const jsonStr = Buffer.from(b64, "base64").toString("utf8");
		const payload = JSON.parse(jsonStr);
		const userId = Number(payload.sub);
		return Number.isFinite(userId) ? userId : null;
	} catch {
		return null;
	}
}

async function getCurrentUserId(): Promise<number | null> {
	const cookieStore = await cookies();
	const token = cookieStore.get("vos_access_token")?.value;
	if (!token) return null;
	return decodeUserIdFromJwt(token);
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const pageSize = parseInt(searchParams.get("pageSize") || "10");
        const searchQuery = searchParams.get("q") || "";

        const result = await fetchAllEmployeeStockPurchases(page, pageSize, searchQuery);
        
        return NextResponse.json({
            purchases: result.data,
            metadata: {
                total_count: Number(result.meta?.filter_count ?? result.meta?.total_count ?? 0),
                page,
                pageSize,
                lastUpdated: new Date().toISOString(),
            },
        });
    } catch (e) {
        console.error("Employee Stock Purchase GET error:", e);
        return NextResponse.json(
            { error: "Failed to fetch employee stock purchases", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const userId = await getCurrentUserId();

        const createdRecord = await createEmployeeStockPurchase(body, userId || undefined);
        return NextResponse.json(createdRecord, { status: 201 });
    } catch (e) {
        console.error("Employee Stock Purchase POST error:", e);
        return NextResponse.json(
            { error: "Failed to create employee stock purchase", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}
