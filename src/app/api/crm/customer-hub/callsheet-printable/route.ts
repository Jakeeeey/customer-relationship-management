import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

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
            const smData = json.data || [];

            const userIds = new Set<string>();
            smData.forEach((s: Record<string, unknown>) => {
                if (s.employee_id) userIds.add(s.employee_id.toString());
                else if (s.encoder_id) userIds.add(s.encoder_id.toString());
            });

            if (userIds.size === 0) return NextResponse.json({ data: [] });

            const idsStr = Array.from(userIds).join(',');
            const uRes = await fetch(`${DIRECTUS_URL}/items/user?filter[user_id][_in]=${idsStr}&limit=-1`, {
                headers: fetchHeaders,
            });
            if (!uRes.ok) return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
            const uJson = await uRes.json();
            return NextResponse.json({ data: uJson.data || [] });
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

            const customerIds = csData.map((cs: { customer_id: unknown }) => cs.customer_id);
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
            const res = await fetch(`${DIRECTUS_URL}/items/suppliers?filter[supplier_type][_in]=TRADE,Trade&filter[isActive][_eq]=1&limit=-1`, {
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

            const productIds = psData.map((ps: { product_id: unknown }) => ps.product_id);
            if (productIds.length === 0) return NextResponse.json({ data: [] });

            const idsStr = productIds.join(',');
            const pRes = await fetch(`${DIRECTUS_URL}/items/products?filter[product_id][_in]=${idsStr}&filter[isActive][_eq]=1&limit=-1`, {
                headers: fetchHeaders,
            });
            if (!pRes.ok) return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
            const pJson = await pRes.json();
            const products = pJson.data || [];

            const parentIds = products.map((p: Record<string, unknown>) => p.parent_id).filter(Boolean);
            let parents: unknown[] = [];
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

            let children: unknown[] = [];
            if (productIds.length > 0) {
                const uniqueProductIds = [...new Set(productIds as number[])];
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

            const allProductsMap = new Map<number, unknown>();
            const addToMap = (list: unknown[]) => {
                for (const p of list as Record<string, unknown>[]) {
                    if (!allProductsMap.has(Number(p.product_id))) {
                        allProductsMap.set(Number(p.product_id), p);
                    }
                }
            };

            addToMap(products);
            addToMap(parents);
            addToMap(children);

            const allProducts = Array.from(allProductsMap.values());

            const result = allProducts.map((p: unknown) => {
                const product = p as Record<string, unknown>;
                const parentIdVal = Number(product.parent_id);
                const parent = parentIdVal ? allProductsMap.get(parentIdVal) as Record<string, unknown> : null;

                // Use description if available, else product_name
                let display_name = product.description ? product.description : product.product_name;

                // If it's a child product but has no description/name, fallback to parent's name
                if (!display_name && parent) {
                    display_name = parent.product_name || "Unnamed Product";
                }

                return {
                    ...product,
                    display_name: display_name as string || "Unnamed Product",
                    parent_product_name: (parent?.product_name as string) || null,
                    parent_product: parent || null,
                };
            });

            return NextResponse.json({ data: result });
        }

        if (type === "mo-avg") {
            const customerCode = req.nextUrl.searchParams.get("customerCode");
            if (!customerCode) return NextResponse.json({ error: "customerCode required" }, { status: 400 });

            const now = new Date();
            const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            const dateStr = sixMonthsAgo.toISOString().split('T')[0];

            const filter = {
                "_and": [
                    { "invoice_no": { "isRemitted": { "_eq": 1 } } },
                    { "invoice_no": { "customer_code": { "_eq": customerCode } } },
                    { "invoice_no": { "invoice_date": { "_gte": dateStr } } }
                ]
            };

            const url = `${DIRECTUS_URL}/items/sales_invoice_details?filter=${encodeURIComponent(JSON.stringify(filter))}&fields=product_id,quantity&limit=-1`;
            const res = await fetch(url, { headers: fetchHeaders });

            if (!res.ok) {
                const errText = await res.text();
                // Fallback attempt
                const fallbackFilter = {
                    "_and": [
                        { "invoice_no": { "customer_code": { "_eq": customerCode } } },
                        { "invoice_no": { "invoice_date": { "_gte": dateStr } } }
                    ]
                };
                const fallbackUrl = `${DIRECTUS_URL}/items/sales_invoice_details?filter=${encodeURIComponent(JSON.stringify(fallbackFilter))}&fields=product_id,quantity&limit=-1`;
                const fallbackRes = await fetch(fallbackUrl, { headers: fetchHeaders });
                if (fallbackRes.ok) {
                    const json = await fallbackRes.json();
                    const items = json.data || [];
                    const aggregates: Record<number, number> = {};
                    items.forEach((item: { product_id: number; quantity: number }) => {
                        const pid = Number(item.product_id);
                        if (pid) aggregates[pid] = (aggregates[pid] || 0) + (Number(item.quantity) || 0);
                    });
                    const results: Record<number, number> = {};
                    Object.entries(aggregates).forEach(([pid, total]) => {
                        results[Number(pid)] = Number((total / 6.0).toFixed(2));
                    });
                    return NextResponse.json({ data: results });
                }
                return NextResponse.json({ error: "Failed to fetch MO AVG", details: errText }, { status: res.status });
            }

            const json = await res.json();
            const items = json.data || [];
            const aggregates: Record<number, number> = {};
            items.forEach((item: { product_id: number; quantity: number }) => {
                const pid = Number(item.product_id);
                if (pid) aggregates[pid] = (aggregates[pid] || 0) + (Number(item.quantity) || 0);
            });
            const results: Record<number, number> = {};
            Object.entries(aggregates).forEach(([pid, total]) => {
                results[Number(pid)] = Number((total / 6.0).toFixed(2));
            });
            return NextResponse.json({ data: results });
        }

        return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
    } catch (error: unknown) {
        console.error("API error", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
