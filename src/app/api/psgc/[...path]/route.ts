import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const path = (await params).path.join("/");
    const url = `https://psgc.gitlab.io/api/${path}/`;

    try {
        const res = await fetch(url);
        if (!res.ok) {
            return NextResponse.json({ error: `Failed to fetch from PSGC: ${res.statusText}` }, { status: res.status });
        }
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("PSGC Proxy Error:", error);
        return NextResponse.json({ error: "Failed to fetch from PSGC API" }, { status: 500 });
    }
}
