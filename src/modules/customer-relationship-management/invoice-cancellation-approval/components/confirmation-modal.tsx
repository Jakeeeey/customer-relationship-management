"use client";

import { useMemo } from "react";
import { Loader2, AlertTriangle, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import { ApprovalAction, InvoiceRow } from "../types";

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingAction: {
    type: ApprovalAction;
    data: InvoiceRow | InvoiceRow[];
  } | null;
  isProcessing: boolean;
  onConfirm: () => Promise<void>;
}

export function ActionConfirmationModal({
  open,
  onOpenChange,
  pendingAction,
  isProcessing,
  onConfirm,
}: ConfirmationModalProps) {
  const selectedItems = useMemo(() => {
    if (!pendingAction?.data) return [];
    return Array.isArray(pendingAction.data)
      ? pendingAction.data
      : [pendingAction.data];
  }, [pendingAction]);

  const isBulk = selectedItems.length > 1;
  const totalAmount = useMemo(
    () =>
      selectedItems.reduce((sum, item) => sum + (item.total_amount || 0), 0),
    [selectedItems],
  );

  if (!pendingAction) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            Confirm{" "}
            {pendingAction.type === "APPROVE" ? "Approval" : "Rejection"}
            {isBulk && (
              <span className="text-sm font-normal text-muted-foreground">
                ({selectedItems.length} items)
              </span>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4" asChild>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Are you sure you want to{" "}
                <strong
                  className={
                    pendingAction.type === "APPROVE"
                      ? "text-blue-600"
                      : "text-red-600"
                  }
                >
                  {pendingAction.type.toUpperCase()}
                </strong>{" "}
                the cancellation request{isBulk ? "s" : ""}?
              </p>

              <div className="rounded-md border bg-muted/30 p-3 text-xs">
                {!isBulk ? (
                  <table className="w-full">
                    <tbody>
                      <tr className="border-b border-border/50">
                        <td className="py-1.5 text-muted-foreground font-medium uppercase text-[10px]">
                          Invoice No.
                        </td>
                        <td className="py-1.5 text-right font-bold text-foreground">
                          {selectedItems[0]?.invoice_no}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 text-muted-foreground font-medium uppercase text-[10px]">
                          Total Amount
                        </td>
                        <td className="py-1.5 text-right text-foreground">
                          {formatCurrency(selectedItems[0]?.total_amount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div className="space-y-2">
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                      {selectedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center py-1 border-b last:border-0"
                        >
                          <span className="font-semibold text-foreground">
                            {item.invoice_no}
                          </span>
                          <span className="font-mono">
                            {formatCurrency(item.total_amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between pt-2 border-t font-bold text-blue-700">
                      <span>Total Batch Amount</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-1">
                {pendingAction.type === "APPROVE" ? (
                  <Alert
                    variant="destructive"
                    className="bg-destructive/5 py-2"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Irreversible Action</AlertTitle>
                    <AlertDescription className="text-[11px]">
                      Voids invoice and resets Sales Order.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Return to Dispatch</AlertTitle>
                    <AlertDescription className="text-[11px]">
                      Returns items to the active list.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
              </>
            ) : (
              `Confirm ${pendingAction.type === "APPROVE" ? "Approval" : "Rejection"}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
