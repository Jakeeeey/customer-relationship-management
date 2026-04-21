import { CancellationRequest } from "../../invoice-cancellation/types";
import { InvoiceRow } from "../types";

export function mapRequestsToInvoiceRows(
    pendingRequests: CancellationRequest[],
    approvedRequests: CancellationRequest[],
): InvoiceRow[] {
    const pending = pendingRequests.map((req) => ({
        ...req,
        ui_status: "PENDING" as const,
    }));

    const approved = approvedRequests.map((req) => ({
        ...req,
        ui_status: "APPROVED" as const,
    }));

    return [...pending, ...approved].map(
        (req): InvoiceRow => ({
            id: req.id,
            invoice_id: req.invoice_id,
            invoice_no: req.invoice_no,
            customer_code: req.customer_code,
            customer_name: req.customer_name, // 🚀 NEW: Pass it through!
            sales_order_id: req.sales_order_id,
            total_amount: req.total_amount,
            reason_code: req.reason_code || "N/A",
            remarks: req.remarks ?? null,
            status: req.ui_status,
            approved_by:
                Number((req as Record<string, unknown>).approved_by) === 1
                    ? "N/A"
                    : "N/A",
            date_approved:
                ((req as Record<string, unknown>).date_approved as string) ||
                ((req as Record<string, unknown>).updated_at as string) ||
                null,
        }),
    );
}