import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const action = searchParams.get("action");
        const salesmanId = searchParams.get("salesmanId");
        const supplierId = searchParams.get("supplierId");

        const directusUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
        const directusToken = process.env.DIRECTUS_STATIC_TOKEN || "";
        const springBaseUrl = process.env.SPRING_API_BASE_URL?.replace(/\/+$/, "");

        const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${directusToken}`
        };

        // 1. Handle Salesmen List
        if (action === "salesmen") {
            const res = await fetch(`${directusUrl}/items/salesman?filter[isActive][_eq]=1&limit=-1&fields=id,salesman_name,salesman_code`, {
                headers,
                cache: "no-store"
            });
            if (!res.ok) throw new Error("Failed to fetch salesmen from Directus");
            const json = await res.json();
            return NextResponse.json(json.data || []);
        }

        // 2. Handle Suppliers List
        if (action === "suppliers") {
            const res = await fetch(`${directusUrl}/items/suppliers?filter[supplier_type][_in]=TRADE,Trade&limit=-1&fields=id,supplier_name,supplier_shortcut`, {
                headers,
                cache: "no-store"
            });
            if (!res.ok) throw new Error("Failed to fetch suppliers from Directus");
            const json = await res.json();
            return NextResponse.json(json.data || []);
        }

        // 3. Handle Category by code
        if (action === "category") {
            const categoryCode = searchParams.get("categoryCode");
            if (!categoryCode) {
                return NextResponse.json({ error: "categoryCode is required" }, { status: 400 });
            }
            // Fetch category by ID/Code from Directus /items/categories/{category-code}
            const res = await fetch(`${directusUrl}/items/categories/${categoryCode}`, {
                headers,
                cache: "force-cache" // Can cache categories
            });
            if (!res.ok) {
                return NextResponse.json({ category_name: categoryCode }); // Fallback to code if failed
            }
            const json = await res.json();
            return NextResponse.json(json.data || { category_name: categoryCode });
        }

        // 3. Handle Price List Data (Default)
        if (!salesmanId || !supplierId) {
            return NextResponse.json({ error: "salesmanId and supplierId are required" }, { status: 400 });
        }

        if (!springBaseUrl) {
            return NextResponse.json({ error: "SPRING_API_BASE_URL is not configured" }, { status: 500 });
        }

        const url = `${springBaseUrl}/api/product-price-type?salesmanId=${salesmanId}&supplierId=${supplierId}`;
        
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
