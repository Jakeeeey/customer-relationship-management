"use client";

import { SalesInvoiceHeader, SalesInvoiceDetail, Salesman, Customer, SalesType, WorklistFilters, SalesReturn, InvoiceDetailsResponse, SearchProduct } from "../types";

const API_BASE = "/api/crm/site-sales-management/site-sales-posting";

export const siteSalesPostingProvider = {
    // 1. Fetch Worklist (isDispatched = 0, sales_type = 3)
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

    // 3. Save Adjustments (Header + Detail CRUD)
    saveAdjustments: async (
        invoiceId: number | string, 
        payload: { 
            customer_code?: string | null; 
            order_id?: string | null;
            invoice_date?: string | null;
            due_date?: string | null;
            remarks?: string | null;
            gross_amount?: number;
            discount_amount?: number;
            vat_amount?: number;
            total_amount?: number;
            net_amount?: number;
            details: SalesInvoiceDetail[];
            deletedDetailIds: number[]; 
        }
    ): Promise<{ success: boolean }> => {
        const res = await fetch(API_BASE, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "save_adjustments",
                invoiceId,
                ...payload
            })
        });
        if (!res.ok) throw new Error("Failed to save adjustments");
        return res.json();
    },

    // 4. Finalize Settlement (Sets isDispatched = 1)
    finalizeSettlement: async (invoiceIds: (number | string)[]): Promise<{ success: boolean }> => {
        const res = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "finalize_settlement",
                invoiceIds
            })
        });
        if (!res.ok) throw new Error("Failed to finalize settlement");
        return res.json();
    },

    // 5. Utility Data
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
    },
    
    // 6. Return Linking
    getAvailableReturns: async (customerCode: string): Promise<SalesReturn[]> => {
        const res = await fetch(`${API_BASE}?type=available_returns&customerCode=${customerCode}`);
        if (!res.ok) throw new Error("Failed to fetch available returns");
        return res.json();
    },

    linkReturn: async (invoiceId: number | string, returnId: number | string, amount: number): Promise<{ success: boolean }> => {
        const res = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "link_return",
                invoiceId,
                returnId,
                amount
            })
        });
        if (!res.ok) throw new Error("Failed to link return");
        return res.json();
    },

    // 7. Product Search for Adding Items
    searchProducts: async (params: { search: string, priceTypeId: number, priceType?: string | null, supplierId?: number | null, branchId?: number | string | null, customerCode?: string | null }): Promise<SearchProduct[]> => {
        const query = new URLSearchParams({
            type: "search_products",
            search: params.search,
            priceTypeId: params.priceTypeId.toString()
        });
        if (params.priceType) query.append("priceType", params.priceType);
        if (params.supplierId != null) query.append("supplierId", params.supplierId.toString());
        if (params.branchId != null) query.append("branchId", params.branchId.toString());
        if (params.customerCode) query.append("customerCode", params.customerCode);

        const res = await fetch(`${API_BASE}?${query.toString()}`);
        if (!res.ok) throw new Error("Failed to search products");
        return res.json();
    },

    getSuppliers: async (): Promise<{ id: number; supplier_name: string }[]> => {
        const res = await fetch(`${API_BASE}?type=suppliers`);
        if (!res.ok) throw new Error("Failed to fetch suppliers");
        return res.json();
    }
};

