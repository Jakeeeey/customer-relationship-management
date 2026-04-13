// src/modules/financial-management/printables-management/product-printables/hooks/useProductPrintables.ts
"use client";

import * as React from "react";
import { toast } from "sonner";
import type { ProductRow, FilterState, MatrixRow, VariantCell, Category, Brand } from "../types";

export const defaultFilters: FilterState = {
    q: "",
    category_ids: [],
    brand_ids: [],
    unit_ids: [],
    supplier_ids: [],
    price_type_ids: [],
    supplier_scope: "ALL",
    active_only: true,
    page: 1,
    total_pages: 0,
};

function pickId(v: string | number | null | undefined | Record<string, unknown>): number | null {
    if (v === null || v === undefined) return null;
    const n = Number((v as Record<string, unknown>)?.product_id ?? (v as Record<string, unknown>)?.id ?? v);
    return Number.isFinite(n) && n > 0 ? n : null;
}

export function useProductPrintables(
    filters: FilterState,
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>,
    categories: Category[] = [],
    brands: Brand[] = []
) {
    const [loading, setLoading] = React.useState(false);
    const [matrixRows, setMatrixRows] = React.useState<MatrixRow[]>([]);
    const [usedUnitIds, setUsedUnitIds] = React.useState<Set<number>>(new Set());


    const refresh = React.useCallback(async () => {
        setLoading(true);
        try {
            const sp = new URLSearchParams();
            if (filters.q) sp.set("q", filters.q);
            if (filters.category_ids.length) sp.set("category_ids", filters.category_ids.join(","));
            if (filters.brand_ids.length) sp.set("brand_ids", filters.brand_ids.join(","));
            if (filters.unit_ids.length) sp.set("unit_ids", filters.unit_ids.join(","));
            if (filters.supplier_ids.length) sp.set("supplier_ids", filters.supplier_ids.join(","));
            sp.set("supplier_scope", filters.supplier_scope);
            sp.set("active_only", filters.active_only ? "1" : "0");
            sp.set("page", String(filters.page));
            sp.set("page_size", "50");

            const res = await fetch(`/api/crm/printables?${sp.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch products");
            const json = await res.json();
            const products: ProductRow[] = json.data ?? [];
            const meta = json.meta ?? { total_pages: 0 };

            const catMap = new Map(categories.map(c => [Number(c.category_id), c.category_name]));
            const brandMap = new Map(brands.map(b => [Number(b.brand_id), b.brand_name]));

            // Grouping logic (now just assembling since server paginates groups)
            const groups = new Map<number, ProductRow[]>();
            const unitIds = new Set<number>();

            for (const p of products) {
                const groupId = pickId(p.parent_id) ?? pickId(p.product_id);
                if (groupId === null) continue;
                if (!groups.has(groupId)) groups.set(groupId, []);
                groups.get(groupId)!.push(p);

                const uomId = Number(p.unit_of_measurement);
                if (Number.isFinite(uomId)) unitIds.add(uomId);
            }

            const assembled: MatrixRow[] = [];
            for (const [groupId, variants] of groups.entries()) {
                const display = variants.find(v => pickId(v.product_id) === groupId) || variants[0];
                const variantsByUnitId: Record<number, VariantCell> = {};

                for (const v of variants) {
                    const uomId = Number(v.unit_of_measurement);
                    if (!Number.isFinite(uomId)) continue;

                    variantsByUnitId[uomId] = {
                        product: v,
                        tiers: {
                            ListPrice: v.cost_per_unit ? Number(v.cost_per_unit) : null,
                            A: v.priceA ? Number(v.priceA) : null,
                            B: v.priceB ? Number(v.priceB) : null,
                            C: v.priceC ? Number(v.priceC) : null,
                            D: v.priceD ? Number(v.priceD) : null,
                            E: v.priceE ? Number(v.priceE) : null,
                        }
                    };
                }

                assembled.push({
                    group_id: groupId,
                    display,
                    variantsByUnitId,
                    category_name: catMap.get(Number(display.product_category)) || "—",
                    brand_name: brandMap.get(Number(display.product_brand)) || "—",
                });
            }

            setMatrixRows(assembled);
            setUsedUnitIds(unitIds);
            setFilters(prev => ({ ...prev, total_pages: meta.total_pages }));
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to load products");
        } finally {
            setLoading(false);
        }
    }, [categories, brands, setFilters, filters.active_only, filters.brand_ids, filters.category_ids, filters.page, filters.q, filters.supplier_ids, filters.supplier_scope, filters.unit_ids]);

    React.useEffect(() => {
        refresh();
    }, [refresh]);

    return {
        loading,
        matrixRows,
        usedUnitIds,
        filters,
        setFilters,
        refresh,
        resetFilters: () => setFilters(defaultFilters),
    };
}
