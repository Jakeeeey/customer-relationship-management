export interface TargetSetting {
    id?: number;
    salesman_id: number;
    volume: number;
    new_accounts: number;
    productive_outlets: number;
    line_sales: number;
    frequency: number;
    basket_count: number;
    tactica_sku?: number; // Total count of tactical SKUs
    reach: number;
    date_range_from: string;
    date_range_to: string;
    created_at?: string;
    created_by?: number;
    // Relationships
    tactical_skus?: TacticalSKU[];
    customer_targets?: CustomerTarget[];
    supplier_targets?: SupplierTarget[];
}

export interface TacticalSKU {
    id?: number;
    salesman_target_setting_id?: number;
    product_id: number;
    target_quantity: number;
    target_value: number;
    created_at?: string;
    created_by?: number;
    // Expanded data
    product_name?: string;
    product_code?: string;
}

export interface ProductPricing {
    id: number;
    product_id: number;
    price_type_id: number;
    price: number | string;
}

export interface ProductSummary {
    product_id: number;
    product_name: string;
    product_code: string;
    priceA?: number;
    priceB?: number;
    priceC?: number;
    priceD?: number;
    priceE?: number;
    [key: string]: string | number | undefined;
}

export interface Salesman {
    id: number;
    employee_id: number;
    salesman_code: string;
    salesman_name: string;
    operation: number; // 1: Booking, 3: Site Sales
    price_type?: string;
    price_type_id?: number;
    email?: string;
    // Current Performance Data
    current_volume?: number;
    current_frequency?: number;
    current_new_accounts?: number;
    current_productive_outlets?: number;
    current_line_sales?: number;
    current_basket_count?: number;
    current_reach?: number;
}

export interface SalesmanWithTarget extends Salesman {
    current_target?: TargetSetting;
}

export type OperationType = 1 | 3; // 1: Booking, 3: Site Sales

export interface TargetFormData {
    salesman_id: number;
    month: number;
    year: number;
    volume: number;
    new_accounts: number;
    productive_outlets: number;
    line_sales: number;
    frequency: number;
    basket_count: number;
    reach: number;
    tactical_skus: {
        product_id: number;
        target_quantity: number;
        target_value: number;
    }[];
    customer_targets: {
        customer_id: number;
        target_amount: number;
    }[];
    supplier_targets: {
        supplier_id: number;
        target_amount: number;
    }[];
}

export interface CustomerTarget {
    id?: number;
    target_setting_id: number;
    customer_id: number;
    target_amount: number;
    created_at?: string;
    customer_name?: string;
}

export interface SupplierTarget {
    id?: number;
    target_setting_id: number;
    supplier_id: number;
    target_amount: number;
    created_at?: string;
    supplier_name?: string;
}

export interface CustomerRecord {
    id: number;
    customer_name: string;
    province: string;
    city: string;
    brgy: string;
}

export interface SupplierRecord {
    id: number;
    supplier_name: string;
    supplier_type: string;
}
