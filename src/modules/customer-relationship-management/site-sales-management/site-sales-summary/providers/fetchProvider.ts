"use client";

import { 
    SalesInvoiceHeader, 
    Salesman, 
    Customer, 
    SalesType, 
    WorklistFilters, 
    InvoiceDetailsResponse, 
} from "../types";

const API_BASE = "/api/crm/site-sales-management/site-sales-posting";

export const siteSalesSummaryProvider = {
    // 1. Fetch Worklist (Usually includes dispatched and paid items in summary)
    getWorklist: async (params: WorklistFilters): Promise<{ data: SalesInvoiceHeader[], metadata: { totalCount: number } }> => {
        const query = new URLSearchParams();
        if (params.page) query.append("page", params.page.toString());
        if (params.limit) query.append("limit", params.limit.toString());
        if (params.search) query.append("search", params.search);
        if (params.salesmanId) query.append("salesmanId", params.salesmanId);
        if (params.customerId) query.append("customerId", params.customerId);
        if (params.startDate) query.append("startDate", params.startDate);
        if (params.endDate) query.append("endDate", params.endDate);
        if (params.isDispatched !== undefined) query.append("isDispatched", params.isDispatched.toString());
        if (params.isPaid !== undefined) query.append("isPaid", params.isPaid.toString());
        if (params.salesTypeId) query.append("salesTypeId", params.salesTypeId.toString());

        const res = await fetch(`${API_BASE}?type=worklist&${query.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch worklist");
        return res.json();
    },

    // 2. Fetch Header & Details
    getInvoiceDetails: async (invoiceId: string): Promise<InvoiceDetailsResponse> => {
        const res = await fetch(`${API_BASE}?type=details&invoiceId=${invoiceId}`);
        if (!res.ok) throw new Error("Failed to fetch invoice details");
        return res.json();
    },

    // 3. Utility Data
    getSalesmen: async (): Promise<Salesman[]> => {
        const res = await fetch(`${API_BASE}?type=salesmen`);
        if (!res.ok) throw new Error("Failed to fetch salesmen");
        return res.json();
    },

    getSalesTypes: async (): Promise<SalesType[]> => {
        const res = await fetch(`${API_BASE}?type=sales_types`);
        if (!res.ok) throw new Error("Failed to fetch sales types");
        return res.json();
    },

    getCustomers: async (search: string = ""): Promise<Customer[]> => {
        const res = await fetch(`${API_BASE}?type=customers&search=${search}`);
        if (!res.ok) throw new Error("Failed to fetch customers");
        return res.json();
    }
};
