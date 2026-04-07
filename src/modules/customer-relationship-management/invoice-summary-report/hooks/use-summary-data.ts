import { useState, useEffect, useMemo, useCallback } from "react";
import { InvoiceReportRow } from "../types";

// Type for the raw API response item
interface ApiInvoiceItem {
  date_approved?: string | null;
  invoice_no?: string | number | null;
  sales_order_id?: string | number | null;
  customer_code?: string | null;
  total_amount?: number | null;
  reason_code?: string | null;
  remarks?: string | null;
  status?: string;
  approver_name?: string | null; // 🚀 FIX: Added to interface
}

export function useSummaryData() {
  const [rawData, setRawData] = useState<InvoiceReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/crm/invoice-summary-report?page=0&size=1000");
      const json = await response.json();

      const rawItems = json.content || [];

      const mappedData: InvoiceReportRow[] = rawItems.map((item: ApiInvoiceItem) => ({
        date_time: item.date_approved || null,
        original_invoice: String(item.invoice_no || "N/A"),
        sales_order_no: String(item.sales_order_id || "N/A"),
        customer_name: item.customer_code || "Unknown Customer",
        amount: Number(item.total_amount) || 0,
        defect_reason: item.reason_code || "Uncategorized",
        csr_remarks: item.remarks || null,
        approver: item.approver_name || null, // 🚀 FIX: Successfully mapped to the UI!
        status: (item.status as "PENDING" | "APPROVED" | "REJECTED") || "PENDING",
      }));

      setRawData(mappedData);
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