"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  InvoiceRow,
} from "@/modules/customer-relationship-management/invoice-cancellation-approval/types";
import { Loader } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "./table-column-header";

export const columns: ColumnDef<InvoiceRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-0.5"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-0.5"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "invoice_no",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Invoice No." />
    ),
    meta: { label: "Invoice No" },
    cell: ({ row }) => (
      <span className="font-medium">{row.original.invoice_no}</span>
    ),
  },
  {
    accessorKey: "customer_code",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Customer Code" />
    ),
    meta: { label: "Code" },
  },
  {
    accessorKey: "sales_order_id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="S.O No." />
    ),
    meta: { label: "S.O No" },
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.sales_order_id}
      </span>
    ),
  },
  {
    accessorKey: "total_amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Amount" />
    ),
    meta: { label: "Amount" },
    cell: ({ row }) => (
      <span className="font-medium">
        {formatCurrency(row.original.total_amount)}
      </span>
    ),
  },
  {
    accessorKey: "reason_code",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Reason Type" />
    ),
    meta: { label: "Reason Type" },
    cell: ({ row }) => (
      <Badge variant="outline" className="font-normal text-muted-foreground">
        {row.original.reason_code}
      </Badge>
    ),
  },
  {
    accessorKey: "remarks",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Remarks" />
    ),
    meta: { label: "Remarks" },
    cell: ({ row }) => (
      <span className="text-xs italic text-muted-foreground line-clamp-1 max-w-37.5">
        {row.original.remarks || "No remarks"}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: () => {
      return (
        <Badge variant="secondary" className="px-1.5 gap-1">
          <Loader className="h-3 w-3 animate-spin" />
          Pending
        </Badge>
      );
    },
  },
  /* INDIVIDUAL ACTIONS COMMENTED OUT - Using Bulk Actions instead ,Dont remove this
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const data = row.original;
      return (
        <div className="flex gap-2">
          <Button
            onClick={() => onAction("APPROVE", row.original)}
            disabled={isProcessing}
            variant={"default"}
            size={"sm"}
            className="h-7 px-2 bg-blue-700 text-white text-xs hover:bg-blue-700"
          >
            Accept
          </Button>
          <Button
            onClick={() => onAction("REJECT", row.original)}
            disabled={isProcessing}
            size={"sm"}
            className="text-xs h-7"
          >
            Reject
          </Button>
        </div>
      );
    },
  },
  */
];
