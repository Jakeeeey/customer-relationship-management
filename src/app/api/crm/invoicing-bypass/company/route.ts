import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function directusHeaders() {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    return h;
}

export async function GET() {
    try {
        const response = await fetch(`${DIRECTUS_BASE}/items/company/1?fields=company_code`, {
            headers: directusHeaders(),
            cache: 'no-store'
        });

        if (!response.ok) {
            return NextResponse.json({ error: "Failed to fetch company data" }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (err: unknown) {
        return NextResponse.json(
            { error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) }, 
            { status: 500 }
        );
    }
}
