"use client";

import { SummaryDashboard } from "./components/SummaryDashboard";
import { SummaryFilters } from "./components/SummaryFilters";
import { SummaryCharts } from "./components/SummaryCharts";
import { SummaryDataTable } from "./components/SummaryDataTable";


export function EmployeeStockPurchaseSummaryModule() {
    return (
        <div className="flex flex-col gap-4">
            <div className="px-4 pt-4">
                <h1 className="text-2xl font-bold tracking-tight">Employee Stock Purchase Summary</h1>
                <p className="text-muted-foreground">
                    Overview of stock purchases and metrics.
                </p>
            </div>
            <SummaryFilters />
            <SummaryDashboard />
            <SummaryCharts />
            <SummaryDataTable />
        </div>
    );
}
