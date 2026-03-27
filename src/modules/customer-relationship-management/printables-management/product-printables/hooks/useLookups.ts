// src/modules/financial-management/printables-management/product-printables/hooks/useLookups.ts
"use client";

import * as React from "react";
import type { Brand, Category, Supplier, Unit, FilterState, PriceType } from "../types";
import * as api from "../providers/printablesApi";

export function useLookups(filters?: Partial<FilterState>) {
    const [loading, setLoading] = React.useState(true);
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [brands, setBrands] = React.useState<Brand[]>([]);
    const [units, setUnits] = React.useState<Unit[]>([]);
    const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
    const [priceTypes, setPriceTypes] = React.useState<PriceType[]>([]);
    const [error, setError] = React.useState<string | null>(null);

    const supplierIdsKey = filters?.supplier_ids?.join(",") ?? "";
    const categoryId = filters?.category_ids?.[0];
    const brandId = filters?.brand_ids?.[0];
    const supplierScope = filters?.supplier_scope;

    React.useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setLoading(true);
                const [res, ptRes] = await Promise.all([
                    api.getLookups({
                        supplier_ids: supplierIdsKey,
                        supplier_scope: supplierScope,
                        category_id: categoryId,
                        brand_id: brandId,
                    }),
                    fetch("/api/crm/printables/price-types").then((r) => r.json())
                ]);

                if (!mounted) return;
                setCategories(res.data.categories ?? []);
                setBrands(res.data.brands ?? []);
                setUnits(res.data.units ?? []);
                setSuppliers(res.data.suppliers ?? []);
                setPriceTypes(ptRes.data ?? []);
            } catch (err: unknown) {
                if (mounted) setError(err instanceof Error ? err.message : "Failed to load lookups");
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [supplierIdsKey, supplierScope, categoryId, brandId]);

    return { loading, error, categories, brands, units, suppliers, priceTypes };
}
