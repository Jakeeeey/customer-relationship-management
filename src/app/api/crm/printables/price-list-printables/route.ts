import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const salesmanId = searchParams.get("salesmanId");
        const supplierId = searchParams.get("supplierId");

        if (!salesmanId || !supplierId) {
            return NextResponse.json({ error: "salesmanId and supplierId are required" }, { status: 400 });
        }

        const baseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/+$/, "");
        if (!baseUrl) {
            return NextResponse.json({ error: "SPRING_API_BASE_URL is not configured" }, { status: 500 });
        }

        const url = `${baseUrl}/api/product-price-type?salesmanId=${salesmanId}&supplierId=${supplierId}`;
        
        const cookieStore = await cookies();
        const token = cookieStore.get("vos_access_token")?.value;

        const response = await fetch(url, {
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": `Bearer ${token}` } : {})
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: "Failed to fetch from Spring Boot", details: errorText }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (err: unknown) {
        return NextResponse.json({ 
            error: "Internal Server Error", 
            details: err instanceof Error ? err.message : String(err) 
        }, { status: 500 });
    }
}
