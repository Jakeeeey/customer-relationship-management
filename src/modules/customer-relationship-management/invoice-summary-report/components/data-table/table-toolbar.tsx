"use client";

import { Table } from "@tanstack/react-table";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "./table-view-option";
import { DataTableFacetedFilter } from "./table-faceted-filter";
import { DataTableDateFilter } from "./table-date-filter";
import { DataTableTimeFilter } from "./table-time-filter";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {/* TEXT SEARCH: For Customer Name */}
        {table.getColumn("customer_name") && (
          <Input
            placeholder="Filter customers..."
            value={
              (table.getColumn("customer_name")?.getFilterValue() as string) ??
              ""
            }
            onChange={(event) =>
              table
                .getColumn("customer_name")
                ?.setFilterValue(event.target.value)
            }
            className="h-8 w-37.5 lg:w-62.5"
          />
        )}

        {/* FACETED FILTER: For Status */}
        {table.getColumn("status") && (
          <DataTableFacetedFilter
            column={table.getColumn("status")}
            title="Status"
            options={[
              { label: "Pending", value: "PENDING" },
              { label: "Approved", value: "APPROVED" },
              { label: "Rejected", value: "REJECTED" },
            ]}
          />
        )}

        {/* FACETED FILTER: For Reason Type */}
        {table.getColumn("defect_reason") && (
          <DataTableFacetedFilter
            column={table.getColumn("defect_reason")}
            title="Type"
            options={[
              { label: "System Error", value: "System Error" },
              { label: "Printer Jam", value: "Printer Jam" },
              { label: "Wrong Price", value: "Wrong Price" },
              { label: "Typographical Error", value: "Typographical Error" },
            ]}
          />
        )}

        {/* FACETED FILTER: For Date */}
        {table.getColumn("date_time") && (
          <DataTableDateFilter
            column={table.getColumn("date_time")}
            title="Date Requested"
          />
        )}
        {/* FACETED FILTER: For Time*/}
        {table.getColumn("date_time") && (
          <DataTableTimeFilter
            column={table.getColumn("date_time")}
            title="Time Range"
          />
        )}

        {/* RESET BUTTON: Appears only when filters are active */}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      {/* VIEW OPTIONS: Column Toggle */}
      <DataTableViewOptions table={table} />
    </div>
  );
}
