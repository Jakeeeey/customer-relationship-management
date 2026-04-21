import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const COLLECTIONS = {
    CUSTOMER: "customer",
};

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    const { searchParams } = new URL(req.url);
    
    // Support either legacy "code" or new "field" + "value"
    const field = searchParams.get("field") || "customer_code";
    const value = searchParams.get("value") || searchParams.get("code");

    if (!value) {
        return NextResponse.json({ error: "Value is required" }, { status: 400 });
    }

    try {
        // Build Directus filter for exact or case-insensitive match
        // Using _ieq (case-insensitive) for better uniqueness checking
        const filter = encodeURIComponent(JSON.stringify({
            [field]: {
                _eq: value
            }
        }));

        const url = `${DIRECTUS_URL}/items/${COLLECTIONS.CUSTOMER}?filter=${filter}&limit=1&fields=id`;
        
        const res = await fetch(url, {
            cache: "no-store",
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!res.ok) {
            throw new Error(`Directus error: ${res.statusText}`);
        }

        const json = await res.json();
        const exists = json.data && json.data.length > 0;

        return NextResponse.json({ exists, field, value });
    } catch (e) {
        console.error("Check existence API error:", e);
        return NextResponse.json(
            { error: "Failed to check existence", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}
