import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getDirectusBase } from "../../../../traceability-compliance/directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const DIRECTUS_URL = getDirectusBase();
        const incomingUrl = new URL(req.url);
        const targetUrl = `${DIRECTUS_URL}/items/physical_inventory_details${incomingUrl.search}`;
        const data = await directusFetch(targetUrl);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
