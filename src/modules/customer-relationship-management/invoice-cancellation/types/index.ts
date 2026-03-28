import { z } from "zod";

export const TransactionStatusEnum = z.enum([
  "FOR DISPATCH",
  "PENDING CANCEL",
  "CANCELLED",
  "VOID",
]);

export const CancellationRequestSchema = z.object({
  id: z.number(),
  invoice_id: z.number(),
  sales_order_id: z.string(),
  invoice_no: z.string(),
  customer_code: z.string(),
  total_amount: z.number(),
  reason_code: z.string(),
  remarks: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  date_approved: z.string().optional(),
});

export const SalesInvoiceSchema = z.object({
  invoice_id: z.number(),
  invoice_no: z.string(),
  customer_code: z.string(),
  total_amount: z.number(),
  transaction_status: TransactionStatusEnum,
  order_id: z.string(), // Maps to orderNo in Spring Boot
});

export type CancellationRequest = z.infer<typeof CancellationRequestSchema>;
export type SalesInvoice = z.infer<typeof SalesInvoiceSchema>;
export type TransactionStatus = z.infer<typeof TransactionStatusEnum>;

export interface ApprovalParams {
  requestId: number;
  invoiceId: number;
  orderNo: string;
  auditorId: number;
}