import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    const directusUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8055";

    if (!token) {
        return NextResponse.json({ error: "Missing Server Token" }, { status: 500 });
    }

    try {
        // Grab the form data passed from our front-end
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Create a clean FormData object specifically for Directus
        const directusData = new FormData();
        directusData.append("file", file);

        // Send it directly to the Directus /files endpoint
        const response = await fetch(`${directusUrl}/files`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: directusData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Directus upload failed: ${response.statusText} - ${errorText}`);
        }

        const json = await response.json();

        // Return the newly created file data (which includes the UUID we need)
        return NextResponse.json(json.data);

    } catch (e) {
        console.error("Upload API Error:", e);
        return NextResponse.json(
            { error: "Failed to upload file", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}