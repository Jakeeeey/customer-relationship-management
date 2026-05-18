"use client";

import {
    DealerInvoiceHeader,
    DealerInvoiceDetail,
    Salesman,
    Customer,
    SalesType,
    WorklistFilters,
    InvoiceDetailsResponse,
    SearchProduct,
    Supplier,
    InvoiceType,
    PriceType,
    Branch,
    PaymentTerm,
    CustomerSalesmanLink,
    MasterUser
} from "../types";

const API_BASE = "/api/crm/site-sales-management/dealer-sales-invoice";

export const dealerInvoiceProvider = {
    // 1. Fetch Worklist (isDispatched = 0, sales_type = 3)
    getWorklist: async (params: WorklistFilters): Promise<{ data: DealerInvoiceHeader[], metadata: { totalCount: number } }> => {
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
            details: DealerInvoiceDetail[];
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

    getMasterUsers: async (): Promise<MasterUser[]> => {
        const res = await fetch(`${API_BASE}?type=master_users`);
        if (!res.ok) throw new Error("Failed to fetch master users");
        return res.json();
    },

    getAccounts: async (userId: number | string): Promise<Salesman[]> => {
        const res = await fetch(`${API_BASE}?type=accounts&userId=${userId}`);
        if (!res.ok) throw new Error("Failed to fetch accounts");
        return res.json();
    },

    getSalesmanByCustomer: async (customerId: number): Promise<MasterUser[]> => {
        const res = await fetch(`${API_BASE}?type=salesman_by_customer&customerId=${customerId}`);
        if (!res.ok) throw new Error("Failed to fetch salesman by customer");
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



    unDispatch: async (id: string | number): Promise<{ success: boolean }> => {
        const res = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "un_dispatch",
                id
            })
        });
        if (!res.ok) throw new Error("Failed to un-dispatch invoice");
        return res.json();
    },

    // 7. Product Search for Adding Items
    searchProducts: async (params: { search: string, priceTypeId: number, priceType?: string | null, supplierId?: number | string | null, branchId?: number | string | null, customerCode?: string | null }): Promise<SearchProduct[]> => {
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

    getSuppliers: async (): Promise<Supplier[]> => {
        const res = await fetch(`${API_BASE}?type=suppliers`);
        if (!res.ok) throw new Error("Failed to fetch suppliers");
        return res.json();
    },

    getUtilityInfo: async (): Promise<{
        invoice_types: InvoiceType[],
        price_types: PriceType[],
        branches: Branch[],
        payment_terms: PaymentTerm[]
    }> => {
        const res = await fetch(`${API_BASE}?type=utility_info`);
        if (!res.ok) throw new Error("Failed to fetch utility info");
        return res.json();
    },

    getCustomerSalesman: async (customerId: number): Promise<CustomerSalesmanLink | null> => {
        const res = await fetch(`${API_BASE}?type=customer_salesman&customerId=${customerId}`);
        if (!res.ok) throw new Error("Failed to fetch customer salesman");
        return res.json();
    },



    createInvoice: async (payload: Record<string, unknown>): Promise<{ success: boolean; invoiceId: number }> => {
        const res = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "create_invoice",
                ...payload
            })
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || "Failed to create invoice");
        }
        return res.json();
    }
};
