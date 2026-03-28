import { z } from "zod";

export const InvoiceSchema = z.object({
  id: z.number(),
  invoice_id: z.number(),
  invoice_no: z.string(),
  customer_code: z.string(),
  sales_order_id: z.string(),
  total_amount: z.number(),
  reason_code: z.string(),
  remarks: z.string().nullable(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  approved_by: z.string(),
  date_approved: z.string().nullable().optional(),
});
export type ApprovalTab = "PENDING" | "APPROVED" | "REJECTED";
export type InvoiceAction = "APPROVE" | "REJECT";
export const ApprovalActionEnum = z.enum(["APPROVE", "REJECT"]);

export type ApprovalAction = z.infer<typeof ApprovalActionEnum>;
export type InvoiceRow = z.infer<typeof InvoiceSchema>;
