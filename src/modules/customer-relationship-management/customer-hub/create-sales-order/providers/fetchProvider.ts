"use client";

const API_BASE = "/api/crm/customer-hub/create-sales-order";

export const salesOrderProvider = {
    getSalesmen: async (): Promise<any[]> => {
        const res = await fetch(`${API_BASE}?action=salesmen`);
        return res.json();
    },

    getCustomers: async (salesmanId: number): Promise<any[]> => {
        const res = await fetch(`${API_BASE}?action=customers&salesman_id=${salesmanId}`);
        return res.json();
    },

    getSuppliers: async (): Promise<any[]> => {
        const res = await fetch(`${API_BASE}?action=suppliers`);
        return res.json();
    },

    searchProducts: async (search: string, customerCode: string, supplierId: number, priceType: string, customerId: number): Promise<any[]> => {
        const res = await fetch(`${API_BASE}?action=products&search=${encodeURIComponent(search)}&customer_code=${customerCode}&supplier_id=${supplierId}&price_type=${priceType}&customer_id=${customerId}`);
        return res.json();
    },

    createOrder: async (header: any, items: any[]): Promise<any> => {
        const res = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ header, items })
        });
        return res.json();
    }
};
