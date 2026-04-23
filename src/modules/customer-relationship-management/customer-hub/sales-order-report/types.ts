export interface SalesOrder {
    order_id: number;
    order_no: string;
    po_no: string | null;
    customer_code: string | null;
    salesman_id: number | null;
    supplier_id: number | null;
    branch_id: number | null;
    order_date: string | null;
    delivery_date: string | null;
    due_date: string | null;
    payment_terms: string | null;
    order_status: string | null;
    total_amount: number | null;
    allocated_amount: number | null;
    sales_type: string | null;
    receipt_type: string | null;
    discount_amount: number | null;
    net_amount: number | null;
    created_by: number | null;
    created_date: string | null;
    modified_by: number | null;
    modified_date: string | null;
    posted_by: number | null;
    posted_date: string | null;
    remarks: string | null;
    isDelivered: boolean | null;
    isCancelled: boolean | null;
    for_approval_at: string | null;
    for_consolidation_at: string | null;
    for_picking_at: string | null;
    for_invoicing_at: string | null;
    for_loading_at: string | null;
    for_shipping_at: string | null;
    delivered_at: string | null;
    on_hold_at: string | null;
    cancelled_at: string | null;
}

export interface SalesOrderDetail {
    detail_id: number;
    product_id: number | { product_name: string; product_code: string; description?: string; uom?: string };
    order_id: number;
    unit_price: number;
    ordered_quantity: number;
    allocated_quantity: number;
    served_quantity: number;
    discount_type: number | null;
    discount_amount: number | null;
    gross_amount: number | null;
    net_amount: number | null;
    allocated_amount: number | null;
    remarks: string | null;
    created_date: string | null;
    modified_date: string | null;
}

export interface SalesOrderWithDetails extends SalesOrder {
    details: SalesOrderDetail[];
}

export interface Customer {
    id: number;
    customer_code: string;
    customer_name: string;
    store_name: string;
    city: string | null;
    province: string | null;
}

export interface Salesman {
    id: number;
    salesman_code: string;
    salesman_name: string;
    truck_plate: string | null;
}

export interface Branch {
    id: number;
    branch_code: string;
    branch_name: string;
    branch_description: string | null;
}

export interface Supplier {
    id: number;
    supplier_shortcut: string;
    supplier_name: string;
    supplier_type?: string;
}

export interface InvoiceDetail {
    product_id: { product_name: string; product_code: string; description?: string; uom?: string };
    unit_price: number;
    quantity: number;
    total_amount: number;
    discount_amount: number;
    discount_type?: string | number | null;
}

export interface InvoiceData {
    invoice_no: string;
    invoice_date: string;
    gross_amount: number;
    total_amount: number;
    discount_amount: number;
    vat_amount?: number;
    net_amount: number;
}

export interface PdfData {
    fileId: string;
    receipts: string;
    url: string;
    width_mm?: number;
    height_mm?: number;
}

export interface Invoice {
    invoice: InvoiceData;
    details: InvoiceDetail[];
    pdf?: PdfData | null;
}

export interface SalesOrderDataResponse {
    salesOrders: SalesOrder[];
    salesOrderDetails: SalesOrderDetail[];
    customers: Customer[];
    salesmen: Salesman[];
    branches: Branch[];
    suppliers: Supplier[];
    meta: {
        total_count: number;
        aggregates?: {
            total_amount: number;
            allocated_amount: number;
        };
    };
}
