import { NextRequest, NextResponse } from "next/server";

export async function getReceivableRows(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const customerCode = searchParams.get("customerCode");

    if (!customerCode) {
        return NextResponse.json({ error: "customerCode is required" }, { status: 400 });
    }

    try {
            const baseUrl = (
            process.env.SPRING_AR_API_BASE_URL ||
            process.env.SPRING_API_BASE_URL ||
            ""
        ).replace(/\/+$/, "");

        if (!baseUrl) {
            return NextResponse.json(
                { error: "Spring API base URL is not configured" },
                { status: 500 }
            );
        }
        const targetUrl = `${baseUrl}/api/v1/accounts-receivable`;
        
        console.log(`[AR Proxy] Fetching from: ${targetUrl}`);
        
        const res = await fetch(targetUrl, {
            // Optional: you can add a timeout here if the API is known to be slow
            headers: {
                "Accept": "application/json",
            },
            cache: "no-store"
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[AR Proxy] Error ${res.status}: ${errText}`);
            return NextResponse.json({ error: `Downstream API error: ${res.status}`, details: errText }, { status: res.status });
        }

        const data = await res.json();

        const rows: unknown[] = Array.isArray(data)
            ? data
            : Array.isArray((data as { data?: unknown[] })?.data)
                ? (data as { data: unknown[] }).data
                : Array.isArray((data as { content?: unknown[] })?.content)
                    ? (data as { content: unknown[] }).content
                    : [];

        const filtered = rows.filter((row) => {
            const code = (row as { customerCode?: unknown }).customerCode;
            return String(code ?? "").trim() === customerCode.trim();
        });

        return NextResponse.json(filtered);
    } catch (error: unknown) {
        const err = error as Error;
        console.error("[AR Proxy] Fatal error:", err);
        return NextResponse.json({ error: err.message || "Failed to fetch AR data" }, { status: 500 });
    }
}
