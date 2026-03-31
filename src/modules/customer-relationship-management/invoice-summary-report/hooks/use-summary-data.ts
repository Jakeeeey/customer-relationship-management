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
}

export function useSummaryData() {
  const [rawData, setRawData] = useState<InvoiceReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 🚀 FIX 1: Fetch a large batch so your dashboard charts have data to aggregate
      const response = await fetch("/api/crm/invoice-summary-report?page=0&size=1000");
      const json = await response.json();

      // 🚀 FIX 2: Spring Boot pagination puts the array inside 'content', not 'data'
      const rawItems = json.content || [];

      // 🚀 FIX 3: The Translation Layer! Map backend keys to your UI's expected keys
      const mappedData: InvoiceReportRow[] = rawItems.map((item: ApiInvoiceItem) => ({
        date_time: item.date_approved || null, // Map from date_approved
        original_invoice: String(item.invoice_no || "N/A"), // Map from invoice_no
        sales_order_no: item.sales_order_id || "N/A", // Map from sales_order_id
        customer_name: item.customer_code || "Unknown Customer", // Map from customer_code
        amount: Number(item.total_amount) || 0, // Map from total_amount
        defect_reason: item.reason_code || "Uncategorized", // Map from reason_code
        csr_remarks: item.remarks || null, // Map from remarks
        approver: null, // Default to null until your backend provides the approver's name
        status: item.status || "PENDING",
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