// src/modules/financial-management/printables-management/product-printables/components/ProductPrintablesView.tsx
"use client";

import * as React from "react";
import { useProductPrintables, defaultFilters } from "../hooks/useProductPrintables";
import { useLookups } from "../hooks/useLookups";
import type { MatrixRow, FilterState, ProductRow, VariantCell } from "../types";
import PrintablesFiltersBar from "./PrintablesFiltersBar";
import PrintablesMatrixTable from "./PrintablesMatrixTable";
import PrintLabelsDialog from "./PrintLabelsDialog";
import { Button } from "@/components/ui/button";
import { Printer, ChevronLeft, ChevronRight } from "lucide-react";

import { toast } from "sonner";

function pickId(v: string | number | null | undefined | Record<string, unknown>): number | null {
    if (v === null || v === undefined) return null;
    const n = Number((v as Record<string, unknown>)?.product_id ?? (v as Record<string, unknown>)?.id ?? v);
    return Number.isFinite(n) && n > 0 ? n : null;
}

export default function ProductPrintablesView() {
    const [filters, setFilters] = React.useState<FilterState>(defaultFilters);
    const { categories, brands, units, suppliers, priceTypes, loading: lookupsLoading } = useLookups(filters);
    const { matrixRows, usedUnitIds, loading: productsLoading, resetFilters } = useProductPrintables(filters, setFilters, categories, brands);
    const [printOpen, setPrintOpen] = React.useState(false);
    const [isPrinting, setIsPrinting] = React.useState(false);
    const [allMatrixRows, setAllMatrixRows] = React.useState<MatrixRow[]>([]);
    const [allUsedUnitIds, setAllUsedUnitIds] = React.useState<Set<number>>(new Set());

    const handlePrintAll = async () => {
        setIsPrinting(true);
        try {
            const sp = new URLSearchParams();
            if (filters.q) sp.set("q", filters.q);
            if (filters.category_ids.length) sp.set("category_ids", filters.category_ids.join(","));
            if (filters.brand_ids.length) sp.set("brand_ids", filters.brand_ids.join(","));
            if (filters.unit_ids.length) sp.set("unit_ids", filters.unit_ids.join(","));
            if (filters.supplier_ids.length) sp.set("supplier_ids", filters.supplier_ids.join(","));
            sp.set("supplier_scope", filters.supplier_scope);
            sp.set("active_only", filters.active_only ? "1" : "0");
            sp.set("page_size", "-1"); // Custom param to fetch all

            const res = await fetch(`/api/crm/printables?${sp.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch all products for printing");
            const json = await res.json();
            const products = json.data ?? [];

            const catMap = new Map(categories.map(c => [Number(c.category_id), c.category_name]));
            const brandMap = new Map(brands.map(b => [Number(b.brand_id), b.brand_name]));

            const groups = new Map<number, ProductRow[]>();
            const unitIds = new Set<number>();

            for (const p of products) {
                const pid = pickId(p.product_id);
                const parentId = pickId(p.parent_id);
                const gid = parentId || pid;

                if (gid) {
                    if (!groups.has(gid)) groups.set(gid, []);
                    groups.get(gid)!.push(p);
                }

                const uomId = pickId(p.unit_of_measurement);
                if (uomId) unitIds.add(uomId);
            }

            const assembled: MatrixRow[] = [];
            for (const [groupId, variants] of groups.entries()) {
                const display = variants.find(v => Number(v.product_id) === groupId) || variants[0];
                const variantsByUnitId: Record<number, VariantCell> = {};

                for (const v of variants) {
                    const uomId = Number(v.unit_of_measurement);
                    if (uomId) {
                        variantsByUnitId[uomId] = {
                            product: v,
                            tiers: {
                                A: v.priceA ? Number(v.priceA) : null,
                                B: v.priceB ? Number(v.priceB) : null,
                                C: v.priceC ? Number(v.priceC) : null,
                                D: v.priceD ? Number(v.priceD) : null,
                                E: v.priceE ? Number(v.priceE) : null,
                            }
                        };
                    }
                }

                assembled.push({
                    group_id: groupId,
                    display,
                    variantsByUnitId,
                    category_name: catMap.get(Number(display.product_category)) || "—",
                    brand_name: brandMap.get(Number(display.product_brand)) || "—",
                });
            }

            setAllMatrixRows(assembled);
            setAllUsedUnitIds(unitIds);
            setPrintOpen(true);

            if (assembled.length > 0) {
                toast.success(`Prepared ${assembled.length} groups for printing.`);
            }
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to prepare print data");
            console.error(error);
        } finally {
            setIsPrinting(false);
        }
    };

    const handlePrevPage = () => {
        setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }));
    };

    const handleNextPage = () => {
        setFilters(prev => ({ ...prev, page: Math.min(prev.total_pages, prev.page + 1) }));
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                        Filter and generate spreadsheet-style matrix reports for your products.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handlePrintAll}
                        disabled={productsLoading || lookupsLoading || isPrinting}
                        className="rounded-xl px-6 gap-2"
                    >
                        <Printer className="w-4 h-4" />
                        {isPrinting ? "Prepping All Rows..." : "Print Spreadsheet"}
                    </Button>
                </div>
            </div>

            <PrintablesFiltersBar
                filters={filters}
                setFilters={setFilters}
                resetFilters={resetFilters}
                categories={categories}
                brands={brands}
                units={units}
                suppliers={suppliers}
                priceTypes={priceTypes}
            />

            <PrintablesMatrixTable
                rows={matrixRows}
                loading={productsLoading}
                priceTypes={priceTypes}
                units={units}
                usedUnitIds={usedUnitIds}
                selectedPriceTypeIds={filters.price_type_ids}
            />

            {/* Pagination Controls */}
            {filters.total_pages > 1 && (
                <div className="flex items-center justify-between px-2 py-4 bg-muted/20 rounded-2xl border border-border/50">
                    <div className="text-sm text-muted-foreground">
                        Page <span className="font-bold text-foreground">{filters.page}</span> of <span className="font-bold text-foreground">{filters.total_pages}</span>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={filters.page === 1 || productsLoading}
                            onClick={handlePrevPage}
                            className="rounded-lg gap-1"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={filters.page === filters.total_pages || productsLoading}
                            onClick={handleNextPage}
                            className="rounded-lg gap-1"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            <PrintLabelsDialog
                open={printOpen}
                onOpenChange={setPrintOpen}
                rows={allMatrixRows}
                priceTypes={priceTypes}
                units={units}
                usedUnitIds={allUsedUnitIds}
                supplier={filters.supplier_ids.length === 1 ? suppliers.find(s => String(s.id) === filters.supplier_ids[0]) : null}
                selectedPriceTypeIds={filters.price_type_ids}
            />
        </div>
    );
}
