import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const invoiceIdsStr = formData.get("invoice_ids");
        const receiptNumbers = formData.get("receipt_numbers");
        const widthMm = formData.get("width_mm");
        const heightMm = formData.get("height_mm");

        if (!file || !invoiceIdsStr || !receiptNumbers) {
            return NextResponse.json({ error: "Missing required fields (file, invoice_ids, receipt_numbers)" }, { status: 400 });
        }

        // Parse invoice_ids (can be comma-separated or JSON array string)
        let invoiceIds: number[] = [];
        try {
            const raw = invoiceIdsStr as string;
            if (raw.startsWith('[') && raw.endsWith(']')) {
                invoiceIds = JSON.parse(raw);
            } else {
                invoiceIds = raw.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            }
        } catch (e) {
            console.error("[Save PDF API] Error parsing invoice_ids:", e);
            return NextResponse.json({ error: "Invalid invoice_ids format" }, { status: 400 });
        }

        if (invoiceIds.length === 0) {
            return NextResponse.json({ error: "No valid invoice IDs provided" }, { status: 400 });
        }

        console.log(`[Save PDF API] Archiving PDF for Invoice IDs: ${invoiceIds.join(", ")} | Receipts: ${receiptNumbers}`);

        // Get created_by from JWT token
        let userId: number | null = null;
        try {
            const cookieStore = await cookies();
            const token = cookieStore.get('vos_access_token');
            if (token && token.value) {
                const payload = token.value.split('.')[1];
                const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8')) as { sub: string };
                if (decoded && decoded.sub) {
                    userId = parseInt(decoded.sub);
                }
            }
        } catch (e) {
            console.warn("[Save PDF API] Failed to decode token:", e);
        }

        const now = new Date().toISOString();

        // 1. Upload the PDF to Directus Files
        const directusFormData = new FormData();
        directusFormData.append("file", file);
        directusFormData.append("title", `Invoices PDF (${receiptNumbers})`);

        const uploadRes = await fetch(`${DIRECTUS_BASE}/files`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${DIRECTUS_TOKEN}`,
            },
            body: directusFormData,
        });

        if (!uploadRes.ok) {
            const errorText = await uploadRes.text();
            console.error(`[Save PDF API] File Upload failed:`, errorText);
            return NextResponse.json({ error: "Failed to upload PDF to Directus" }, { status: uploadRes.status });
        }

        const uploadData = await uploadRes.json();
        const fileId = uploadData.data.id;

        // 2. PATCH the file to set the folder
        await fetch(`${DIRECTUS_BASE}/files/${fileId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${DIRECTUS_TOKEN}`,
            },
            body: JSON.stringify({
                folder: process.env.DIRECTUS_INVOICE_PDF_FOLDER_ID}),
        }).catch(err => console.warn("[Save PDF API] Folder patch failed:", err));

        // 3. Create records in sales_invoice_pdf for EACH invoice
        const archivePromises = invoiceIds.map(async (id, index) => {
            const recordRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_pdf`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
                },
                body: JSON.stringify({
                    sales_invoice_id: id,
                    receipt_numbers: receiptNumbers,
                    pdf_file: fileId,
                    page: index + 1,
                    width_mm: widthMm ? parseInt(widthMm as string) : null,
                    height_mm: heightMm ? parseInt(heightMm as string) : null,
                    created_at: now,
                    created_by: userId,
                    updated_at: now,
                    updated_by: userId
                }),
            });
            if (!recordRes.ok) {
                const error = await recordRes.text();
                console.error(`[Save PDF API] Failed for invoice ${id}:`, error);
                throw new Error(`Failed to create record for ID ${id}`);
            }
            return (await recordRes.json()).data.id;
        });

        const createdRecords = await Promise.all(archivePromises);
        console.log(`[Save PDF API] PDF archived for ${createdRecords.length} invoices.`);

        return NextResponse.json({ success: true, record_ids: createdRecords, file_id: fileId });

    } catch (err: unknown) {
        console.error("[Save PDF API] Catch Error:", err);
        return NextResponse.json({ error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
