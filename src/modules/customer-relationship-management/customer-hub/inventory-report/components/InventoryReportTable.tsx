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
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { InventoryRow } from "../type";

interface Props {
  rows: InventoryRow[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  isLoading?: boolean;
  sortBy:
    | "product"
    | "branch"
    | "category"
    | "current"
    | "allocated"
    | "available";
  sortDir: "asc" | "desc";
  onSort: (by: Props["sortBy"]) => void;
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

function normalizeUnit(u?: unknown) {
  if (!u) return "other";
  const s = String(u).toLowerCase();
  if (s.includes("box")) return "box";
  if (s.includes("pack")) return "pack";
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
  // 4 decimal places, trim trailing zeros but keep leading zero for <1
  const fixed = Number.isFinite(v) ? v.toFixed(4) : "0.0000";
  // remove trailing zeros and optional dot
  let s = fixed.replace(/\.0+$|(?<=\.\d*?)0+$/g, (m) => (m === ".0" ? "" : ""));
  // fallback for 0.0000
  if (s === "") s = "0";
  return s;
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

export default function InventoryReportTable({
  rows,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  sortBy,
  sortDir,
  onSort,
}: Props) {
  // Group rows by product key (prefer productDescription/product name)
  const groups = useMemo(() => {
    const m = new Map<string, InventoryRow[]>();
    for (const r of rows) {
      const skuKey = (
        getString(r, ["productDescription", "product_description"]) ||
        getString(r, ["product_name", "productName", "name", "item"]) ||
        getString(r, ["productCode", "product_code", "code", "sku"]) ||
        String(getNumber(r as InventoryRow, ["productId", "id"])) ||
        JSON.stringify(r).slice(0, 64)
      ).trim();
      const arr = m.get(skuKey) ?? [];
      arr.push(r);
      m.set(skuKey, arr);
    }

    return Array.from(m.entries()).map(([key, items]) => ({ key, items }));
  }, [rows]);

  const pageCount = Math.max(1, Math.ceil(groups.length / pageSize));
  const visible = groups.slice(
    (page - 1) * pageSize,
    (page - 1) * pageSize + pageSize,
  );

  function analyzeGroup(items: InventoryRow[]) {
    let totalPiecesCurrent = 0;
    let totalPiecesAllocated = 0;
    let totalPiecesInbound = 0;

    const unitInfo: {
      unit: string;
      unitType: string;
      unitCount: number;
      rawCurrent: number;
      rawAllocated: number;
      rawInbound: number;
      costPerUnit: number;
    }[] = [];

    for (const r of items) {
      const unit = getString(r, ["unit", "uom", "unit_of_measurement"]).trim();
      const unitType = normalizeUnit(unit || (r as any).unit);
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
      // inbound / projected raw (use projected/inboxProjected/inbox)
      const rawInbound =
        getNumber(r, [
          "projected",
          "inboxProjected",
          "inbox_projected",
          "inbox",
          "inbound",
        ]) || 0;

      const costPerUnit =
        getNumber(r as InventoryRow, [
          "costPerUnit",
          "cost_per_unit",
          "price",
        ]) || 0;

      unitInfo.push({
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

    // pick box unitCount: prefer explicit box row, else largest unitCount
    const boxRow = unitInfo.find(
      (u) => u.unitType === "box" && u.unitCount > 0,
    );
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

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-border overflow-auto bg-background">
        <Table>
          <TableHeader className="bg-muted/50 border-b">
            <TableRow>
              <TableHead
                className="font-bold min-w-75 text-foreground cursor-pointer"
                onClick={() => onSort("product")}
              >
                PRODUCT
              </TableHead>
              <TableHead
                className="font-bold text-right whitespace-nowrap text-foreground cursor-pointer"
                onClick={() => onSort("available")}
              >
                AVAILABLE
              </TableHead>
              <TableHead
                className="font-bold text-right whitespace-nowrap text-foreground cursor-pointer"
                onClick={() => onSort("current")}
              >
                CURRENT
              </TableHead>
              <TableHead
                className="font-bold text-right whitespace-nowrap text-foreground cursor-pointer"
                onClick={() => onSort("allocated")}
              >
                ALLOCATED
              </TableHead>
              <TableHead className="font-bold text-right whitespace-nowrap text-foreground">
                INBOUND
              </TableHead>
              <TableHead className="font-bold text-right whitespace-nowrap text-foreground">
                PROJECTED
              </TableHead>
              <TableHead className="font-bold whitespace-nowrap text-foreground">
                CATEGORY
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="p-4">
                    <Skeleton className="h-6 w-full" />
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              visible.map((g, idx) => {
                const items = g.items;
                const productName = getString(items[0], [
                  "productDescription",
                  "product_description",
                  "product_name",
                  "productName",
                  "name",
                  "item",
                ]);
                const category = getString(items[0], [
                  "category",
                  "category_name",
                ]);

                const a = analyzeGroup(items);

                function buildPopover(
                  metric: "current" | "allocated" | "available" | "projected",
                ) {
                  const unitTypes = Array.from(
                    new Set(a.unitInfo.map((u) => u.unitType)),
                  );
                  const columns: string[] = [];
                  if (unitTypes.includes("box")) columns.push("Boxes");
                  if (unitTypes.includes("pack")) columns.push("Packs");
                  if (unitTypes.includes("pcs") || unitTypes.includes("other"))
                    columns.push("Pcs");

                  const sumByUnitType = (type: string) =>
                    a.unitInfo
                      .filter((u) => u.unitType === type)
                      .reduce((s, u) => {
                        const val =
                          metric === "current"
                            ? u.rawCurrent
                            : metric === "allocated"
                              ? u.rawAllocated
                              : metric === "projected"
                                ? u.rawInbound
                                : 0;
                        return s + (Number(val) || 0);
                      }, 0);

                  const apiRowValues = columns.map((col) => {
                    if (col === "Boxes") return String(sumByUnitType("box"));
                    if (col === "Packs") return String(sumByUnitType("pack"));
                    return String(
                      sumByUnitType("pcs") || sumByUnitType("other") || 0,
                    );
                  });

                  let totalPieces = 0;
                  if (metric === "current") totalPieces = a.totalPiecesCurrent;
                  else if (metric === "allocated")
                    totalPieces = a.totalPiecesAllocated;
                  else if (metric === "projected")
                    totalPieces =
                      a.totalPiecesCurrent -
                      a.totalPiecesAllocated +
                      a.totalPiecesInbound;
                  else if (metric === "available")
                    totalPieces = a.totalPiecesCurrent - a.totalPiecesAllocated;

                  const calcRowValues = columns.map((col) => {
                    if (col === "Boxes")
                      return formatBoxes(totalPieces / a.boxUnitCount);
                    if (col === "Packs") {
                      const pack = a.unitInfo.find(
                        (u) => u.unitType === "pack",
                      );
                      const packUnitCount = pack
                        ? pack.unitCount
                        : a.boxUnitCount;
                      return formatBoxes(totalPieces / packUnitCount);
                    }
                    return formatPcs(totalPieces);
                  });

                  const valueBoxes =
                    (totalPieces / a.boxUnitCount) * (a.costPerBox || 0);

                  const colsClass =
                    columns.length === 3 ? "grid-cols-3" : "grid-cols-2";

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
                            key={c}
                            className="text-muted-foreground text-[12px]"
                          >
                            {c}
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
                            {" "}
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
                    <TableCell className="max-w-75 truncate">
                      {productName}
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
                        content={buildPopover("projected")}
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
                      {formatBoxes(a.projectedBoxes)}
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      {category}
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
            {Math.min(groups.length, (page - 1) * pageSize + 1)} -{" "}
            {Math.min(groups.length, page * pageSize)}
          </span>{" "}
          of {groups.length} products
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
