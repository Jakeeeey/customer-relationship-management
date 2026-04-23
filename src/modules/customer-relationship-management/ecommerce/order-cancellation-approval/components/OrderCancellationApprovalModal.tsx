import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Calendar,
  Clock,
  DollarSign,
  FileCheck2,
  HelpCircle,
  MessageSquare,
  Receipt,
  Store,
  User,
  UserCircle,
  XCircle,
} from "lucide-react";
import type { OrderCancellationApprovalRow } from "../types";
import { formatCurrency, formatDate } from "../utils/businessRules";

type Props = {
  open: boolean;
  row: OrderCancellationApprovalRow | null;
  reviewerRemarks: string;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onRemarksChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
};

export function OrderCancellationApprovalModal({
  open,
  row,
  reviewerRemarks,
  isSubmitting,
  onOpenChange,
  onRemarksChange,
  onApprove,
  onReject,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Review Cancellation Request
          </AlertDialogTitle>
          <AlertDialogDescription>
            Review the sales order cancellation request details below and decide whether to approve or reject.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {row ? (
          <div className="grid gap-6 py-4">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Order Information Card */}
              <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Order Information</h4>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Detail icon={<Receipt className="h-3.5 w-3.5" />} label="Sales Order No." value={row.salesOrderNo} />
                  <Detail icon={<Calendar className="h-3.5 w-3.5" />} label="Order Date" value={formatDate(row.orderDate)} />
                  <div className="sm:col-span-2">
                    <Detail icon={<User className="h-3.5 w-3.5" />} label="Customer Name" value={row.customerName} />
                  </div>
                  <div className="sm:col-span-2">
                    <Detail icon={<Store className="h-3.5 w-3.5" />} label="Supplier" value={row.supplierName} />
                  </div>
                  <Detail
                    icon={<DollarSign className="h-3.5 w-3.5" />}
                    label="Total Amount"
                    value={formatCurrency(row.totalAmount)}
                    valueClassName="text-destructive font-bold"
                  />
                </div>
              </div>

              {/* Request Information Card */}
              <div className="flex flex-col gap-3 rounded-xl border bg-destructive/5 p-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-destructive/10 pb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h4 className="font-semibold text-sm text-destructive">Cancellation Details</h4>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Detail icon={<Clock className="h-3.5 w-3.5" />} label="Requested At" value={formatDate(row.requestedAt)} />
                  <Detail icon={<UserCircle className="h-3.5 w-3.5" />} label="Requested By" value={row.requestedByName} />
                  <div className="col-span-full">
                    <Detail icon={<HelpCircle className="h-3.5 w-3.5" />} label="Reason" value={row.requestReason} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="request-remarks" className="flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  Requester Remarks
                </Label>
                <div className="rounded-lg border bg-muted/40 px-3 py-2.5 text-sm font-medium text-foreground min-h-[5rem] whitespace-pre-wrap">
                  {row.requestRemarks?.trim() || (
                    <span className="text-muted-foreground italic">No additional remarks provided.</span>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reviewer-remarks" className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-primary" />
                  Approval Remarks
                </Label>
                <Textarea
                  id="reviewer-remarks"
                  value={reviewerRemarks}
                  onChange={(event) => onRemarksChange(event.target.value)}
                  placeholder="Enter optional remarks before proceeding..."
                  className="min-h-[5rem] resize-none focus-visible:ring-primary"
                />
              </div>
            </div>
          </div>
        ) : null}

        <AlertDialogFooter className="border-t pt-4 mt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="destructive" onClick={onReject} disabled={!row || isSubmitting}>
              <XCircle className="mr-2 h-4 w-4" />
              Reject Request
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onApprove}
              disabled={!row || isSubmitting}
            >
              <FileCheck2 className="mr-2 h-4 w-4" />
              Approve Request
            </Button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Detail({
  label,
  value,
  icon,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      {icon && <div className="mt-0.5 text-muted-foreground/70">{icon}</div>}
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className={`text-sm font-medium leading-snug ${valueClassName || ""}`}>{value || "-"}</div>
      </div>
    </div>
  );
}
