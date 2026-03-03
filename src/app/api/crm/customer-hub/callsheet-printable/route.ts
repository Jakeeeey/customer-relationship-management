import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://goatedcodoer:8056";
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

const fetchHeaders = {
    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    "Content-Type": "application/json",
};

export async function GET(req: NextRequest) {
    const type = req.nextUrl.searchParams.get("type");

    try {
        if (type === "salesmen") {
            const res = await fetch(`${DIRECTUS_URL}/items/salesman?filter[isActive][_eq]=1&limit=-1`, {
                headers: fetchHeaders,
            });
            if (!res.ok) return NextResponse.json({ error: "Failed to fetch salesmen" }, { status: 500 });
            const json = await res.json();
            return NextResponse.json({ data: json.data || [] });
        }

        if (type === "accounts") {
            const userId = req.nextUrl.searchParams.get("userId");
            if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

            const smRes = await fetch(`${DIRECTUS_URL}/items/salesman?filter[_or][0][employee_id][_eq]=${userId}&filter[_or][1][encoder_id][_eq]=${userId}&filter[isActive][_eq]=1&limit=-1`, {
                headers: fetchHeaders,
            });
            if (!smRes.ok) return NextResponse.json({ error: "Failed to fetch user accounts" }, { status: 500 });
            const smJson = await smRes.json();
            return NextResponse.json({ data: smJson.data || [] });
        }

        if (type === "customers") {
            const salesmanId = req.nextUrl.searchParams.get("salesmanId");
            if (!salesmanId) return NextResponse.json({ error: "salesmanId required" }, { status: 400 });

            const csRes = await fetch(`${DIRECTUS_URL}/items/customer_salesmen?filter[salesman_id][_eq]=${salesmanId}&limit=-1`, {
                headers: fetchHeaders,
            });
            if (!csRes.ok) return NextResponse.json({ error: "Failed to fetch customer_salesmen" }, { status: 500 });
            const csJson = await csRes.json();
            const csData = csJson.data || [];

            const customerIds = csData.map((cs: any) => cs.customer_id);
            if (customerIds.length === 0) return NextResponse.json({ data: [] });

            const idsStr = customerIds.join(',');
            const cRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[id][_in]=${idsStr}&limit=-1`, {
                headers: fetchHeaders,
            });
            if (!cRes.ok) return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
            const cJson = await cRes.json();
            return NextResponse.json({ data: cJson.data || [] });
        }

        if (type === "suppliers") {
            const res = await fetch(`${DIRECTUS_URL}/items/suppliers?filter[isActive][_eq]=1&limit=-1`, {
                headers: fetchHeaders,
            });
            if (!res.ok) return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
            const json = await res.json();
            return NextResponse.json({ data: json.data || [] });
        }

        if (type === "products") {
            const supplierId = req.nextUrl.searchParams.get("supplierId");
            if (!supplierId) return NextResponse.json({ error: "supplierId required" }, { status: 400 });

            const psRes = await fetch(`${DIRECTUS_URL}/items/product_per_supplier?filter[supplier_id][_eq]=${supplierId}&limit=-1`, {
                headers: fetchHeaders,
            });
            if (!psRes.ok) return NextResponse.json({ error: "Failed to fetch product_per_supplier" }, { status: 500 });
            const psJson = await psRes.json();
            const psData = psJson.data || [];

            const productIds = psData.map((ps: any) => ps.product_id);
            if (productIds.length === 0) return NextResponse.json({ data: [] });

            const idsStr = productIds.join(',');
            const pRes = await fetch(`${DIRECTUS_URL}/items/products?filter[product_id][_in]=${idsStr}&filter[isActive][_eq]=1&limit=-1`, {
                headers: fetchHeaders,
            });
            if (!pRes.ok) return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
            const pJson = await pRes.json();
            const products = pJson.data || [];

            const parentIds = products.map((p: any) => p.parent_id).filter(Boolean);
            let parents: any[] = [];
            if (parentIds.length > 0) {
                const parentIdsStr = [...new Set(parentIds)].join(',');
                const prRes = await fetch(`${DIRECTUS_URL}/items/products?filter[product_id][_in]=${parentIdsStr}&limit=-1`, {
                    headers: fetchHeaders,
                });
                if (prRes.ok) {
                    const prJson = await prRes.json();
                    parents = prJson.data || [];
                }
            }

            const result = products.map((p: any) => {
                const parent = parents.find((pr: any) => pr.product_id === p.parent_id);
                return {
                    ...p,
                    parent_product: parent || null
                };
            });

            return NextResponse.json({ data: result });
        }

        return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
    } catch (e) {
        console.error("API error", e);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
