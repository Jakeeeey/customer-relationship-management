export interface NormalizeInvoice {
    invoice_id: number;
    order_id: string;       // order_no string e.g. "MP12185" (display)
    sales_order_id?: number; // numeric PK of sales_order (for FK)
    invoice_no: string;
    transaction_status: string;
    invoice_date: string;
    total_amount: number;
    order_status: string;
    not_fulfilled_at: string;
    is_pending_request: boolean;
    customer_code?: string;
    customer_name?: string;
}

export interface InvoiceDetail {
    detail_id: number;
    order_id: string;
    invoice_no: number;
    product_id: number;
    product_name?: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    discount_amount?: number;
    gross_amount?: number;
}
