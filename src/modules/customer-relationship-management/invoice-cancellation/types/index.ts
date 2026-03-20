import { z } from "zod";

export const TransactionStatusEnum = z.enum([
  "FOR DISPATCH",
  "PENDING CANCEL",
  "CANCELLED",
  "VOID",
]);

export const ApprovalParamsSchema = z.object({
  requestId: z.number(),
  invoiceId: z.number(),
  orderNo: z.string(),
  auditorId: z.number(),
});

export const CancellationRequestSchema = z.object({
  id: z.number(),
  invoice_id: z.number(),
  sales_order_id: z.string(),
  invoice_no: z.string().max(20),
  customer_code: z.string().max(10),
  total_amount: z.number(),
  transaction_status: TransactionStatusEnum,
  reason_code: z.string().max(10),
  remarks: z.string().max(255).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  order_no: z.string(),
  date_approved: z.string().optional(),
});

export const SalesInvoiceSchema = z.object({
  id: z.number(),
  invoice_id: z.number(),
  invoice_no: z.string().max(20),
  customer_code: z.string().max(10),
  total_amount: z.number(),
  transaction_status: TransactionStatusEnum,
  order_id: z.number(),
  sales_type: z.string().max(20),
});

export type CancellationRequest = z.infer<typeof CancellationRequestSchema>;

export type SalesInvoice = z.infer<typeof SalesInvoiceSchema>;

export type TransactionStatus = z.infer<typeof TransactionStatusEnum>;

export type ApprovalParams = z.infer<typeof ApprovalParamsSchema>;
