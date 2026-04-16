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
  totalCurrent: number;
  totalAllocated: number;
  totalProjected?: number;
  netAvailable: number;
  stockOut: number;
  outOfStockRate: number;
  inStock: number;
  issues: number;
  inventoryHealth: string;
}

interface Props {
  loading?: boolean;
  KPIs: KPIData;
  formatNumber: (v: number) => string;
}

export default function KPICards({
  loading = false,
  KPIs,
  formatNumber,
}: Props) {
  return (
    <div className="grid grid-cols-5 gap-3 w-full">
      <Popover>
        <PopoverTrigger asChild>
          <div className=" p-3 rounded-md shadow-sm cursor-pointer border">
            <div className="text-xs text-muted-foreground">Total SKUs</div>
            <div className="text-lg font-bold">
              {loading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                formatNumber(KPIs.totalSKUs)
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 shadow-lg border-border bg-popover">
          <div className="text-sm font-semibold">Total SKUs</div>
          <div className="text-xs text-muted-foreground">
            Distinct product SKUs tracked in the current dataset.
          </div>
          <div className="mt-2 font-mono text-lg">
            {formatNumber(KPIs.totalSKUs)}
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <div
            className={`p-3 rounded-md shadow-sm border  cursor-pointer ${!loading && KPIs.totalCurrent < 0 ? "border border-rose-200  bg-rose-50" : ""}`}
          >
            <div className="text-xs text-muted-foreground">Total Current</div>
            <div
              className={`text-lg font-bold ${!loading && KPIs.totalCurrent < 0 ? "text-rose-600" : ""}`}
            >
              {loading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                formatNumber(KPIs.totalCurrent)
              )}
            </div>
            {!loading && (
              <div className="text-xs text-muted-foreground mt-1">
                In Stock:{" "}
                <span className="font-medium">
                  {formatNumber(KPIs.inStock)}
                </span>{" "}
                | Issues:{" "}
                <span className="font-medium text-rose-600">
                  {formatNumber(KPIs.issues)}
                </span>
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 shadow-lg border-border  bg-popover">
          <div className="text-sm font-semibold ">Total Current</div>
          <div className="text-xs text-muted-foreground">
            Total on-hand quantity summed across distinct SKUs.
          </div>
          <div className="mt-2">
            <div className="font-mono">
              Total: {formatNumber(KPIs.totalCurrent)}
            </div>
            <div className="font-mono">
              In Stock (non-negative): {formatNumber(KPIs.inStock)}
            </div>
            <div className="font-mono text-rose-600">
              Issues (negative inventory): {formatNumber(KPIs.issues)}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <div className="p-3 rounded-md shadow-sm border cursor-pointer">
            <div className="text-xs text-muted-foreground">Total Allocated</div>
            <div className="text-lg font-bold">
              {loading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                formatNumber(KPIs.totalAllocated)
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 shadow-lg border-border bg-popover">
          <div className="text-sm font-semibold">Total Allocated</div>
          <div className="text-xs text-muted-foreground">
            Quantity currently reserved or allocated.
          </div>
          <div className="mt-2 font-mono">
            {formatNumber(KPIs.totalAllocated)}
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <div className="p-3 rounded-md shadow-sm border cursor-pointer">
            <div className="text-xs text-muted-foreground">Net Available</div>
            <div className="text-lg font-bold">
              {loading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                formatNumber(KPIs.netAvailable)
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 shadow-lg border-border bg-popover">
          <div className="text-sm font-semibold">Net Available</div>
          <div className="text-xs text-muted-foreground">
            Calculated as total on-hand minus allocated quantities.
          </div>
          <div className="mt-2 font-mono">
            {formatNumber(KPIs.netAvailable)}
          </div>
          {KPIs.totalProjected !== undefined && (
            <div className="text-xs text-muted-foreground mt-1">
              Projected: {formatNumber(KPIs.totalProjected)}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <div
            className={`p-3 rounded-md shadow-sm border  cursor-pointer ${!loading && KPIs.outOfStockRate > 0.5 ? "border border-rose-200 bg-rose-50 dark:border-rose-400/70 dark:bg-rose-600/20" : !loading && KPIs.outOfStockRate > 0.3 ? "border border-orange-200 bg-orange-50 " : ""}`}
          >
            <div className="text-xs text-muted-foreground">
              Out of Stock Items
            </div>
            <div
              className={`text-lg font-bold ${!loading && KPIs.outOfStockRate > 0.5 ? "text-rose-600 dark:text-rose-600/80" : !loading && KPIs.outOfStockRate > 0.3 ? "text-orange-600" : ""}`}
            >
              {loading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                `${formatNumber(KPIs.stockOut)} (${Math.round(KPIs.outOfStockRate * 100)}%)`
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 shadow-lg border-border bg-popover ">
          <div className="text-sm font-semibold">Out of Stock Items</div>
          <div className="text-xs text-muted-foreground">
            Number and percentage of SKUs with zero on-hand quantity.
          </div>
          <div className="mt-2 font-mono">
            {formatNumber(KPIs.stockOut)} SKUs •{" "}
            {Math.round(KPIs.outOfStockRate * 100)}%
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
