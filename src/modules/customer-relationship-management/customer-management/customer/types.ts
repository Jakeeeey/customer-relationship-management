/**
 * Customer Module - Type Definitions
 * Based on the provided SQL schema for customer and bank_accounts
 */

// ============================================================================
// DIRECTUS ENTITY TYPES
// ============================================================================

export interface Customer {
    id: number;
    customer_code: string;
    customer_name: string;
    type: 'Regular' | 'Employee';
    user_id?: number | null;
    customer_image?: string | null;
    store_name: string;
    store_signage: string;
    brgy?: string | null;
    city?: string | null;
    province?: string | null;
    contact_number: string;
    customer_email?: string | null;
    tel_number?: string | null;
    bank_details?: string | null; // This might be a legacy field or a string representation
    customer_tin?: string | null;
    payment_term?: number | null;
    store_type: number | null;
    price_type?: string | null;
    encoder_id: number;
    credit_type?: number | null;
    company_code?: number | null;
    date_entered?: string | null;
    isActive: number; // 0 or 1
    isVAT: number;    // 0 or 1
    isEWT: number;    // 0 or 1
    classification?: number | null;
    discount_type?: number | null;
    otherDetails?: string | null;
    division_id?: number | null;
    department_id?: number | null;
    location?: unknown | null; // point type
}

export interface BankAccount {
    id?: number;
    customer_id?: number;
    bank_name: number; // Based on schema being int
    account_name: string;
    account_number: string;
    account_type: 'Savings' | 'Checking' | 'Other';
    branch_of_account?: string | null;
    is_primary: number; // 0 or 1
    notes?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface BankAccountFormData {
    id?: number;
    customer_id?: number;
    bank_name: number;
    account_name: string;
    account_number: string;
    account_type: 'Savings' | 'Checking' | 'Other';
    branch_of_account?: string | null;
    is_primary: number;
    notes?: string | null;
}

export interface StoreType {
    id: number;
    store_type: string;
}

export interface DiscountType {
    id: number;
    discount_type: string;
    total_percent: number;
}

export interface PaymentTerm {
    id: number;
    payment_name: string;
    payment_days: number;
    payment_description?: string | null;
}

export interface ReferenceOption {
    id: number;
    name: string;
}

export interface ReferenceItem {
    id?: number;
    user_id?: number;
    division_name?: string;
    department_name?: string;
    store_type?: string;
    classification_name?: string;
    discount_type?: string;
    user_fname?: string;
    user_mname?: string;
    user_lname?: string;
}

// ============================================================================
// ENRICHED TYPES (WITH JOINS)
// ============================================================================

export interface CustomerWithRelations extends Customer {
    bank_accounts?: BankAccount[];
}

// ============================================================================
// FORM TYPES (For CRUD)
// ============================================================================

export interface CustomerFormData extends Omit<Customer, 'id' | 'date_entered' | 'encoder_id'> {
    bank_accounts?: BankAccountFormData[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface CustomersAPIResponse {
    customers: CustomerWithRelations[];
    bank_accounts: BankAccount[]; // For backward compatibility or global list if needed
    metadata: {
        total_count: number;
        filter_count?: number;
        page: number;
        pageSize: number;
        lastUpdated: string;
    };
}

// ============================================================================
// DIRECTUS GENERIC RESPONSES
// ============================================================================

export interface DirectusResponse<T> {
    data: T[];
    meta?: {
        filter_count?: number;
        total_count?: number;
    };
}

export interface DirectusSingleResponse<T> {
    data: T;
}
