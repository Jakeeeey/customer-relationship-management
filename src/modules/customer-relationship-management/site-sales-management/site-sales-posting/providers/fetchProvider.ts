"use client";

import { SalesInvoiceHeader, SalesInvoiceDetail } from "../types";

const API_BASE = "/api/crm/site-sales-management/site-sales-posting";

export const siteSalesPostingProvider = {
    // 1. Fetch Worklist (isDispatched = 0, sales_type = 3)
    getWorklist: async (params: any): Promise<{ data: SalesInvoiceHeader[], metadata: any }> => {
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

        const res = await fetch(`${API_BASE}?type=worklist&${query.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch worklist");
        return res.json();
    },

    // 2. Fetch Invoice Details & Linked Documents
    getInvoiceDetails: async (invoiceId: number | string) => {
        const res = await fetch(`${API_BASE}?type=details&invoiceId=${invoiceId}`);
        if (!res.ok) throw new Error("Failed to fetch invoice details");
        return res.json();
    },

    // 3. Save Adjustments (Header + Detail CRUD)
    saveAdjustments: async (
        invoiceId: number | string, 
        payload: { 
            customer_code?: string | null; 
            invoice_date?: string | null;
            due_date?: string | null;
            remarks?: string | null;
            details: SalesInvoiceDetail[];
            deletedDetailIds: number[]; 
        }
    ) => {
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
    finalizeSettlement: async (invoiceIds: (number | string)[]) => {
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
    getSalesmen: async () => {
        const res = await fetch(`${API_BASE}?type=salesmen`);
        if (!res.ok) throw new Error("Failed to fetch salesmen");
        return res.json();
    },

    getSalesTypes: async () => {
        const res = await fetch(`${API_BASE}?type=sales_types`);
        if (!res.ok) throw new Error("Failed to fetch sales types");
        return res.json();
    },

    getCustomers: async (search: string = "") => {
        const res = await fetch(`${API_BASE}?type=customers&search=${search}`);
        if (!res.ok) throw new Error("Failed to fetch customers");
        return res.json();
    }
};

