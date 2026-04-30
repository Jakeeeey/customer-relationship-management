"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  ProductOption,
} from "../type";

interface Props {
  filters: InventoryFilters;
  // onApply now receives the buffered filters to apply
  onApply: (f: InventoryFilters) => void;
  onExport?: () => void;
  options: LookupOptions;
  // NOTE: search moved to InventoryReportTable; Filter no longer renders global search
}

// Lightweight local shape used inside this component for predictable state
type LocalFilters = {
  branch: string[];
  supplier: string[];
  category: string[];
  brand: string[];
  product: string[]; // selected product names (or fallback ids)
};

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
  // Keep selected values unique and derive labels from the first matching option
  const uniqValues = Array.from(new Set(values));
  const selectedLabels = uniqValues
    .map((v) => opts.find((o) => o.value === v)?.label ?? String(v))
    .filter(Boolean);
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
      <PopoverContent className="w-(--radix-popover-trigger-width) p-3">
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
              onClick={() =>
                onChange(Array.from(new Set(opts.map((o) => o.value))))
              }
            >
              Select all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange([]);
                setQuery("");

              }}
            >
              Clear
            </Button>
            
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground">No results.</div>
            ) : (
              filtered.map((opt, idx) => {
                const checked = values.includes(opt.value);
                return (
                  <label
                    key={`${String(opt.value)}-${idx}`}
                    className="flex items-center gap-2 p-1 rounded hover:bg-accent"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => {
                        const isChecked = Boolean(c);
                        if (isChecked) {
                          // add value if not already present
                          if (!values.includes(opt.value))
                            onChange([...values, opt.value]);
                        } else {
                          onChange(values.filter((v) => v !== opt.value));
                        }
                      }}
                    />
                    <span className="truncate text-sm">{opt.label}</span>
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
  return String(c.category_name ?? c.categoryName ?? c.id ?? "");
}

function brandLabel(b?: BrandOption) {
  if (!b) return "";
  return String(b.brand_name ?? b.brandName ?? b.brand ?? b.id ?? "");
}

function brandValue(b?: BrandOption) {
  if (!b) return "";
  return String(b.brand_name ?? b.brandName ?? b.id ?? "");
}

function productLabel(p?: ProductOption) {
  if (!p) return "";
  const name = String(p.product_name ?? p.productName ?? "").trim();
  const fallback = String(
    (p as Record<string, unknown>).product_id ??
      (p as Record<string, unknown>).id ??
      "",
  ).trim();
  // Show only the product name to the user. If name is missing, fall back to id.
  return name || fallback || "";
}

function productValue(p?: ProductOption) {
  if (!p) return "";
  // Use product name as the option value when available so the dropdown shows names only;
  // fall back to id/product_id if name missing.
  return String(p.product_name ?? p.productName ?? p.id ?? p.product_id ?? "");
}

export default function Filter({ filters, onApply, onExport, options }: Props) {
  const initialLocalFilters = React.useMemo<LocalFilters>(
    () => ({
      branch: Array.isArray(filters.branch)
        ? (filters.branch as string[])
        : filters.branch
          ? [String(filters.branch)]
          : [],
      supplier: Array.isArray(filters.supplier)
        ? (filters.supplier as string[])
        : filters.supplier
          ? [String(filters.supplier)]
          : [],
      category: Array.isArray(filters.category)
        ? (filters.category as string[])
        : filters.category
          ? [String(filters.category)]
          : [],
      brand: Array.isArray(filters.brand)
        ? (filters.brand as string[])
        : filters.brand
          ? [String(filters.brand)]
          : [],
      product: Array.isArray(filters.product)
        ? (filters.product as string[])
        : filters.product
          ? [String(filters.product)]
          : [],
    }),
    [filters],
  );

  const [localFilters, setLocalFilters] =
    React.useState<LocalFilters>(initialLocalFilters);

  React.useEffect(
    () => setLocalFilters(initialLocalFilters),
    [initialLocalFilters],
  );

  const handleClear = React.useCallback(() => {
    setLocalFilters({
      branch: [],
      supplier: [],
      category: [],
      brand: [],
      product: [],
    });
  }, []);

  const handleApply = React.useCallback(() => {
    onApply({
      branch: localFilters.branch,
      supplier: localFilters.supplier,
      category: localFilters.category,
      brand: localFilters.brand,
      product: localFilters.product,
    });
  }, [localFilters, onApply]);

  // Build product options deduped by product name (case-insensitive). If multiple
  // items share the same name, only the first is shown. Unnamed products fall back to id.
  const productOpts = React.useMemo(() => {
    const seen = new Map<string, ProductOption>();
    const list = options?.products ?? [];
    for (const raw of list) {
      const p = raw as ProductOption;
      const name = String(p.product_name ?? p.productName ?? "").trim();
      const key = name.toLowerCase();
      if (key) {
        if (!seen.has(key)) seen.set(key, p);
      } else {
        const id = String(p.id ?? p.product_id ?? "").trim();
        if (id && !seen.has(`__id__${id}`)) seen.set(`__id__${id}`, p);
      }
    }
    return Array.from(seen.values()).map((p) => ({
      value: productValue(p),
      label: productLabel(p),
    }));
  }, [options.products]);

  return (
    <Card>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1">
              Product
            </Label>
            <MultiSelect
              opts={productOpts}
              values={localFilters.product}
              onChange={(vals) =>
                setLocalFilters({ ...localFilters, product: vals })
              }
              placeholder="All products"
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
              values={localFilters.supplier}
              onChange={(vals) =>
                setLocalFilters({ ...localFilters, supplier: vals })
              }
              placeholder="All suppliers"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <Label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1">
              Branch
            </Label>
            <MultiSelect
              opts={(options.branches || []).map((b) => ({
                value: branchValue(b as BranchOption),
                label: branchLabel(b as BranchOption),
              }))}
              values={localFilters.branch}
              onChange={(vals) =>
                setLocalFilters({ ...localFilters, branch: vals })
              }
              placeholder="All branches"
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
              values={localFilters.category}
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
              values={localFilters.brand}
              onChange={(vals) =>
                setLocalFilters({ ...localFilters, brand: vals })
              }
              placeholder="All brands"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
          <Button size="sm" onClick={handleApply}>
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
