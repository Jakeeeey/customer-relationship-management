// src/modules/business-intelligence-analytics/sales-report/providers/fetchProvider.ts
import type { SalesReportLookups, SalesReportResponse } from "../types";

async function http<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "GET", cache: "no-store" });
  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.success) {
    const msg = data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data.data as T;
}

export async function getLookups() {
  return http<SalesReportLookups>("/api/analytics/sales-report/salesman-performance?mode=lookups");
}

export async function getSalesReport(params: {
  year: number;
  months: number[];
  employee_id: number;
  salesman_codes: string[];
}) {
  const sp = new URLSearchParams();
  sp.set("mode", "report");
  sp.set("year", String(params.year));
  sp.set("months", params.months.join(","));
  sp.set("employee_id", String(params.employee_id));
  sp.set("salesman_codes", params.salesman_codes.join(","));
  return http<SalesReportResponse>(`/api/analytics/sales-report/salesman-performance?${sp.toString()}`);
}
