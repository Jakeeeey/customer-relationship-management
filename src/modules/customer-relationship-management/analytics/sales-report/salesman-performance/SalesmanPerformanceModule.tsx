//src/modules/business-intelligence-analytics/sales-report/SalesmanPerformanceModule.tsx
"use client";

import * as React from "react";
import { SalesReportFiltersBar } from "./components/SalesReportFilters";
import { SalesReportKpisBar } from "./components/SalesReportKpis";
import { SalesReportTable } from "./components/SalesReportTable";
import { SalesInvoicesTable } from "./components/SalesInvoicesTable";
import { exportSalesReportCsv } from "./utils/exportCsv";
import { useSalesReport } from "./hooks/useSalesReport";

export default function SalesmanPerformanceModule() {
  const sr = useSalesReport();

  React.useEffect(() => {
    sr.loadLookups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      {/* <div className="flex flex-col gap-1">
        <div className="text-2xl font-bold">Sales Performance</div>
        <div className="text-sm text-muted-foreground">Allocation vs. Invoiced Report</div>
      </div> */}

      <SalesReportFiltersBar
        employees={sr.employees}
        value={sr.filters}
        onChange={sr.setFilters}
        onGenerate={sr.generate}
        onExport={() =>
          exportSalesReportCsv({
            reportRows: sr.rows,
            invoiceRows: sr.invoices,
            filters: sr.filters,
          })
        }
        loading={sr.loading}
        disabled={sr.loadingLookups}
      />


      <SalesReportKpisBar kpis={sr.kpis} />

      <SalesReportTable rows={sr.rows} loading={sr.loading} />

      {/* ✅ NEW: Invoices table below */}
      <SalesInvoicesTable rows={sr.invoices} loading={sr.loading} />
    </div>
  );
}
