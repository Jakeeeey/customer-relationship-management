import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function directusHeaders() {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    return h;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search");

        let url = `${DIRECTUS_BASE}/items/suppliers?limit=50&fields=id,supplier_shortcut,supplier_name&filter[isActive][_eq]=1&filter[supplier_type][_eq]=TRADE`;
        
        if (search) {
            const searchTerm = encodeURIComponent(search);
            url += `&filter[_and][0][_or][0][supplier_shortcut][_icontains]=${searchTerm}&filter[_and][0][_or][1][supplier_name][_icontains]=${searchTerm}`;
        }
        
        const response = await fetch(url, {
            cache: "no-store",
            headers: directusHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: "Failed to fetch suppliers", details: errorText }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data.data || []);
    } catch (err: unknown) {
        return NextResponse.json({ error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
