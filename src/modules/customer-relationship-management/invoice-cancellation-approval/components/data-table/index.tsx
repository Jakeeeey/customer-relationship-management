"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  RowSelectionState,
  useReactTable,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/modules/customer-relationship-management/invoice-cancellation/components/data-table/pagination";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import {
  ApprovalAction, // 🚀 FIX: Changed from InvoiceAction to ApprovalAction
  InvoiceRow,
} from "@/modules/customer-relationship-management/invoice-cancellation-approval/types";
import { TableToolbar } from "./table-view-option";
import { TasksTableActionBar } from "./table-action-bar";

interface ApprovalDataTableProps {
  data: InvoiceRow[];
  isLoading: boolean;
  // 🚀 FIX: Updated the type here as well
  onBulkAction: (action: ApprovalAction, rows: InvoiceRow[]) => void;
  columns: ColumnDef<InvoiceRow>[];
  currentTab: string;
  onTabChange: (val: string) => void;
}

export function ApprovalDataTable({
                                    data,
                                    isLoading,
                                    onBulkAction,
                                    columns,
                                    currentTab,
                                    onTabChange,
                                  }: ApprovalDataTableProps) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
      [],
  );

  const filteredData = React.useMemo(() => {
    return data.filter((row) => row.status === currentTab);
  }, [data, currentTab]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<InvoiceRow>({
    data: filteredData,
    columns,
    state: {
      rowSelection,
      sorting,
      columnFilters,
    },

    autoResetPageIndex: false,
    autoResetExpanded: false,

    enableRowSelection: (row) => row.original.status === "PENDING",
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const selectedTotal = selectedRows.reduce(
      (sum, row) => sum + row.original.total_amount,
      0,
  );

  // FIX: Clear row selection when currentTab changes (via useEffect, not during render)
  React.useEffect(() => {
    setRowSelection({});
  }, [currentTab]);

  return (
      <div className="space-y-4">
        <Tabs value={currentTab} onValueChange={onTabChange} className="w-full">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="PENDING">Pending</TabsTrigger>
              <TabsTrigger value="APPROVED">Approved</TabsTrigger>
            </TabsList>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
              <Input
                  placeholder="Search invoice number..."
                  value={
                      (table.getColumn("invoice_no")?.getFilterValue() as string) ??
                      ""
                  }
                  onChange={(event) =>
                      table
                          .getColumn("invoice_no")
                          ?.setFilterValue(event.target.value)
                  }
                  className="w-full sm:w-62.5"
              />
              <TableToolbar table={table} />
            </div>
          </div>

          {/* BULK ACTION TOOLBAR */}
          {selectedCount > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border rounded-lg bg-muted/50 animate-in fade-in slide-in-from-bottom-1">
                <div className="flex items-center gap-4">
                  <div className="text-sm font-semibold">
                    Total: {formatCurrency(selectedTotal)}
                  </div>
                </div>
              </div>
          )}

          <TasksTableActionBar table={table} onBulkAction={onBulkAction} />

          <TabsContent value={currentTab}>
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                            <TableHead key={header.id}>
                              {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext(),
                                  )}
                            </TableHead>
                        ))}
                      </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                      <TableRow>
                        <TableCell
                            colSpan={columns.length}
                            className="h-24 text-center"
                        >
                          Loading...
                        </TableCell>
                      </TableRow>
                  ) : table.getRowModel().rows.length > 0 ? (
                      table.getRowModel().rows.map((row) => (
                          <TableRow
                              key={row.id}
                              data-state={row.getIsSelected() && "selected"}
                          >
                            {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                  {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext(),
                                  )}
                                </TableCell>
                            ))}
                          </TableRow>
                      ))
                  ) : (
                      <TableRow>
                        <TableCell
                            colSpan={columns.length}
                            className="h-24 text-center text-muted-foreground"
                        >
                          {currentTab === "PENDING"
                              ? "No pending requests."
                              : "No approved requests."}
                        </TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <DataTablePagination table={table} />
          </TabsContent>
        </Tabs>
      </div>
  );
}