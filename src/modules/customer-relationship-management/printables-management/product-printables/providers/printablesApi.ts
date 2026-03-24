// src/modules/financial-management/printables-management/product-printables/providers/printablesApi.ts
import type { Brand, Category, ProductRow, Supplier, Unit } from "../types";

async function http<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
    const res = await fetch(input, {
        cache: "no-store",
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(init?.headers ?? {}),
        },
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Request failed (${res.status})`);
    }
    return (await res.json()) as T;
}

export async function getLookups(params?: {
    supplier_ids?: string;
    supplier_scope?: "ALL" | "LINKED_ONLY";
    category_id?: string;
    brand_id?: string;
}) {
    const sp = new URLSearchParams();
    if (params?.supplier_ids) sp.set("supplier_ids", String(params.supplier_ids));
    if (params?.supplier_scope) sp.set("supplier_scope", String(params.supplier_scope));
    if (params?.category_id) sp.set("category_id", String(params.category_id));
    if (params?.brand_id) sp.set("brand_id", String(params.brand_id));

    const qs = sp.toString();
    // Reusing the existing lookups API if possible, or we could create a new one.
    // For now, I'll use the product-pricing lookups as they cover the same entities.
    return http<{ data: { categories: Category[]; brands: Brand[]; units: Unit[]; suppliers?: Supplier[] } }>(
        `/api/fm/printables/lookups${qs ? `?${qs}` : ""}`,
    );
}

export async function getProducts(params: {
    q?: string;
    category_ids?: string;
    brand_ids?: string;
    unit_ids?: string;
    supplier_ids?: string;
    supplier_scope?: "ALL" | "LINKED_ONLY";
    active_only?: "0" | "1";
}) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v) sp.set(k, v);
    }
    return http<{ data: ProductRow[] }>(`/api/fm/printables?${sp.toString()}`);
}
