// src/app/api/fm/printables/lookups/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

const CATEGORIES = "categories";
const BRAND = "brand";
const UNITS = "units";
const SUPPLIERS = "suppliers";
const PRODUCT_PER_SUPPLIER = "product_per_supplier";
const PRODUCTS = "products";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function directusHeaders() {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    return h;
}

async function fetchDirectus<T>(url: string): Promise<T> {
    const res = await fetch(url, { cache: "no-store", headers: directusHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as T;
}

function decodeUserIdFromJwtCookie(req: NextRequest, cookieName = "vos_access_token") {
    const token = req.cookies.get(cookieName)?.value;
    if (!token) return null;

    const parts = token.split(".");
    if (parts.length < 2) return null;

    try {
        const payloadPart = parts[1];
        const pad = "=".repeat((4 - (payloadPart.length % 4)) % 4);
        const b64 = (payloadPart + pad).replace(/-/g, "+").replace(/_/g, "/");
        const jsonStr = Buffer.from(b64, "base64").toString("utf8");
        const payloadUnknown: unknown = JSON.parse(jsonStr);

        if (!isRecord(payloadUnknown)) return null;

        const payload = (payloadUnknown as Record<string, unknown>);
        const userId = Number(payload.sub);
        return Number.isFinite(userId) ? userId : null;
    } catch {
        return null;
    }
}

function safeCsvIds(v: string | null) {
    const s = String(v ?? "").trim();
    if (!s) return [];
    return s.split(",").map(x => x.trim()).filter(Boolean).filter(x => /^\d+$/.test(x));
}

function chunk<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

async function collectSetsFromProducts(args: {
    productIds?: number[];
    categoryId?: number;
    brandId?: number;
}) {
    const { productIds, categoryId = 0, brandId = 0 } = args;
    const catSet = new Set<string>();
    const brandSet = new Set<string>();
    const unitSet = new Set<string>();

    const fields = [
        "product_id",
        "product_category.category_id",
        "product_brand.brand_id",
        "unit_of_measurement.unit_id",
    ].join(",");

    const applyFilters = (sp: URLSearchParams) => {
        sp.set("limit", "-1");
        sp.set("fields", fields);
        if (categoryId > 0) sp.set("filter[product_category][category_id][_eq]", String(categoryId));
        if (brandId > 0) sp.set("filter[product_brand][brand_id][_eq]", String(brandId));
    };

    if (Array.isArray(productIds) && productIds.length > 0) {
        const batches = chunk(productIds, 300);
        for (const batch of batches) {
            const sp = new URLSearchParams();
            applyFilters(sp);
            sp.set("filter[product_id][_in]", batch.join(","));
            const prodJson = await fetchDirectus<{ data: Record<string, unknown>[] }>(`${DIRECTUS_URL}/items/${PRODUCTS}?${sp.toString()}`);
            for (const p of (prodJson.data ?? [])) {
                if ((p.product_category as Record<string, unknown>)?.category_id != null) catSet.add(String((p.product_category as Record<string, unknown>).category_id));
                if ((p.product_brand as Record<string, unknown>)?.brand_id != null) brandSet.add(String((p.product_brand as Record<string, unknown>).brand_id));
                if ((p.unit_of_measurement as Record<string, unknown>)?.unit_id != null) unitSet.add(String((p.unit_of_measurement as Record<string, unknown>).unit_id));
            }
        }
        return { catSet, brandSet, unitSet };
    }

    const sp = new URLSearchParams();
    applyFilters(sp);
    const prodJson = await fetchDirectus<{ data: Record<string, unknown>[] }>(`${DIRECTUS_URL}/items/${PRODUCTS}?${sp.toString()}`);
    for (const p of (prodJson.data ?? [])) {
        if ((p.product_category as Record<string, unknown>)?.category_id != null) catSet.add(String((p.product_category as Record<string, unknown>).category_id));
        if ((p.product_brand as Record<string, unknown>)?.brand_id != null) brandSet.add(String((p.product_brand as Record<string, unknown>).brand_id));
        if ((p.unit_of_measurement as Record<string, unknown>)?.unit_id != null) unitSet.add(String((p.unit_of_measurement as Record<string, unknown>).unit_id));
    }
    return { catSet, brandSet, unitSet };
}

export async function GET(req: NextRequest) {
    try {
        if (!DIRECTUS_URL) return NextResponse.json({ error: "NEXT_PUBLIC_API_BASE_URL is not set" }, { status: 500 });
        const userId = decodeUserIdFromJwtCookie(req);
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const supplierIds = safeCsvIds(searchParams.get("supplier_ids"));
        const supplierScope = (searchParams.get("supplier_scope") || "ALL").toUpperCase();
        const categoryId = Number(searchParams.get("category_id")) || 0;
        const brandId = Number(searchParams.get("brand_id")) || 0;

        // Fetch Base Lookups
        const [catJson, brandJson, unitJson, supplierJson] = await Promise.all([
            fetchDirectus<{ data: Record<string, unknown>[] }>(`${DIRECTUS_URL}/items/${CATEGORIES}?limit=-1&fields=category_id,category_name&sort=category_name`),
            fetchDirectus<{ data: Record<string, unknown>[] }>(`${DIRECTUS_URL}/items/${BRAND}?limit=-1&fields=brand_id,brand_name&sort=brand_name`),
            fetchDirectus<{ data: Record<string, unknown>[] }>(`${DIRECTUS_URL}/items/${UNITS}?limit=-1&fields=unit_id,unit_name,unit_shortcut,order&sort=order,unit_name`),
            fetchDirectus<{ data: Record<string, unknown>[] }>(`${DIRECTUS_URL}/items/${SUPPLIERS}?limit=-1&fields=id,supplier_name,supplier_shortcut,isActive,address,tin_number,contact_person,phone_number,email_address,city,state_province,supplier_type&sort=supplier_name&filter[isActive][_eq]=1&filter[supplier_type][_eq]=TRADE`),
        ]);

        let categories = catJson.data ?? [];
        let brands = brandJson.data ?? [];
        let units = unitJson.data ?? [];
        const suppliers = supplierJson.data ?? [];

        const shouldScopeBySupplier = supplierIds.length > 0 || supplierScope === "LINKED_ONLY";
        let universeProductIds: number[] | null = null;

        if (shouldScopeBySupplier) {
            const ppsJson = await fetchDirectus<{ data: Record<string, unknown>[] }>(`${DIRECTUS_URL}/items/${PRODUCT_PER_SUPPLIER}?limit=-1&fields=product_id&filter[supplier_id][_in]=${supplierIds.join(",")}`);
            universeProductIds = (ppsJson.data ?? [])
                .map((r) => Number(r.product_id))
                .filter(n => Number.isFinite(n) && n > 0);
            
            if (universeProductIds.length === 0) {
                return NextResponse.json({ data: { categories: [], brands: [], units: [], suppliers } });
            }
        }

        const needsCascade = (universeProductIds && universeProductIds.length > 0) || categoryId > 0 || brandId > 0;
        if (needsCascade) {
            const [cSets, bSets, uSets] = await Promise.all([
                collectSetsFromProducts({ productIds: universeProductIds ?? undefined, brandId, categoryId: 0 }),
                collectSetsFromProducts({ productIds: universeProductIds ?? undefined, categoryId, brandId: 0 }),
                collectSetsFromProducts({ productIds: universeProductIds ?? undefined, categoryId, brandId }),
            ]);

            categories = categories.filter(c => cSets.catSet.has(String(c.category_id)));
            brands = brands.filter(b => bSets.brandSet.has(String(b.brand_id)));
            units = units.filter(u => uSets.unitSet.has(String(u.unit_id)));
        }

        return NextResponse.json({ data: { categories, brands, units, suppliers } });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
    }
}
