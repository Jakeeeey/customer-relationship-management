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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getString,
  // getNumber,
  groupInventoryRows,
  formatBoxQty,
} from "./utils/groupInventory";
import type { ProductGroup } from "./utils/groupInventory";

type InventoryReportModuleProps = {
  userName: string;
};

// ---------------------------------------------------------------------------
// Local helper: decode display name from JWT cookie (lightweight, client-only)
// ---------------------------------------------------------------------------
function getLoggedInUserName(): string | null {
  try {
    if (typeof document === "undefined") return null;
    const m = document.cookie.match(/(^|; )vos_access_token=([^;]+)/);
    const token = m?.[2] ? decodeURIComponent(m[2]) : null;
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    const payload = JSON.parse(atob(base64));
    return (
      [payload.FirstName, payload.LastName].filter(Boolean).join(" ") ||
      payload.email ||
      payload.sub ||
      null
    );
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Deep object → string scan (used only for the module-level search haystack)
// ---------------------------------------------------------------------------
function getObjectString(v: unknown, keys: string[] = []): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v).trim();
  if (typeof v !== "object") return "";
  const obj = v as Record<string, unknown>;
  for (const k of keys) {
    const cand = obj[k];
    if (cand == null) continue;
    if (typeof cand === "string" || typeof cand === "number") {
      const s = String(cand).trim();
      if (s) return s;
    }
  }
  for (const k of Object.keys(obj)) {
    const cand = obj[k];
    if (cand == null) continue;
    if (typeof cand === "string" || typeof cand === "number") {
      const s = String(cand).trim();
      if (s) return s;
    }
    if (typeof cand === "object") {
      const s = getObjectString(cand, []);
      if (s) return s;
    }
  }
  return "";
}

