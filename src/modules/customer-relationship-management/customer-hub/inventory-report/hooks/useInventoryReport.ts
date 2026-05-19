//src\modules\customer-relationship-management\customer-hub\inventory-report\hooks\useInventoryReport.ts
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
    product: [],
  });

  const [options, setOptions] = useState<LookupOptions>({
    branches: [],
    suppliers: [],
    categories: [],
    brands: [],
    products: [],
  });

  const loadOptions = useCallback(async () => {
    try {
      // Use a small timeout per-request so one slow upstream service doesn't
      // hang the entire options load. Also tolerate individual failures.
      const fetchWithTimeout = async (url: string, timeout = 8000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
          return await fetch(url, {
            signal: controller.signal,
            cache: "no-store",
          });
        } finally {
          clearTimeout(id);
        }
      };

      const urls = [
        `/api/crm/customer-hub/inventory-report?directusCollection=branches&limit=-1&fields=branch_name&sort=branch_name`,
        `/api/crm/customer-hub/inventory-report?directusCollection=brand&limit=-1&fields=brand_name&sort=brand_name`,
        `/api/crm/customer-hub/inventory-report?directusCollection=suppliers&limit=-1&fields=supplier_name,supplier_type&sort=supplier_name&filter={%22supplier_type%22:{%22_eq%22:%22TRADE%22}}`,
        `/api/crm/customer-hub/inventory-report?directusCollection=categories&limit=-1&fields=category_name&sort=category_name`,
        // Request `id` as well so client-side matching can use stable ids while
        // the UI only displays product names.
        `/api/crm/customer-hub/inventory-report?directusCollection=products&limit=-1&fields=product_name&sort=product_name`,
      ];

      const settled = await Promise.allSettled(
        urls.map((u) => fetchWithTimeout(u, 8000)),
      );
      const branchesRes =
        settled[0].status === "fulfilled" ? settled[0].value : null;
      const brandsRes =
        settled[1].status === "fulfilled" ? settled[1].value : null;
      const suppliersRes =
        settled[2].status === "fulfilled" ? settled[2].value : null;
      const categoriesRes =
        settled[3].status === "fulfilled" ? settled[3].value : null;
      const productsRes =
        settled[4].status === "fulfilled" ? settled[4].value : null;

      // // also fetch products list (Directus collection: products)
      // const productsRes = await fetch(
      //   `/api/crm/customer-hub/inventory-report?directusCollection=products&limit=-1&fields=product_id,product_name&sort=product_name`,
      //   { cache: "no-store" },
      // );

      const branchesJson =
        branchesRes && branchesRes.ok
          ? await branchesRes.json().catch(() => null)
          : null;
      const brandsJson =
        brandsRes && brandsRes.ok
          ? await brandsRes.json().catch(() => null)
          : null;
      const suppliersJson =
        suppliersRes && suppliersRes.ok
          ? await suppliersRes.json().catch(() => null)
          : null;
      const categoriesJson =
        categoriesRes && categoriesRes.ok
          ? await categoriesRes.json().catch(() => null)
          : null;
      const productsJson =
        productsRes && productsRes.ok
          ? await productsRes.json().catch(() => null)
          : null;

      setOptions({
        branches: Array.isArray(branchesJson?.data) ? branchesJson.data : [],
        suppliers: Array.isArray(suppliersJson?.data) ? suppliersJson.data : [],
        categories: Array.isArray(categoriesJson?.data)
          ? categoriesJson.data
          : [],
        brands: Array.isArray(brandsJson?.data) ? brandsJson.data : [],
        products: Array.isArray(productsJson?.data) ? productsJson.data : [],
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
    async (useFilters = filters) => {
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
        // Build fetchFilters containing only single-valued filters. For any
        // filter key that contains multiple selections, omit it from the
        // server request and apply the multi-selection filtering client-side
        // after we receive the response. This works around backends that do
        // not support multi-value filters per key.
        const fetchFilters: Record<string, string | undefined> = {};
        const clientMultiFilters: Record<string, string[]> = {};

        try {
          for (const [k, v] of Object.entries(useFilters || {})) {
            if (v === undefined || v === null) continue;
            if (Array.isArray(v)) {
              const items = v
                .map((it) => (it == null ? "" : String(it).trim()))
                .filter((s) => s && s.toLowerCase() !== "all");
              if (items.length === 0) continue;
              if (k === "product") {
                // If a single product is selected, forward it to Spring as
                // `productDescription` (Spring accepts this). For multiple
                // selections, apply client-side filtering after fetching.
                if (items.length === 1) {
                  fetchFilters["productDescription"] = items[0];
                } else {
                  clientMultiFilters[k] = items.map((s) => s.toLowerCase());
                }
              } else if (items.length === 1) {
                fetchFilters[k] = items[0];
              } else {
                clientMultiFilters[k] = items.map((s) => s.toLowerCase());
              }
            } else {
              const s = String(v).trim();
              if (!s || s.toLowerCase() === "all") continue;
              if (k === "product") {
                // single string product -> forward as productDescription
                fetchFilters["productDescription"] = s;
              } else {
                fetchFilters[k] = s;
              }
            }
          }
        } catch (e) {
          // defensive: fall back to passing raw filters
          console.log(e);
          Object.assign(fetchFilters, useFilters as Record<string, string>);
        }

        const resp = (await fetchInventoryData(
          fetchFilters,
          signal,
        )) as InventoryApiResponse;
        // if aborted during fetch, just return early
        if (signal.aborted) return;
        const parsed = parseResponse(resp);
        if (signal.aborted) return;

        let finalData: InventoryRow[] = parsed.data || [];

        // Helper to extract a text value from a row for a given set of
        // possible keys. This handles primitive values and shallow nested
        // objects with common fields like name/label/value.
        const extractStringFromRow = (row: InventoryRow, keys: string[]) => {
          try {
            const r = row as Record<string, unknown>;
            for (const k of keys) {
              if (!k) continue;
              const v = r[k];
              if (v == null) continue;
              if (typeof v === "string" || typeof v === "number") {
                const s = String(v).trim();
                if (s) return s;
              }
              if (typeof v === "object") {
                // shallow search common props
                const cand =
                  (v as Record<string, unknown>)["name"] ??
                  (v as Record<string, unknown>)["value"] ??
                  (v as Record<string, unknown>)["label"] ??
                  (v as Record<string, unknown>)["text"] ??
                  (v as Record<string, unknown>)["unit_name"] ??
                  (v as Record<string, unknown>)["unitName"];
                if (
                  cand != null &&
                  (typeof cand === "string" || typeof cand === "number")
                ) {
                  const s = String(cand).trim();
                  if (s) return s;
                }
              }
            }
            // fallback: try to find any primitive inside the object
            for (const k of Object.keys(r)) {
              const v = r[k];
              if (v == null) continue;
              if (typeof v === "string" || typeof v === "number") {
                const s = String(v).trim();
                if (s) return s;
              }
            }
          } catch {
            /* ignore */
          }
          return "";
        };

        if (Object.keys(clientMultiFilters).length > 0) {
          // Define candidate keys for known filter types
          const keyCandidates: Record<string, string[]> = {
            branch: ["branch", "branch_name", "branchName", "branchName_short"],
            supplier: [
              "supplier",
              "supplier_name",
              "supplier_shortcut",
              "supplierName",
            ],
            category: ["category", "category_name", "categoryName"],
            brand: ["brand", "brand_name", "brandName"],
            product: [
              "productDescription",
              "product_description",
              "product_name",
              "productName",
              "name",
              "item",
            ],
          };

          // Product filters: only need product names. Single selections are
          // forwarded to the Spring endpoint as `productDescription`; multiple
          // selections are applied client-side by matching product name/desc
          // fields on the returned rows.
          let productAllowedNames: string[] = [];
          if (
            clientMultiFilters.product &&
            clientMultiFilters.product.length > 0
          ) {
            productAllowedNames = Array.from(
              new Set(clientMultiFilters.product),
            );
          }

          finalData = finalData.filter((row) => {
            for (const [k, allowed] of Object.entries(clientMultiFilters)) {
              if (k === "product") {
                const nameCandidates = [
                  "productDescription",
                  "product_description",
                  "product_name",
                  "productName",
                  "name",
                  "item",
                ];
                const val = extractStringFromRow(
                  row,
                  nameCandidates,
                ).toLowerCase();
                if (productAllowedNames.length > 0) {
                  if (productAllowedNames.includes(val)) continue;
                }

                return false;
              }

              const candidates = keyCandidates[k] ?? [k];
              const val = extractStringFromRow(row, candidates).toLowerCase();
              if (!allowed.includes(val)) return false;
            }
            return true;
          });
        }

        setRows(finalData || []);
        setTotal(finalData.length || 0);
      } catch (err: unknown) {
        // Detect aborts without using `any`.
        const isAbortError = (e: unknown): boolean =>
          typeof e === "object" &&
          e !== null &&
          (e as { name?: unknown }).name === "AbortError";

        if (isAbortError(err)) {
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
        if (abortControllerRef.current === controller)
          abortControllerRef.current = null;
      }
    },
    // Include `options` and `filters` so the callback stays in sync with the
    // latest lookup options and the active filters used as a default param.
    // Callers control when loadData runs via explicit calls; keeping deps
    // minimal beyond those two values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options, filters],
  );

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  // Initial load on mount
  useEffect(() => {
    loadData(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced reload when filters change only. Do NOT fetch when page or pageSize
  // change since we fetch the full dataset and paginate client-side.
  useEffect(() => {
    const timeout = setTimeout(() => {
      // Always refetch starting at page 1 when filters change
      loadData(filters);
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
      product: "all",
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
    reload: () => loadData(filters),
  };
}

export default useInventoryReport;
