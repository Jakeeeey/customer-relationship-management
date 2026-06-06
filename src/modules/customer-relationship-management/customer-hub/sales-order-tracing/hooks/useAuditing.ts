// src/modules/customer-relationship-management/customer-hub/sales-order-tracing/hooks/useAuditing.ts
"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { fetchAuditingData } from "../providers/fetchProvider";
import { toast } from "sonner";
import type { AuditingFilters, AuditingRow } from "../types";

export function useAuditing(initialPage = 1, initialSize = 10) {
  const [rows, setRows] = useState<AuditingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [customerNames, setCustomerNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialSize);

  const [filters, setFilters] = useState<AuditingFilters>({
    search: "",
    customerName: "",
    startDate: "",
    endDate: "",
    orderStatus: "all",
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch records dynamically supporting pagination and filters
  const loadData = useCallback(async (
    p: number,
    s: number,
    f: AuditingFilters
  ) => {
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
      const resp = await fetchAuditingData(
        {
          ...f,
          page: p,
          size: s,
        },
        signal
      );
      if (signal.aborted) return;

      if (resp) {
        setRows(resp.content || []);
        setTotal(resp.totalElements || 0);
        if (resp.customerNames) {
          setCustomerNames(resp.customerNames);
        }
      } else {
        setRows([]);
        setTotal(0);
      }
    } catch (err: unknown) {
      const isAbort =
        typeof err === "object" && err !== null && (err as { name?: unknown }).name === "AbortError";
      if (isAbort) return;

      console.error("Auditing fetch error", err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(message || "Failed to load sales-order-tracing data");
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setLoading(false);
    }
  }, []);

  // Fetch data on dependency changes
  useEffect(() => {
    loadData(page, pageSize, filters);
  }, [page, pageSize, filters, loadData]);

  const applyFilters = (next: AuditingFilters) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1); // Reset page to 1 on filter application
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      customerName: "",
      startDate: "",
      endDate: "",
      orderStatus: "all",
    });
    setPage(1); // Reset page to 1 on clear
  };

  return {
    rows,
    loading,
    error,
    page,
    pageSize,
    total,
    setPage,
    setPageSize,
    filters,
    setFilters,
    applyFilters,
    clearFilters,
    customerNames,
    reload: () => loadData(page, pageSize, filters),
  };
}

export default useAuditing;
