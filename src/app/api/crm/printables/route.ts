// src/app/api/fm/printables/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const PRODUCTS = "products";
const PRODUCT_PER_SUPPLIER = "product_per_supplier";

type ProductRow = {
    product_id: number;
    parent_id: number | null;
    product_code: string | null;
    product_name: string | null;
    product_category: number | string | null;
    product_brand: number | string | null;
    unit_of_measurement: number | string | null;
    isActive: number | string | null;
    price_per_unit?: number | string | null;
    priceA?: number | string | null;
    priceB?: number | string | null;
    priceC?: number | string | null;
    priceD?: number | string | null;
    priceE?: number | string | null;
};

function directusHeaders(): Record<string, string> {
    const token = process.env.DIRECTUS_STATIC_TOKEN || process.env.DIRECTUS_SERVICE_TOKEN || "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
}

async function fetchDirectus<T>(url: string): Promise<T> {
    const res = await fetch(url, { cache: "no-store", headers: directusHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as T;
}

function pickId(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    const n = Number((v as Record<string, unknown>)?.product_id ?? (v as Record<string, unknown>)?.id ?? v);
    return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(req: NextRequest) {
    try {
        if (!DIRECTUS_URL) return NextResponse.json({ error: "API URL not set" }, { status: 500 });
        const { searchParams } = new URL(req.url);

        const page = Math.max(1, Number(searchParams.get("page") || 1));
        const pageSizeRaw = searchParams.get("page_size");
        const pageSize = pageSizeRaw === "-1" ? -1 : Math.max(1, Number(pageSizeRaw || 50));
        const q = searchParams.get("q") || "";
        const categoryIds = searchParams.get("category_ids")?.split(",") || [];
        const brandIds = searchParams.get("brand_ids")?.split(",") || [];
        const unitIds = searchParams.get("unit_ids")?.split(",") || [];
        const supplierIds = searchParams.get("supplier_ids")?.split(",") || [];
        const supplierScope = searchParams.get("supplier_scope") || "ALL";
        const activeOnly = searchParams.get("active_only") === "1";

        const fields = [
            "product_id", "parent_id", "product_code", "product_name",
            "isActive", "product_category", "product_brand", "unit_of_measurement",
            "price_per_unit", "priceA", "priceB", "priceC", "priceD", "priceE"
        ].join(",");

        const params = new URLSearchParams();
        params.set("limit", "-1");
        params.set("fields", fields);
        
        let andIdx = 0;
        const addAnd = (suffix: string, value: string) => {
            params.set(`filter[_and][${andIdx}]${suffix}`, value);
            andIdx += 1;
        };

        if (activeOnly) addAnd("[isActive][_eq]", "1");
        if (categoryIds.length) addAnd("[product_category][_in]", categoryIds.join(","));
        if (brandIds.length) addAnd("[product_brand][_in]", brandIds.join(","));
        if (unitIds.length) addAnd("[unit_of_measurement][_in]", unitIds.join(","));
        if (q) {
            addAnd("[_or][0][product_name][_contains]", q);
            params.set(`filter[_and][${andIdx - 1}][_or][1][product_code][_contains]`, q);
        }

        // Handle Supplier Filtering
        if (supplierIds.length > 0 || supplierScope === "LINKED_ONLY") {
            const sp = new URLSearchParams();
            sp.set("limit", "-1");
            sp.set("fields", "product_id");
            if (supplierIds.length > 0) {
                sp.set("filter[supplier_id][_in]", supplierIds.join(","));
            }

            const pps = await fetchDirectus<{ data: Record<string, unknown>[] }>(
                `${DIRECTUS_URL}/items/${PRODUCT_PER_SUPPLIER}?${sp.toString()}`
            );
            const pids = pps.data.map(p => pickId(p.product_id)).filter(id => id !== null);
            
            if (!pids.length) {
                return NextResponse.json({ data: [], meta: { total_groups: 0, total_pages: 0 } });
            }
            addAnd("[product_id][_in]", pids.join(","));
        }

        const data = await fetchDirectus<{ data: ProductRow[] }>(`${DIRECTUS_URL}/items/${PRODUCTS}?${params.toString()}`);
        const rows = data.data;

        // Grouping
        const groupMap = new Map<number, ProductRow[]>();
        for (const r of rows) {
            const gid = pickId(r.parent_id) ?? pickId(r.product_id);
            if (gid === null) continue;
            if (!groupMap.has(gid)) groupMap.set(gid, []);
            groupMap.get(gid)!.push(r);
        }

        const gids = Array.from(groupMap.keys());
        const totalGroups = gids.length;
        const totalPages = Math.ceil(totalGroups / pageSize);
        
        // Paginate Groups
        if (pageSize === -1) {
            return NextResponse.json({
                data: rows,
                meta: {
                    total_groups: totalGroups,
                    total_pages: 1,
                    page: 1,
                    page_size: totalGroups
                }
            });
        }
        
        const pagedGids = gids.slice((page - 1) * pageSize, page * pageSize);
        const pagedRows: ProductRow[] = [];
        for (const gid of pagedGids) {
            pagedRows.push(...groupMap.get(gid)!);
        }

        return NextResponse.json({
            data: pagedRows,
            meta: {
                total_groups: totalGroups,
                total_pages: totalPages,
                page,
                page_size: pageSize
            }
        });

    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
