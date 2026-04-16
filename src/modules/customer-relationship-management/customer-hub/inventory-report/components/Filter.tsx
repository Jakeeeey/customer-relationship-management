"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  InventoryFilters,
  LookupOptions,
  BranchOption,
  SupplierOption,
  CategoryOption,
  BrandOption,
} from "../type";

interface Props {
  filters: InventoryFilters;
  setFilters: (f: InventoryFilters) => void;
  // onApply now receives the buffered filters to apply
  onApply: (f: InventoryFilters) => void;
  // onClear is kept for compatibility but will not trigger a refresh
  onClear: () => void;
  onExport?: () => void;
  options: LookupOptions;
  // optional global search controlled by parent
  search?: string;
  onSearchChange?: (v: string) => void;
}

// MultiSelect component declared at module level to avoid creating components during render
function MultiSelect({
  opts,
  values,
  onChange,
  placeholder,
}: {
  opts: { value: string; label: string }[];
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const selectedLabels = opts
    .filter((o) => values.includes(o.value))
    .map((o) => o.label);

  const [query, setQuery] = React.useState("");

  const lower = query.trim().toLowerCase();
  const filtered = lower
    ? opts.filter(
        (o) =>
          o.label.toLowerCase().includes(lower) ||
          String(o.value).toLowerCase().includes(lower),
      )
    : opts;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full text-left h-10 text-sm font-semibold tracking-wide border-muted-foreground/20 rounded-xl shadow-sm bg-white"
        >
          <span
            className={`${values.length === 0 ? "text-muted-foreground" : ""} truncate`}
          >
            {values.length === 0
              ? (placeholder ?? "All")
              : selectedLabels.length > 2
                ? `${selectedLabels.length} selected`
                : selectedLabels.join(", ")}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-3 ">
        <div className="flex flex-col">
          <Input
            placeholder={`Search ${placeholder?.toLowerCase() ?? "options"}...`}
            value={query}
            onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
            className="mb-2"
          />

          <div className="flex gap-2 mb-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(opts.map((o) => o.value))}
            >
              Select all
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onChange([])}>
              Clear
            </Button>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground">No results.</div>
            ) : (
              filtered.map((opt) => {
                const checked = values.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 p-1 rounded hover:bg-accent"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => {
                        const isChecked = Boolean(c);
                        if (isChecked) onChange([...values, opt.value]);
                        else onChange(values.filter((v) => v !== opt.value));
                      }}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function branchLabel(b?: BranchOption) {
  if (!b) return "";
  return String(b.branch_name ?? b.branch ?? b.branchName ?? b.id ?? "");
}

function branchValue(b?: BranchOption) {
  if (!b) return "";
  return String(b.branch_name ?? b.branch ?? b.id ?? "");
}

function supplierLabel(s?: SupplierOption) {
  if (!s) return "";
  return String(
    s.supplier_shortcut ?? s.supplier_name ?? s.supplierName ?? s.id ?? "",
  );
}

function supplierValue(s?: SupplierOption) {
  if (!s) return "";
  return String(s.supplier_shortcut ?? s.supplier_name ?? s.id ?? "");
}

function categoryLabel(c?: CategoryOption) {
  if (!c) return "";
  return String(c.category_name ?? c.categoryName ?? c.id ?? "");
}

function categoryValue(c?: CategoryOption) {
  if (!c) return "";
  return String(c.category_name ?? c.category_id ?? c.id ?? "");
}

function brandLabel(b?: BrandOption) {
  if (!b) return "";
  return String(b.brand_name ?? b.brandName ?? b.id ?? "");
}

function brandValue(b?: BrandOption) {
  if (!b) return "";
  return String(b.brand_name ?? b.brand_id ?? b.id ?? "");
}

export function Filter({
  filters,
  setFilters,
  onApply,
  onClear,
  onExport,
  options,
  search,
  onSearchChange,
}: Props) {
  // Local buffer for filters so changes don't trigger immediate refresh
  const toArray = (v?: string | string[] | undefined) => {
    if (!v) return [] as string[];
    if (Array.isArray(v)) return v as string[];
    const s = String(v);
    if (s.toLowerCase() === "all") return [] as string[];
    return [s];
  };

  const [localFilters, setLocalFilters] = React.useState<InventoryFilters>(
    () => ({
      branch: toArray(filters.branch),
      supplier: toArray(filters.supplier),
      category: toArray(filters.category),
      brand: toArray(filters.brand),
    }),
  );

  // Keep local buffer in sync when parent filters change (e.g. external reset)
  React.useEffect(() => {
    setLocalFilters({
      branch: toArray(filters.branch),
      supplier: toArray(filters.supplier),
      category: toArray(filters.category),
      brand: toArray(filters.brand),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);
  return (
    <Card className="border   shadow-sm border-muted-foreground/10 overflow-hidden p-0">
      <CardHeader className="text-[12px] bg-slate-50/50 dark:bg-card p-4 px-4 font-black    flex items-center justify-between border-b uppercase text-slate-400 tracking-widest">
        Filters
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-4">
        {onSearchChange !== undefined && (
          <div>
            <Input
              placeholder="Search products..."
              value={search ?? ""}
              onChange={(e) =>
                onSearchChange?.((e.target as HTMLInputElement).value)
              }
              className="mb-2"
              title="Global search across product name/code/brand/category/supplier/branch"
            />
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1">
              Branch
            </Label>
            <MultiSelect
              opts={(options.branches || []).map((b) => ({
                value: branchValue(b as BranchOption),
                label: branchLabel(b as BranchOption),
              }))}
              values={
                Array.isArray(localFilters.branch)
                  ? (localFilters.branch as string[])
                  : localFilters.branch
                    ? [String(localFilters.branch)]
                    : []
              }
              onChange={(vals) =>
                setLocalFilters({ ...localFilters, branch: vals })
              }
              placeholder="All branches"
            />
          </div>

          <div>
            <Label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1">
              Supplier
            </Label>
            <MultiSelect
              opts={(options.suppliers || []).map((s) => ({
                value: supplierValue(s as SupplierOption),
                label: supplierLabel(s as SupplierOption),
              }))}
              values={
                Array.isArray(localFilters.supplier)
                  ? (localFilters.supplier as string[])
                  : localFilters.supplier
                    ? [String(localFilters.supplier)]
                    : []
              }
              onChange={(vals) =>
                setLocalFilters({ ...localFilters, supplier: vals })
              }
              placeholder="All suppliers"
            />
          </div>

          <div>
            <Label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1">
              Category
            </Label>
            <MultiSelect
              opts={(options.categories || []).map((c) => ({
                value: categoryValue(c as CategoryOption),
                label: categoryLabel(c as CategoryOption),
              }))}
              values={
                Array.isArray(localFilters.category)
                  ? (localFilters.category as string[])
                  : localFilters.category
                    ? [String(localFilters.category)]
                    : []
              }
              onChange={(vals) =>
                setLocalFilters({ ...localFilters, category: vals })
              }
              placeholder="All categories"
            />
          </div>

          <div>
            <Label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1">
              Brand
            </Label>
            <MultiSelect
              opts={(options.brands || []).map((b) => ({
                value: brandValue(b as BrandOption),
                label: brandLabel(b as BrandOption),
              }))}
              values={
                Array.isArray(localFilters.brand)
                  ? (localFilters.brand as string[])
                  : localFilters.brand
                    ? [String(localFilters.brand)]
                    : []
              }
              onChange={(vals) =>
                setLocalFilters({ ...localFilters, brand: vals })
              }
              placeholder="All brands"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setLocalFilters({
                branch: [],
                supplier: [],
                category: [],
                brand: [],
              })
            }
          >
            Clear
          </Button>
          <Button
            size="sm"
            onClick={() => {
              // Only apply when user clicks Apply: notify parent with buffered filters
              onApply({
                branch: Array.isArray(localFilters.branch)
                  ? localFilters.branch
                  : localFilters.branch
                    ? [String(localFilters.branch)]
                    : [],
                supplier: Array.isArray(localFilters.supplier)
                  ? localFilters.supplier
                  : localFilters.supplier
                    ? [String(localFilters.supplier)]
                    : [],
                category: Array.isArray(localFilters.category)
                  ? localFilters.category
                  : localFilters.category
                    ? [String(localFilters.category)]
                    : [],
                brand: Array.isArray(localFilters.brand)
                  ? localFilters.brand
                  : localFilters.brand
                    ? [String(localFilters.brand)]
                    : [],
              });
            }}
          >
            Apply
          </Button>
          {onExport && (
            <Button size="sm" variant="outline" onClick={onExport}>
              Preview Export
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default Filter;
