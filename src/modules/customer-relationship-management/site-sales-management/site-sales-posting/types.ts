import { z } from "zod";

// --- Header Schema ---
export const SalesInvoiceHeaderSchema = z.object({
    invoice_id: z.number().or(z.string().transform(Number)),
    order_id: z.string().nullable().optional(),
    customer_code: z.string().nullable().optional(),
    invoice_no: z.string().nullable().optional(),
    salesman_id: z.number().nullable().optional(),
    branch_id: z.number().nullable().optional(),
    invoice_date: z.string().nullable().optional(), // TIMESTAMP
    dispatch_date: z.string().nullable().optional(), // Immutable Transaction Date
    due_date: z.string().nullable().optional(),
    payment_terms: z.number().nullable().optional(),
    transaction_status: z.string().nullable().optional(),
    payment_status: z.string().nullable().optional(),
    total_amount: z.number().nullable().optional(),
    sales_type: z.number().nullable().optional(),
    invoice_type: z.number().nullable().optional(),
    price_type: z.string().nullable().optional(),
    vat_amount: z.number().nullable().optional(),
    gross_amount: z.number().nullable().optional(),
    discount_amount: z.number().nullable().optional(),
    net_amount: z.number().nullable().optional(),
    remarks: z.string().nullable().optional(),
    isDispatched: z.boolean().or(z.number().transform(n => n === 1)).nullable().optional(),
    isPaid: z.boolean().or(z.number().transform(n => n === 1)).nullable().optional(), // Mapped from UI toggles if needed
    
    // Virtual fields from Joins/UI
    customer_name: z.string().optional(),
    salesman_name: z.string().optional(),
});

export type SalesInvoiceHeader = z.infer<typeof SalesInvoiceHeaderSchema> & {
    // Allow expanded objects from Directus
    branch_id?: any;
    salesman_id?: any;
};

// --- Detail Schema ---
export const SalesInvoiceDetailSchema = z.object({
    detail_id: z.number().or(z.string().transform(Number)).optional(),
    invoice_id: z.number().or(z.string().transform(Number)),
    product_id: z.number().or(z.string().transform(Number)),
    unit: z.string().optional(),
    quantity: z.number().min(0),
    unit_price: z.number().min(0),
    discount_amount: z.number().min(0).default(0),
    discount_type: z.number().or(z.string()).nullable().optional(),
    
    // Virtual fields for calculation
    gross_amount: z.number().optional(),
    net_amount: z.number().optional(),
    vat_amount: z.number().optional(),
    total_amount: z.number().optional(),
});

export type SalesInvoiceDetail = z.infer<typeof SalesInvoiceDetailSchema> & {
    product_id?: any; // To handle expanded object from Directus
};

// --- Linked Documents Schema ---
export const LinkedDocumentSchema = z.object({
    id: z.string().or(z.number()),
    type: z.enum(["RETURN", "MEMO", "PAYMENT"]),
    reference_no: z.string(),
    date: z.string(),
    amount: z.number(),
    status: z.string().optional()
});

export type LinkedDocument = z.infer<typeof LinkedDocumentSchema>;
