import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get("url");

    if (!imageUrl) {
        return new NextResponse("Missing url parameter", { status: 400 });
    }

    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
        }

        const buffer = await response.arrayBuffer();
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
                "Cache-Control": "public, max-age=31536000, immutable"
            }
        });
    } catch (err) {
        return new NextResponse(String(err), { status: 500 });
    }
}
