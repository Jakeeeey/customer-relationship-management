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
}

export interface Supplier {
    id: number | string;
    supplier_name: string;
    trade_type?: "Trade" | "Non-Trade";
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
    brand_id?: number;
    pieces_per_box?: number;
    uom?: string;
    parent_id?: number | null;
    unit_of_measurement?: number;
    unit_of_measurement_count?: number;
    uom_name?: string;
    uom_shortcut?: string;
    parent_product_name?: string;
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


