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
        const isRaw = searchParams.get("raw") === "true";
        const isDownload = searchParams.get("download") === "true";

        // Serve interactive UI if not downloading or requesting raw binary, and it's an image
        if (!isRaw && !isDownload && contentType.startsWith("image/")) {
            let relatedFiles = [{ file_id: id, attachment_name: filename }];
            try {
                // Discover parent order logically for Next/Previous functionality
                const attachRes = await fetch(`${DIRECTUS_URL}/items/sales_order_attachment?filter[file_id][_eq]=${id}&fields=sales_order_no,sales_order_id&limit=1`, {
                    headers: DIRECTUS_TOKEN ? { Authorization: `Bearer ${DIRECTUS_TOKEN}` } : {}
                });
                const attachData = (await attachRes.json()).data;
                if (attachData && attachData.length > 0) {
                    const { sales_order_no, sales_order_id } = attachData[0];
                    let filter = "";
                    if (sales_order_id) filter = `filter[sales_order_id][_eq]=${sales_order_id}`;
                    else if (sales_order_no) filter = `filter[sales_order_no][_eq]=${encodeURIComponent(sales_order_no)}`;
                    
                    if (filter) {
                        const groupRes = await fetch(`${DIRECTUS_URL}/items/sales_order_attachment?${filter}&fields=file_id,attachment_name&limit=-1`, {
                            headers: DIRECTUS_TOKEN ? { Authorization: `Bearer ${DIRECTUS_TOKEN}` } : {}
                        });
                        const groupData = (await groupRes.json()).data;
                        if (groupData && groupData.length > 0) relatedFiles = groupData;
                    }
                }
            } catch (e) {
                console.error("Failed to fetch related attachments for viewer", e);
            }

            const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Document Viewer - ${filename}</title>
                <style>
                    body { margin: 0; padding: 0; background-color: #020617; color: white; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; overflow: hidden; display: flex; flex-direction: column; height: 100vh; }
                    .header { padding: 1rem 1.5rem; background: rgba(2, 6, 23, 0.85); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); z-index: 20;}
                    .title { font-weight: 700; font-size: 15px; letter-spacing: 0.025em; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; max-width: 400px; color: #f8fafc; }
                    .controls { display: flex; gap: 10px; align-items: center; }
                    button { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #f8fafc; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); outline: none;}
                    button:hover:not(:disabled) { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); transform: translateY(-1px); }
                    button:active:not(:disabled) { transform: translateY(0px); }
                    button:disabled { opacity: 0.3; cursor: not-allowed; }
                    .main { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; padding: 1rem; background: radial-gradient(circle at center, #0f172a 0%, #020617 100%);}
                    
                    /* Wrapper centers the image and provides the rotation axis */
                    .img-wrapper { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                    
                    /* Inner image container handles the constraints depending on rotation */
                    img { max-width: 90vw; max-height: 80vh; object-fit: contain; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); background: #000; }
                    
                    .nav-btn { position: absolute; top: 50%; transform: translateY(-50%); width: 44px; height: 44px; border-radius: 50%; padding: 0; font-size: 18px; z-index: 10; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(4px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.5);}
                    .nav-btn:hover:not(:disabled) { background: rgba(30, 41, 59, 0.9); transform: translateY(-50%) scale(1.05); }
                    .prev { left: 1.5rem; }
                    .next { right: 1.5rem; }
                    .counter { font-size: 12px; font-weight: 700; color: #94a3b8; padding: 0 16px; font-variant-numeric: tabular-nums; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title" id="titleEl">${filename}</div>
                    <div class="controls">
                        <span class="counter" id="counterEl"></span>
                        <button onclick="rotate(-90)" title="Rotate Left">↺ Rotate L</button>
                        <button onclick="rotate(90)" title="Rotate Right">Rotate R ↻</button>
                        <button onclick="download()" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.3); color: #10b981; margin-left: 8px;">Download</button>
                    </div>
                </div>
                <div class="main">
                    <button class="nav-btn prev" id="prevBtn" onclick="navigate(-1)">❮</button>
                    <div class="img-wrapper" id="imgWrapper">
                        <img id="imageEl" src="?id=${id}&filename=${filename}&raw=true" alt="Document loading..." />
                    </div>
                    <button class="nav-btn next" id="nextBtn" onclick="navigate(1)">❯</button>
                </div>

                <script>
                    const files = ${JSON.stringify(relatedFiles)};
                    let currentId = "${id}";
                    let currentIndex = files.findIndex(f => f.file_id === currentId);
                    if (currentIndex === -1) currentIndex = 0;
                    
                    let rotation = 0;

                    function updateUI(smoothRotate = false) {
                        const file = files[currentIndex];
                        
                        // Update specific DOM Elements
                        document.getElementById('titleEl').innerText = file.attachment_name || "Document";
                        document.getElementById('imageEl').src = "?id=" + file.file_id + "&raw=true";
                        
                        // Update Status
                        document.getElementById('counterEl').innerText = (currentIndex + 1) + " of " + files.length;
                        document.getElementById('prevBtn').disabled = currentIndex === 0;
                        document.getElementById('nextBtn').disabled = currentIndex === files.length - 1;
                        
                        // Apply rotation
                        const wrapper = document.getElementById('imgWrapper');
                        if (!smoothRotate) wrapper.style.transition = 'none'; // Snap reset when navigating
                        else wrapper.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                        
                        // Force reflow before applying transform
                        void wrapper.offsetHeight;
                        wrapper.style.transform = 'rotate(' + rotation + 'deg)';
                        
                        // Update URL silently
                        const url = new URL(window.location.href);
                        url.searchParams.set('id', file.file_id);
                        if (file.attachment_name) url.searchParams.set('filename', file.attachment_name);
                        window.history.replaceState({}, '', url.toString());
                    }

                    function rotate(deg) {
                        rotation += deg;
                        updateUI(true); // smooth animate
                    }

                    function navigate(dir) {
                        const newIdx = currentIndex + dir;
                        if (newIdx >= 0 && newIdx < files.length) {
                            currentIndex = newIdx;
                            rotation = 0; // reset
                            updateUI(false); // snap reset
                        }
                    }

                    function download() {
                        const file = files[currentIndex];
                        window.open("?id=" + file.file_id + "&filename=" + encodeURIComponent(file.attachment_name || 'file') + "&download=true", "_blank");
                    }

                    // Keyboard hooks
                    document.addEventListener('keydown', (e) => {
                        if (e.key === 'ArrowLeft') navigate(-1);
                        if (e.key === 'ArrowRight') navigate(1);
                        if (e.key === 'r') rotate(90);
                    });

                    // Boot
                    updateUI(false);
                </script>
            </body>
            </html>
            `;

            return new NextResponse(html, {
                status: 200,
                headers: { "Content-Type": "text/html" }
            });
        }

        // --- Standard Raw Binary Fallback Below ---
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
