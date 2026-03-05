"use client";

export type PriceType = "Retail" | "Wholesale" | "Promo" | "Special" | string;

export interface Salesman {
    salesman_id: number;
    salesman_name: string;
    salesman_code: string;
    user_id?: string;
    price_type: PriceType;
    status: string;
}

export interface Customer {
    customer_code: string;
    customer_name: string;
    salesman_id: number;
    price_type?: PriceType; // Overrides salesman price type if present
    discount_type_id?: number; // Level 5: Global Default
}

export interface Supplier {
    supplier_id: number;
    supplier_name: string;
    trade_type: "Trade" | "Non-Trade";
}

export interface Product {
    product_id: number;
    product_name: string;
    product_code: string;
    category_id: number;
    brand_id: number;
    base_price: number;
    pieces_per_box: number; // For UOM logic
    uom: string;
    availableQty?: number; // Stock level
}

export interface DiscountType {
    discount_type_id: number;
    description: string;
}

export interface LineDiscount {
    line_discount_id: number;
    discount_type_id: number;
    percentage: number; // e.g., 7 for 7%
    sequence: number; // Important for chain calculation order
}

export interface LineItem {
    id: string; // internal uuid
    product: any;
    quantity: number;
    uom: string;
    unitPrice: number; // Base price for the selected UOM
    discountType?: string; // Description of which hierarchy level matched
    discounts: number[]; // Chain of percentages e.g. [7, 2]
    netAmount: number;
    totalAmount: number; // Before discounts
    discountAmount: number;
    availableQty?: number;
}

export interface SalesOrderHeader {
    salesman_id: number;
    customer_code: string;
    po_no: string;
    total_amount: number;
    discount_amount: number;
    net_amount: number;
    order_date: string;
}
