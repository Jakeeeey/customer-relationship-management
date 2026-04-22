import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrderCancellationApprovalRow } from "../types";
import { formatCurrency, formatDate } from "../utils/businessRules";

type Props = {
  rows: OrderCancellationApprovalRow[];
  isLoading: boolean;
  onReview: (row: OrderCancellationApprovalRow) => void;
};

export function OrderCancellationApprovalTable({ rows, isLoading, onReview }: Props) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[56px]">No.</TableHead>
            <TableHead>Sales Order No.</TableHead>
            <TableHead>Customer Name</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Order Date</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <TableRow key={`loading-${index}`}>
                <TableCell>
                  <Skeleton className="h-4 w-8" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto h-4 w-24" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto h-8 w-20" />
                </TableCell>
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                No pending sales order cancellation request found.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow key={row.requestId}>
                <TableCell className="font-semibold">{index + 1}</TableCell>
                <TableCell className="font-semibold">{row.salesOrderNo || "-"}</TableCell>
                <TableCell>{row.customerName || "Unknown Customer"}</TableCell>
                <TableCell>{row.supplierName || "Unknown Supplier"}</TableCell>
                <TableCell>{formatDate(row.orderDate)}</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(row.totalAmount || 0)}
                </TableCell>
                <TableCell className="text-right">
                  <Button type="button" size="sm" onClick={() => onReview(row)}>
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
