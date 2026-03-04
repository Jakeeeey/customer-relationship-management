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
                const uniqueParentIds = [...new Set(parentIds)];
                // Chunk the parent IDs to avoid URL length limits
                const chunkSize = 50;
                for (let i = 0; i < uniqueParentIds.length; i += chunkSize) {
                    const chunk = uniqueParentIds.slice(i, i + chunkSize);
                    const parentIdsStr = chunk.join(',');
                    const prRes = await fetch(`${DIRECTUS_URL}/items/products?filter[product_id][_in]=${parentIdsStr}&limit=-1`, {
                        headers: fetchHeaders,
                    });
                    if (prRes.ok) {
                        const prJson = await prRes.json();
                        if (prJson.data) {
                            parents = parents.concat(prJson.data);
                        }
                    } else {
                        console.error("Failed to fetch parent chunk", await prRes.text());
                    }
                }
            }

            let children: any[] = [];
            if (productIds.length > 0) {
                const uniqueProductIds = [...new Set(productIds)];
                const chunkSize = 50;
                for (let i = 0; i < uniqueProductIds.length; i += chunkSize) {
                    const chunk = uniqueProductIds.slice(i, i + chunkSize);
                    const chunkStr = chunk.join(',');
                    const cRes = await fetch(`${DIRECTUS_URL}/items/products?filter[parent_id][_in]=${chunkStr}&filter[isActive][_eq]=1&limit=-1`, {
                        headers: fetchHeaders,
                    });
                    if (cRes.ok) {
                        const cJson = await cRes.json();
                        if (cJson.data) {
                            children = children.concat(cJson.data);
                        }
                    } else {
                        console.error("Failed to fetch children chunk", await cRes.text());
                    }
                }
            }

            const allProductsMap = new Map();
            const addToMap = (list: any[]) => {
                for (const p of list) {
                    if (!allProductsMap.has(Number(p.product_id))) {
                        allProductsMap.set(Number(p.product_id), p);
                    }
                }
            };

            addToMap(products);
            addToMap(parents);
            addToMap(children);

            const allProducts = Array.from(allProductsMap.values());

            const result = allProducts.map((p: any) => {
                const parentIdVal = Number(p.parent_id);
                const parent = parentIdVal ? allProductsMap.get(parentIdVal) : null;

                // Use description if available, else product_name
                let display_name = p.description ? p.description : p.product_name;

                // If it's a child product but has no description/name, fallback to parent's name
                if (!display_name && parent) {
                    display_name = parent.product_name || "Unnamed Product";
                }

                return {
                    ...p,
                    display_name: display_name || "Unnamed Product",
                    parent_product_name: parent?.product_name || null,
                    parent_product: parent || null,
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
