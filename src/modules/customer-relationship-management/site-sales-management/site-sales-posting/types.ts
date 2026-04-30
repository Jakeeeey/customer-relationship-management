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

export interface Branch {
    id: number;
    branch_name: string;
}

export interface Salesman {
    id: number;
    salesman_name: string;
    salesman_code?: string;
    price_type_id?: number;
}

export interface Product {
    product_id: number;
    product_name: string;
    product_code: string;
    description?: string;
}

export type SalesInvoiceHeader = z.infer<typeof SalesInvoiceHeaderSchema> & {
    // Allow expanded objects from Directus
    branch_id?: Branch | null;
    salesman_id?: Salesman | null;
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
    discount_type_name: z.string().nullable().optional(),
    brand_name: z.string().nullable().optional(),
    category_name: z.string().nullable().optional(),
    unit_name: z.string().nullable().optional(),
    
    // Virtual fields for calculation
    gross_amount: z.number().optional(),
    net_amount: z.number().optional(),
    vat_amount: z.number().optional(),
    total_amount: z.number().optional(),
});

export type SalesInvoiceDetail = Omit<z.infer<typeof SalesInvoiceDetailSchema>, 'product_id'> & {
    product_id?: Product | number | null;
};

export interface Customer {
    customer_code: string;
    customer_name?: string;
    store_name?: string;
    city?: string;
    province?: string;
}

export interface SalesType {
    id: number;
    operation_name: string;
}

export interface LinkedDocument {
    id: number;
    type: "RETURN" | "MEMO";
    reference_no: string;
    date: string;
    amount: number;
    status: string;
    items?: {
        id: number;
        product_name: string;
        quantity: number;
        unit_price: number;
        total_amount: number;
        discount_amount: number;
        discount_type_name?: string | null;
        reason?: string;
    }[];
}

export interface WorklistFilters {
    page?: number;
    limit?: number;
    search?: string;
    salesmanId?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
    isDispatched?: boolean;
    isPaid?: boolean;
    salesTypeId?: number | string;
}

export interface SalesReturn {
    return_id: number;
    return_number: string;
    return_date: string;
    total_amount: number;
    customer_code: string;
    salesman_id?: Salesman | null;
}

export interface InvoiceDetailsResponse {
    header: SalesInvoiceHeader;
    details: SalesInvoiceDetail[];
    linkedDocs: LinkedDocument[];
    main_supplier_id?: number | null;
    main_supplier_name?: string | null;
}

export interface SearchProduct {
    product_id: number;
    product_name: string;
    description?: string;
    product_code: string;
    unit_price: number;
    unit: string;
    available_qty: number;
    unit_count: number;
    brand_name?: string | null;
    category_name?: string | null;
    discount_type?: string | number | null;
    discount_type_name?: string | null;
    discounts?: number[];
}

export interface CartItem extends SearchProduct {
    quantity: number;
    discount_amount: number;
    total_amount: number;
}
