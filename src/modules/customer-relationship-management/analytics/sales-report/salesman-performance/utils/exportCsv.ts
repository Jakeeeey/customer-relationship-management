// src/modules/business-intelligence-analytics/sales-report/utils/exportCsv.ts
"use client";

import * as XLSX from "xlsx";
import type { SalesReportRow, SalesInvoiceRow, SalesReportFilters } from "../types";

function safeFilenamePart(s: string) {
  return String(s || "")
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatMonths(months: number[] | undefined) {
  if (!months || months.length === 0) return "AllMonths";
  return months
    .slice()
    .sort((a, b) => a - b)
    .map((m) => String(m).padStart(2, "0"))
    .join("-");
}

function hasClassification(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return false;
  const lowered = s.toLowerCase();
  return lowered !== "-" && lowered !== "—" && lowered !== "n/a" && lowered !== "na" && lowered !== "none";
}

function sortClassificationFirst(rows: SalesReportRow[]) {
  // Classified rows first; keep relative order within each group (stable sort in modern JS)
  return [...rows].sort((a, b) => {
    const aHas = hasClassification((a as Record<string, unknown>).classification);
    const bHas = hasClassification((b as Record<string, unknown>).classification);
    if (aHas === bHas) return 0;
    return aHas ? -1 : 1;
  });
}

export function exportSalesReportCsv(args: {
  reportRows: SalesReportRow[];
  invoiceRows: SalesInvoiceRow[];
  filters?: SalesReportFilters;
}) {
  const { reportRows, invoiceRows, filters } = args;

  // ✅ PRIORITIZE CLASSIFICATION ROWS FIRST (matches UI expectation)
  const sortedReportRows = sortClassificationFirst(reportRows ?? []);

  // =========================
  // Sheet 1: Main Report Table
  // =========================
  const sheet1Data = sortedReportRows.map((r) => {
    const rc = r as Record<string, unknown>;
    return {
    Classification: hasClassification(rc.classification) ? rc.classification : "",
    "Customer Name": rc.customer_name ?? "",

    "Freq 1 Allocated (SO)": rc.so_1_15 ?? 0,
    "Freq 1 SO Date": rc.so_1_15_date ?? "",
    "Freq 1 Net Sales (SI)": rc.si_1_15 ?? 0,
    "Freq 1 SI Date": rc.si_1_15_date ?? "",

    "Freq 2 Allocated (SO)": rc.so_16_eom ?? 0,
    "Freq 2 SO Date": rc.so_16_eom_date ?? "",
    "Freq 2 Net Sales (SI)": rc.si_16_eom ?? 0,
    "Freq 2 SI Date": rc.si_16_eom_date ?? "",

    "Total (SI)": rc.total_si ?? 0,
  }});

  const ws1 = XLSX.utils.json_to_sheet(sheet1Data, {
    header: [
      "Classification",
      "Customer Name",
      "Freq 1 Allocated (SO)",
      "Freq 1 SO Date",
      "Freq 1 Net Sales (SI)",
      "Freq 1 SI Date",
      "Freq 2 Allocated (SO)",
      "Freq 2 SO Date",
      "Freq 2 Net Sales (SI)",
      "Freq 2 SI Date",
      "Total (SI)",
    ],
  });

  ws1["!cols"] = [
    { wch: 22 }, // Classification
    { wch: 40 }, // Customer Name
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
  ];

  // =========================
  // Sheet 2: Invoices Table
  // =========================
  const sheet2Data = (invoiceRows ?? []).map((r) => {
    const rc = r as Record<string, unknown>;
    return {
    Customer: rc.customer ?? "",
    "PO Date": rc.po_date ?? "",
    "Sales Invoice Date": rc.si_date ?? "",
    "Net Amount (SI - SR)": rc.net_amount ?? 0,
  }});

  const ws2 = XLSX.utils.json_to_sheet(sheet2Data, {
    header: ["Customer", "PO Date", "Sales Invoice Date", "Net Amount (SI - SR)"],
  });

  ws2["!cols"] = [{ wch: 44 }, { wch: 16 }, { wch: 18 }, { wch: 20 }];

  // =========================
  // Workbook build + download
  // =========================
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, "Sales Report");
  XLSX.utils.book_append_sheet(wb, ws2, "Invoices");

  // ✅ UPDATED: Salesman selection is employee_id now
  const employeePart = safeFilenamePart(String(filters?.employee_id ?? "AllSalesmen"));
  const yearPart = safeFilenamePart(String(filters?.year ?? ""));
  const monthPart = safeFilenamePart(formatMonths(filters?.months));

  const filename = `Sales_Report_${employeePart}_${yearPart}_${monthPart}.xlsx`;

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
