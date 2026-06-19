"use client";

import { Badge } from "@/components/ui/badge";
import { ColumnDef, Row } from "@tanstack/react-table";
import { DateRange } from "react-day-picker";
import { SalesOrder } from "../../types";
import { DataTableColumnHeader } from "./table-column-header";

const objectFilterFn = (row: Row<SalesOrder>, columnId: string, filterValue: string[]) => {
  if (!filterValue || filterValue.length === 0) return true;
  const val = row.getValue(columnId);
  const idToMatch = typeof val === "object" && val !== null 
    ? (val as { id?: number; customer_code?: string }).id || (val as { id?: number; customer_code?: string }).customer_code 
    : String(val);
  return filterValue.includes(String(idToMatch));
};

const objectSortingFn = (rowA: Row<SalesOrder>, rowB: Row<SalesOrder>, columnId: string) => {
  const valA = rowA.getValue(columnId);
  const valB = rowB.getValue(columnId);
  
  const nameA = typeof valA === "object" && valA !== null 
    ? (valA as { customer_name?: string; name?: string }).customer_name || (valA as { customer_name?: string; name?: string }).name || "" 
    : String(valA || "");
    
  const nameB = typeof valB === "object" && valB !== null 
    ? (valB as { customer_name?: string; name?: string }).customer_name || (valB as { customer_name?: string; name?: string }).name || "" 
    : String(valB || "");
    
  return nameA.localeCompare(nameB);
};

const dateRangeFilterFn = (row: Row<SalesOrder>, columnId: string, filterValue: DateRange | undefined) => {
  if (!filterValue?.from) return true;
  const rowDateStr = row.getValue(columnId) as string;
  if (!rowDateStr) return false;
  
  const rowDate = new Date(rowDateStr);
  rowDate.setHours(0,0,0,0);
  
  const from = new Date(filterValue.from);
  from.setHours(0,0,0,0);
  
  if (filterValue.to) {
    const to = new Date(filterValue.to);
    to.setHours(23,59,59,999);
    return rowDate >= from && rowDate <= to;
  }
  
  return rowDate >= from;
};

export const columns = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _onRequest: (order: SalesOrder) => void,
): ColumnDef<SalesOrder>[] => [
  {
    accessorKey: "order_date",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Order Date" className="min-w-[110px]" />,
    cell: ({ row }) => {
      const dateStr = row.original.order_date;
      if (!dateStr) return "-";
      return (
        <div className="text-sm font-medium text-foreground/80">
          {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(dateStr))}
        </div>
      );
    },
    filterFn: dateRangeFilterFn,
  },
  {
    accessorKey: "order_no",
    header: ({ column }) => <DataTableColumnHeader column={column} label="SO No." className="min-w-[130px]" />,
    cell: ({ row }) => (
      <div className="font-bold tracking-tight text-foreground/90">
        {row.original.order_no}
      </div>
    ),
  },
  {
    accessorKey: "po_no",
    enableSorting: false,
    header: ({ column }) => <DataTableColumnHeader column={column} label="PO No." className="min-w-[110px]" />,
    cell: ({ row }) => (
      <div className="text-muted-foreground font-medium text-sm">
        {row.original.po_no || "-"}
      </div>
    ),
  },
  {
    accessorKey: "invoice_no",
    enableSorting: false,
    header: ({ column }) => <DataTableColumnHeader column={column} label="Invoice No." className="min-w-[120px]" />,
    cell: ({ row }) => {
      const inv = row.original.invoice_no;
      if (!inv) return <div className="text-muted-foreground font-medium text-sm">-</div>;
      
      const invoices = Array.isArray(inv) ? inv : [inv];
      
      return (
        <div className="flex flex-col gap-1.5 items-start">
          {invoices.map((invoice, idx) => (
            <Badge key={idx} variant="outline" className="font-mono text-xs font-semibold bg-muted/50">
              {invoice}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "supplier_id",
    enableSorting: false,
    header: ({ column }) => <DataTableColumnHeader column={column} label="Supplier" className="min-w-[150px]" />,
    cell: ({ row }) => {
      const supplier = row.original.supplier_id;
      if (typeof supplier === "object" && supplier !== null) {
        return (
          <div className="flex flex-col items-start max-w-[150px] lg:max-w-[200px]">
            <span className="font-semibold text-sm truncate w-full" title={supplier.name}>
              {supplier.name}
            </span>
          </div>
        );
      }
      return supplier ? (
        <Badge variant="outline" className="font-mono text-xs font-semibold bg-muted/50">
          {String(supplier)}
        </Badge>
      ) : <span className="text-muted-foreground">-</span>;
    },
    filterFn: objectFilterFn,
  },
  {
    accessorKey: "customer_code",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Customer" className="min-w-[200px]" />,
    cell: ({ row }) => {
      const customer = row.original.customer_code;
      if (typeof customer === "object" && customer !== null) {
        return (
          <div className="flex flex-col gap-1 items-start max-w-[200px] lg:max-w-[300px]">
            <span className="font-semibold text-sm truncate w-full" title={customer.customer_name}>
              {customer.customer_name}
            </span>
            <Badge variant="outline" className="font-mono text-[10px] leading-none py-0.5 px-1.5 font-semibold bg-muted/50">
              {customer.customer_code}
            </Badge>
          </div>
        );
      }
      return customer ? (
        <Badge variant="outline" className="font-mono text-xs font-semibold bg-muted/50">
          {String(customer || "-")}
        </Badge>
      ) : "-";
    },
    filterFn: objectFilterFn,
    sortingFn: objectSortingFn,
  },
  {
    accessorKey: "salesman_id",
    enableSorting: false,
    header: ({ column }) => <DataTableColumnHeader column={column} label="Salesman" className="min-w-[150px]" />,
    cell: ({ row }) => {
      const salesman = row.original.salesman_id;
      if (typeof salesman === "object" && salesman !== null) {
        return (
          <div className="flex flex-col items-start max-w-[150px] lg:max-w-[200px]">
            <span className="font-semibold text-sm truncate w-full" title={salesman.name}>
              {salesman.name}
            </span>
          </div>
        );
      }
      return salesman ? (
        <Badge variant="outline" className="font-mono text-xs font-semibold bg-muted/50">
          {String(salesman)}
        </Badge>
      ) : <span className="text-muted-foreground">-</span>;
    },
    filterFn: objectFilterFn,
  },
  {
    accessorKey: "not_fulfilled_at",
    enableSorting: false,
    header: ({ column }) => <DataTableColumnHeader column={column} label="Unfulfilled Date" className="min-w-[130px]" />,
    cell: ({ row }) => {
      const dateStr = row.original.not_fulfilled_at;
      if (!dateStr) return "-";
      return (
        <div className="text-sm font-medium text-amber-600 dark:text-amber-400">
          {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(dateStr))}
        </div>
      );
    },
  },
  {
    accessorKey: "invoice_amount",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Invoice Amount" className="min-w-[120px] justify-end" />,
    cell: ({ row }) => {
      const amount = row.original.invoice_amount || row.original.net_amount;
      if (!amount && amount !== 0) return <div className="text-right text-muted-foreground">-</div>;
      return (
        <div className="text-right font-bold text-emerald-600 dark:text-emerald-500 tabular-nums pr-4">
          ₱{amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </div>
      );
    },
  },
];
