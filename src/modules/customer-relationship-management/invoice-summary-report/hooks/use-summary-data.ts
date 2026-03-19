import { useState, useEffect, useMemo, useCallback } from "react";
import { InvoiceReportRow } from "../types";

export function useSummaryData() {
  const [rawData, setRawData] = useState<InvoiceReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/crm/invoice-summary-report");
      const json = await response.json();
      setRawData(json.data || []);
    } catch (error) {
      console.error("Summary Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return useMemo(
    () => ({
      rawData,
      isLoading,
      refresh: fetchData,
    }),
    [rawData, isLoading, fetchData],
  );
}
