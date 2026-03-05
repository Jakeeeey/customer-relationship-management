"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { CustomerWithRelations, Customer, BankAccount, CustomersAPIResponse } from "../types";

interface UseCustomersReturn {
    customers: CustomerWithRelations[];
    bankAccounts: BankAccount[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    metadata: CustomersAPIResponse['metadata'];
    page: number;
    pageSize: number;
    searchQuery: string;
    statusFilter: string;
    setPage: (page: number) => void;
    setPageSize: (pageSize: number) => void;
    setSearchQuery: (query: string) => void;
    setStatusFilter: (status: string) => void;
    userMapping: Record<number, string>;
    refetch: () => Promise<void>;
    createCustomer: (data: Partial<Customer>) => Promise<void>;
    updateCustomer: (id: number, data: Partial<Customer>) => Promise<void>;
}

export function useCustomers(): UseCustomersReturn {
    const [allCustomers, setAllCustomers] = useState<CustomerWithRelations[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [userMapping, setUserMapping] = useState<Record<number, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [metadata, setMetadata] = useState<CustomersAPIResponse['metadata']>({
        total_count: 0,
        page: 1,
        pageSize: 10,
        lastUpdated: new Date().toISOString(),
    });

    // Pagination & Filter State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const hasLoadedRef = useRef(false);

    const fetchData = useCallback(async (showLoading = false) => {
        try {
            if (showLoading || !hasLoadedRef.current) {
                setIsLoading(true);
            }

            setIsError(false);
            setError(null);

            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                q: searchQuery,
                status: statusFilter,
                t: Date.now().toString()
            });

            // Parallel fetch for customers and user mapping if not loaded
            const [customerRes, userRes] = await Promise.all([
                fetch(`/api/crm/customer?${params.toString()}`, { cache: "no-store" }),
                fetch("/api/crm/customer/references?type=user", { cache: "no-store" })
            ]);

            if (!customerRes.ok) {
                throw new Error(`API error: ${customerRes.status}`);
            }

            const data: CustomersAPIResponse = await customerRes.json();
            setAllCustomers(data.customers || []);
            setBankAccounts(data.bank_accounts || []);
            setMetadata(data.metadata);

            if (userRes.ok) {
                const userData = await userRes.json();
                const mapping: Record<number, string> = {};
                (userData.data || []).forEach((u: any) => {
                    const fullName = [u.user_fname, u.user_mname, u.user_lname].filter(Boolean).join(" ");
                    const uid = u.id || u.user_id;
                    if (uid) {
                        mapping[uid] = fullName || `User #${uid}`;
                    }
                });
                setUserMapping(mapping);
            }

            hasLoadedRef.current = true;

        } catch (err) {
            setIsError(true);
            setError(err instanceof Error ? err : new Error("Unknown error"));
            console.error("Customer fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize, searchQuery, statusFilter]);

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

    const refetch = useCallback(() => fetchData(true), [fetchData]);

    return {
        customers: allCustomers,
        bankAccounts,
        userMapping,
        isLoading,
        isError,
        error,
        metadata,
        page,
        pageSize,
        searchQuery,
        statusFilter,
        setPage,
        setPageSize,
        setSearchQuery,
        setStatusFilter,
        refetch,
        createCustomer,
        updateCustomer,
    };
}
