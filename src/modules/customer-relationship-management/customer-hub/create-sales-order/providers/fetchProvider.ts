"use client";

import { Salesman, Customer, Supplier, Product, RunningInventoryItem } from "../types";

const API_BASE = "/api/crm/customer-hub/create-sales-order";

export const salesOrderProvider = {
    getSalesmen: async (): Promise<Salesman[]> => {
        const res = await fetch(`${API_BASE}?action=salesmen`);
        return res.json();
    },

    getCustomers: async (salesmanId: number): Promise<Customer[]> => {
        const res = await fetch(`${API_BASE}?action=customers&salesman_id=${salesmanId}`);
        return res.json();
    },

    getSuppliers: async (): Promise<Supplier[]> => {
        const res = await fetch(`${API_BASE}?action=suppliers`);
        return res.json();
    },

    // Pag-search ng mga products na pwedeng bilhin
    searchProducts: async (search: string, customerCode: string, supplierId: number, priceType: string, customerId: number, priceTypeId?: number, salesmanId?: string): Promise<Product[]> => {
        // Dito natin ipinapasa ang price_type_id para makuha ang tamang presyo mula sa Directus
        const res = await fetch(`${API_BASE}?action=products&search=${encodeURIComponent(search)}&customer_code=${customerCode}&supplier_id=${supplierId}&price_type=${priceType}&customer_id=${customerId}${priceTypeId ? `&price_type_id=${priceTypeId}` : ""}${salesmanId ? `&salesman_id=${salesmanId}` : ""}`);
        return res.json();
    },

    // Pag-save ng bagong Sales Order sa database
    createOrder: async (header: Record<string, unknown>, items: Record<string, unknown>[]): Promise<{ success: boolean; order_no?: string; error?: string }> => {
        const res = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ header, items })
        });
        return res.json();
    },

    getInventory: async (params?: Record<string, string>): Promise<RunningInventoryItem[]> => {
        const query = params ? `&${new URLSearchParams(params).toString()}` : "";
        const res = await fetch(`${API_BASE}?action=inventory${query}`);
        if (!res.ok) throw new Error("Failed to fetch inventory");
        return res.json();
    }
};