export default function InventoryReportModule({
  userName,
}: InventoryReportModuleProps) {
  const {
    rows,
    loading,
    page,
    pageSize,
    setPage,
    setPageSize,
    filters,
    applyFilters,
    options,
  } = useInventoryReport(1, 20);

  // UI state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    | "product" | "branch" | "brand" | "category" | "supplier"
    | "current" | "allocated" | "available" | "inbound" | "projected"
  >("current");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ------------------------------------------------------------------
  // Filter rows by global search, then pass raw rows to InventoryReportTable.
  // The table handles grouping + sorting internally via groupInventoryRows().
  // ------------------------------------------------------------------
  const filteredRows = useMemo<InventoryRow[]>(() => {
    if (!debouncedSearch) return rows;
    const tokens = debouncedSearch.split(/\s+/).filter(Boolean);
    return rows.filter((r) => {
      let hay = [
        getString(r, ["product_name", "productName", "name", "item", "description", "product_description"]),
        getString(r, ["product_code", "productCode", "code", "sku"]),
        getString(r, ["brand", "brand_name"]),
        getString(r, ["category", "category_name"]),
        getString(r, ["supplier", "supplier_name"]),
        getString(r, ["branch", "branch_name"]),
      ].join(" ").toLowerCase();

      // include any nested "product*" fields
      try {
        for (const k of Object.keys(r as Record<string, unknown>)) {
          if (k.toLowerCase().startsWith("product")) {
            const extra = getObjectString((r as Record<string, unknown>)[k], [
              "product_description", "productDescription",
              "product_name", "productName", "name", "description", "item", "value",
            ]);
            if (extra) hay += " " + extra.toLowerCase();
          }
        }
      } catch { /* ignore */ }

      return tokens.every((t) => hay.includes(t));
    });
  }, [rows, debouncedSearch]);

  // ------------------------------------------------------------------
  // Groups — used for KPIs and the export preview
  // ------------------------------------------------------------------
  const groups = useMemo<ProductGroup[]>(
    () => groupInventoryRows(filteredRows),
    [filteredRows],
  );

  // ------------------------------------------------------------------
  // KPI calculations — derived from grouped data so they match the table
  // ------------------------------------------------------------------
  const KPIs = useMemo(() => {
    let totalCurrent = 0;
    let totalAllocated = 0;
    let totalProjected = 0;
    let stockOut = 0;
    let inStockSum = 0;
    let issuesSum = 0;

    for (const g of groups) {
      const a = g.analysis;
      totalCurrent += a.boxesCurrent;
      totalAllocated += a.boxesAllocated;
      totalProjected += a.projectedBoxes;

      if (a.boxesCurrent === 0) stockOut++;
      if (a.boxesCurrent > 0) inStockSum += a.boxesCurrent;
      else issuesSum += Math.abs(a.boxesCurrent);
    }

    const totalSKUs = groups.length;
    const netAvailable = inStockSum - totalAllocated;
    const outOfStockRate = totalSKUs > 0 ? stockOut / totalSKUs : 0;
    const inventoryHealth =
      issuesSum > 0 ? "CRITICAL" : outOfStockRate > 0.3 ? "HIGH RISK" : "HEALTHY";

    return {
      totalSKUs,
      totalCurrent,
      totalAllocated,
      totalProjected,
      netAvailable,
      stockOut,
      outOfStockRate,
      inStock: inStockSum,
      issues: issuesSum,
      inventoryHealth,
    };
  }, [groups]);

  const formatNumber = (v: number) => {
    try {
      return new Intl.NumberFormat(undefined).format(v);
    } catch {
      return String(v);
    }
  };

  const handleApply = useCallback(
    (nextFilters: InventoryFilters) => applyFilters(nextFilters),
    [applyFilters],
  );

  // ------------------------------------------------------------------
  // Export preview state — paginate over groups (not raw rows)
  // ------------------------------------------------------------------
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewRowsPerPage, setPreviewRowsPerPage] = useState(20);

  const previewTotalPages = Math.max(1, Math.ceil(groups.length / previewRowsPerPage));
  const paginatedPreviewGroups = groups.slice(
    (previewPage - 1) * previewRowsPerPage,
    previewPage * previewRowsPerPage,
  );

  const handleExport = useCallback(() => {
    setPreviewPage(1);
    setIsPreviewOpen(true);
  }, []);

  // ------------------------------------------------------------------
  // Excel download — pass raw filtered rows; exportToExcel groups them internally
  // ------------------------------------------------------------------
  const handleDownload = useCallback(() => {
    try {
      if (filteredRows.length === 0) {
        toast.error("No data to export");
        return;
      }
      exportToExcel(filteredRows, "inventory-report.xlsx", {
        filters,
        generatedBy: userName || getLoggedInUserName() || undefined,
        generatedDate: new Date().toLocaleString("en-US", {
          year: "numeric", month: "long", day: "numeric",
          hour: "2-digit", minute: "2-digit",
        }),
      });
      toast.success("Export started");
    } catch (err) {
      console.error(err);
      toast.error("Export failed");
    }
  }, [filteredRows, filters, userName]);

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Download className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-tight">Inventory Report</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">
              Customer Relationship Management
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-lg">
        <KPICards KPIs={KPIs} loading={loading} formatNumber={formatNumber} />
        <div className="py-4">
          <Filter filters={filters} onApply={handleApply} onExport={handleExport} options={options} />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Export Preview Dialog — shows grouped values, matching the table    */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[98vw] sm:max-w-[95vw] w-full h-[75vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-muted/20">
            <DialogTitle className="flex items-center justify-between w-full pr-8">
              <div className="flex items-center gap-2 text-lg font-bold">
                <Download className="w-5 h-5 text-primary" />
                Export Preview
              </div>
              <Badge variant="outline" className="font-mono px-3 py-1 bg-primary/10 text-primary border-primary/20">
                {groups.length} PRODUCTS
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 p-4 overflow-hidden flex flex-col gap-4">
            <div className="rounded-md border border-border overflow-auto flex-1 relative bg-background">
              <Table>
                <TableHeader className="bg-muted/50 border-b">
                  <TableRow>
                    <TableHead className="font-bold whitespace-nowrap text-foreground">SUPPLIER</TableHead>
                    <TableHead className="font-bold whitespace-nowrap text-foreground">CATEGORY</TableHead>
                    <TableHead className="font-bold whitespace-nowrap text-foreground">BRAND</TableHead>
                    <TableHead className="font-bold min-w-75 text-foreground">PRODUCT</TableHead>
                    <TableHead className="font-bold text-right whitespace-nowrap text-foreground">AVAILABLE</TableHead>
                    <TableHead className="font-bold text-right whitespace-nowrap text-foreground">CURRENT</TableHead>
                    <TableHead className="font-bold text-right whitespace-nowrap text-foreground">ALLOCATED</TableHead>
                    <TableHead className="font-bold text-right whitespace-nowrap text-foreground">INBOUND</TableHead>
                    <TableHead className="font-bold text-right whitespace-nowrap text-foreground">PROJECTED INVENTORY</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPreviewGroups.map((g, i) => {
                    const a = g.analysis;
                    return (
                      <TableRow key={g.key + i} className="text-xs border-border hover:bg-muted/30">
                        <TableCell className="whitespace-nowrap">{g.supplier || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{g.category || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{g.brand || "-"}</TableCell>
                        <TableCell className="max-w-75 truncate">{g.productName || "-"}</TableCell>
                        <TableCell className="text-right font-mono">{formatBoxQty(a.availableBoxes)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{formatBoxQty(a.boxesCurrent)}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{formatBoxQty(a.boxesAllocated)}</TableCell>
                        <TableCell className="text-right font-mono">{formatBoxQty(a.boxesInbound)}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">{formatBoxQty(a.projectedBoxes)}</TableCell>
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
                  {Math.min(groups.length, (previewPage - 1) * previewRowsPerPage + 1)}
                  {" – "}
                  {Math.min(groups.length, previewPage * previewRowsPerPage)}
                </span>{" "}
                of {groups.length} products
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview Rows:</span>
                  <Select
                    value={previewRowsPerPage.toString()}
                    onValueChange={(v) => { setPreviewRowsPerPage(Number(v)); setPreviewPage(1); }}
                  >
                    <SelectTrigger className="w-20 h-9 bg-background border-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[20, 50, 100].map((v) => (
                        <SelectItem key={v} value={v.toString()}>{v}</SelectItem>
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
                    {previewPage} <span className="text-muted-foreground mx-1">/</span> {previewTotalPages}
                  </div>
                  <button
                    className="h-9 w-9 rounded border"
                    disabled={previewPage >= previewTotalPages}
                    onClick={() => setPreviewPage((p) => Math.min(previewTotalPages, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/20 gap-2">
            <button className="btn btn-ghost" onClick={() => setIsPreviewOpen(false)}>
              Close
            </button>
            <button
              onClick={async () => {
                try {
                  if (filteredRows.length === 0) { toast.error("No data to export"); return; }
                  await exportInventoryReportPdf(
                    filteredRows,
                    "inventory-report.pdf",
                    filters,
                    userName || getLoggedInUserName() || undefined,
                  );
                  toast.success("PDF export completed");
                } catch (err) {
                  console.error(err);
                  toast.error("PDF export failed");
                } finally {
                  setIsPreviewOpen(false);
                }
              }}
              className="bg-white/10 hover:opacity-90 min-w-40 text-primary border px-4 py-2 rounded"
            >
              <Download className="w-4 h-4 mr-2 inline-block" />
              Download PDF
            </button>
            <button
              onClick={() => { handleDownload(); setIsPreviewOpen(false); }}
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
            rows={filteredRows}
            page={page}
            pageSize={pageSize}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(s) => setPageSize(s)}
            isLoading={loading}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={(by) => {
              if (sortBy === by) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
              else { setSortBy(by); setSortDir("asc"); }
              setPage(1);
            }}
            search={search}
            onSearchChange={setSearch}
          />
        </div>
      </section>
    </div>
  );
}