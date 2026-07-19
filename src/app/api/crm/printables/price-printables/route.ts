import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const action = searchParams.get("action");
        const salesmanId = searchParams.get("salesmanId");
        const supplierInput = searchParams.get("supplierInput") || "All";
        const segmentInput = searchParams.get("segmentInput") || "All";
        const categoryInput = searchParams.get("categoryInput") || "All";

        const directusUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
        const directusToken = process.env.DIRECTUS_STATIC_TOKEN || "";
        
        // We use port 8088 for the new endpoint. Ideally this would be a separate env var or we replace the port,
        // but for now we construct the base URL explicitly using the server IP and port 8088 as requested.
        const springBaseUrl = "http://100.68.114.32:8088";

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

        // 3. Handle Categories List
        if (action === "categories") {
            // categories table uses category_id
            const res = await fetch(`${directusUrl}/items/categories?limit=-1&fields=category_id,category_name&sort=category_name`, {
                headers,
                cache: "no-store"
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Failed to fetch categories from Directus: ${res.status} ${text}`);
            }
            const json = await res.json();
            const mappedData = (json.data || []).map((c: { category_id: number; category_name: string }) => ({
                id: c.category_id,
                category_name: c.category_name
            }));
            return NextResponse.json(mappedData);
        }

        // 4. Handle Segments List
        if (action === "segments") {
            // fetch all fields to avoid guessing the exact ID field name (e.g. segment_id vs id)
            const res = await fetch(`${directusUrl}/items/product_segment?limit=-1&sort=segment_name`, {
                headers,
                cache: "no-store"
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Failed to fetch segments from Directus: ${res.status} ${text}`);
            }
            const json = await res.json();
            const mappedData = (json.data || []).map((s: { id?: number; segment_id?: number; product_segment_id?: number; segment_name: string }) => ({
                id: s.id || s.segment_id || s.product_segment_id || 0,
                segment_name: s.segment_name
            }));
            return NextResponse.json(mappedData);
        }

        // 5. Handle Price List Data (Default)
        if (!salesmanId) {
            return NextResponse.json({ error: "salesmanId is required" }, { status: 400 });
        }

        const url = `${springBaseUrl}/api/v2/price-list?salesmanId=${salesmanId}&supplierInput=${encodeURIComponent(supplierInput)}&segmentInput=${encodeURIComponent(segmentInput)}&categoryInput=${encodeURIComponent(categoryInput)}`;
        
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
