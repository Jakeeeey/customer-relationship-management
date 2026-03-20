"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { CircleDashed } from "lucide-react";
import { SalesInvoice } from "../../types";
import { DataTableColumnHeader } from "./table-column-header";

export const columns = (
  onRequest: (invoice: SalesInvoice) => void,
): ColumnDef<SalesInvoice>[] => [
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
    accessorKey: "order_id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="S.O No." />
    ),
    meta: { label: "S.O No" },
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.order_id}
      </span>
    ),
  },
  {
    accessorKey: "total_amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Amount" />
    ),
    meta: { label: "Amount" },
    cell: ({ row }) => {
      const amount = row.original.total_amount;
      const formatted = new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
      }).format(amount);
      return <div className=" font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "transaction_status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.transaction_status;
      return (
        <Badge variant={"secondary"} className="px-1.5">
          <CircleDashed />
          {status}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const invoice = row.original;
      return (
        <Button
          size="sm"
          className="px-2 h-7 text-xs"
          onClick={() => onRequest(invoice)}
        >
          Cancel
        </Button>
      );
    },
  },
];
