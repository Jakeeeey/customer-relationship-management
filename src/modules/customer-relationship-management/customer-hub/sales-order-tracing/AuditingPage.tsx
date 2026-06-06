// src/modules/customer-relationship-management/customer-hub/sales-order-tracing/AuditingPage.tsx
"use client";

import React from "react";
import useAuditing from "./hooks/useAuditing";
import AuditingFilter from "./components/AuditingFilter";
import AuditingTable from "./components/AuditingTable";
import { Eye, Loader2 } from "lucide-react";

export default function AuditingPage() {
  const {
    rows,
    loading,
    page,
    pageSize,
    setPage,
    setPageSize,
    filters,
    applyFilters,
    clearFilters,
    customerNames,
    total,
    reload,
  } = useAuditing(1, 10);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 min-w-0">
      {/* Title Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
          <Eye className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">Sales Order Tracing</h1>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
          </div>
          <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
            Customer Relationship Management • Status Pipeline
          </p>
        </div>
      </div>

      {/* Filter Section */}
      <AuditingFilter
        filters={filters}
        customerNames={customerNames}
        onApply={applyFilters}
        onClear={clearFilters}
        onRefresh={reload}
      />

      {/* Table Module Section */}
      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <AuditingTable
          rows={rows}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          isLoading={loading}
          total={total}
        />
      </div>
    </div>
  );
}
