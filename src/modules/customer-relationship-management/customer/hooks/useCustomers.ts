"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { CustomerWithRelations, Customer, BankAccount, CustomersAPIResponse } from "../types";

interface UseCustomersReturn {
    customers: CustomerWithRelations[];
    bankAccounts: BankAccount[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    createCustomer: (data: Partial<Customer>) => Promise<void>;
    updateCustomer: (id: number, data: Partial<Customer>) => Promise<void>;
    deleteCustomer: (id: number) => Promise<void>;
}

export function useCustomers(): UseCustomersReturn {
    const [allCustomers, setAllCustomers] = useState<CustomerWithRelations[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const hasLoadedRef = useRef(false);

    const fetchData = useCallback(async (showLoading = false) => {
        try {
            if (showLoading || !hasLoadedRef.current) {
                setIsLoading(true);
            }

            setIsError(false);
            setError(null);

            const res = await fetch(`/api/crm/customer?t=${Date.now()}`, { cache: "no-store" });

            if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }

            const data: CustomersAPIResponse = await res.json();

            setAllCustomers(data.customers || []);
            setBankAccounts(data.bank_accounts || []);
            hasLoadedRef.current = true;

        } catch (err) {
            setIsError(true);
            setError(err instanceof Error ? err : new Error("Unknown error"));
            console.error("Customer fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(true);
    }, [fetchData]);

    // Handle window focus to keep data fresh (pattern from HRM)
    useEffect(() => {
        const handleFocus = () => fetchData(false);
        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [fetchData]);

    const createCustomer = useCallback(async (data: Partial<Customer>) => {
        try {
            const res = await fetch("/api/crm/customer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Server error: ${res.status}`);
            }

            await fetchData(true);
        } catch (err) {
            console.error('Create customer error:', err);
            throw err;
        }
    }, [fetchData]);

    const updateCustomer = useCallback(async (id: number, data: Partial<Customer>) => {
        try {
            const res = await fetch("/api/crm/customer", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, ...data }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Server error: ${res.status}`);
            }

            await fetchData(true);
        } catch (err) {
            console.error('Update customer error:', err);
            throw err;
        }
    }, [fetchData]);

    const deleteCustomer = useCallback(async (id: number) => {
        try {
            const res = await fetch(`/api/crm/customer?id=${id}`, {
                method: "DELETE"
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Server error: ${res.status}`);
            }

            await fetchData(true);
        } catch (err) {
            console.error('Delete customer error:', err);
            throw err;
        }
    }, [fetchData]);

    const refetch = useCallback(() => fetchData(true), [fetchData]);

    return {
        customers: allCustomers,
        bankAccounts,
        isLoading,
        isError,
        error,
        refetch,
        createCustomer,
        updateCustomer,
        deleteCustomer,
    };
}
