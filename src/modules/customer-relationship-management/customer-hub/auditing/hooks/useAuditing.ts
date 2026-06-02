// src/modules/customer-relationship-management/customer-hub/auditing/hooks/useAuditing.ts
"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { fetchAuditingData } from "../providers/fetchProvider";
import { toast } from "sonner";
import type { AuditingFilters, AuditingRow } from "../types";

export function useAuditing(initialPage = 1, initialSize = 10) {
  const [allRows, setAllRows] = useState<AuditingRow[]>([]);
  const [filteredRows, setFilteredRows] = useState<AuditingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialSize);

  const [filters, setFilters] = useState<AuditingFilters>({
    startDate: "",
    endDate: "",
    orderStatus: "all",
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch records dynamically supporting date ranges passed from filters
  const loadData = useCallback(async (useFilters = filters) => {
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    } catch {
      /* ignore */
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    setLoading(true);
    setError(null);

    try {
      const fetchFilters: AuditingFilters = {};
      if (useFilters.startDate) fetchFilters.startDate = useFilters.startDate;
      if (useFilters.endDate) fetchFilters.endDate = useFilters.endDate;

      const resp = await fetchAuditingData(fetchFilters, signal);
      if (signal.aborted) return;

      const dataRows = Array.isArray(resp) ? resp : [];
      setAllRows(dataRows);
    } catch (err: unknown) {
      const isAbort =
        typeof err === "object" && err !== null && (err as { name?: unknown }).name === "AbortError";
      if (isAbort) return;

      console.error("Auditing fetch error", err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(message || "Failed to load auditing data");
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setLoading(false);
    }
  }, []);

  // Client-side filtering for orderStatus
  useEffect(() => {
    let result = [...allRows];

    // Filter by orderStatus in client memory
    if (filters.orderStatus && filters.orderStatus.toLowerCase() !== "all") {
      const targetStatus = filters.orderStatus.toLowerCase();
      result = result.filter(
        (row) => row.orderStatus && row.orderStatus.toLowerCase() === targetStatus
      );
    }

    setFilteredRows(result);
    setPage(1);
  }, [allRows, filters.orderStatus]);

  // Re-fetch all records only when dates changes dynamically
  useEffect(() => {
    loadData(filters);
  }, [filters.startDate, filters.endDate, loadData]);

  const applyFilters = (next: AuditingFilters) => {
    setFilters((prev) => ({ ...prev, ...next }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      orderStatus: "all",
    });
  };

  return {
    rows: filteredRows,
    loading,
    error,
    page,
    pageSize,
    total: filteredRows.length,
    setPage,
    setPageSize,
    filters,
    setFilters,
    applyFilters,
    clearFilters,
    reload: () => loadData(filters),
  };
}

export default useAuditing;
