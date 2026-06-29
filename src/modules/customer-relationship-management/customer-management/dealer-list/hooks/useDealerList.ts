//src/modules/customer-relationship-management/customer-management/dealer-list/hooks/useDealerList.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  fetchDealerData,
  fetchDealerFieldOptions,
  fetchDealerTypes,
  fetchSubscriptions,
  fetchDepartmentOptions,
} from "../providers/fetchProvider";
import type {
  DealerApiResponse,
  DealerFilters,
  DealerKPIs,
  DealerLookupOptions,
  DealerRecord,
  NormalizedDealerResult,
} from "../types";

// ---------------------------------------------------------------------------
// Response normalizer – handles array | { data: [] } | null shapes
// ---------------------------------------------------------------------------
function parseResponse(
  json: DealerApiResponse | unknown,
): NormalizedDealerResult {
  if (!json) return { data: [], total: 0 };
  
  let rawItems: DealerRecord[] = [];
  let totalCount = 0;

  if (Array.isArray(json)) {
    rawItems = json as DealerRecord[];
    totalCount = json.length;
  } else if (typeof json === "object" && json !== null) {
    const obj = json as Record<string, unknown>;
    if (Array.isArray(obj.data)) {
      rawItems = obj.data as DealerRecord[];
      const meta = obj.meta as Record<string, unknown> | undefined;
      totalCount =
        (meta &&
          (Number(meta["filter_count"]) || Number(meta["total_count"]))) ||
        rawItems.length;
    }
  }

  // Map nested objects to raw virtual strings so components continue to work
  const mappedData = rawItems.map((r) => {
    const typeObj = r.dealer_type_id;
    const subObj = r.subscription_id;
    return {
      ...r,
      dealer_type:
        typeObj && typeof typeObj === "object"
          ? typeObj.type_name
          : undefined,
      subscription_tier:
        subObj && typeof subObj === "object"
          ? subObj.name
          : undefined,
    };
  });

  return { data: mappedData, total: totalCount };
}

// ---------------------------------------------------------------------------
// KPI derivation (pure, client-side)
// ---------------------------------------------------------------------------
function computeKPIs(data: DealerRecord[]): DealerKPIs {
  return {
    totalDealers: data.length,
    activeDealers: data.filter(
      (d) => d.dealer_name && String(d.dealer_name).trim().length > 0,
    ).length,
    dealerTypes: new Set(data.map((d) => d.dealer_type).filter(Boolean)).size,
    provinces: new Set(data.map((d) => d.dealer_province).filter(Boolean)).size,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useDealerList(initialPage = 1, initialPageSize = 20) {
  const [allRows, setAllRows] = useState<DealerRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState<DealerFilters>({
    dealer_type_id: "",
    dealer_city: "",
    dealer_province: "",
    dealer_brgy: "",
    dealer_department: "",
    subscription_id: "",
    search: "",
  });

  const [options, setOptions] = useState<DealerLookupOptions>({
    types: [],
    cities: [],
    provinces: [],
    departments: [],
    tiers: [],
  });

  const [selectedDealer, setSelectedDealer] = useState<DealerRecord | null>(
    null,
  );

  const abortControllerRef = useRef<AbortController | null>(null);

  // -------------------------------------------------------------------------
  // Load filter dropdown options from Directus
  // -------------------------------------------------------------------------
  const loadOptions = useCallback(async () => {
    try {
      const [types, cities, provinces, departments, tiers] = await Promise.all([
        fetchDealerTypes(),
        fetchDealerFieldOptions("dealer_city"),
        fetchDealerFieldOptions("dealer_province"),
        fetchDepartmentOptions(),
        fetchSubscriptions(),
      ]);

      setOptions({ types, cities, provinces, departments, tiers });
    } catch (e) {
      console.warn("Failed to load dealer lookup options", e);
      // non-critical – filters will still work with empty options
    }
  }, []);

  // -------------------------------------------------------------------------
  // Load dealer records
  // -------------------------------------------------------------------------
  const loadData = useCallback(
    async (useFilters = filters) => {
      // Cancel any previous in-flight request
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
        // Only server-filter fields that the Directus filter system supports
        // (single-value equality). The free-text `search` filter is applied
        // client-side below.
        const serverFilters: DealerFilters = {
          dealer_type_id: useFilters.dealer_type_id,
          dealer_city: useFilters.dealer_city,
          dealer_province: useFilters.dealer_province,
          dealer_brgy: useFilters.dealer_brgy,
          dealer_department: useFilters.dealer_department,
          subscription_id: useFilters.subscription_id,
        };

        const resp = (await fetchDealerData(
          serverFilters,
          signal,
        )) as DealerApiResponse;

        if (signal.aborted) return;

        const parsed = parseResponse(resp);
        if (signal.aborted) return;

        setAllRows(parsed.data);
        setTotal(parsed.total);
      } catch (err: unknown) {
        const isAbortError = (e: unknown): boolean =>
          typeof e === "object" &&
          e !== null &&
          (e as { name?: unknown }).name === "AbortError";

        if (isAbortError(err)) return;

        console.error("Dealer list fetch error", err);
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        toast.error(message || "Failed to load dealer list");
      } finally {
        setLoading(false);
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [filters],
  );

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------
  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  // Initial data load
  useEffect(() => {
    loadData(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced refetch on server-side filter changes (not search)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.dealer_type_id,
    filters.dealer_city,
    filters.dealer_province,
    filters.dealer_brgy,
    filters.dealer_department,
    filters.subscription_id,
  ]);

  // -------------------------------------------------------------------------
  // Client-side search + pagination applied on top of allRows
  // -------------------------------------------------------------------------
  const search = filters.search ?? "";

  const filteredRows = search.trim()
    ? allRows.filter((r) => {
        const needle = search.trim().toLowerCase();
        return [
          r.dealer_name,
          r.dealer_code,
          r.dealer_type,
          r.dealer_city,
          r.dealer_province,
          r.dealer_brgy,
          r.dealer_email,
          r.dealer_contact,
          r.dealer_department,
          r.subscription_tier,
          r.dealer_tags,
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(needle));
      })
    : allRows;

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const rows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const kpis = computeKPIs(filteredRows);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------
  const applyFilters = useCallback((next: Partial<DealerFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      dealer_type_id: "",
      dealer_city: "",
      dealer_province: "",
      dealer_brgy: "",
      dealer_department: "",
      subscription_id: "",
      search: "",
    });
    setPage(1);
  }, []);

  return {
    // Table data
    rows,
    filteredRows,
    allRows,
    loading,
    error,
    // Pagination
    page,
    pageSize,
    total,
    totalPages,
    setPage,
    setPageSize,
    // Filters
    filters,
    applyFilters,
    clearFilters,
    // Lookup options for filter dropdowns
    options,
    // KPIs
    kpis,
    // Detail view
    selectedDealer,
    setSelectedDealer,
    // Manual reload
    reload: useCallback(() => {
      loadData(filters);
    }, [loadData, filters]),
  };
}

export default useDealerList;
