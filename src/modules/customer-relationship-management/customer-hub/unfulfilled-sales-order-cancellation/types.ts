import { z } from "zod";

export const SalesOrderSchema = z.object({
  order_id: z.number(),
  order_no: z.string(),
  po_no: z.string(),
  invoice_no: z.union([z.string(), z.array(z.string())]).optional(),
  customer_code: z.union([
    z.string(),
    z.object({
      customer_code: z.string(),
      customer_name: z.string(),
    })
  ]).nullable().optional(),
  salesman_id: z.union([
    z.number(),
    z.object({
      id: z.number(),
      name: z.string(),
      code: z.string().optional(),
    })
  ]).nullable().optional(),
  supplier_id: z.union([
    z.number(),
    z.object({
      id: z.number(),
      name: z.string(),
    })
  ]).nullable().optional(),
  branch_id: z.union([
    z.number(),
    z.object({
      id: z.number(),
      name: z.string(),
    })
  ]).nullable().optional(),
  order_date: z.string(),
  delivery_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  payment_terms: z.number().nullable().optional(),
  order_status: z.enum([
    'Draft', 'Pending', 'For Approval', 'For Consolidation', 
    'For Picking', 'For Invoicing', 'For Loading', 'For Shipping', 
    'En Route', 'Delivered', 'On Hold', 'For Cancellation', 
    'Cancelled', 'Not Fulfilled'
  ]),
  total_amount: z.number().nullable().optional(),
  allocated_amount: z.number().nullable().optional(),
  sales_type: z.number().nullable().optional(),
  receipt_type: z.number().nullable().optional(),
  discount_amount: z.number().nullable().optional(),
  net_amount: z.number().nullable().optional(),
  invoice_amount: z.number().nullable().optional(),
  created_by: z.number().nullable().optional(),
  created_date: z.string().nullable().optional(),
  modified_by: z.number().nullable().optional(),
  modified_date: z.string().nullable().optional(),
  posted_by: z.number().nullable().optional(),
  posted_date: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  cbm: z.number().nullable().optional(),
  kilo: z.number().nullable().optional(),
  cse: z.number().nullable().optional(),
  isDelivered: z.boolean().nullable().optional(),
  isCancelled: z.boolean().nullable().optional(),
  draft_at: z.string().nullable().optional(),
  pending_date: z.string().nullable().optional(),
  for_approval_at: z.string().nullable().optional(),
  for_consolidation_at: z.string().nullable().optional(),
  for_picking_at: z.string().nullable().optional(),
  for_invoicing_at: z.string().nullable().optional(),
  for_loading_at: z.string().nullable().optional(),
  for_shipping_at: z.string().nullable().optional(),
  en_route_at: z.string().nullable().optional(),
  delivered_at: z.string().nullable().optional(),
  on_hold_at: z.string().nullable().optional(),
  cancelled_at: z.string().nullable().optional(),
  not_fulfilled_at: z.string().nullable().optional(),
  for_cancellation_at: z.string().nullable().optional(),
});

export type SalesOrder = z.infer<typeof SalesOrderSchema>;

export const SalesOrderDetailSchema = z.object({
  detail_id: z.number(),
  product_id: z.union([z.number(), z.object({ id: z.number(), name: z.string(), code: z.string() })]),
  ordered_quantity: z.number(),
  unit_price: z.number(),
  net_amount: z.number().nullable().optional(),
});

export type SalesOrderDetail = z.infer<typeof SalesOrderDetailSchema>;

export interface SalesInvoiceDetail {
  detail_id: number;
  product_name: string;
  product_code: string;
  unit: string;
  ordered_quantity: number;
  unit_price: number;
  gross_amount: number;
  discount_amount: number;
  net_amount: number;
}

export interface InvoiceDetailsGroup {
  invoice_no: string;
  transaction_status?: string;
  details: SalesInvoiceDetail[];
}
