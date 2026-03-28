import { useState, useEffect, useCallback } from "react";
import { CustomerMapFilter, CustomerMapRecord } from "../types/customer-map.schema";

export function useCustomerMap() {
  const [data, setData] = useState<CustomerMapRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CustomerMapFilter>({});
  const [options, setOptions] = useState<{
    clusters: string[];
    storeTypes: string[];
    classifications: string[];
    salesmen: string[];
  }>({
    clusters: [],
    storeTypes: [],
    classifications: [],
    salesmen: [],
  });

  const fetchOptions = useCallback(async () => {
    try {
      const fields = ["cluster", "storeType", "classification", "salesman"];
      const results = await Promise.all(
        fields.map(field => fetch(`/api/crm/customer-hub/customer-map?field=${field}`).then(res => res.json()))
      );

      setOptions({
        clusters: Array.isArray(results[0]) ? results[0] : [],
        storeTypes: Array.isArray(results[1]) ? results[1] : [],
        classifications: Array.isArray(results[2]) ? results[2] : [],
        salesmen: Array.isArray(results[3]) ? results[3] : [],
      });
    } catch (err) {
      console.warn("Failed to fetch filter options:", err);
    }
  }, []);

  const fetchMapData = useCallback(async (currentFilters: CustomerMapFilter) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (currentFilters.cluster) params.append("cluster", currentFilters.cluster);
      if (currentFilters.storeType) params.append("storeType", currentFilters.storeType);
      if (currentFilters.classification) params.append("classification", currentFilters.classification);
      if (currentFilters.salesman) params.append("salesman", currentFilters.salesman);

      const response = await fetch(`/api/crm/customer-hub/customer-map?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch map data");
      }
      
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    fetchMapData(filters);
  }, [filters, fetchMapData]);

  const updateFilters = (newFilters: CustomerMapFilter) => {
    setFilters(newFilters);
  };

  const refreshMap = () => {
    fetchMapData(filters);
    fetchOptions();
  };

  return {
    data,
    isLoading,
    error,
    filters,
    options,
    updateFilters,
    refreshMap,
  };
}
