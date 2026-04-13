import { NextRequest, NextResponse } from "next/server";

// ── Directus (All files and images now live here) ─────────
const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN ?? "";

export const dynamic = "force-dynamic";

/**
 * GET /api/crm/customer-hub/callsheet/file?id={uuid}&filename={name}
 *
 * Strategy:
 * All images and files are now stored in Directus assets (port 8056).
 * This endpoint proxies the request to ensure proper MIME types and 
 * avoid Cross-Origin/X-Frame issues during preview.
 */

const MIME_MAP: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
};

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const filename = searchParams.get("filename") || id || "file";

    if (!id) {
        return NextResponse.json({ error: "File ID is required" }, { status: 400 });
    }

    const ext = (filename.split(".").pop() ?? "").toLowerCase();
    const contentType = MIME_MAP[ext] ?? "application/octet-stream";

    try {
        // Directus /assets/ stores everything now
        const directusUrl = `${DIRECTUS_URL}/assets/${id}`;
        
        const directusRes = await fetch(directusUrl, {
            cache: "no-store",
            headers: DIRECTUS_TOKEN ? { Authorization: `Bearer ${DIRECTUS_TOKEN}` } : {},
        });

        if (!directusRes.ok) {
            console.error(`File not found in Directus. status=${directusRes.status}`);
            return NextResponse.json(
                { error: "File not found in Directus assets", status: directusRes.status },
                { status: 404 }
            );
        }

        const buffer = await directusRes.arrayBuffer();
        
        const isDownload = searchParams.get("download") === "true";
        
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${filename}"`,
                "X-Frame-Options": "SAMEORIGIN",
            },
        });
    } catch (e) {
        console.error("File proxy error:", e);
        return NextResponse.json(
            { error: "Failed to fetch file from Directus", message: e instanceof Error ? e.message : "Unknown" },
            { status: 500 }
        );
    }
}
