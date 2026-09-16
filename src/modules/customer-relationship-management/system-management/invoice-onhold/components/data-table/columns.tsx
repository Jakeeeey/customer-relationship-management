"use client";

import { ColumnDef } from "@tanstack/react-table";
import { InvoiceOnholdData } from "../../types/invoice-onhold.schema";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateLong } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";
import { useInvoiceOnholdContext } from "../../providers/InvoiceOnholdProvider";
import { toast } from "sonner";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// Cell component to use hooks
const ActionCell = ({ order }: { order: InvoiceOnholdData }) => {
  const { putOnHold, isPuttingOnHold } = useInvoiceOnholdContext();
  const [open, setOpen] = useState(false);
  const [remarks, setRemarks] = useState("");

  const handlePutOnHold = async () => {
    if (!remarks.trim()) {
      toast.error("Error", {
        description: "Remarks are required to put an order on hold.",
      });
      return;
    }
    
    try {
      await putOnHold(order.order_id, remarks);
      toast.success("Success", {
        description: `Order ${order.order_no} has been put on hold.`,
      });
      setOpen(false);
      setRemarks("");
    } catch (err: unknown) {
      toast.error("Error", {
        description: err instanceof Error ? err.message : "Failed to put order on hold.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="destructive" 
          size="sm" 
          disabled={isPuttingOnHold}
          className="flex items-center gap-2"
        >
          <ShieldAlert className="h-4 w-4" />
          Put On Hold
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Put Order On Hold</DialogTitle>
          <DialogDescription>
            Are you sure you want to put order {order.order_no} on hold? Please provide a reason.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea 
            placeholder="Enter remarks..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={isPuttingOnHold}
            className="min-h-[100px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPuttingOnHold}>
            Cancel
          </Button>
          <Button onClick={handlePutOnHold} disabled={isPuttingOnHold || !remarks.trim()}>
            {isPuttingOnHold ? "Putting on hold..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
