// src/modules/customer-relationship-management/customer-hub/auditing/components/AuditingTable.tsx
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Search,
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
}

export default function AuditingTable({
  rows,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading,
}: AuditingTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof AuditingRow | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Helper to format values or lists safely
  const formatCellList = (val: string | string[] | null) => {
    if (!val) return "-";
    if (Array.isArray(val)) {
      return val.join(", ");
    }
    return val;
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
    let list = [...rows];

    // Local Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          (r.orderNo && r.orderNo.toLowerCase().includes(q)) ||
          (r.customerCode && r.customerCode.toLowerCase().includes(q)) ||
          (r.orderStatus && r.orderStatus.toLowerCase().includes(q)) ||
          (typeof r.pdpList === "string" && r.pdpList.toLowerCase().includes(q)) ||
          (typeof r.cldtoList === "string" && r.cldtoList.toLowerCase().includes(q)) ||
          (typeof r.dpList === "string" && r.dpList.toLowerCase().includes(q))
      );
    }

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
  }, [rows, searchQuery, sortField, sortAsc]);

  // Client-side pagination
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processedRows.slice(start, start + pageSize);
  }, [processedRows, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(processedRows.length / pageSize));

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
    if (lower === "audited" || lower === "processing") {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs font-semibold px-2 py-0.5 rounded-full capitalize">
          {status}
        </Badge>
      );
    }
    if (lower === "dispatched" || lower === "pending") {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs font-semibold px-2 py-0.5 rounded-full capitalize">
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
      {/* Search Bar & Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Input
            placeholder="Quick search order or status..."
            className="pl-9 h-9 text-xs rounded-lg border-primary/10 bg-background/50 hover:border-primary/20 focus:border-primary transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
        </div>

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
              <TableHead className="font-semibold text-xs tracking-wider text-muted-foreground py-3.5 px-4 cursor-pointer hover:text-foreground select-none transition-colors" onClick={() => handleSort("orderNo")}>
                <div className="flex items-center gap-1.5">
                  SALES ORDER
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </TableHead>
              <TableHead className="font-semibold text-xs tracking-wider text-muted-foreground py-3.5 px-4 cursor-pointer hover:text-foreground select-none transition-colors" onClick={() => handleSort("customerCode")}>
                <div className="flex items-center gap-1.5">
                  CUSTOMER
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
                  CONSOLIDATOR
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
                  <TableCell className="p-4"><div className="h-4 bg-muted/60 rounded-md w-28" /></TableCell>
                  <TableCell className="p-4"><div className="h-4 bg-muted/60 rounded-md w-20" /></TableCell>
                  <TableCell className="p-4"><div className="h-4 bg-muted/60 rounded-md w-36" /></TableCell>
                  <TableCell className="p-4"><div className="h-4 bg-muted/60 rounded-md w-24" /></TableCell>
                  <TableCell className="p-4"><div className="h-4 bg-muted/60 rounded-md w-24" /></TableCell>
                </TableRow>
              ))
            ) : paginatedRows.length === 0 ? (
              // Empty State
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground/80">
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
                  {/* Sales Order Column */}
                  <TableCell className="py-3 px-4">
                    <div className="space-y-1">
                      <span className="font-semibold text-xs tracking-tight text-foreground">{row.orderNo || "-"}</span>
                      <div className="flex items-center gap-1.5">
                        {getStatusBadge(row.orderStatus)}
                        {row.orderDate && (
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(row.orderDate).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Customer Code Column */}
                  <TableCell className="py-3 px-4 text-xs font-medium text-foreground">
                    {row.customerCode || "-"}
                  </TableCell>

                  {/* Pre Dispatch Plan Column */}
                  <TableCell className="py-3 px-4 text-xs font-mono text-primary font-semibold hover:underline cursor-pointer">
                    {formatCellList(row.pdpList)}
                  </TableCell>

                  {/* Consolidator Column */}
                  <TableCell className="py-3 px-4 text-xs font-mono text-foreground">
                    {formatCellList(row.cldtoList)}
                  </TableCell>

                  {/* Dispatch Plan Column */}
                  <TableCell className="py-3 px-4 text-xs font-mono text-foreground">
                    {formatCellList(row.dpList)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {processedRows.length > 0 && (
        <div className="flex items-center justify-between py-2 px-1">
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-bold text-foreground">{Math.min(processedRows.length, (page - 1) * pageSize + 1)}</span> to{" "}
            <span className="font-bold text-foreground">{Math.min(processedRows.length, page * pageSize)}</span> of{" "}
            <span className="font-semibold text-foreground">{processedRows.length}</span> records
          </div>

          <div className="flex items-center gap-2">
            <Button
              className="h-8 w-8 rounded-lg border border-primary/10 hover:bg-muted text-muted-foreground p-0"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-xs font-semibold font-mono text-foreground px-2">
              {page} <span className="text-muted-foreground/60 mx-1">/</span> {totalPages}
            </div>
            <Button
              className="h-8 w-8 rounded-lg border border-primary/10 hover:bg-muted text-muted-foreground p-0"
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
