/**
 * Duplicate Customer Module - Type Definitions
 * Based on the SQL schema for the customer table.
 */

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
    bank_details?: string | null;
    customer_tin?: string | null;
    payment_term?: number | null;
    store_type: number;
    price_type?: string | null;
    encoder_id: number;
    credit_type?: number | null;
    company_code?: number | null;
    date_entered?: string | null;
    isActive: number;
    isVAT: number;
    isEWT: number;
    discount_type?: number | null;
    otherDetails?: string | null;
    classification?: number | null;
    prospect_status?: 'pending' | 'visited' | null;
    encoder_name?: string;
}

export type DuplicateMatchReason = 
    | 'EXACT_NAME_MATCH'
    | 'FUZZY_NAME_MATCH'
    | 'SHARED_TIN'
    | 'SHARED_CONTACT'
    | 'SHARED_EMAIL'
    | 'SHARED_STORE_LOCATION'
    | 'SIMILAR_NAME_SAME_ADDRESS';

export interface DuplicateGroup {
    id: string; // Generated ID for the group
    reasons: DuplicateMatchReason[];
    customers: Customer[];
    confidence_score: number; // 0 to 1
    status: 'pending' | 'resolved' | 'dismissed';
}

export interface GroupingOptions {
    fuzzyThreshold: number; // e.g. 0.8
    checkFuzzyNames: boolean;
    checkIdentifiers: boolean;
    checkLocations: boolean;
}
