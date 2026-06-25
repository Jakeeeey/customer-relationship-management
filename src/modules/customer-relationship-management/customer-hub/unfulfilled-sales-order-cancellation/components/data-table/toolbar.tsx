"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Table } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTableFacetedFilter } from "./faceted-filter";
import { DatePickerWithRange } from "./date-range-picker";
import { DateRange } from "react-day-picker";
import { DataTableViewOptions } from "./view-options";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function TableToolbar<TData>({ table }: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  // Extract unique options from the table data
  const customers = React.useMemo(() => {
    return Array.from(new Map(table.getCoreRowModel().rows.map(row => {
      const val = row.getValue("customer_code") as { customer_code?: string; customer_name?: string } | string;
      const id = typeof val === "object" && val !== null ? val.customer_code : String(val);
      const name = typeof val === "object" && val !== null ? val.customer_name : String(val);
      return [id, { label: String(name || id), value: String(id) }];
    })).values()).filter(o => o.value && o.value !== "undefined" && o.value !== "null" && o.label !== "undefined");
  }, [table]);

  const suppliers = React.useMemo(() => {
    return Array.from(new Map(table.getCoreRowModel().rows.map(row => {
      const val = row.getValue("supplier_id") as { id?: number; name?: string } | number;
      const id = typeof val === "object" && val !== null ? val.id : String(val);
      const name = typeof val === "object" && val !== null ? val.name : String(val);
      return [id, { label: String(name || id), value: String(id) }];
    })).values()).filter(o => o.value && o.value !== "undefined" && o.value !== "null" && o.label !== "undefined");
  }, [table]);

  const salesmen = React.useMemo(() => {
    return Array.from(new Map(table.getCoreRowModel().rows.map(row => {
      const val = row.getValue("salesman_id") as { id?: number; name?: string } | number;
      const id = typeof val === "object" && val !== null ? val.id : String(val);
      const name = typeof val === "object" && val !== null ? val.name : String(val);
      return [id, { label: String(name || id), value: String(id) }];
    })).values()).filter(o => o.value && o.value !== "undefined" && o.value !== "null" && o.label !== "undefined");
  }, [table]);

  const dateFilterValue = table.getColumn("order_date")?.getFilterValue() as DateRange | undefined;

  return (
    <div className="flex flex-col gap-4 w-full lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 items-center w-full">
        <Input
          placeholder="Search SO, PO, or Invoice No..."
          value={(table.getState().globalFilter as string) ?? ""}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          className="h-9 w-full rounded-xl flex-1 max-w-[500px]"
        />
      </div>
      
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <DatePickerWithRange 
          date={dateFilterValue} 
          setDate={(date) => table.getColumn("order_date")?.setFilterValue(date)} 
        />

        {table.getColumn("customer_code") && customers.length > 0 && (
          <DataTableFacetedFilter
            column={table.getColumn("customer_code")}
            title="Customer"
            options={customers}
          />
        )}
        
        {table.getColumn("supplier_id") && suppliers.length > 0 && (
          <DataTableFacetedFilter
            column={table.getColumn("supplier_id")}
            title="Supplier"
            options={suppliers}
          />
        )}

        {table.getColumn("salesman_id") && salesmen.length > 0 && (
          <DataTableFacetedFilter
            column={table.getColumn("salesman_id")}
            title="Salesman"
            options={salesmen}
          />
        )}

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-9 px-2 lg:px-3 rounded-xl"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
