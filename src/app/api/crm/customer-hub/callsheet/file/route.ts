import { NextRequest, NextResponse } from "next/server";

// ── Custom file server (JPGs, photos) ────────────────────────
const FILE_SERVER_BASE =
    process.env.FILE_SERVER_URL ??
    process.env.NEXT_PUBLIC_FILE_SERVER_URL ??
    "http://goatedcodoer:7002";

// ── Directus (PDFs and other Directus-managed files) ─────────
const DIRECTUS_URL = process.env.DIRECTUS_URL ?? "http://goatedcodoer:8056";
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN ?? "";

export const dynamic = "force-dynamic";

/**
 * GET /api/crm/customer-hub/callsheet/file?id={uuid}&filename={name}
 *
 * Strategy:
 * 1. Try the custom file server first (port 7002) — used for JPG attachments
 * 2. If it returns empty body, fall back to Directus /assets/ — used for PDFs
 *
 * Always overrides Content-Type based on filename extension because the
 * custom file server sends "application/octet-stream" for every file.
 * Always sets Content-Disposition: inline so the browser renders in-place.
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
        // ── Step 1: Try the custom file server ────────────────
        const customRes = await fetch(`${FILE_SERVER_BASE}/files/${id}`, {
            cache: "no-store",
        });

        if (customRes.ok) {
            const buffer = await customRes.arrayBuffer();
            // The custom server returns 200 with empty body for unknown IDs
            if (buffer.byteLength > 0) {
                return new NextResponse(buffer, {
                    status: 200,
                    headers: {
                        "Content-Type": contentType,
                        "Content-Disposition": `inline; filename="${filename}"`,
                        "X-Frame-Options": "SAMEORIGIN",
                    },
                });
            }
        }

        // ── Step 2: Fall back to Directus /assets/ ────────────
        // PDFs and other Directus-managed files live here
        const directusUrl = `${DIRECTUS_URL}/assets/${id}`;
        const directusRes = await fetch(directusUrl, {
            cache: "no-store",
            headers: DIRECTUS_TOKEN ? { Authorization: `Bearer ${DIRECTUS_TOKEN}` } : {},
        });

        if (!directusRes.ok) {
            console.error(`File not found on either server. custom=empty, directus=${directusRes.status}`);
            return NextResponse.json(
                { error: "File not found", status: directusRes.status },
                { status: 404 }
            );
        }

        const buffer = await directusRes.arrayBuffer();
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `inline; filename="${filename}"`,
                "X-Frame-Options": "SAMEORIGIN",
            },
        });

    } catch (e) {
        console.error("File proxy error:", e);
        return NextResponse.json(
            { error: "Failed to fetch file", message: e instanceof Error ? e.message : "Unknown" },
            { status: 500 }
        );
    }
}
