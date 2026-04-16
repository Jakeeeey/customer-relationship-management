"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { fetchInventoryData } from "../providers/fetchprovider";
import { toast } from "sonner";
import type {
  InventoryFilters,
  InventoryRow,
  LookupOptions,
  InventoryApiResponse,
  NormalizedInventoryResult,
} from "../type";

export function useInventoryReport(initialPage = 1, initialSize = 20) {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialSize);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState<InventoryFilters>({
    branch: [],
    supplier: [],
    category: [],
    brand: [],
  });

  const [options, setOptions] = useState<LookupOptions>({
    branches: [],
    suppliers: [],
    categories: [],
    brands: [],
  });

  const loadOptions = useCallback(async () => {
    try {
      const [branchesRes, brandsRes, suppliersRes, categoriesRes] =
        await Promise.all([
          fetch(
            `/api/crm/customer-hub/inventory-report?directusCollection=branches&limit=-1&fields=branch_name&sort=branch_name`,
            { cache: "no-store" },
          ),
          fetch(
            `/api/crm/customer-hub/inventory-report?directusCollection=brand&limit=-1&fields=brand_name&sort=brand_name`,
            { cache: "no-store" },
          ),
          fetch(
            `/api/crm/customer-hub/inventory-report?directusCollection=suppliers&limit=-1&fields=supplier_name&sort=supplier_name`,
            { cache: "no-store" },
          ),
          fetch(
            `/api/crm/customer-hub/inventory-report?directusCollection=categories&limit=-1&fields=category_name&sort=category_name`,
            { cache: "no-store" },
          ),
        ]);

      const [branchesJson, brandsJson, suppliersJson, categoriesJson] =
        await Promise.all([
          branchesRes.ok ? branchesRes.json().catch(() => null) : null,
          brandsRes.ok ? brandsRes.json().catch(() => null) : null,
          suppliersRes.ok ? suppliersRes.json().catch(() => null) : null,
          categoriesRes.ok ? categoriesRes.json().catch(() => null) : null,
        ]);

      setOptions({
        branches: Array.isArray(branchesJson?.data) ? branchesJson.data : [],
        suppliers: Array.isArray(suppliersJson?.data) ? suppliersJson.data : [],
        categories: Array.isArray(categoriesJson?.data)
          ? categoriesJson.data
          : [],
        brands: Array.isArray(brandsJson?.data) ? brandsJson.data : [],
      });
    } catch (e: unknown) {
      console.warn("Failed to load lookup options", e);
      toast.error("Failed to load filter options");
    }
  }, []);

  const parseResponse = (
    json: InventoryApiResponse | unknown,
  ): NormalizedInventoryResult => {
    // Attempt to normalize common shapes
    if (!json) return { data: [], total: 0 };
    if (Array.isArray(json))
      return { data: json as InventoryRow[], total: json.length };

    if (typeof json === "object" && json !== null) {
      const asObj = json as Record<string, unknown>;
      // { data: [], meta: { total: number } }
      if (Array.isArray(asObj.data)) {
        const meta = asObj.meta as Record<string, unknown> | undefined;
        const totalCount =
          (meta &&
            (Number(meta["total"]) ||
              Number(meta["total_elements"]) ||
              Number(meta["total_count"]) ||
              Number(meta["total_groups"]))) ||
          0;
        return {
          data: asObj.data as InventoryRow[],
          total: totalCount || (asObj.data as InventoryRow[]).length,
        };
      }

      // { items: [] } or { content: [] }
      if (Array.isArray(asObj.items) || Array.isArray(asObj.content)) {
        const arr = (asObj.items ?? asObj.content) as InventoryRow[];
        const tot = (Number(asObj.total) ||
          Number(asObj.totalElements) ||
          Number(asObj["total_count"]) ||
          arr.length) as number;
        return { data: arr, total: tot };
      }

      // Single-record object
      // Detect by looking for common inventory keys
      const maybeKeys = ["product_code", "product_name", "productCode", "name"];
      if (
        maybeKeys.some((k) => Object.prototype.hasOwnProperty.call(asObj, k))
      ) {
        return { data: [asObj as InventoryRow], total: 1 };
      }
    }

    return { data: [], total: 0 };
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(
    // load the full filtered dataset (page/pageSize are for caller convenience only)
    async (p = page, size = pageSize, useFilters = filters) => {
      // Abort any previous in-flight request for inventory data
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
        const resp = (await fetchInventoryData(
          p,
          size,
          useFilters,
          signal,
        )) as InventoryApiResponse;
        // if aborted during fetch, just return early
        if (signal.aborted) return;
        const parsed = parseResponse(resp);
        if (signal.aborted) return;
        setRows(parsed.data || []);
        setTotal(parsed.total || 0);
      } catch (err: unknown) {
        if ((err as any)?.name === "AbortError") {
          // request was aborted - do not surface as an error
          return;
        }
        console.error("Inventory fetch error", err);
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        toast.error(message || "Failed to load inventory");
      } finally {
        setLoading(false);
        // clear controller only if it's the same one we created
        if (abortControllerRef.current === controller) abortControllerRef.current = null;
      }
    },
    // Intentionally leave deps empty - callers provide p/size/useFilters to control behavior
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  // Initial load on mount
  useEffect(() => {
    loadData(page, pageSize, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced reload when filters change only. Do NOT fetch when page or pageSize
  // change since we fetch the full dataset and paginate client-side.
  useEffect(() => {
    const timeout = setTimeout(() => {
      // Always refetch starting at page 1 when filters change
      loadData(1, pageSize, filters);
    }, 350);

    return () => {
      clearTimeout(timeout);
      // If a filter change occurs while a fetch is in-flight, abort it.
      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
      } catch {
        /* ignore */
      }
    };
    // Only watch filters changes intentionally. Page changes should not trigger data fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const applyFilters = (next: InventoryFilters) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      branch: "all",
      supplier: "all",
      category: "all",
      brand: "all",
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
    options,
    reload: () => loadData(page, pageSize, filters),
  };
}

export default useInventoryReport;
