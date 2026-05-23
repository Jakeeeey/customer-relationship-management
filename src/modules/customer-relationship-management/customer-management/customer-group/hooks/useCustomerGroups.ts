"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { CustomerGroup, CustomerGroupFormData, CustomerGroupsAPIResponse } from "../types";
import { toast } from "sonner";

interface UseCustomerGroupsReturn {
    groups: CustomerGroup[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    refetch: () => Promise<void>;
    createGroup: (data: CustomerGroupFormData) => Promise<void>;
    updateGroup: (data: CustomerGroupFormData) => Promise<void>;
    deleteGroup: (id: number) => Promise<void>;
}

export function useCustomerGroups(): UseCustomerGroupsReturn {
    const [groups, setGroups] = useState<CustomerGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const hasLoadedRef = useRef(false);

    const fetchData = useCallback(async (showLoading = false) => {
        try {
            if (showLoading || !hasLoadedRef.current) {
                setIsLoading(true);
            }

            setIsError(false);
            setError(null);

            const params = new URLSearchParams({
                q: searchQuery,
                t: Date.now().toString()
            });

            const res = await fetch(`/api/crm/customer-management/customer-group?${params.toString()}`, { cache: "no-store" });

            if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }

            const data: CustomerGroupsAPIResponse = await res.json();
            setGroups(data.data || []);
            hasLoadedRef.current = true;
        } catch (err) {
            setIsError(true);
            setError(err instanceof Error ? err : new Error("Unknown error"));
            console.error("Customer Group fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        fetchData(true);
    }, [fetchData]);

    useEffect(() => {
        const handleFocus = () => fetchData(false);
        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [fetchData]);

    const createGroup = useCallback(async (data: CustomerGroupFormData) => {
        try {
            const res = await fetch("/api/crm/customer-management/customer-group", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Server error: ${res.status}`);
            }

            toast.success("Customer Group created successfully!");
            await fetchData(true);
        } catch (err) {
            console.error('Create group error:', err);
            toast.error(err instanceof Error ? err.message : "Failed to create group");
            throw err;
        }
    }, [fetchData]);

    const updateGroup = useCallback(async (data: CustomerGroupFormData) => {
        try {
            const res = await fetch("/api/crm/customer-management/customer-group", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Server error: ${res.status}`);
            }

            toast.success("Customer Group updated successfully!");
            await fetchData(true);
        } catch (err) {
            console.error('Update group error:', err);
            toast.error(err instanceof Error ? err.message : "Failed to update group");
            throw err;
        }
    }, [fetchData]);

    const deleteGroup = useCallback(async (id: number) => {
        try {
            const res = await fetch(`/api/crm/customer-management/customer-group?id=${id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Server error: ${res.status}`);
            }

            toast.success("Customer Group deleted successfully!");
            await fetchData(true);
        } catch (err) {
            console.error('Delete group error:', err);
            toast.error(err instanceof Error ? err.message : "Failed to delete group");
            throw err;
        }
    }, [fetchData]);

    const refetch = useCallback(() => fetchData(true), [fetchData]);

    return {
        groups,
        isLoading,
        isError,
        error,
        searchQuery,
        setSearchQuery,
        refetch,
        createGroup,
        updateGroup,
        deleteGroup,
    };
}
