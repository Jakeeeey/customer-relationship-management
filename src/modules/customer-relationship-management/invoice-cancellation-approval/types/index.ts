import { z } from "zod";

// 1. Your original Zod Schema (updated to accept the enriched BFF data)
export const InvoiceSchema = z.object({
  id: z.number(),
  invoice_id: z.number(),
  invoice_no: z.string(),
  customer_code: z.string(),
  sales_order_id: z.string(),
  total_amount: z.number(),
  reason_code: z.string(),
  remarks: z.string().nullable().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  // Backend might send numbers or nulls for these, so we make them flexible:
  approved_by: z.union([z.string(), z.number()]).nullable().optional(),
  date_approved: z.string().nullable().optional(),
  // Included so your mapping function doesn't throw errors:
  ui_status: z.enum(["PENDING", "APPROVED"]).optional(),
});

// 2. Your Enums and Tabs
export type ApprovalTab = "PENDING" | "APPROVED" | "REJECTED";
export const ApprovalActionEnum = z.enum(["APPROVE", "REJECT"]);

// 3. Your Zod Inferences
export type ApprovalAction = z.infer<typeof ApprovalActionEnum>;
export type InvoiceRow = z.infer<typeof InvoiceSchema>;

// Aliased so your mapper and hooks don't break if they look for 'CancellationRequest'
export type CancellationRequest = z.infer<typeof InvoiceSchema>;

// 4. 🚀 THE MISSING PIECE that caused TS2305!
export interface ApprovalParams {
  requestId: number;
  auditorId: number;
  rejectionReason?: string;
}