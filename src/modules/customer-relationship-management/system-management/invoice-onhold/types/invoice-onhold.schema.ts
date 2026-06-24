import { z } from "zod";

export const InvoiceOnholdSchema = z.object({
  order_id: z.number().or(z.string()),
  order_no: z.string(),
  po_no: z.string().optional().nullable(),
  customer_code: z.string(),
  total_amount: z.number().nullable(),
  order_status: z.string(),
  order_date: z.string().nullable(),
  created_date: z.string().nullable(),
});

export type InvoiceOnholdData = z.infer<typeof InvoiceOnholdSchema>;

export const InvoiceOnholdResponseSchema = z.array(InvoiceOnholdSchema);
