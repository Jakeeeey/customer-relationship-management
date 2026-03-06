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

    // Pag-search ng mga products na pwedeng bilhin
    searchProducts: async (search: string, customerCode: string, supplierId: number, priceType: string, customerId: number, priceTypeId?: number, salesmanId?: string): Promise<any[]> => {
        // Dito natin ipinapasa ang price_type_id para makuha ang tamang presyo mula sa Directus
        const res = await fetch(`${API_BASE}?action=products&search=${encodeURIComponent(search)}&customer_code=${customerCode}&supplier_id=${supplierId}&price_type=${priceType}&customer_id=${customerId}${priceTypeId ? `&price_type_id=${priceTypeId}` : ""}${salesmanId ? `&salesman_id=${salesmanId}` : ""}`);
        return res.json();
    },

    // Pag-save ng bagong Sales Order sa database
    createOrder: async (header: any, items: any[]): Promise<any> => {
        const res = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ header, items })
        });
        return res.json();
    }
};
