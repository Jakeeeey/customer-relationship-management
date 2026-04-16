"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import useInventoryReport from "./hooks/useInventoryReport";
import Filter from "./components/Filter";
import InventoryReportTable from "./components/InventoryReportTable";
import KPICards from "./components/KPICards";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import exportToExcel from "./utils/exportExcel";
import exportInventoryReportPdf from "./utils/exportPdf";
import { toast } from "sonner";
import type { InventoryRow, InventoryFilters } from "./type";
// import {
//   findNumericFieldWithKey,
//   toPieces,
//   getConversionConfig,
//   type ConversionConfig,
// } from "./utils/units";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function InventoryReportModule() {
  const {
    rows,
    loading,
    page,
    pageSize,
    setPage,
    setPageSize,
    filters,
    setFilters,
    applyFilters,
    clearFilters,
    options,
  } = useInventoryReport(1, 20);

  // UI state: search, sorting
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "product" | "branch" | "category" | "current" | "allocated" | "available"
  >("available");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // debounce global search
  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedSearch(search.trim().toLowerCase()),
      300,
    );
    return () => clearTimeout(t);
  }, [search]);

  // normalization helpers
  const getString = (r: InventoryRow, keys: string[]) => {
    for (const k of keys) {
      const v = (r as Record<string, unknown>)[k];
      if (v == null) continue;
      return String(v);
    }
    return "";
  };

  const getNumber = (r: InventoryRow, keys: string[]) => {
    for (const k of keys) {
      const v = (r as Record<string, unknown>)[k];
      if (v == null) continue;
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
    return 0;
  };

  // derive available and search/filter/sort
  const processed = useMemo(() => {
    // apply global search client-side against product description/name
    const filtered = rows.filter((r) => {
      if (!debouncedSearch) return true;
      const hay = (
        getString(r, [
          "product_name",
          "productName",
          "name",
          "item",
          "description",
          "product_description",
        ]) +
        " " +
        getString(r, ["product_code", "productCode", "code", "sku"]) +
        " " +
        getString(r, ["brand", "brand_name"]) +
        " " +
        getString(r, ["category", "category_name"]) +
        " " +
        getString(r, ["supplier", "supplier_name"]) +
        " " +
        getString(r, ["branch", "branch_name"])
      ).toLowerCase();
      return hay.includes(debouncedSearch);
    });

    const mapped = filtered.map((r) => {
      const current = getNumber(r, [
        "current",
        "onhand",
        "on_hand",
        "onHand",
        "quantity",
        "qty",
      ]);
      const allocated = getNumber(r, [
        "allocated",
        "allocated_qty",
        "allocatedQuantity",
        "current_allocated",
      ]);
      const available = current - allocated;
      return { r, current, allocated, available };
    });

    mapped.sort((a, b) => {
      let res = 0;
      switch (sortBy) {
        case "product":
          res = getString(a.r, [
            "product_name",
            "productName",
            "name",
          ]).localeCompare(
            getString(b.r, ["product_name", "productName", "name"]),
          );
          break;
        case "branch":
          res = getString(a.r, ["branch", "branch_name"]).localeCompare(
            getString(b.r, ["branch", "branch_name"]),
          );
          break;
        case "category":
          res = getString(a.r, ["category", "category_name"]).localeCompare(
            getString(b.r, ["category", "category_name"]),
          );
          break;
        case "current":
          res = a.current - b.current;
          break;
        case "allocated":
          res = a.allocated - b.allocated;
          break;
        case "available":
        default:
          res = a.available - b.available;
          break;
      }
      return sortDir === "asc" ? res : -res;
    });

    return mapped;
  }, [rows, debouncedSearch, sortBy, sortDir]);

  const totalFiltered = processed.length;

  // pagination is handled inside InventoryReportTable; avoid allocating
  // intermediate paginated arrays here.

  // KPI calculations (aggregated by product identifier to avoid duplicate counting)
  const KPIs = useMemo(() => {
    const agg = new Map<
      string,
      { current: number; allocated: number; projected: number }
    >();
    for (const m of processed) {
      const r = m.r as InventoryRow;
      const skuKey = (
        getString(r as InventoryRow, [
          "productCode",
          "product_code",
          "code",
          "sku",
        ]) ||
        getString(r as InventoryRow, [
          "product_name",
          "productName",
          "productDescription",
          "product_description",
          "name",
          "item",
        ]) ||
        getString(r as InventoryRow, ["productId", "id"]) ||
        JSON.stringify(r).slice(0, 64)
      ).trim();

      const curr = Number(m.current || 0);
      const alloc = Number(m.allocated || 0);
      const proj = Number(getNumber(r as InventoryRow, ["projected"])) || 0;

      const existing = agg.get(skuKey);
      if (existing) {
        existing.current += curr;
        existing.allocated += alloc;
        existing.projected += proj;
      } else {
        agg.set(skuKey, { current: curr, allocated: alloc, projected: proj });
      }
    }

    let totalCurrent = 0;
    let totalAllocated = 0;
    let totalProjected = 0;
    let stockOut = 0;

    for (const v of agg.values()) {
      totalCurrent += v.current;
      totalAllocated += v.allocated;
      totalProjected += v.projected;
      if (v.current === 0) stockOut++;
    }

    const totalSKUs = agg.size;
    const netAvailable = totalCurrent - totalAllocated;
    const outOfStockRate = totalSKUs > 0 ? stockOut / totalSKUs : 0;
    const inStock = Math.max(0, totalCurrent);
    const issues = Math.abs(Math.min(0, totalCurrent));
    const inventoryHealth =
      totalCurrent < 0
        ? "CRITICAL"
        : outOfStockRate > 0.3
          ? "HIGH RISK"
          : "HEALTHY";

    return {
      totalSKUs,
      totalCurrent,
      totalAllocated,
      totalProjected,
      netAvailable,
      stockOut,
      outOfStockRate,
      inStock,
      issues,
      inventoryHealth,
    };
  }, [processed]);

  const formatNumber = (v: number) => {
    try {
      return new Intl.NumberFormat(undefined).format(v);
    } catch {
      return String(v);
    }
  };

  const handleApply = useCallback(
    (nextFilters: InventoryFilters) => {
      applyFilters(nextFilters);
    },
    [applyFilters],
  );

  const handleClear = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  // Preview / Export UI state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewRowsPerPage, setPreviewRowsPerPage] = useState(20);

  const filteredData = processed.map((m) => m.r);

  const paginatedPreviewData = filteredData.slice(
    (previewPage - 1) * previewRowsPerPage,
    (previewPage - 1) * previewRowsPerPage + previewRowsPerPage,
  );

  const previewTotalPages = Math.max(
    1,
    Math.ceil(filteredData.length / previewRowsPerPage),
  );

  const handleExport = useCallback(() => {
    // open preview instead of immediate export
    setPreviewPage(1);
    setIsPreviewOpen(true);
  }, [setIsPreviewOpen]);

  const handleDownload = useCallback(() => {
    try {
      const currentFilteredData = processed.map((m) => m.r);

      if (currentFilteredData.length === 0) {
        toast.error("No data to export");
        return;
      }

      const dataToExport = currentFilteredData.map((r) => {
        const onHand =
          getNumber(r, [
            "current",
            "onhand",
            "on_hand",
            "onHand",
            "quantity",
            "qty",
          ]) || 0;
        const allocated =
          getNumber(r, [
            "allocated",
            "allocated_qty",
            "allocatedQuantity",
            "current_allocated",
          ]) || 0;
        const inbox =
          getNumber(r, ["inboxCurrent", "inbox_current", "inbound", "inbox"]) ||
          0;
        const projected = getNumber(r, ["projected"]) || 0;

        // derive status label same as table logic
        const statusKey =
          onHand === 0
            ? "OUT_OF_STOCK"
            : onHand - allocated <= 0
              ? "CRITICAL"
              : onHand < 0.3 * (onHand + inbox)
                ? "RISK"
                : "HEALTHY";
        const statusLabelMap: Record<string, string> = {
          OUT_OF_STOCK: "Out of stock",
          CRITICAL: "Critical",
          RISK: "Risk",
          HEALTHY: "Healthy",
        };

        return {
          // use the same product key fallbacks as the table so product names are populated
          Product:
            getString(r, [
              "product_name",
              "productName",
              "productDescription",
              "product_description",
              "name",
              "item",
            ]) || "",
          Status: statusLabelMap[statusKey] || "",
          Available: onHand - allocated,
          Current: onHand,
          Allocated: allocated,
          Inbound: inbox,
          Projected: projected,
          Unit: getString(r, ["uom", "unit", "unit_of_measurement"]) || "",
          Brand: getString(r, ["brand", "brand_name"]) || "",
          Category: getString(r, ["category", "category_name"]) || "",
          Branch: getString(r, ["branch", "branch_name"]) || "",
          Supplier: getString(r, ["supplier", "supplier_name"]) || "",
        };
      });

      exportToExcel(
        dataToExport as unknown as InventoryRow[],
        "inventory-report.xlsx",
        {
          filters,
        },
      );
      toast.success("Export started");
    } catch (err: unknown) {
      console.error(err);
      toast.error("Export failed");
    }
  }, [processed, filters]);

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Download className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-tight">
              Inventory Report
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">
              Customer Relationship Management
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-lg ">
        {/* Alert for negative total current */}
        {KPIs.totalCurrent < 0 && (
          <div className="mb-3">
            <Alert variant="destructive">
              <AlertTitle>Inventory anomaly detected</AlertTitle>
              <AlertDescription>
                Inventory anomaly detected: Total Current is negative. Data
                validation or stock reconciliation required.
              </AlertDescription>
            </Alert>
          </div>
        )}
        {/* KPI Cards */}
        <KPICards KPIs={KPIs} loading={loading} formatNumber={formatNumber} />

        <div className="py-4">
          <Filter
            filters={filters}
            setFilters={setFilters}
            onApply={handleApply}
            onClear={handleClear}
            onExport={handleExport}
            options={options}
            search={search}
            onSearchChange={setSearch}
          />
        </div>
      </section>
      {/* Export Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[98vw] sm:max-w-[95vw] w-full h-[75vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-muted/20">
            <DialogTitle className="flex items-center justify-between w-full pr-8">
              <div className="flex items-center gap-2 text-lg font-bold">
                <Download className="w-5 h-5 text-primary" />
                Export Preview
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="font-mono px-3 py-1 bg-primary/10 text-primary border-primary/20"
                >
                  {filteredData.length} TOTAL ROWS
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 p-4 overflow-hidden flex flex-col gap-4">
            <div className="rounded-md border border-border overflow-auto flex-1 relative bg-background">
              <Table>
                <TableHeader className="bg-muted/50 border-b">
                  <TableRow>
                    <TableHead className="font-bold min-w-75 text-foreground">
                      PRODUCT
                    </TableHead>
                    {/* <TableHead className="font-bold whitespace-nowrap text-foreground">
                      STATUS
                    </TableHead> */}
                    <TableHead className="font-bold text-right whitespace-nowrap text-foreground">
                      AVAILABLE
                    </TableHead>
                    <TableHead className="font-bold text-right whitespace-nowrap text-foreground">
                      CURRENT
                    </TableHead>
                    <TableHead className="font-bold text-right whitespace-nowrap text-foreground">
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
                  {paginatedPreviewData.map((item, i) => {
                    const onHand =
                      getNumber(item as InventoryRow, [
                        "current",
                        "onhand",
                        "on_hand",
                        "onHand",
                        "quantity",
                        "qty",
                      ]) || 0;
                    const allocated =
                      getNumber(item as InventoryRow, [
                        "allocated",
                        "allocated_qty",
                        "allocatedQuantity",
                        "current_allocated",
                      ]) || 0;
                    const inbox =
                      getNumber(item as InventoryRow, [
                        "inboxCurrent",
                        "inbox_current",
                        "inbound",
                        "inbox",
                      ]) || 0;
                    const projected =
                      getNumber(item as InventoryRow, ["projected"]) || 0;
                    const available = onHand - allocated;
                    // const statusKey =
                    //   onHand === 0
                    //     ? "OUT_OF_STOCK"
                    //     : onHand - allocated <= 0
                    //       ? "CRITICAL"
                    //       : onHand < 0.3 * (onHand + inbox)
                    //         ? "RISK"
                    //         : "HEALTHY";
                    // const statusLabelMap: Record<string, string> = {
                    //   OUT_OF_STOCK: "Out of stock",
                    //   CRITICAL: "Critical",
                    //   RISK: "Risk",
                    //   HEALTHY: "Healthy",
                    // };

                    return (
                      <TableRow
                        key={i}
                        className="text-xs border-border hover:bg-muted/30"
                      >
                        <TableCell className="max-w-75 truncate">
                          {getString(item as InventoryRow, [
                            "product_name",
                            "productName",
                            "productDescription",
                            "product_description",
                            "name",
                          ])}
                        </TableCell>
                        {/* <TableCell className="whitespace-nowrap">
                          {statusLabelMap[statusKey]}
                        </TableCell> */}
                        <TableCell className="text-right font-mono">
                          {available}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {onHand}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {allocated}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {inbox}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">
                          {projected}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {getString(item as InventoryRow, [
                            "category",
                            "category_name",
                          ])}
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
                  {Math.min(
                    filteredData.length,
                    (previewPage - 1) * previewRowsPerPage + 1,
                  )}{" "}
                  -{" "}
                  {Math.min(
                    filteredData.length,
                    previewPage * previewRowsPerPage,
                  )}
                </span>{" "}
                of {filteredData.length} rows in preview
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Preview Rows:
                  </span>
                  <Select
                    value={previewRowsPerPage.toString()}
                    onValueChange={(v) => {
                      setPreviewRowsPerPage(Number(v));
                      setPreviewPage(1);
                    }}
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
                    disabled={previewPage === 1}
                    onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="w-20 text-center font-mono text-sm">
                    {previewPage}{" "}
                    <span className="text-muted-foreground mx-1">/</span>{" "}
                    {previewTotalPages}
                  </div>
                  <button
                    className="h-9 w-9 rounded border"
                    disabled={previewPage >= previewTotalPages}
                    onClick={() =>
                      setPreviewPage((p) => Math.min(previewTotalPages, p + 1))
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/20 gap-2">
            <button
              className="btn btn-ghost"
              onClick={() => setIsPreviewOpen(false)}
            >
              Close
            </button>
            <button
              onClick={() => {
                try {
                  const currentFilteredData = processed.map((m) => m.r);
                  if (currentFilteredData.length === 0) {
                    toast.error("No data to export");
                    return;
                  }
                  exportInventoryReportPdf(
                    currentFilteredData,
                    "inventory-report.pdf",
                    filters,
                  );
                  toast.success("PDF export started");
                  setIsPreviewOpen(false);
                } catch (err: unknown) {
                  console.error(err);
                  toast.error("PDF export failed");
                }
              }}
              className="bg-white/10 hover:opacity-90 min-w-40 text-primary border px-4 py-2 rounded"
            >
              <Download className="w-4 h-4 mr-2 inline-block" />
              Download PDF
            </button>
            <button
              onClick={() => {
                handleDownload();
                setIsPreviewOpen(false);
              }}
              className="bg-primary hover:opacity-90 min-w-40 text-white px-4 py-2 rounded"
            >
              <Download className="w-4 h-4 mr-2 inline-block" />
              Download Full Excel
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <div className="p-4">
          <InventoryReportTable
            rows={processed.map((m) => m.r)}
            page={page}
            pageSize={pageSize}
            total={totalFiltered}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(s) => setPageSize(s)}
            isLoading={loading}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={(by) => {
              if (sortBy === by)
                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
              else {
                setSortBy(by);
                setSortDir("asc");
              }
              setPage(1);
            }}
          />
        </div>
      </section>
    </div>
  );
}
