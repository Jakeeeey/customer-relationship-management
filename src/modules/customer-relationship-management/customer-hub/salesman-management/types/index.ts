export interface Salesman {
    id: number;
    employee_id: number;
    salesman_code: string;
    salesman_name: string;
    truck_plate?: string;
    division_id?: number | Division;
    branch_code?: number | Branch;
    bad_branch_code?: number | Branch;
    operation?: number | Operation;
    company_code?: number;
    supplier_code?: number;
    price_type?: string;
    isActive: boolean | number;
    isInventory?: boolean | number;
    canCollect?: boolean | number;
    inventory_day?: number;
    modified_date?: string;
    encoder_id?: number;
    [key: string]: unknown;
}

export interface Division {
    division_id: number;
    division_name: string;
    division_description?: string;
    division_head?: string;
    division_code?: string;
}

export interface Operation {
    id: number;
    operation_code?: string;
    operation_name?: string;
    definition?: string;
}

export interface Branch {
    id: number;
    branch_name: string;
    branch_code: string;
    branch_description?: string;
}

export interface User {
    user_id: number;
    user_fname: string;
    user_lname: string;
    user_email: string;
    user_position: string;
}

export interface Customer {
    id: number;
    customer_code: string;
    customer_name: string;
    store_name: string;
    brgy?: string;
    city?: string;
    province?: string;
    contact_number?: string;

    // 🚀 FIXED: Allow payment_term to be an object so we can read payment_name!
    payment_term?: number | { id?: number; payment_name?: string; payment_days?: number };

    price_type?: string;
    credit_type?: number;
    isVAT?: number | boolean;
    isEWT?: number | boolean;
    store_type?: number | { id?: number; store_type?: string };
    classification?: number | { id?: number; classification_name?: string };
    junction_id?: number;
}