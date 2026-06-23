"use client";

import React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SalesOrder } from "../types";
import { Loader2, AlertTriangle } from "lucide-react";
import { SalesOrderService } from "../services/sales-order-service";

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SalesOrder | null;
  remarks: string;
  onSuccess: () => void;
}

export function CancelOrderModal({
  isOpen,
  onClose,
  order,
  remarks,
  onSuccess,
}: CancelModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleConfirm() {
    if (!order) return;
    setIsSubmitting(true);

    try {
      // Generate literal Philippine Time (UTC+8) formatted as YYYY-MM-DD HH:mm:ss for DATETIME column
      const now = new Date();
      const phTimeDate = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      const phTime = phTimeDate.toISOString().replace("T", " ").substring(0, 19);

      await SalesOrderService.cancelOrder(order.order_id, phTime, remarks);

      toast.success("Order Cancelled", {
        description: `Sales Order ${order.order_no} has been marked for cancellation.`,
      });

      onSuccess();
      onClose();
    } catch {
      toast.error("Action Failed", {
        description: "Could not cancel the order. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-2xl max-w-md p-0 overflow-hidden border-none shadow-xl">
        <div className="bg-red-50 dark:bg-red-950/20 p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <DialogTitle className="text-xl font-black tracking-tighter text-red-700 dark:text-red-400">
            Cancel Sales Order
          </DialogTitle>
          <DialogDescription className="mt-2 text-red-600/80 dark:text-red-300/80 font-medium">
            Are you sure you want to cancel Sales Order{" "}
            <span className="font-bold text-red-700 dark:text-red-300">
              {order?.order_no}
            </span>
            ? This action is permanent and cannot be undone.
          </DialogDescription>
        </div>

        <DialogFooter className="p-4 bg-background flex sm:justify-between items-center border-t border-red-100 dark:border-red-900/30">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            disabled={isSubmitting}
            className="rounded-xl font-semibold"
          >
            Keep Order
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="rounded-xl font-bold active:scale-95 transition-transform bg-red-600 hover:bg-red-700 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : "Yes, Cancel Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
