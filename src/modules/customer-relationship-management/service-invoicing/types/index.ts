export type PriceType = "Retail" | "Wholesale" | "Promo" | "Special" | string;

export interface Salesman {
    id: number | string;
    salesman_name: string;
    salesman_code?: string;
    employee_id?: number | string;
    encoder_id?: number | string;
    user_id?: number | string;
    user_fname?: string;
    user_lname?: string;
    price_type?: PriceType;
    price_type_id?: number | null;
    branch_code?: number | { id?: number | string } | null;
    status?: string;
    linked_account_ids?: (number | string)[];
}

export interface PaymentTerm {
    id: number;
    payment_name: string;
    payment_terms?: string;
    payment_days: number;
    payment_description?: string;
}

export interface Customer {
    id: number | string;
    customer_code: string;
    customer_name?: string;
    store_name: string;
    salesman_id?: number;
    price_type?: PriceType;
    price_type_id?: number | null;
    discount_type_id?: number;
    payment_term?: number | null;
    province?: string;
    city?: string;
    credit_limit?: number | string | null;
}

export interface Supplier {
    id: number | string;
    supplier_name: string;
    supplier_shortcut?: string;
    trade_type?: "TRADE" | "NON-TRADE";
}

export interface ReceiptType {
    id: number | string;
    type: string;
    shortcut?: string;
    isOfficial?: number | string | boolean | null;
    max_length?: number | null;
}

export interface SalesType {
    id: number | string;
    operation_name: string;
    operation_code?: string;
}

export interface Branch {
    id: number | string;
    branch_name: string;
    branch_code: string;
}

export interface PriceTypeModel {
    price_type_id: number;
    price_type_name: string;
    sort?: number;
}

/**
 * Dynamic line item corresponding to `vos_database.sales_invoice_details_other`
 */
export interface ServiceInvoiceDetailOther {
    id: string; // Client-side unique row key
    detail_id?: number; // Primary key in sales_invoice_details_other
    invoice_id?: number;
    order_id?: string | null;
    item_description: string;
    unit: string;
    quantity: number;
    unit_price: number;
    gross_amount: number;
    discount_amount: number;
    vat_amount: number;
    ewt_amount: number;
    total_amount: number;
    remarks?: string;
}

/**
 * Header record corresponding to `vos_database.sales_invoice`
 */
export interface ServiceInvoiceHeaderRecord {
    invoice_id: number;
    order_id: string | null;
    customer_code: string | null;
    customer_name?: string;
    invoice_no: string | null;
    salesman_id: number | { id: number; salesman_name: string; salesman_code?: string } | null;
    branch_id: number | { id: number; branch_name: string; branch_code?: string } | null;
    invoice_date: string | null;
    dispatch_date: string | null;
    due_date: string | null;
    payment_terms: number | null;
    transaction_status: string | null;
    payment_status: string | null;
    total_amount: number | null;
    sales_type: number | { id: number; operation_name: string } | null;
    invoice_type: number | { id: number; type: string; shortcut?: string } | null;
    price_type: string | null;
    vat_amount: number | null;
    gross_amount: number | null;
    discount_amount: number | null;
    net_amount: number | null;
    ewt_amount: number | null;
    created_by?: number | null;
    created_date?: string | null;
    modified_by?: number | null;
    modified_date?: string | null;
    posted_by?: number | null;
    posted_date?: string | null;
    remarks: string | null;
    isReceipt?: boolean | number | null;
    isPosted?: boolean | number | null;
    isDispatched?: boolean | number | null;
    isRemitted?: boolean | number | null;
    isReplaced?: boolean | number | null;
    details_other?: ServiceInvoiceDetailOther[];
}

export interface ServiceInvoiceSummary {
    grossAmount: number;
    discountAmount: number;
    vatAmount: number;
    ewtAmount: number;
    netAmount: number;
    totalAmount: number;
    itemCount: number;
}

