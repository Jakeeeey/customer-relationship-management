// src/modules/customer-relationship-management/customer-hub/sales-order-tracing/components/AuditingTable.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ClipboardList,
} from "lucide-react";
import type { AuditingRow } from "../types";

interface AuditingTableProps {
  rows: AuditingRow[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  isLoading: boolean;
  total: number;
}



export default function AuditingTable({
  rows,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading,
  total,
}: AuditingTableProps) {

  const [sortField, setSortField] = useState<keyof AuditingRow | null>(null);
  const [sortAsc, setSortAsc] = useState(true);


  // PH Manila Time Zone Formatter (Asia/Manila)
  const formatPHDateTime = (dateStr: string | undefined) => {
    if (!dateStr) return "-";
    try {
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) {
        return dateStr;
      }
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(dateObj);
    } catch (e) {
      console.error(e);
      return dateStr;
    }
  };

  // Helper to display value(s) paired with its PH Manila Time zone formatted date(s)
  const formatCellWithDate = (
    val: string | string[] | null | undefined,
    dateStr: string | string[] | null | undefined
  ) => {
    if (!val) return "-";

    const parseToArray = (v: string | string[] | null | undefined): string[] => {
      if (!v) return [];
      if (Array.isArray(v)) return v;
      return v.split(",").map((s) => s.trim()).filter(Boolean);
    };

    const items = parseToArray(val);
    const dates = parseToArray(dateStr);

    if (items.length === 0) return "-";

    return (
      <div className="space-y-1.5">
        {items.map((item, idx) => {
          const dateVal = dates[idx];
          return (
            <div key={idx} className="space-y-0.5 border-b border-dashed border-border/20 last:border-0 pb-1 last:pb-0">
              <span className="font-semibold text-xs text-foreground block">{item}</span>
              {dateVal && dateVal !== "-" && (
                <span className="text-[9px] text-muted-foreground block">
                  {formatPHDateTime(dateVal)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Safe sorting
  const handleSort = (field: keyof AuditingRow) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const processedRows = useMemo(() => {
    const list = [...rows];



    // Sort
    if (sortField) {
      list.sort((a, b) => {
        const valA = String(a[sortField] || "").toLowerCase();
        const valB = String(b[sortField] || "").toLowerCase();
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [rows, sortField, sortAsc]);

  // Pagination is handled server-side
  const paginatedRows = processedRows;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Determine Badge Colors for statuses
  const getStatusBadge = (status: string) => {
    const lower = (status || "").toLowerCase();
    if (lower === "delivered" || lower === "posted") {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-semibold px-2 py-0.5 rounded-full capitalize">
          {status}
        </Badge>
      );
    }
    if (lower === "audited" || lower === "processing" || lower === "for approval") {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs font-semibold px-2 py-0.5 rounded-full capitalize">
          {status}
        </Badge>
      );
    }
    if (lower === "dispatched" || lower === "pending" || lower === "for shipping" || lower === "en route") {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs font-semibold px-2 py-0.5 rounded-full capitalize">
          {status}
        </Badge>
      );
    }
    if (lower === "cancelled" || lower === "on hold") {
      return (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-xs font-semibold px-2 py-0.5 rounded-full capitalize">
          {status}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/20 text-xs font-semibold px-2 py-0.5 rounded-full capitalize">
        {status || "Unknown"}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Table Controls */}
      <div className="flex items-center justify-end gap-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="bg-background border border-primary/10 rounded-lg p-1.5 h-9 text-xs focus:outline-none focus:border-primary cursor-pointer hover:border-primary/20 transition-all font-semibold text-foreground"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="border border-border/60 rounded-xl overflow-hidden shadow-sm bg-card transition-all">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-b/60">
              <TableHead className="font-semibold text-xs tracking-wider text-muted-foreground py-3.5 px-4 cursor-pointer hover:text-foreground select-none transition-colors" onClick={() => handleSort("customerName")}>
                <div className="flex items-center gap-1.5">
                  CUSTOMER
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </TableHead>
              <TableHead className="font-semibold text-xs tracking-wider text-muted-foreground py-3.5 px-4 cursor-pointer hover:text-foreground select-none transition-colors" onClick={() => handleSort("orderNo")}>
                <div className="flex items-center gap-1.5">
                  SALES ORDER
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </TableHead>
              <TableHead className="font-semibold text-xs tracking-wider text-muted-foreground py-3.5 px-4 cursor-pointer hover:text-foreground select-none transition-colors" onClick={() => handleSort("invoiceList")}>
                <div className="flex items-center gap-1.5">
                  INVOICE
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </TableHead>
              <TableHead className="font-semibold text-xs tracking-wider text-muted-foreground py-3.5 px-4 cursor-pointer hover:text-foreground select-none transition-colors" onClick={() => handleSort("pdpList")}>
                <div className="flex items-center gap-1.5">
                  PRE DISPATCH PLAN
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </TableHead>
              <TableHead className="font-semibold text-xs tracking-wider text-muted-foreground py-3.5 px-4 cursor-pointer hover:text-foreground select-none transition-colors" onClick={() => handleSort("cldtoList")}>
                <div className="flex items-center gap-1.5">
                  CONSOLIDATION
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </TableHead>
              <TableHead className="font-semibold text-xs tracking-wider text-muted-foreground py-3.5 px-4 cursor-pointer hover:text-foreground select-none transition-colors" onClick={() => handleSort("dpList")}>
                <div className="flex items-center gap-1.5">
                  DISPATCH PLAN
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading Skeleton State
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse border-b/40">
                  <TableCell className="p-4"><div className="h-4 bg-muted/60 rounded-md w-36" /></TableCell>
                  <TableCell className="p-4"><div className="h-4 bg-muted/60 rounded-md w-28" /></TableCell>
                  <TableCell className="p-4"><div className="h-4 bg-muted/60 rounded-md w-28" /></TableCell>
                  <TableCell className="p-4"><div className="h-4 bg-muted/60 rounded-md w-24" /></TableCell>
                  <TableCell className="p-4"><div className="h-4 bg-muted/60 rounded-md w-24" /></TableCell>
                  <TableCell className="p-4"><div className="h-4 bg-muted/60 rounded-md w-28" /></TableCell>
                </TableRow>
              ))
            ) : paginatedRows.length === 0 ? (
              // Empty State
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground/80">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <ClipboardList className="w-8 h-8 text-muted-foreground/40 stroke-[1.5]" />
                    <span className="text-xs font-semibold">No auditing matching logs found</span>
                    <span className="text-[10px] text-muted-foreground/60">Try adjusting your filters or date ranges.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              // Actual Table Rows
              paginatedRows.map((row) => (
                <TableRow key={row.orderId} className="hover:bg-muted/10 transition-colors border-b/40">
                  {/* Customer Column – Name with Status below */}
                  <TableCell className="py-3 px-4">
                    <div className="space-y-1">
                      <span className="font-semibold text-xs text-foreground block max-w-[200px] break-words">{row.customerName || "-"}</span>
                      {getStatusBadge(row.orderStatus)}
                    </div>
                  </TableCell>

                  {/* Sales Order Column – Order No with Date & Time below */}
                  <TableCell className="py-3 px-4">
                    <div className="space-y-1">
                      <span className="font-semibold text-xs tracking-tight text-foreground block">{row.orderNo || "-"}</span>
                      <span className="text-[9px] text-muted-foreground block">
                        {formatPHDateTime(row.soCreatedDate || row.orderDate)}
                      </span>
                    </div>
                  </TableCell>

                  {/* Invoice Column – Invoice No with Date & Time below */}
                  <TableCell className="py-3 px-4 text-xs font-mono">
                    {formatCellWithDate(row.invoiceList, row.invoiceCreatedDates)}
                  </TableCell>

                  {/* Pre Dispatch Plan Column – PDP No with Date & Time below */}
                  <TableCell className="py-3 px-4 text-xs font-mono">
                    {formatCellWithDate(row.pdpList, row.pdpCreatedDates)}
                  </TableCell>

                  {/* Consolidation Column – CLDTO No with Date & Time below */}
                  <TableCell className="py-3 px-4 text-xs font-mono">
                    {formatCellWithDate(row.cldtoList, row.cldtoCreatedDates)}
                  </TableCell>

                  {/* Dispatch Plan Column – DP No with Date & Time below */}
                  <TableCell className="py-3 px-4 text-xs font-mono">
                    {formatCellWithDate(row.dpList, row.dpCreatedDates)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {total > 0 && (
        <div className="flex items-center justify-between py-2 px-1">
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-bold text-foreground">{Math.min(total, (page - 1) * pageSize + 1)}</span> to{" "}
            <span className="font-bold text-foreground">{Math.min(total, page * pageSize)}</span> of{" "}
            <span className="font-semibold text-foreground">{total}</span> records
          </div>

          <div className="flex items-center gap-2">
            <Button
              className="h-8 w-8 rounded-lg border border-border bg-background hover:bg-muted text-foreground p-0 transition-colors"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-xs font-semibold font-mono text-foreground px-2">
              {page} <span className="text-muted-foreground/60 mx-1">/</span> {totalPages}
            </div>
            <Button
              className="h-8 w-8 rounded-lg border border-border bg-background hover:bg-muted text-foreground p-0 transition-colors"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

