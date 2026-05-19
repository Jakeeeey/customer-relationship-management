"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface KPIData {
  totalSKUs: number;
  totalCurrent: number;     // sum of boxesCurrent across all groups
  totalAllocated: number;   // sum of boxesAllocated
  totalProjected?: number;  // sum of projectedBoxes
  netAvailable: number;     // sum of availableBoxes (inStock - totalAllocated)
  stockOut: number;         // count of groups where boxesCurrent === 0
  outOfStockRate: number;   // stockOut / totalSKUs
  inStock: number;          // sum of boxesCurrent where > 0
  issues: number;           // sum of abs(boxesCurrent) where < 0
  inventoryHealth: string;
}

interface Props {
  loading?: boolean;
  KPIs: KPIData;
  /**
   * formatNumber is used for whole-number values (SKU counts, stock-out counts).
   * Box quantities are formatted internally with up to 4 decimal places so they
   * match what InventoryReportTable shows.
   */
  formatNumber: (v: number) => string;
}

/** Render a box quantity the same way InventoryReportTable does: up to 4dp, trailing zeros stripped. */
function formatBoxQty(v: number): string {
  if (!Number.isFinite(v)) return "0";
  const fixed = v.toFixed(4);
  const n = parseFloat(fixed);
  return Number.isNaN(n) ? "0" : n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export default function KPICards({ loading = false, KPIs, formatNumber }: Props) {
  return (
    <div className="grid grid-cols-5 gap-3 w-full">

      {/* Total SKUs -------------------------------------------------------- */}
      <Popover>
        <PopoverTrigger asChild>
          <div className="p-3 rounded-md shadow-sm cursor-pointer border">
            <div className="text-xs text-muted-foreground">Total SKUs</div>
            <div className="text-lg font-bold">
              {loading ? <Skeleton className="h-6 w-20" /> : formatNumber(KPIs.totalSKUs)}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 shadow-lg border-border bg-popover">
          <div className="text-sm font-semibold">Total SKUs</div>
          <div className="text-xs text-muted-foreground">
            Distinct products in the current filtered dataset.
          </div>
          <div className="mt-2 font-mono text-lg">{formatNumber(KPIs.totalSKUs)}</div>
        </PopoverContent>
      </Popover>

      {/* Total Current ----------------------------------------------------- */}
      <Popover>
        <PopoverTrigger asChild>
          <div
            className={`p-3 rounded-md shadow-sm border cursor-pointer 
              
              `}
          >
            <div className="text-xs text-muted-foreground">Total Current</div>
            <div className={`text-lg font-bold ${!loading && KPIs.issues > 0 ? "text-rose-600" : ""}`}>
              {loading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                // Net = inStock boxes - issues boxes (mirrors the old display, now in box units)
                formatBoxQty(KPIs.inStock - KPIs.issues)
              )}
            </div>
            {!loading && (
              <div className="text-xs text-muted-foreground mt-1">
                In Stock: <span className="font-medium">{formatBoxQty(KPIs.inStock)}</span>
                {" | "}
                Issues: <span className="font-medium text-rose-600">{formatBoxQty(KPIs.issues)}</span>
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="p-3 shadow-lg border-border bg-popover">
          <div className="text-sm font-semibold">Total Current (In Stock − Issues)</div>
          <div className="text-xs text-muted-foreground">
            Box-equivalent quantities summed across all grouped products. Matches
            the values shown in the inventory table.
          </div>
          <div className="mt-2 space-y-1">
            <div className="font-mono text-sm">Net Total: {formatBoxQty(KPIs.totalCurrent)}</div>
            <div className="font-mono text-sm">In Stock: {formatBoxQty(KPIs.inStock)}</div>
            <div className="font-mono text-sm text-rose-600">Issues: {formatBoxQty(KPIs.issues)}</div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Total Allocated --------------------------------------------------- */}
      <Popover>
        <PopoverTrigger asChild>
          <div className="p-3 rounded-md shadow-sm border cursor-pointer">
            <div className="text-xs text-muted-foreground">Total Allocated</div>
            <div className="text-lg font-bold">
              {loading ? <Skeleton className="h-6 w-20" /> : formatBoxQty(KPIs.totalAllocated)}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 shadow-lg border-border bg-popover">
          <div className="text-sm font-semibold">Total Allocated</div>
          <div className="text-xs text-muted-foreground">
            Box-equivalent quantity currently reserved or allocated across all products.
          </div>
          <div className="mt-2 font-mono">{formatBoxQty(KPIs.totalAllocated)}</div>
        </PopoverContent>
      </Popover>

      {/* Net Available ----------------------------------------------------- */}
      <Popover>
        <PopoverTrigger asChild>
          <div className="p-3 rounded-md shadow-sm border cursor-pointer">
            <div className="text-xs text-muted-foreground">Net Available</div>
            <div className="text-lg font-bold">
              {loading ? <Skeleton className="h-6 w-20" /> : formatBoxQty(KPIs.netAvailable)}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 shadow-lg border-border bg-popover">
          <div className="text-sm font-semibold">Net Available</div>
          <div className="text-xs text-muted-foreground">
            In-stock boxes minus allocated boxes. Matches the Available column in the table.
          </div>
          <div className="mt-2 font-mono">{formatBoxQty(KPIs.netAvailable)}</div>
          {KPIs.totalProjected !== undefined && (
            <div className="text-xs text-muted-foreground mt-1">
              Projected: {formatBoxQty(KPIs.totalProjected)}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Out of Stock ------------------------------------------------------ */}
      <Popover>
        <PopoverTrigger asChild>
          <div
            className={`p-3 rounded-md shadow-sm border cursor-pointer ${
              !loading && KPIs.outOfStockRate > 0.5
                ? "border-rose-200 bg-rose-50 dark:border-rose-600/70 dark:bg-rose-600/20"
                : !loading && KPIs.outOfStockRate > 0.3
                  ? "border-orange-200 bg-orange-50"
                  : ""
            }`}
          >
            <div className="text-xs text-muted-foreground">Out of Stock Items</div>
            <div
              className={`text-lg font-bold ${
                !loading && KPIs.outOfStockRate > 0.5
                  ? "text-rose-600 dark:text-rose-600/80"
                  : !loading && KPIs.outOfStockRate > 0.3
                    ? "text-orange-600"
                    : ""
              }`}
            >
              {loading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                `${formatNumber(KPIs.stockOut)} (${Math.round(KPIs.outOfStockRate * 100)}%)`
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 shadow-lg border-border bg-popover">
          <div className="text-sm font-semibold">Out of Stock Items</div>
          <div className="text-xs text-muted-foreground">
            Products with zero box-equivalent on-hand quantity.
          </div>
          <div className="mt-2 font-mono">
            {formatNumber(KPIs.stockOut)} products • {Math.round(KPIs.outOfStockRate * 100)}%
          </div>
        </PopoverContent>
      </Popover>

    </div>
  );
}