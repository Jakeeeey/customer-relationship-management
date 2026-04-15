"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { CustomerProspect, CustomerProspectsAPIResponse, DiscountType, Salesman, StoreType, PaymentTerm, CustomerClassification } from "../types";

interface UseCustomerProspectsReturn {
    prospects: CustomerProspect[];
    discountTypes: DiscountType[];
    salesmen: Salesman[];
    storeTypes: StoreType[];
    paymentTerms: PaymentTerm[];
    classifications: CustomerClassification[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    metadata: CustomerProspectsAPIResponse['metadata'];
    page: number;
    pageSize: number;
    searchQuery: string;
    statusFilter: string;
    salesmanFilter: string;
    setPage: (page: number) => void;
    setPageSize: (pageSize: number) => void;
    setSearchQuery: (query: string) => void;
    setStatusFilter: (status: string) => void;
    setSalesmanFilter: (salesmanId: string) => void;
    refetch: () => Promise<void>;
    approveProspect: (id: number) => Promise<void>;
    rejectProspect: (id: number) => Promise<void>;
    updateProspect: (id: number, data: Partial<CustomerProspect>) => Promise<void>;
}

export function useCustomerProspects(): UseCustomerProspectsReturn {
    const [prospects, setProspects] = useState<CustomerProspect[]>([]);
    const [discountTypes, setDiscountTypes] = useState<DiscountType[]>([]);
    const [salesmen, setSalesmen] = useState<Salesman[]>([]);
    const [storeTypes, setStoreTypes] = useState<StoreType[]>([]);
    const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
    const [classifications, setClassifications] = useState<CustomerClassification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [metadata, setMetadata] = useState<CustomerProspectsAPIResponse['metadata']>({
        total_count: 0,
        filter_count: 0,
        page: 1,
        pageSize: 10,
        lastUpdated: new Date().toISOString(),
    });

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("Pending");
    const [salesmanFilter, setSalesmanFilter] = useState("all");

    const hasLoadedRef = useRef(false);

    const filterDeps = `${page}-${pageSize}-${searchQuery}-${statusFilter}-${salesmanFilter}`;
    const resetDeps = `${searchQuery}-${statusFilter}-${salesmanFilter}`;

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
                salesman: salesmanFilter,
                t: Date.now().toString()
            });

            const res = await fetch(`/api/crm/customer-prospect?${params.toString()}`, { cache: "no-store" });

            if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }

            const data: CustomerProspectsAPIResponse = await res.json();
            setProspects(data.prospects || []);
            setMetadata(data.metadata);

            // Fetch References (Discount Types, Salesmen, Store Types) once or on manual refetch
            if (discountTypes.length === 0 || salesmen.length === 0 || storeTypes.length === 0) {
                const [dtRes, slRes, stRes, ptRes, clRes] = await Promise.all([
                    fetch('/api/crm/customer/references?type=discount_type'),
                    fetch('/api/crm/customer/references?type=salesman'),
                    fetch('/api/crm/customer/references?type=store_type'),
                    fetch('/api/crm/customer/references?type=payment_term'),
                    fetch('/api/crm/customer/references?type=classification')
                ]);

                if (dtRes.ok) {
                    const dtData = await dtRes.json();
                    setDiscountTypes(dtData.data || []);
                }
                if (slRes.ok) {
                    const slData = await slRes.json();
                    setSalesmen(slData.data || []);
                }
                if (stRes.ok) {
                    const stData = await stRes.json();
                    setStoreTypes(stData.data || []);
                }
                if (ptRes.ok) {
                    const ptData = await ptRes.json();
                    setPaymentTerms(ptData.data || []);
                }
                if (clRes.ok) {
                    const clData = await clRes.json();
                    setClassifications(clData.data || []);
                }
            }

            hasLoadedRef.current = true;
        } catch (err) {
            setIsError(true);
            setError(err instanceof Error ? err : new Error("Unknown error"));
            console.error("Prospect fetch error:", err);
        } finally {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterDeps]); // Fixed length of 1

    useEffect(() => {
        setPage(1);
    }, [resetDeps]); // Fixed length of 1

    useEffect(() => {
        fetchData(true);
    }, [fetchData]);

    const handleAction = useCallback(async (id: number, action: 'Approve' | 'Reject') => {
        try {
            const res = await fetch("/api/crm/customer-prospect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, action }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Action failed: ${res.status}`);
            }

            await fetchData(true);
        } catch (err) {
            console.error(`${action} prospect error:`, err);
            throw err;
        }
    }, [fetchData]);

    const approveProspect = (id: number) => handleAction(id, "Approve");
    const rejectProspect = (id: number) => handleAction(id, "Reject");

    const updateProspect = useCallback(async (id: number, data: Partial<CustomerProspect>) => {
        try {
            const res = await fetch("/api/crm/customer-prospect", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, ...data }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Update failed: ${res.status}`);
            }

            await fetchData(true);
        } catch (err) {
            console.error("Update prospect error:", err);
            throw err;
        }
    }, [fetchData]);

    const refetch = useCallback(() => fetchData(true), [fetchData]);

    return {
        prospects,
        discountTypes,
        salesmen,
        storeTypes,
        paymentTerms,
        classifications,
        isLoading,
        isError,
        error,
        metadata,
        page,
        pageSize,
        searchQuery,
        statusFilter,
        salesmanFilter,
        setPage,
        setPageSize,
        setSearchQuery,
        setStatusFilter,
        setSalesmanFilter,
        refetch,
        approveProspect,
        rejectProspect,
        updateProspect
    };
}
