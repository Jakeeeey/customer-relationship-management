import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        return NextResponse.json({ message: "Site Sales Summary GET works!" });
    } catch (error: unknown) {
        console.error("API GET error", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        return NextResponse.json({ success: true, received: body });
    } catch (error: unknown) {
        console.error("API POST error", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
