import { Customer } from "../customer/types";

export interface CustomerGroup {
    id: number;
    group_code: string;
    group_name: string;
    description?: string | null;
    province?: string | null;
    city?: string | null;
    brgy?: string | null;
    primary_customer_id?: number | null;
    isActive: number;
    date_entered?: string | null;
    
    // Relations
    primary_customer?: Customer | null;
    customers?: Customer[];
}

export interface CustomerGroupFormData {
    id?: number;
    group_code: string;
    group_name: string;
    description?: string | null;
    province?: string | null;
    city?: string | null;
    brgy?: string | null;
    primary_customer_id?: number | null;
    isActive: number;
    customer_ids: number[]; // Added
    removed_customer_ids?: number[]; // Added
}

export interface CustomerGroupsAPIResponse {
    ok: boolean;
    data: CustomerGroup[];
    message?: string;
}
