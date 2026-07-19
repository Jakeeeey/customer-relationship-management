"use client";

import { ColumnDef } from "@tanstack/react-table";
import { InvoiceOnholdData } from "../../types/invoice-onhold.schema";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateLong } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";
import { useInvoiceOnholdContext } from "../../providers/InvoiceOnholdProvider";
import { toast } from "sonner";

// Cell component to use hooks
const ActionCell = ({ order }: { order: InvoiceOnholdData }) => {
  const { putOnHold, isPuttingOnHold } = useInvoiceOnholdContext();

  const handlePutOnHold = async () => {
    try {
      await putOnHold(order.order_id);
      toast.success("Success", {
        description: `Order ${order.order_no} has been put on hold.`,
      });
    } catch (err: unknown) {
      toast.error("Error", {
        description: err instanceof Error ? err.message : "Failed to put order on hold.",
      });
    }
  };

  return (
    <Button 
      variant="destructive" 
      size="sm" 
      onClick={handlePutOnHold} 
      disabled={isPuttingOnHold}
      className="flex items-center gap-2"
    >
      <ShieldAlert className="h-4 w-4" />
      Put On Hold
    </Button>
  );
};

export const columns: ColumnDef<InvoiceOnholdData>[] = [
  {
    accessorKey: "order_no",
    header: "Order Number",
  },
  {
    accessorKey: "customer_code",
    header: "Customer Code",
  },
  {
    accessorKey: "po_no",
    header: "PO Number",
    cell: ({ row }) => row.getValue("po_no") || "N/A",
  },
  {
    accessorKey: "total_amount",
    header: "Total Amount",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total_amount") || "0");
      return formatCurrency(amount);
    },
  },
  {
    accessorKey: "order_status",
    header: "Status",
  },
  {
    accessorKey: "order_date",
    header: "Order Date",
    cell: ({ row }) => {
      const date = row.getValue("order_date");
      return date ? formatDateLong(new Date(date as string)) : "N/A";
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <ActionCell order={row.original} />,
  },
];
