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
    branch_code?: number | null;
    status?: string;
    linked_account_ids?: (number | string)[];
}

export interface PaymentTerm {
    id: number;
    payment_name: string;
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
}

export interface Supplier {
    id: number | string;
    supplier_name: string;
    supplier_shortcut?: string;
    trade_type?: "TRADE" | "NON-TRADE";
}

export interface Product {
    product_id: number;
    product_name?: string;
    product_code?: string;
    description?: string;
    display_name?: string;
    base_price: number;
    discount_level?: string;
    discounts: number[];
    category_id?: number;
    category_name?: string | null;
    brand_id?: number;
    brand_name?: string | null;
    pieces_per_box?: number;
    uom?: string;
    parent_id?: number | null;
    unit_of_measurement?: number;
    unit_of_measurement_count?: number;
    uom_name?: string;
    uom_shortcut?: string;
    parent_product_name?: string;
    available_qty?: number | null;
    unit_count?: number | null;
    discount_type?: number | string | null;
    [key: string]: unknown;
}

export interface LineItem {
    id: string;
    product: Product;
    quantity: number;
    uom: string;
    unitPrice: number;
    discountType?: string;
    discounts: number[];
    netAmount: number;
    totalAmount: number;
    discountAmount: number;
    savedNetAmount?: number;
    savedDiscountAmount?: number;
    savedAllocatedQty?: number;
}

export interface SalesOrderHeader {
    customer_id?: number;
    customer_code?: string;
    salesman_id: number;
    supplier_id: number;
    branch_id: number;
    price_type_id?: number | null;
    receipt_type: number;
    sales_type: number;
    po_no: string;
    due_date: string;
    delivery_date: string;
    total_amount: number;
    discount_amount: number;
    net_amount: number;
    allocated_amount: number;
    payment_terms?: number | null;
    order_no: string;
    order_status: string;
    for_approval_at: string;
    remarks: string;
}

export interface ReceiptType {
    id: number | string;
    type: string;
    shortcut?: string;
}

export interface SalesType {
    id: number | string;
    operation_name: string;
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


