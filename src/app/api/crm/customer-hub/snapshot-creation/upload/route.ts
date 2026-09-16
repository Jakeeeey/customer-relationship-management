import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const directusFormData = new FormData();
        directusFormData.append("title", file.name);
        directusFormData.append("file", file);

        const uploadRes = await fetch(`${DIRECTUS_URL}/files`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${DIRECTUS_TOKEN}`,
            },
            body: directusFormData as unknown as BodyInit,
        });

        if (!uploadRes.ok) {
            const errBody = await uploadRes.text();
            console.error("Failed to upload file to Directus:", errBody);
            return NextResponse.json({ error: "Failed to upload to server" }, { status: 500 });
        }

        const uploadData = (await uploadRes.json()).data;
        return NextResponse.json({ success: true, file_id: uploadData.id });
    } catch (error: unknown) {
        console.error("Upload route error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
