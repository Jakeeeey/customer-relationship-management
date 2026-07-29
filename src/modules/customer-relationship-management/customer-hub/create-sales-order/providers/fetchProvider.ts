"use client";

import { Salesman, Customer, Supplier, Product, Branch, PriceTypeModel } from "../types";

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

    getAllCustomers: async (search?: string, offset?: number): Promise<Customer[]> => {
        let url = `${API_BASE}?action=all_customers`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (offset) url += `&offset=${offset}`;
        const res = await fetch(url);
        return res.json();
    },

    getSalesmanByCustomer: async (customerId: number): Promise<Salesman[]> => {
        const res = await fetch(`${API_BASE}?action=salesman_by_customer&customer_id=${customerId}`);
        return res.json();
    },

    getSuppliers: async (): Promise<Supplier[]> => {
        const res = await fetch(`${API_BASE}?action=suppliers`);
        return res.json();
    },

    getBranches: async (): Promise<Branch[]> => {
        const res = await fetch(`${API_BASE}?action=branches`);
        return res.json();
    },

    getPriceTypes: async (): Promise<PriceTypeModel[]> => {
        const res = await fetch(`${API_BASE}?action=price_types`);
        return res.json();
    },

    // Pag-search ng mga products na pwedeng bilhin
    searchProducts: async (search: string, customerCode: string, supplierId: number, priceType: string, customerId: number, priceTypeId?: number, salesmanId?: string, branchId?: string): Promise<Product[]> => {
        // Dito natin ipinapasa ang price_type_id para makuha ang tamang presyo mula sa Directus
        let url = `${API_BASE}?action=products&search=${encodeURIComponent(search)}&customer_code=${customerCode}&supplier_id=${supplierId}&price_type=${priceType}&customer_id=${customerId}`;
        if (priceTypeId) url += `&price_type_id=${priceTypeId}`;
        if (salesmanId) url += `&salesman_id=${salesmanId}`;
        if (branchId) url += `&branch_id=${branchId}`;

        const cacheKey = `crm_products_${url}`;
        const cachedStr = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;

        if (cachedStr) {
            try {
                const cachedData = JSON.parse(cachedStr);
                const now = new Date().getTime();
                if (cachedData.expiry && now < cachedData.expiry) {
                    console.log("[fetchProvider] Using 30-min cached products for", url);
                    return cachedData.data;
                } else {
                    localStorage.removeItem(cacheKey); // Remove expired
                }
            } catch (e) {
                console.warn("[fetchProvider] Failed to parse product cache", e);
                localStorage.removeItem(cacheKey);
            }
        }

        const res = await fetch(url);
        const data = await res.json();

        // Save to cache for 30 minutes (30 * 60 * 1000 = 1800000 ms)
        try {
            if (typeof window !== "undefined") {
                const expiry = new Date().getTime() + 1800000;
                localStorage.setItem(cacheKey, JSON.stringify({ expiry, data }));

                // Optional: Cleanup old expired cache to prevent bloat
                Object.keys(localStorage).forEach((key) => {
                    if (key.startsWith("crm_products_")) {
                        try {
                            const item = localStorage.getItem(key);
                            if (item) {
                                const parsed = JSON.parse(item);
                                if (parsed.expiry && new Date().getTime() > parsed.expiry) {
                                    localStorage.removeItem(key);
                                }
                            }
                        } catch {
                            localStorage.removeItem(key);
                        }
                    }
                });
            }
        } catch {
            console.warn("[fetchProvider] Failed to set product cache");
        }

        return data;
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

    API_BASE,

    getSalesmanById: async (id: number): Promise<Salesman | null> => {
        const res = await fetch(`${API_BASE}?action=salesman_by_id&id=${id}`);
        return res.json();
    },

    deleteOrderItem: async (detailId: number | string): Promise<{ success: boolean; error?: string }> => {
        const res = await fetch(`${API_BASE}?action=delete_item&id=${detailId}`);
        return res.json();
    },

};
