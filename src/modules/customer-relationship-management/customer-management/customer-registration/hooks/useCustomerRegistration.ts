"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { CustomerRegistration, CustomerRegistrationAPIResponse } from "../types";

interface UseCustomerRegistrationReturn {
    customers: CustomerRegistration[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    metadata: CustomerRegistrationAPIResponse['metadata'];
    page: number;
    pageSize: number;
    searchQuery: string;
    setPage: (page: number) => void;
    setPageSize: (pageSize: number) => void;
    setSearchQuery: (query: string) => void;
    refetch: () => Promise<void>;
    createCustomer: (data: Partial<CustomerRegistration>) => Promise<void>;
    updateCustomer: (id: number, data: Partial<CustomerRegistration>) => Promise<void>;
    statusFilter: string;
    setStatusFilter: (status: string) => void;
    storeTypeFilter: string;
    setStoreTypeFilter: (storeType: string) => void;
    classificationFilter: string;
    setClassificationFilter: (classification: string) => void;
}

export function useCustomerRegistration(): UseCustomerRegistrationReturn {
    const [customers, setCustomers] = useState<CustomerRegistration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [metadata, setMetadata] = useState<CustomerRegistrationAPIResponse['metadata']>({
        total_count: 0,
        page: 1,
        pageSize: 100,
        lastUpdated: new Date().toISOString(),
    });

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(100);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [storeTypeFilter, setStoreTypeFilter] = useState("all");
    const [classificationFilter, setClassificationFilter] = useState("all");

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
                storeType: storeTypeFilter,
                classification: classificationFilter,
                t: Date.now().toString()
            });

            const res = await fetch(`/api/crm/customer?${params.toString()}`, { cache: "no-store" });

            if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }

            const data: CustomerRegistrationAPIResponse = await res.json();
            setCustomers(data.customers || []);
            setMetadata(data.metadata);

            hasLoadedRef.current = true;
        } catch (err) {
            setIsError(true);
            setError(err instanceof Error ? err : new Error("Unknown error"));
            console.error("Customer Registration fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize, searchQuery, statusFilter, storeTypeFilter, classificationFilter]);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, statusFilter, storeTypeFilter, classificationFilter]);

    useEffect(() => {
        fetchData(true);
    }, [fetchData]);

    const createCustomer = useCallback(async (data: Partial<CustomerRegistration>) => {
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
            console.error('Create customer registration error:', err);
            throw err;
        }
    }, [fetchData]);

    const updateCustomer = useCallback(async (id: number, data: Partial<CustomerRegistration>) => {
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
            console.error('Update customer registration error:', err);
            throw err;
        }
    }, [fetchData]);

    const refetch = useCallback(() => fetchData(true), [fetchData]);

    return {
        customers,
        isLoading,
        isError,
        error,
        metadata,
        page,
        pageSize,
        searchQuery,
        setPage,
        setPageSize,
        setSearchQuery,
        refetch,
        createCustomer,
        updateCustomer,
        statusFilter,
        setStatusFilter,
        storeTypeFilter,
        setStoreTypeFilter,
        classificationFilter,
        setClassificationFilter,
    };
}
