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

    getSupportingData: async (): Promise<{
        branches: Branch[];
        divisions: Division[];
        operations: Operation[];
        users: User[];
    }> => {
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

    createSalesman: async (data: Partial<Salesman>): Promise<{ success: boolean; id?: number; error?: string }> => {
        const res = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        return res.json();
    }
};
