import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        
        if (!id) {
            return NextResponse.json({ error: "No asset ID provided" }, { status: 400 });
        }

        const res = await fetch(`${DIRECTUS_URL}/assets/${id}`, {
            headers: {
                Authorization: `Bearer ${DIRECTUS_TOKEN}`
            }
        });

        if (!res.ok) {
            return NextResponse.json({ error: "Failed to fetch asset" }, { status: res.status });
        }

        const contentType = res.headers.get("content-type") || "application/octet-stream";
        
        const response = new NextResponse(res.body as unknown as BodyInit, {
            status: 200,
            headers: {
                "Content-Type": contentType,
            }
        });
        
        return response;

    } catch (error: unknown) {
        console.error("Asset proxy error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
