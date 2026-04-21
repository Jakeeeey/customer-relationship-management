"use client";

import { Salesman, Branch, Division, Operation, User } from "../types";

const API_BASE = "/api/crm/customer-hub/salesman-management";

export const salesmanProvider = {
    getSalesmen: async (page: number = 1, limit: number = 20, search: string = "", activeOnly?: boolean): Promise<{ data: Salesman[], total: number }> => {
        let url = `${API_BASE}?action=list&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
        if (activeOnly !== undefined) url += `&isActive=${activeOnly}`;

        const res = await fetch(url);
        if (!res.ok) return { data: [], total: 0 };
        const result = await res.json();
        return {
            data: result.data || [],
            total: result.meta?.total_count || 0
        };
    },

    getSupportingData: async (): Promise<{ branches: Branch[]; divisions: Division[]; operations: Operation[]; users: User[]; }> => {
        const res = await fetch(`${API_BASE}?action=supporting-data`);
        if (!res.ok) throw new Error("Failed to load supporting data");
        return res.json();
    },

    getCustomerCount: async (id: number): Promise<number> => {
        const res = await fetch(`${API_BASE}?action=customer-count&id=${id}`);
        if (!res.ok) return 0;
        const data = await res.json();
        return data.count || 0;
    },

    deactivateAndReassign: async (id: number, targetSalesmanId: number): Promise<{ success: boolean; error?: string }> => {
        const res = await fetch(`${API_BASE}?id=${id}&action=deactivate-reassign`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetSalesmanId })
        });
        return res.json();
    },

    updateSalesman: async (id: number, data: Partial<Salesman>): Promise<{ success: boolean; error?: string }> => {
        const res = await fetch(`${API_BASE}?id=${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    // 🚀 NEW: Get valid registered vehicles
    getVehicles: async () => {
        const res = await fetch(`${API_BASE}?action=vehicles`);
        const result = await res.json();
        return result.data || [];
    },

    getAssignedCustomers: async (salesmanId: number) => {
        const res = await fetch(`${API_BASE}?action=assigned-customers&id=${salesmanId}`);
        const result = await res.json();
        return result.data || [];
    },

    // 🚀 FIXED: Enforces strict price type matching to prevent pricing discrepancies!
    searchAvailableCustomers: async (search: string, priceType?: string) => {
        let url = `${API_BASE}?action=search-customers&search=${encodeURIComponent(search)}`;
        if (priceType) url += `&priceType=${encodeURIComponent(priceType)}`;

        const res = await fetch(url);
        const result = await res.json();
        return result.data || [];
    },

    assignCustomer: async (salesmanId: number, customerId: number) => {
        const res = await fetch(`${API_BASE}?action=assign-customer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ salesman_id: salesmanId, customer_id: customerId })
        });
        return res.json();
    },

    unassignCustomer: async (junctionId: number) => {
        const res = await fetch(`${API_BASE}?action=unassign-customer&junctionId=${junctionId}`, {
            method: "DELETE"
        });
        return res.json();
    }
};