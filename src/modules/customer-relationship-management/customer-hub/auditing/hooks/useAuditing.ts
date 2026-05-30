// src/modules/customer-relationship-management/customer-hub/auditing/hooks/useAuditing.ts
"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { fetchAuditingData } from "../providers/fetchProvider";
import { toast } from "sonner";
import type { AuditingFilters, AuditingRow } from "../types";

export function useAuditing(initialPage = 1, initialSize = 10) {
  const [rows, setRows] = useState<AuditingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialSize);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState<AuditingFilters>({
    startDate: "",
    endDate: "",
    customerCode: "",
    orderStatus: "all",
    orderNo: "",
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(
    async (useFilters = filters) => {
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
        Object.entries(useFilters).forEach(([k, v]) => {
          if (v !== undefined && v !== null && String(v).trim() !== "" && String(v).toLowerCase() !== "all") {
            fetchFilters[k as keyof AuditingFilters] = String(v).trim();
          }
        });

        const resp = await fetchAuditingData(fetchFilters, signal);
        if (signal.aborted) return;

        const dataRows = Array.isArray(resp) ? resp : [];
        setRows(dataRows);
        setTotal(dataRows.length);
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
    },
    [filters]
  );

  useEffect(() => {
    loadData(filters);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadData(filters);
    }, 350);

    return () => {
      clearTimeout(timeout);
      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
      } catch {
        /* ignore */
      }
    };
  }, [filters, loadData]);

  const applyFilters = (next: AuditingFilters) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      customerCode: "",
      orderStatus: "all",
      orderNo: "",
    });
    setPage(1);
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
    reload: () => loadData(filters),
  };
}

export default useAuditing;
