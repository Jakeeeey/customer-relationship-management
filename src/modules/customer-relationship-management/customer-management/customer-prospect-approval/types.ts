/**
 * Customer Prospect Approval Module - Type Definitions
 * Based on the provided SQL schema for customer_prospect
 */

export interface DiscountType {
    id: number;
    discount_type: string;
    total_percent: number;
}

export interface Salesman {
    id: number;
    salesman_name: string;
    salesman_code?: string;
}

export interface StoreType {
    id: number;
    store_type: string;
}

export interface PaymentTerm {
    id: number;
    payment_name: string;
    payment_days: number;
}

export interface CustomerClassification {
    id: number;
    classification_name: string;
}

export interface CustomerProspect {
    id: number;
    salesman_id?: number | null;
    prospect_date?: string | null;
    customer_code?: string | null;
    customer_name?: string | null;
    type: 'Regular' | 'Employee';
    user_id?: number | null;
    customer_image?: string | null;
    store_name?: string | null;
    store_signage?: string | null;
    brgy?: string | null;
    city?: string | null;
    province?: string | null;
    contact_number?: string | null;
    customer_email?: string | null;
    tel_number?: string | null;
    bank_details?: string | null;
    customer_tin?: string | null;
    payment_term?: number | null;
    store_type?: number | null;
    price_type?: string | null;
    encoder_id?: number | null;
    credit_type?: number | null;
    company_code?: number | null;
    date_entered?: string | null;
    isActive: number;
    isVAT: number;
    isEWT: number;
    discount_type?: number | null;
    otherDetails?: string | null;
    classification?: number | null;
    location?: unknown | null;
    prospect_status: 'Pending' | 'Approved' | 'Rejected';
    // Joined data
    salesman_name?: string;
    salesman_code?: string;
    updated_by_name?: string | null;
}

export interface CustomerProspectsAPIResponse {
    prospects: CustomerProspect[];
    metadata: {
        total_count: number;
        filter_count: number;
        page: number;
        pageSize: number;
        lastUpdated: string;
    };
}
