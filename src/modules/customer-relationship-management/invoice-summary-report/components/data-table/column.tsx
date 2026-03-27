import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { InvoiceReportRow } from "../../types";
import { DataTableColumnHeader } from "./table-column-header";
import { formatDate, formatTime } from "../../lib/utils";
import { formatCurrency } from "@/lib/utils";
import { STATUS_CONFIG } from "../constant";
import { CheckCircle2, XCircle, Clock, User } from "lucide-react";
import { isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";

export const columns: ColumnDef<InvoiceReportRow>[] = [
  {
    accessorKey: "date_time",
    id: "date_time",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Date Requested" />
    ),
    filterFn: (row, id, value) => {
      const dateStr = row.getValue(id) as string;
      if (!dateStr) return false;

      const rowDate = parseISO(dateStr);

      // 1. Handle Time Slider (Array of numbers [0, 24])
      if (Array.isArray(value) && typeof value[0] === "number") {
        const [startHour, endHour] = value as [number, number];
        const itemHour = rowDate.getHours();
        // Cross-midnight logic (e.g., 7 PM to 11 AM)
        return startHour > endHour
          ? itemHour >= startHour || itemHour <= endHour
          : itemHour >= startHour && itemHour <= endHour;
      }

      // 2. Handle Date Calendar (Array of Date objects)
      if (value[0] instanceof Date || value[1] instanceof Date) {
        const [start, end] = value as [Date | null, Date | null];
        const s = start ? startOfDay(start) : null;
        const e = end ? endOfDay(end) : null;

        if (s && e) return isWithinInterval(rowDate, { start: s, end: e });
        if (s) return rowDate >= s;
        if (e) return rowDate <= e;
      }

      return true;
    },
    cell: ({ row }) => {
      const date = row.original.date_time;
      return date ? (
        <div className="flex flex-col">
          <span className="text-xs font-medium">{formatDate(date)}</span>
          <span className="text-[10px] text-muted-foreground">
            {formatTime(date)}
          </span>
        </div>
      ) : (
        <span className="text-muted-foreground">N/A</span>
      );
    },
  },
  {
    accessorKey: "original_invoice",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Invoice No." />
    ),
    meta: { label: "Invoice No" },
    enableHiding: false,
  },
  {
    accessorKey: "sales_order_no",
    header: "S.O. No.",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.sales_order_no}</span>
    ),
  },
  {
    accessorKey: "customer_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Customer Name" />
    ),
    meta: {
      label: "Customer Name",
      placeholder: "Search customer...",
      variant: "text",
      icon: User,
    },
    cell: ({ row }) => (
      <div className="max-w-37.5 truncate font-medium lg:max-w-62.5">
        {row.original.customer_name}
      </div>
    ),
  },
  {
    accessorKey: "amount",
    id: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Amount" />
    ),
    meta: { label: "Amount" },
    cell: ({ row }) => {
      return (
        <span className="font-medium">
          {formatCurrency(row.original.amount)}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Status" />
    ),
    meta: {
      label: "Status",
      variant: "multiSelect",
      options: [
        { label: "Pending", value: "PENDING", icon: Clock },
        { label: "Approved", value: "APPROVED", icon: CheckCircle2 },
        { label: "Rejected", value: "REJECTED", icon: XCircle },
      ],
    },
    // Add custom filter logic for multi-select
    filterFn: "arrIncludesSome",
    cell: ({ row }) => {
      const status = row.original.status;
      const config = STATUS_CONFIG[status];
      const Icon = config.icon;

      return (
        <Badge variant={config.variant} className={config.className}>
          <Icon className={config.iconClassName} />
          {config.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "defect_reason",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Reason Type" />
    ),
    meta: { label: "Reason Type" },
    enableHiding: true,
    cell: ({ row }) => (
      <Badge variant="secondary">{row.original.defect_reason}</Badge>
    ),
  },
  {
    accessorKey: "approver",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Approved By" />
    ),
    meta: { label: "Approved By" },
    cell: ({ row }) => {
      const approverName = row.original.approver;
      if (!approverName) {
        return (
          <span className="text-muted-foreground italic text-xs">
            Pending Approval
          </span>
        );
      }

      return <div className="font-medium text-primary">{approverName}</div>;
    },
  },
  {
    accessorKey: "csr_remarks",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Remarks" />
    ),
    meta: { label: "Remarks" },
    cell: ({ row }) => (
      <div className="max-w-50 truncate text-xs text-muted-foreground italic">
        {row.original.csr_remarks || "No remarks"}
      </div>
    ),
  },
];
