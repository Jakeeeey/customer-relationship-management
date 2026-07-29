import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/crm/upload/asset?id=<directus-uuid>
 *
 * Proxies a Directus asset request with the server-side static token,
 * solving the broken-image issue caused by unauthenticated <img> src tags.
 */
export async function GET(req: NextRequest) {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    const directusUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8055";

    const { searchParams } = req.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "Missing asset ID" }, { status: 400 });
    }

    if (!token) {
        return NextResponse.json({ error: "Missing server token" }, { status: 500 });
    }

    try {
        const assetRes = await fetch(`${directusUrl}/assets/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            // Forward cache hints so repeated loads stay fast
            next: { revalidate: 3600 },
        });

        if (!assetRes.ok) {
            return NextResponse.json(
                { error: "Asset not found", status: assetRes.status },
                { status: assetRes.status }
            );
        }

        const contentType = assetRes.headers.get("content-type") || "image/jpeg";
        const buffer = await assetRes.arrayBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
            },
        });
    } catch (e) {
        console.error("Asset Proxy Error:", e);
        return NextResponse.json(
            { error: "Failed to fetch asset", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}
