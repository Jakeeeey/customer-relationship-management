import { NextRequest, NextResponse } from "next/server";

const FILE_SERVER_BASE =
    process.env.FILE_SERVER_URL ??
    process.env.NEXT_PUBLIC_FILE_SERVER_URL ??
    "http://goatedcodoer:7002";


export const dynamic = "force-dynamic";

/**
 * GET /api/crm/customer-hub/callsheet/file?id={file_id}
 *
 * Proxies the file from the external file server and forces
 * Content-Disposition: inline so the browser renders it (PDF viewer)
 * instead of downloading it. This also bypasses X-Frame-Options / CSP
 * restrictions since the iframe now loads from our own origin.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const filename = searchParams.get("filename") || id || "file";

    if (!id) {
        return NextResponse.json({ error: "File ID is required" }, { status: 400 });
    }

    try {
        const upstream = await fetch(`${FILE_SERVER_BASE}/files/${id}`, {
            cache: "no-store",
        });

        if (!upstream.ok) {
            return NextResponse.json(
                { error: "File not found on file server" },
                { status: upstream.status }
            );
        }

        const contentType =
            upstream.headers.get("content-type") || "application/octet-stream";
        const buffer = await upstream.arrayBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                // "inline" forces the browser to display the file, not download it
                "Content-Disposition": `inline; filename="${filename}"`,
                // Allow this response to be embedded in an iframe from our own origin
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
