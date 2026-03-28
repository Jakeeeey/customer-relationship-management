export interface SalesInvoice {
  invoice_id: number;
  invoice_no: string;
  customer_code: string;
  total_amount: number;
  transaction_status: "FOR DISPATCH" | "PENDING CANCEL" | "CANCELLED" | "VOID";
  order_id: string;
}

export interface CancellationRequest {
  request_id: number;
  invoice_id: number;
  sales_order_id: string;
  reason_code: string;
  remarks: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requested_by: number;
  approved_by?: number;
  action_date?: string;
  date_approved?: string;
  rejection_reason?: string;
}

export interface ApprovalParams {
  request_id: number;
  rejection_reason?: string;
}

export interface CancellationReportDto {
  requestId: number;
  invoiceId: number;
  salesOrderId: string;
  reasonCode: string;
  remarks: string;
  status: string;
  dateApproved?: string;
  invoiceNo: string;
  totalAmount: number;
  customerCode: string;
}
