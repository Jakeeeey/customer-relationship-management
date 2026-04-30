//src\modules\customer-relationship-management\customer-hub\inventory-report\components\InventoryReportTable.tsx
"use client";

import React, { useMemo } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { InventoryRow } from "../type";

interface Props {
  rows: InventoryRow[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  isLoading?: boolean;
  sortBy:
    | "product"
    | "branch"
    | "brand"
    | "category"
    | "supplier"
    | "current"
    | "allocated"
    | "available"
    | "inbound"
    | "projected";
  sortDir: "asc" | "desc";
  onSort: (
    by:
      | "product"
      | "supplier"
      | "category"
      | "branch"
      | "brand"
      | "current"
      | "allocated"
      | "available"
      | "inbound"
      | "projected",
  ) => void;
  // optional global search controlled by parent
  search?: string;
  onSearchChange?: (v: string) => void;
}

function getString(r: InventoryRow, keys: string[]) {
  for (const k of keys) {
    const v = (r as Record<string, unknown>)[k];
    if (v == null) continue;
    return String(v);
  }
  return "";
}

function getNumber(r: InventoryRow, keys: string[]) {
  for (const k of keys) {
    const v = (r as Record<string, unknown>)[k];
    if (v == null) continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

// type Primitive = string | number | null | undefined;

type DeepRecord = Record<string, unknown>;

export function getObjectString(v: unknown, keys: string[]): string {
  if (v == null) return "";

  if (typeof v === "string" || typeof v === "number") {
    return String(v).trim();
  }

  if (typeof v !== "object") return "";

  const obj = v as DeepRecord;

  // prioritized key lookup
  if (keys?.length) {
    for (const k of keys) {
      const candidate = obj[k];

      if (candidate == null) continue;

      if (typeof candidate === "string" || typeof candidate === "number") {
        const s = String(candidate).trim();
        if (s) return s;
      }

      if (typeof candidate === "object") {
        const s = getObjectString(candidate, []);
        if (s) return s;
      }
    }
  }

  // fallback deep scan
  for (const k in obj) {
    const candidate = obj[k];

    if (candidate == null) continue;

    if (typeof candidate === "string" || typeof candidate === "number") {
      const s = String(candidate).trim();
      if (s) return s;
    }

    if (typeof candidate === "object") {
      const s = getObjectString(candidate, []);
      if (s) return s;
    }
  }

  return "";
}

function getUnitLabel(r: InventoryRow) {
  const row = r as Record<string, unknown>;
  const directCandidates = [
    row["unit"],
    row["uom"],
    row["unit_of_measurement"],
    row["unitOfMeasurement"],
    row["uom_name"],
    row["unit_name"],
    row["unitName"],
  ];

  for (const candidate of directCandidates) {
    const direct = getObjectString(candidate, []);
    if (direct) return direct;
  }

  const nestedCandidates = [
    row["unit_of_measurement"],
    row["unitOfMeasurement"],
    row["unit"],
    row["uom"],
  ];

  for (const candidate of nestedCandidates) {
    const nested = getObjectString(candidate, [
      "unit_name",
      "unitName",
      "uom_name",
      "uom",
      "name",
      "label",
      "abbreviation",
      "short_name",
      "shortName",
      "description",
      "unit_of_measurement",
      "unitOfMeasurement",
      "value",
    ]);
    if (nested) return nested;
  }

  return "";
}

function normalizeUnit(u?: unknown) {
  if (!u) return "other";

  const s = String(u).toLowerCase().trim();

  if (s.includes("box")) return "box";
  if (s.includes("pack")) return "pack";
  if (s.includes("tie")) return "tie";

  if (s.includes("pcs") || s.includes("piece") || s === "pc") return "pcs";

  return "other";
}

function HoverPopover({
  children,
  content,
  align = "end",
  className,
  showDelay = 0,
  hideDelay = 240,
  duration = 160,
}: {
  children: React.ReactElement;
  content: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
  showDelay?: number; // ms before opening
  hideDelay?: number; // ms before closing
  duration?: number; // animation duration in ms
}) {
  const [open, setOpen] = React.useState(false);
  const showTimer = React.useRef<number | null>(null);
  const hideTimer = React.useRef<number | null>(null);

  const clearTimers = () => {
    if (showTimer.current) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  React.useEffect(() => () => clearTimers(), []);

  const handleEnter = () => {
    // cancel pending hide and schedule show
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    if (!open && !showTimer.current) {
      showTimer.current = window.setTimeout(() => {
        setOpen(true);
        showTimer.current = null;
      }, showDelay) as unknown as number;
    }
  };

  const handleLeave = () => {
    // cancel pending show and schedule hide
    if (showTimer.current) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (open && !hideTimer.current) {
      hideTimer.current = window.setTimeout(() => {
        setOpen(false);
        hideTimer.current = null;
      }, hideDelay) as unknown as number;
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        clearTimers();
        setOpen(v);
      }}
    >
      <PopoverTrigger
        asChild
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className={className}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        style={{ animationDuration: `${duration}ms` }}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}

function formatBoxes(v: number) {
  // Use a fixed 4-decimal rendering then parseFloat to trim trailing zeros
  if (!Number.isFinite(v)) return "0";
  const fixed = v.toFixed(4);
  const n = parseFloat(fixed);
  if (Number.isNaN(n)) return "0";
  return n.toString();
}

function formatPcs(v: number) {
  try {
    return new Intl.NumberFormat(undefined).format(Math.round(v));
  } catch {
    return String(Math.round(v));
  }
}

function formatMoney(v: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(v));
  } catch {
    return Number(v).toFixed(2);
  }
}

function analyzeGroup(items: InventoryRow[]) {
  let totalPiecesCurrent = 0;
  let totalPiecesAllocated = 0;
  let totalPiecesInbound = 0;

  // raw per-row unit info
  const unitInfoRaw: {
    unit: string;
    unitType: string;
    unitCount: number;
    rawCurrent: number;
    rawAllocated: number;
    rawInbound: number;
    costPerUnit: number;
  }[] = [];

  for (const r of items) {
    const unit = getUnitLabel(r).trim();
    const unitType = normalizeUnit(unit);
    const unitCount =
      getNumber(r, ["unitCount", "unit_count", "unitcount"]) || 1;

    const rawCurrent =
      getNumber(r, [
        "current",
        "onhand",
        "on_hand",
        "onHand",
        "quantity",
        "qty",
      ]) || 0;
    const rawAllocated =
      getNumber(r, [
        "allocated",
        "allocated_qty",
        "allocatedQuantity",
        "current_allocated",
      ]) || 0;
    const rawInbound =
      getNumber(r, [
        "projected",
        "inboxProjected",
        "inbox_projected",
        "inbox",
        "inbound",
      ]) || 0;

    const costPerUnit =
      getNumber(r as InventoryRow, ["costPerUnit", "cost_per_unit", "price"]) ||
      0;

    unitInfoRaw.push({
      unit,
      unitType,
      unitCount,
      rawCurrent,
      rawAllocated,
      rawInbound,
      costPerUnit,
    });

    totalPiecesCurrent += rawCurrent * unitCount;
    totalPiecesAllocated += rawAllocated * unitCount;
    totalPiecesInbound += rawInbound * unitCount;
  }

  // Aggregate by unit name (case-insensitive) to avoid duplicate unit rows in popover
  const agg = new Map<
    string,
    {
      unit: string;
      unitType: string;
      unitCount: number;
      rawCurrent: number;
      rawAllocated: number;
      rawInbound: number;
      costPerUnit: number; // weighted average per unit
    }
  >();

  for (const u of unitInfoRaw) {
    const key = `${(u.unit || "unit").toLowerCase().trim()}::${Math.max(
      1,
      Number(u.unitCount || 1),
    )}`;
    const existing = agg.get(key);
    if (!existing) {
      agg.set(key, { ...u });
      continue;
    }

    // merge sums
    const merged = {
      unit: existing.unit || u.unit,
      unitType: existing.unitType || u.unitType,
      unitCount: Math.max(existing.unitCount || 1, u.unitCount || 1),
      rawCurrent: (existing.rawCurrent || 0) + (u.rawCurrent || 0),
      rawAllocated: (existing.rawAllocated || 0) + (u.rawAllocated || 0),
      rawInbound: (existing.rawInbound || 0) + (u.rawInbound || 0),
      costPerUnit: 0,
    };

    // compute weighted cost per unit where possible (weight by current pieces)
    const existingPieces =
      (existing.rawCurrent || 0) * (existing.unitCount || 1);
    const newPieces = (u.rawCurrent || 0) * (u.unitCount || 1);
    if ((existing.costPerUnit || 0) > 0 && (u.costPerUnit || 0) > 0) {
      const totalWeight = existingPieces + newPieces;
      if (totalWeight > 0) {
        const existingSum = (existing.costPerUnit || 0) * existingPieces;
        const newSum = (u.costPerUnit || 0) * newPieces;
        merged.costPerUnit = (existingSum + newSum) / totalWeight;
      } else {
        // fallback: if no pieces, prefer any non-zero cost
        merged.costPerUnit = existing.costPerUnit || u.costPerUnit || 0;
      }
    } else {
      merged.costPerUnit = existing.costPerUnit || u.costPerUnit || 0;
    }

    agg.set(key, merged);
  }

  const unitInfo = Array.from(agg.values());

  // pick box unitCount: prefer explicit box row, else largest unitCount
  const boxRow = unitInfo.find((u) => u.unitType === "box" && u.unitCount > 0);
  const boxUnitCount = boxRow
    ? boxRow.unitCount
    : unitInfo.reduce((acc, it) => Math.max(acc, it.unitCount), 1);

  // cost per box: prefer box row cost, else derive from piece cost
  let costPerBox = 0;
  if (boxRow && boxRow.costPerUnit > 0) costPerBox = boxRow.costPerUnit;
  else {
    const anyCost = unitInfo.find((u) => u.costPerUnit > 0);
    if (anyCost) costPerBox = anyCost.costPerUnit * boxUnitCount;
  }

  const boxesCurrent = totalPiecesCurrent / boxUnitCount;
  const boxesAllocated = totalPiecesAllocated / boxUnitCount;
  const boxesInbound = totalPiecesInbound / boxUnitCount;
  const availableBoxes = boxesCurrent - boxesAllocated;
  const projectedBoxes = boxesCurrent - boxesAllocated + boxesInbound;

  return {
    totalPiecesCurrent,
    totalPiecesAllocated,
    totalPiecesInbound,
    boxUnitCount,
    costPerBox,
    boxesCurrent,
    boxesAllocated,
    boxesInbound,
    availableBoxes,
    projectedBoxes,
    unitInfo,
  };
}

export default function InventoryReportTable({
  rows,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  sortBy,
  sortDir,
  onSort,
  search,
  onSearchChange,
}: Props) {
  // Group rows by product key (prefer productDescription/product name)
  const groups = useMemo(() => {
    const m = new Map<string, InventoryRow[]>();

    const canonical = (s: string) =>
      s
        ? s
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase()
        : "";

    for (const r of rows) {
      const name =
        getString(r, ["productDescription", "product_description"]) ||
        getString(r, ["product_name", "productName", "name", "item"]);
      const code = getString(r, ["productCode", "product_code", "code", "sku"]);
      const id = getString(r, ["productId", "product_id", "id"]);

      let skuKeySource = name || code || id || JSON.stringify(r).slice(0, 64);
      skuKeySource = String(skuKeySource).trim();
      const skuKey = canonical(skuKeySource) || skuKeySource;

      const arr = m.get(skuKey) ?? [];
      arr.push(r);
      m.set(skuKey, arr);
    }

    return Array.from(m.entries()).map(([key, items]) => ({ key, items }));
  }, [rows]);

  const sortedGroups = useMemo(() => {
    const to4 = (v: number) => (Number.isFinite(v) ? Number(v.toFixed(4)) : 0);

    const decorated = groups.map((g) => {
      const first = g.items[0];
      const analysis = analyzeGroup(g.items);
      return {
        ...g,
        analysis,
        productName: getString(first, [
          "productDescription",
          "product_description",
          "product_name",
          "productName",
          "name",
          "item",
        ]),
        brand: getString(first, ["brand", "brand_name", "brandName"]),
        category: getString(first, ["category", "category_name"]),
        branch: getString(first, ["branch", "branch_name"]),
        supplier: getString(first, ["supplier", "supplier_name"]),
      };
    });

    decorated.sort((a, b) => {
      let res = 0;
      switch (sortBy) {
        case "product":
          res = a.productName.localeCompare(b.productName);
          break;
        case "branch":
          res = a.branch.localeCompare(b.branch);
          break;
        case "category":
          res = a.category.localeCompare(b.category);
          break;
        case "brand":
          res = a.brand.localeCompare(b.brand);
          break;
        case "supplier":
          res = a.supplier.localeCompare(b.supplier);
          break;
        case "current":
          res = to4(a.analysis.boxesCurrent) - to4(b.analysis.boxesCurrent);
          break;
        case "allocated":
          res = to4(a.analysis.boxesAllocated) - to4(b.analysis.boxesAllocated);
          break;
        case "inbound":
          res = to4(a.analysis.boxesInbound) - to4(b.analysis.boxesInbound);
          break;
        case "projected":
          res = to4(a.analysis.projectedBoxes) - to4(b.analysis.projectedBoxes);
          break;
        case "available":
        default:
          res = to4(a.analysis.availableBoxes) - to4(b.analysis.availableBoxes);
          break;
      }

      if (res === 0) {
        res = a.productName.localeCompare(b.productName);
      }

      return sortDir === "asc" ? res : -res;
    });

    return decorated;
  }, [groups, sortBy, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sortedGroups.length / pageSize));
  const visible = sortedGroups.slice(
    (page - 1) * pageSize,
    (page - 1) * pageSize + pageSize,
  );

  const renderSortIcon = (key: Props["sortBy"]) => {
    if (sortBy !== key) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
    }

    if (sortDir === "asc") {
      return <ArrowUp className="h-3.5 w-3.5 text-foreground" />;
    }

    return <ArrowDown className="h-3.5 w-3.5 text-foreground" />;
  };

  const renderSortableHeader = (
    label: string,
    key: Props["sortBy"],
    align: "left" | "right" = "left",
  ) => (
    <button
      type="button"
      onClick={() => onSort(key)}
      className={`inline-flex w-full items-center gap-1.5 font-bold uppercase tracking-wide text-[11px] ${align === "right" ? "justify-end" : "justify-start"}`}
      aria-label={`Sort by ${label.toLowerCase()}`}
    >
      <span>{label}</span>
      {renderSortIcon(key)}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[12px]  font-black    flex items-center justify-between  uppercase text-slate-400 tracking-widest">
        Inventory Report Table
      </div>
      <div>
        {onSearchChange !== undefined && (
          <div>
            <Input
              placeholder="Search products..."
              value={search ?? ""}
              onChange={(e) =>
                onSearchChange?.((e.target as HTMLInputElement).value)
              }
              className="mb-2"
              // title="Global search across product name/code/brand/category/supplier/branch"
            />
          </div>
        )}
      </div>
      <div className="rounded-md border border-border overflow-auto bg-background">
        <Table>
          <TableHeader className="bg-muted/50 border-b">
            <TableRow>
              <TableHead className="font-bold whitespace-nowrap text-foreground w-40">
                {renderSortableHeader("SUPPLIER", "supplier")}
              </TableHead>
              <TableHead className="font-bold whitespace-nowrap text-foreground w-40">
                {renderSortableHeader("CATEGORY", "category")}
              </TableHead>
              <TableHead className="font-bold whitespace-nowrap text-foreground w-40">
                {renderSortableHeader("BRAND", "brand")}
              </TableHead>
              <TableHead className="font-bold min-w-75 text-foreground">
                {renderSortableHeader("PRODUCT", "product")}
              </TableHead>
              <TableHead className="font-bold text-right whitespace-nowrap text-foreground w-35">
                {renderSortableHeader("AVAILABLE", "available", "right")}
              </TableHead>
              <TableHead className="font-bold text-right whitespace-nowrap text-foreground w-35">
                {renderSortableHeader("CURRENT", "current", "right")}
              </TableHead>
              <TableHead className="font-bold text-right whitespace-nowrap text-foreground w-35">
                {renderSortableHeader("ALLOCATED", "allocated", "right")}
              </TableHead>
              <TableHead className="font-bold text-right whitespace-nowrap text-foreground w-35">
                {renderSortableHeader("INBOUND", "inbound", "right")}
              </TableHead>
              <TableHead className="font-bold text-right whitespace-nowrap text-foreground w-40">
                {renderSortableHeader(
                  "PROJECTED INVENTORY",
                  "projected",
                  "right",
                )}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={9}>
                  <div className="p-4">
                    <Skeleton className="h-6 w-full" />
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              visible.map((g, idx) => {
                const a = g.analysis;

                function buildPopover(
                  metric:
                    | "current"
                    | "allocated"
                    | "available"
                    | "inbound"
                    | "projected",
                ) {
                  // Build distinct unit columns from the aggregated unitInfo
                  // preserve uniqueness by unit label + unitCount
                  const unitMap = new Map(
                    a.unitInfo.map((u) => [
                      `${(u.unit || "").toString().toLowerCase().trim()}::${Math.max(
                        1,
                        Number(u.unitCount || 1),
                      )}`,
                      u,
                    ]),
                  );

                  const unitCols = Array.from(unitMap.values());
                  const UNIT_PRIORITY: Record<string, number> = {
                    box: 0,
                    tie: 1,
                    pack: 2,
                    pieces: 3,
                    pcs: 3,
                    other: 4,
                  };
                  // Normalize into column descriptors and sort: boxes, packs, pcs, others
                  const columns = unitCols
                    .map((u) => ({
                      key: `${(u.unit || "").toString().toLowerCase().trim()}::${Math.max(
                        1,
                        Number(u.unitCount || 1),
                      )}`,
                      label:
                        (u.unit && String(u.unit).trim()) ||
                        (u.unitType === "box"
                          ? "Boxes"
                          : u.unitType === "pack"
                            ? "Packs"
                            : "Pcs"),
                      unitCount: Math.max(1, Number(u.unitCount || 1)),
                      unitType: u.unitType,
                    }))

                    .sort((a, b) => {
                      const rank = (t: string) =>
                        UNIT_PRIORITY[t?.toLowerCase()] ?? UNIT_PRIORITY.other;

                      return rank(a.unitType) - rank(b.unitType);
                    });

                  // console.log(columns);
                  // console.log(a.unitInfo)

                  const sumForColumn = (col: {
                    key: string;
                    label: string;
                    unitCount: number;
                    unitType: string;
                  }) =>
                    a.unitInfo
                      .filter(
                        (u) =>
                          `${(u.unit || "").toString().toLowerCase().trim()}::${Math.max(
                            1,
                            Number(u.unitCount || 1),
                          )}` === col.key,
                      )
                      .reduce((s, u) => {
                        const val =
                          metric === "current"
                            ? u.rawCurrent
                            : metric === "allocated"
                              ? u.rawAllocated
                              : metric === "inbound"
                                ? u.rawInbound
                                : metric === "available"
                                  ? u.rawCurrent - u.rawAllocated
                                  : u.rawCurrent -
                                    u.rawAllocated +
                                    u.rawInbound;
                        return s + (Number(val) || 0);
                      }, 0);

                  const apiRowValues = columns.map((c) =>
                    String(sumForColumn(c)),
                  );
                  // console.log(apiRowValues)

                  let totalPieces = 0;
                  if (metric === "current") totalPieces = a.totalPiecesCurrent;
                  else if (metric === "allocated")
                    totalPieces = a.totalPiecesAllocated;
                  else if (metric === "inbound")
                    totalPieces = a.totalPiecesInbound;
                  else if (metric === "projected")
                    totalPieces =
                      a.totalPiecesCurrent -
                      a.totalPiecesAllocated +
                      a.totalPiecesInbound;
                  else if (metric === "available")
                    totalPieces = a.totalPiecesCurrent - a.totalPiecesAllocated;

                  const calcRowValues = columns.map((c) => {
                    // Show converted value into the column's unit
                    if ((c.unitCount || 1) > 1)
                      return formatBoxes(totalPieces / c.unitCount);
                    return formatPcs(totalPieces);
                  });

                  const valueBoxes =
                    (totalPieces / a.boxUnitCount) * (a.costPerBox || 0);

                  const colsClass =
                    columns.length === 1
                      ? "grid-cols-1"
                      : columns.length === 2
                        ? "grid-cols-2"
                        : columns.length === 3
                          ? "grid-cols-3"
                          : "grid-cols-4";

                  return (
                    <div className="text-xs">
                      <div className="font-medium  text-right mb-1">
                        {metric.toUpperCase()}
                      </div>

                      <div
                        className={`grid ${colsClass} gap-2 text-right mb-2`}
                      >
                        {columns.map((c) => (
                          <div
                            key={c.key}
                            className="text-muted-foreground text-[12px]"
                          >
                            {c.label}
                          </div>
                        ))}
                      </div>

                      <div
                        className={`grid ${colsClass} gap-2 font-mono text-sm`}
                      >
                        {apiRowValues.map((v, i) => (
                          <div key={`api-${i}`} className="text-right">
                            {v}
                          </div>
                        ))}
                      </div>

                      <div
                        className={`grid ${colsClass} gap-2  mt-1 font-mono text-sm`}
                      >
                        {calcRowValues.map((v, i) => (
                          <div key={`calc-${i}`} className="text-right">
                            {v}
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 font-mono text-right">
                        Total Amount:{" "}
                        {a.costPerBox ? formatMoney(valueBoxes) : ""}
                      </div>
                    </div>
                  );
                }

                return (
                  <TableRow
                    key={g.key + idx}
                    className="text-xs border-border hover:bg-muted/30"
                  >
                    <TableCell
                      className="whitespace-nowrap"
                      title={
                        getString(g.items[0] as InventoryRow, [
                          "supplier",
                          "supplier_name",
                          "supplier_shortcut",
                        ]) || "-"
                      }
                    >
                      {getString(g.items[0] as InventoryRow, [
                        "supplier",
                        "supplier_name",
                        "supplier_shortcut",
                      ]) || "-"}
                    </TableCell>

                    <TableCell className="whitespace-nowrap" title={g.category}>
                      {g.category}
                    </TableCell>

                    <TableCell className="whitespace-nowrap" title={g.brand}>
                      {g.brand || "-"}
                    </TableCell>

                    <TableCell className="max-w-75">
                      <div className="truncate text-sm" title={g.productName}>
                        {g.productName || "-"}
                      </div>
                    </TableCell>

                    <TableCell className="text-right font-mono">
                      <HoverPopover
                        content={buildPopover("available")}
                        align="end"
                        className="p-3 shadow-lg border-border bg-popover"
                        showDelay={0}
                        hideDelay={240}
                        duration={160}
                      >
                        <button className="font-mono text-right w-full text-sm">
                          {formatBoxes(a.availableBoxes)}
                        </button>
                      </HoverPopover>
                    </TableCell>

                    <TableCell className="text-right font-mono font-semibold">
                      <HoverPopover
                        content={buildPopover("current")}
                        align="end"
                        className="p-3 shadow-lg border-border bg-popover"
                        showDelay={0}
                        hideDelay={240}
                        duration={160}
                      >
                        <button className="font-mono text-right w-full text-sm">
                          {formatBoxes(a.boxesCurrent)}
                        </button>
                      </HoverPopover>
                    </TableCell>

                    <TableCell className="text-right font-mono text-muted-foreground">
                      <HoverPopover
                        content={buildPopover("allocated")}
                        align="end"
                        className="p-3 shadow-lg border-border bg-popover"
                        showDelay={0}
                        hideDelay={240}
                        duration={160}
                      >
                        <button className="font-mono text-right w-full text-sm">
                          {formatBoxes(a.boxesAllocated)}
                        </button>
                      </HoverPopover>
                    </TableCell>

                    <TableCell className="text-right font-mono">
                      <HoverPopover
                        content={buildPopover("inbound")}
                        align="end"
                        className="p-3 shadow-lg border-border bg-popover"
                        showDelay={0}
                        hideDelay={240}
                        duration={160}
                      >
                        <button className="font-mono text-right w-full text-sm">
                          {formatBoxes(a.boxesInbound)}
                        </button>
                      </HoverPopover>
                    </TableCell>

                    <TableCell className="text-right font-mono font-bold text-primary">
                      <HoverPopover
                        content={buildPopover("projected")}
                        align="end"
                        className="p-3 shadow-lg border-border bg-popover"
                        showDelay={0}
                        hideDelay={240}
                        duration={160}
                      >
                        <button className="font-mono text-right w-full text-sm font-bold text-primary">
                          {formatBoxes(a.projectedBoxes)}
                        </button>
                      </HoverPopover>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-2 px-4 bg-muted/20 border border-border rounded-lg">
        <div className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-bold text-foreground">
            {Math.min(sortedGroups.length, (page - 1) * pageSize + 1)} -{" "}
            {Math.min(sortedGroups.length, page * pageSize)}
          </span>{" "}
          of {sortedGroups.length} products
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Rows:
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger className="w-20 h-9 bg-background border-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[20, 50, 100].map((v) => (
                  <SelectItem key={v} value={v.toString()}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="h-9 w-9 rounded border"
              disabled={page === 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="w-20 text-center font-mono text-sm">
              {page} <span className="text-muted-foreground mx-1">/</span>{" "}
              {pageCount}
            </div>
            <button
              className="h-9 w-9 rounded border"
              disabled={page >= pageCount}
              onClick={() => onPageChange(Math.min(pageCount, page + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
