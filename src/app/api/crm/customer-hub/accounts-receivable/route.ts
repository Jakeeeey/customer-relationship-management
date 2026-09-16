import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const customerCode = searchParams.get("customerCode");

    if (!customerCode) {
        return NextResponse.json({ error: "customerCode is required" }, { status: 400 });
    }

    try {
        // Use the specific IP and Port provided for the Accounts Receivable service
        const baseUrl = process.env.SPRING_AR_API_BASE_URL || "http://100.95.246.18:8088";
        const targetUrl = `${baseUrl}/api/v1/accounts-receivable/customer-receivable?customerCode=${encodeURIComponent(customerCode)}`;
        
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
        return NextResponse.json(data);
    } catch (error: unknown) {
        const err = error as Error;
        console.error("[AR Proxy] Fatal error:", err);
        return NextResponse.json({ error: err.message || "Failed to fetch AR data" }, { status: 500 });
    }
}
