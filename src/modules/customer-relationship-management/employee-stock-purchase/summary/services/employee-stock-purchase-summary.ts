import { fetchWithRetry } from "@/modules/customer-relationship-management/customer-management/customer/fetch-with-retry";
import { EmployeeStockPurchase } from "../../creation/types";
import { SummaryMetrics } from "../types";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const COLLECTIONS = {
    EMPLOYEE_STOCK_PURCHASE: "employee_stock_purchase",
};

const getToken = () => {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    if (!token) throw new Error("DIRECTUS_STATIC_TOKEN is missing");
    return token;
};

export interface SummaryFilters {
    date_from?: string;
    date_to?: string;
    company_id?: number;
    user_id?: number;
}

export interface SummaryResponse {
    metrics: SummaryMetrics;
    rawData: EmployeeStockPurchase[];
}

export async function fetchEmployeeStockPurchaseSummary(filters?: SummaryFilters): Promise<SummaryResponse> {
    const token = getToken();
    
    const params = new URLSearchParams();
    params.append("limit", "-1"); // Fetch all for summary calculations
    
    // Apply filters
    let filterIndex = 0;
    
    if (filters?.date_from) {
        // Directus filters for date
        params.append(`filter[_and][${filterIndex}][created_at][_gte]`, `${filters.date_from}T00:00:00Z`);
        filterIndex++;
    }
    if (filters?.date_to) {
        params.append(`filter[_and][${filterIndex}][created_at][_lte]`, `${filters.date_to}T23:59:59Z`);
        filterIndex++;
    }
    if (filters?.company_id) {
        params.append(`filter[_and][${filterIndex}][company_id][_eq]`, filters.company_id.toString());
        filterIndex++;
    }
    if (filters?.user_id) {
        params.append(`filter[_and][${filterIndex}][user_id][_eq]`, filters.user_id.toString());
        filterIndex++;
    }
    
    // Add sorting by created_at ascending for charts
    params.append("sort", "created_at");
    
    const url = `${DIRECTUS_URL}/items/${COLLECTIONS.EMPLOYEE_STOCK_PURCHASE}?${params.toString()}`;
    const res = await fetchWithRetry(url, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error(`Error fetching summary: ${res.statusText}`);
    
    const json = await res.json();
    const data: EmployeeStockPurchase[] = json.data || [];
    
    let total_purchases = 0;
    let total_amount = 0;
    let pending_purchases = 0;
    let approved_purchases = 0;
    
    for (const record of data) {
        total_purchases++;
        total_amount += Number(record.amount || 0);
        
        const status = (record.status || "").toUpperCase();
        if (status === "PENDING") {
            pending_purchases++;
        } else if (status === "APPROVED" || status === "COMPLETED") {
            approved_purchases++;
        }
    }
    
    return {
        metrics: {
            total_purchases,
            total_amount,
            pending_purchases,
            approved_purchases
        },
        rawData: data
    };
}
