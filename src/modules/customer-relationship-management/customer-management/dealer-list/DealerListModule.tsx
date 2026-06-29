"use client";
// src/modules/customer-relationship-management/customer-management/dealer-list/DealerListModule.tsx

import React, { useCallback, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import useDealerList from "./hooks/useDealerList";
import DealerListFilter from "./components/Filter";
import DealerTable from "./components/DealerTable";
import DealerDetail from "./components/DealerDetail";
import AddDealerDialog from "./components/AddDealerDialog";
import type { DealerRecord } from "./types";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Sort helpers
// ---------------------------------------------------------------------------
type SortKey =
  | "dealer_name"
  | "dealer_code"
  | "dealer_type"
  | "dealer_city"
  | "dealer_province"
  | "dealer_dateAdmitted"
  | "subscription_tier";

function sortRows(
  rows: DealerRecord[],
  sortBy: SortKey,
  sortDir: "asc" | "desc",
): DealerRecord[] {
  return [...rows].sort((a, b) => {
    const av = String(a[sortBy] ?? "").toLowerCase();
    const bv = String(b[sortBy] ?? "").toLowerCase();
    const cmp = av.localeCompare(bv);
    return sortDir === "asc" ? cmp : -cmp;
  });
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------
export default function DealerListModule() {
  const {
    filteredRows,
    loading,
    error,
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
    filters,
    applyFilters,
    options,
    selectedDealer,
    setSelectedDealer,
    reload,
  } = useDealerList(1, 20);

  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "dealer_name",
    dir: "asc",
  });
  const [addOpen, setAddOpen] = useState(false);
  const [dealerToEdit, setDealerToEdit] = useState<DealerRecord | null>(null);

  // Client-side sort applied on top of the already-filtered rows
  const sortedRows = useMemo(
    () => sortRows(filteredRows, sort.key, sort.dir),
    [filteredRows, sort.key, sort.dir],
  );

  // Slice for the current page
  const pageRows = useMemo(
    () => sortedRows.slice((page - 1) * pageSize, page * pageSize),
    [sortedRows, page, pageSize],
  );

  const handleSort = useCallback((key: SortKey) => {
    setSort((prev) => ({
      key,
      dir: prev.key === key ? (prev.dir === "asc" ? "desc" : "asc") : "asc",
    }));
    setPage(1);
  }, [setPage]);

  const handleReload = useCallback(() => {
    reload();
    toast.info("Refreshing dealer list…");
  }, [reload]);

  const handleDealerSaved = useCallback((saved: DealerRecord) => {
    // Reload the full list so the record appears / updates
    reload();

    // Enrich saved record with type_name and name from options lookup lists
    const typeId = saved.dealer_type_id && typeof saved.dealer_type_id === "object"
      ? saved.dealer_type_id.dealer_type_id
      : saved.dealer_type_id;
    const subId = saved.subscription_id && typeof saved.subscription_id === "object"
      ? saved.subscription_id.id
      : saved.subscription_id;

    // Only search if the ID is valid/truthy
    const typeObj = typeId
      ? options.types.find((t) => Number(t.dealer_type_id) === Number(typeId))
      : undefined;
    const subObj = subId
      ? options.tiers.find((s) => Number(s.id) === Number(subId))
      : undefined;

    const enriched: DealerRecord = {
      ...saved,
      dealer_type: typeObj ? typeObj.type_name : undefined,
      subscription_tier: subObj ? subObj.name : undefined,
      dealer_type_id: typeObj || null,
      subscription_id: subObj || null,
    };

    // Keep the details view open for the saved record
    setSelectedDealer(enriched);
    setDealerToEdit(null);
  }, [reload, setSelectedDealer, options]);

  const handlePageSizeChange = useCallback((s: number) => {
    setPageSize(s);
    setPage(1);
  }, [setPageSize, setPage]);

  const handleEdit = useCallback((d: DealerRecord) => {
    setDealerToEdit(d);
    setAddOpen(true);
  }, []);

  const handleAddDealer = useCallback(() => {
    setDealerToEdit(null);
    setAddOpen(true);
  }, []);

  const handleAddClose = useCallback(() => {
    setAddOpen(false);
    setDealerToEdit(null);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedDealer(null);
  }, [setSelectedDealer]);

  const handleDetailEdit = useCallback(() => {
    if (selectedDealer) {
      setDealerToEdit(selectedDealer);
      setSelectedDealer(null);
      setAddOpen(true);
    }
  }, [selectedDealer, setSelectedDealer]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 animate-in fade-in duration-500">
      {/* ── Page title ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Dealers
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage dealer profiles, registration data, and operational account
              details.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            id="dealer-reload"
            variant="outline"
            size="sm"
            onClick={handleReload}
            disabled={loading}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh Data</span>
          </Button>
        </div>
      </div>
      <Separator />

      {/* ── Filters ── */}
      <DealerListFilter
        filters={filters}
        options={options}
        onApply={applyFilters}
        onAddDealer={handleAddDealer}
      />

      {/* ── Error banner ── */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <DealerTable
        rows={pageRows}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        filteredTotal={filteredRows.length}
        isLoading={loading}
        sortBy={sort.key}
        sortDir={sort.dir}
        onSort={handleSort}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        onRowClick={setSelectedDealer}
        onEdit={handleEdit}
        filters={filters}
      />

      {/* ── Detail Dialog ── */}
      <DealerDetail
        dealer={selectedDealer}
        open={selectedDealer !== null}
        onClose={handleCloseDetail}
        onEdit={handleDetailEdit}
      />

      {/* ── Add Dealer Dialog ── */}
      <AddDealerDialog
        open={addOpen}
        onClose={handleAddClose}
        onSuccess={handleDealerSaved}
        options={options}
        dealerToEdit={dealerToEdit}
      />
    </div>
  );
}
