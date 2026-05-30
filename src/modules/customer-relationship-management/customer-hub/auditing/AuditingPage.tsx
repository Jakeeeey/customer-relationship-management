// src/modules/customer-relationship-management/customer-hub/auditing/AuditingPage.tsx
"use client";

import React from "react";
import useAuditing from "./hooks/useAuditing";
import AuditingFilter from "./components/AuditingFilter";
import AuditingTable from "./components/AuditingTable";
import { Eye } from "lucide-react";

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
  } = useAuditing(1, 10);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 min-w-0">
      {/* Title Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
          <Eye className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">Auditing Module</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
            Customer Relationship Management • Status Pipeline
          </p>
        </div>
      </div>

      {/* Filter Section */}
      <AuditingFilter
        filters={filters}
        onApply={applyFilters}
        onClear={clearFilters}
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
        />
      </div>
    </div>
  );
}
