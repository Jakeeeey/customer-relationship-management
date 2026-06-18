import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const baseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/+$/, "");
        if (!baseUrl) {
            return NextResponse.json({ error: "SPRING_API_BASE_URL is not configured" }, { status: 500 });
        }

        const url = `${baseUrl}/api/view-running-inventory/all`;
        
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

        // MERGE: Fetch cost_per_unit from Directus Products table to supply the missing price
        try {
            const directusUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://goatedcodoer:8091'}/items/products?access_token=${process.env.DIRECTUS_STATIC_TOKEN}&limit=-1&fields=product_id,cost_per_unit`;
            const productsRes = await fetch(directusUrl, { cache: "no-store" });
            
            if (productsRes.ok) {
                const productsData = await productsRes.json();
                const costMap = new Map();
                if (productsData?.data) {
                    productsData.data.forEach((p: { product_id: number; cost_per_unit: number }) => {
                        costMap.set(p.product_id, p.cost_per_unit);
                    });
                }
                
                // Map cost_per_unit into each item in the data array
                data.forEach((item: Record<string, unknown>) => {
                    const pid = item.productId || item.product_id;
                    if (pid && costMap.has(pid)) {
                        item.cost_per_unit = costMap.get(pid);
                    }
                });
            }
        } catch (e) {
            console.error("Failed to merge cost_per_unit from Directus:", e);
        }

        return NextResponse.json(data);
    } catch (err: unknown) {
        return NextResponse.json({ 
            error: "Internal Server Error", 
            details: err instanceof Error ? err.message : String(err) 
        }, { status: 500 });
    }
}
