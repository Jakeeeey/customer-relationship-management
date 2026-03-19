"use client";

import React, { useMemo, useState, useEffect } from "react";
import { ColumnFiltersState } from "@tanstack/react-table";
import { Bookmark, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { startOfDay, endOfDay, parseISO } from "date-fns";
import { useSummaryData } from "./hooks/use-summary-data";
import { InvoiceSummaryBarChart } from "./components/charts/invoice-summary-report-bar";
import { InvoiceSummaryPieChart } from "./components/charts/invoice-summary-report-pie";
import { Button } from "@/components/ui/button";
import { InvoiceReportTable } from "./components/data-table";
import { columns } from "./components/data-table/column";
import { InvoiceSummaryCard } from "./components/card/InvoiceSummaryReportCard";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ActiveFilters } from "./components/data-table/table-active-filters";

const STATUS_FILLS: Record<string, string> = {
  APPROVED: "var(--chart-2)",
  REJECTED: "var(--chart-1)",
  PENDING: "var(--chart-3)",
};

type SavedView = {
  name: string;
  filters: ColumnFiltersState;
};

export default function InvoiceSummaryReportPage() {
  const { rawData, isLoading, refresh } = useSummaryData();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("invoice_report_presets");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setSavedViews(JSON.parse(saved));
  }, []);

  const handleSaveView = (name: string) => {
    const newView = { name, filters: columnFilters };
    const updated = [...savedViews, newView];
    setSavedViews(updated);
    localStorage.setItem("invoice_report_presets", JSON.stringify(updated));
  };

  const handleDeleteView = (e: React.MouseEvent, indexToDelete: number) => {
    e.stopPropagation();
    const updated = savedViews.filter((_, i) => i !== indexToDelete);
    setSavedViews(updated);
    localStorage.setItem("invoice_report_presets", JSON.stringify(updated));
  };

  const handleRenameView = (e: React.MouseEvent, indexToRename: number) => {
    e.stopPropagation();
    const currentName = savedViews[indexToRename].name;
    const newName = prompt("Rename this view:", currentName);

    if (newName && newName !== currentName) {
      const updated = [...savedViews];
      updated[indexToRename] = { ...updated[indexToRename], name: newName };
      setSavedViews(updated);
      localStorage.setItem("invoice_report_presets", JSON.stringify(updated));
    }
  };
  // 1. DYNAMIC FILTERING LOGIC
  const filteredData = useMemo(() => {
    if (!rawData) return [];
    if (columnFilters.length === 0) return rawData;

    return rawData.filter((item) => {
      // .every() stops as soon as one filter fails (efficient)
      return columnFilters.every(({ id, value }) => {
        if (!value) return true;

        // 1. Handle Customer Search (String)
        if (id === "customer_name") {
          return item.customer_name
            .toLowerCase()
            .includes((value as string).toLowerCase());
        }

        // 2. Handle Date/Time logic
        if (id === "date_time" && Array.isArray(value)) {
          const itemDate = parseISO(item.date_time ?? "");

          // Date Range (Calendar)
          if (value[0] instanceof Date) {
            const [start, end] = value as [Date | null, Date | null];
            if (start && itemDate < startOfDay(start)) return false;
            if (end && itemDate > endOfDay(end)) return false;
            return true;
          }

          // Hour Range (Slider)
          if (typeof value[0] === "number") {
            const [startHour, endHour] = value as [number, number];
            const itemHour = itemDate.getHours();
            return startHour > endHour
              ? itemHour >= startHour || itemHour <= endHour
              : itemHour >= startHour && itemHour <= endHour;
          }
        }

        // 3. Handle Faceted Filters (Status, Type, etc.)
        if (Array.isArray(value)) {
          return value.includes(item[id as keyof typeof item]);
        }

        return true;
      });
    });
  }, [rawData, columnFilters]);

  // 2. DYNAMIC ANALYTICS CALCULATIONS
  const dynamicStats = useMemo(() => {
    const stats = {
      totalAmount: 0,
      totalRequests: filteredData.length,
      approvedCount: 0,
      pendingCount: 0,
      statusCounts: {} as Record<string, number>,
      reasonMap: {} as Record<string, { reason: string; APPROVED: number; REJECTED: number; PENDING: number }>,
    };

    // ONE loop for everything
    for (const item of filteredData) {
      const amount = Number(item.amount) || 0;
      stats.totalAmount += amount;

      // Count Statuses
      stats.statusCounts[item.status] =
        (stats.statusCounts[item.status] || 0) + 1;
      if (item.status === "APPROVED") stats.approvedCount++;
      if (item.status === "PENDING") stats.pendingCount++;

      // Group Reasons for Bar Chart
      const reason = item.defect_reason || "Unknown";
      if (!stats.reasonMap[reason]) {
        stats.reasonMap[reason] = {
          reason,
          APPROVED: 0,
          REJECTED: 0,
          PENDING: 0,
        };
      }
      const status = item.status as "APPROVED" | "REJECTED" | "PENDING";
      if (stats.reasonMap[reason].hasOwnProperty(status)) {
        stats.reasonMap[reason][status]++;
      }
    }

    return {
      ...stats,
      pieData: Object.entries(stats.statusCounts).map(([status, count]) => ({
        status,
        count,
        fill: STATUS_FILLS[status] || "var(--chart-5)",
      })),
      barData: Object.values(stats.reasonMap),
    };
  }, [filteredData]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-end">
        <div className="flex flex-end gap-2">
          {/* SEARCHABLE SAVED VIEWS */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <Bookmark className="h-4 w-4" />
                <span className="text-xs">Saved Filters</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="end">
              <Command>
                <CommandInput
                  placeholder="Search views..."
                  className="h-8 text-xs"
                />
                <CommandList className="max-h-50 overflow-y-auto">
                  <CommandEmpty className="text-[11px] py-3 text-center text-muted-foreground">
                    No views found.
                  </CommandEmpty>
                  <CommandGroup
                    heading={
                      <span className="text-[10px] uppercase tracking-wider">
                        My Filter Presets
                      </span>
                    }
                  >
                    {savedViews.map((view, i) => (
                      <CommandItem
                        key={i}
                        onSelect={() => setColumnFilters(view.filters)}
                        className="flex items-center justify-between group py-1.5 px-2 cursor-pointer"
                      >
                        <span className="truncate text-xs font-medium capitalize">
                          {view.name}
                        </span>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-primary/10 hover:text-primary"
                            onClick={(e) => handleRenameView(e, i)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => handleDeleteView(e, i)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
                <CommandSeparator />
                <div className="p-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 h-8 px-2 text-[11px] font-normal"
                    onClick={() => {
                      const name = prompt("Enter view name:");
                      if (name) handleSaveView(name);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    Save current as new
                  </Button>
                </div>
              </Command>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            className="h-8 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="text-xs">Refresh</span>
          </Button>
        </div>
      </div>

      <ActiveFilters
        filters={columnFilters}
        onRemove={(id) =>
          setColumnFilters((prev) => prev.filter((f) => f.id !== id))
        }
        onClearAll={() => setColumnFilters([])}
        onSaveView={handleSaveView}
      />

      <InvoiceSummaryCard stats={dynamicStats} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InvoiceSummaryBarChart
          data={dynamicStats.barData}
          totalAmount={dynamicStats.totalAmount}
          totalRequests={dynamicStats.totalRequests}
        />
        <InvoiceSummaryPieChart data={dynamicStats.pieData} />
      </div>

      <InvoiceReportTable
        columns={columns}
        data={filteredData}
        columnFilters={columnFilters}
        setColumnFilters={setColumnFilters}
      />
    </div>
  );
}
