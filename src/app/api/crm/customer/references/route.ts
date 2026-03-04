import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://100.110.197.61:8056";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const type = req.nextUrl.searchParams.get("type");

    if (!type) {
        return NextResponse.json({ error: "Reference type is required" }, { status: 400 });
    }

    try {
        let collection = "";
        switch (type) {
            case "store_type":
                collection = "store_type";
                break;
            case "discount_type":
                collection = "discount_type";
                break;
            default:
                return NextResponse.json({ error: "Invalid reference type" }, { status: 400 });
        }

        const token = process.env.DIRECTUS_STATIC_TOKEN;
        const res = await fetch(`${DIRECTUS_URL}/items/${collection}?limit=100`, {
            cache: "no-store",
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch ${type}: ${res.statusText}`);
        }

        const json = await res.json();
        return NextResponse.json({ data: json.data });
    } catch (e) {
        console.error(`Reference API error (${type}):`, e);
        return NextResponse.json(
            { error: `Failed to fetch ${type}`, message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}
