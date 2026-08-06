/**
 * Callsheet Module - Type Definitions
 * Based on the Directus `sales_order_attachment` collection
 */

// ============================================================================
// DIRECTUS ENTITY TYPES
// ============================================================================

export interface SalesOrderAttachment {
    id: number;
    sales_order_id: number | null; // added field from directus table
    salesman_id: number;
    salesman_name: string;        // enriched from salesman collection
    customer_code: string;
    customer_name: string;        // enriched from customer collection
    file_id: string | null;
    attachment_name: string;
    related_attachments?: { file_id: string; attachment_name: string }[];
    sales_order_no: string;
    po_no?: string | null;        // mapped from final sales order table
    status: "pending" | "approved" | "rejected" | string;
    created_date: string;
    created_by: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface CallSheetAPIResponse {
    callsheets: SalesOrderAttachment[];
    metadata: {
        total_count: number;
        filter_count?: number;
        page: number;
        pageSize: number;
        lastUpdated: string;
    };
    filterOptions?: {
        salesmen: { id: number; salesman_name: string; salesman_code: string }[];
        customers: { customer_code: string; customer_name: string }[];
    };
}

// ============================================================================
// UI TYPES
// ============================================================================

export type SelectedCallSheet = SalesOrderAttachment | null;
