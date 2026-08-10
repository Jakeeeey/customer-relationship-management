"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { SalesOrderAttachment, CallSheetAPIResponse } from "../types";

interface UseCallSheetReturn {
    isInitializing: boolean;
    isSalesman: boolean;
    callsheets: SalesOrderAttachment[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    metadata: CallSheetAPIResponse["metadata"];
    filterOptions: CallSheetAPIResponse["filterOptions"];
    page: number;
    pageSize: number;
    search: string;
    customerCode: string;
    salesmanId: string;
    status: string;
    setPage: (page: number) => void;
    setPageSize: (pageSize: number) => void;
    setSearch: (search: string) => void;
    setCustomerCode: (code: string) => void;
    setSalesmanId: (id: string) => void;
    setStatus: (status: string) => void;
    refetch: () => Promise<void>;
}

export function useCallSheet(): UseCallSheetReturn {
    const [isInitializing, setIsInitializing] = useState(true);
    const [isSalesman, setIsSalesman] = useState(true);

    const [callsheets, setCallSheets] = useState<SalesOrderAttachment[]>([]);
    const [filterOptions, setFilterOptions] = useState<CallSheetAPIResponse["filterOptions"]>({
        salesmen: [],
        customers: [],
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [metadata, setMetadata] = useState<CallSheetAPIResponse["metadata"]>({
        total_count: 0,
        page: 1,
        pageSize: 10,
        lastUpdated: new Date().toISOString(),
    });

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState("");
    const [customerCode, setCustomerCode] = useState("");
    const [salesmanId, setSalesmanId] = useState("");
    const [status, setStatus] = useState("");

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
                search,
                customer_code: customerCode,
                salesman_id: salesmanId,
                status,
                t: Date.now().toString(),
            });

            const res = await fetch(`/api/crm/customer-hub/salesman-callsheet?${params.toString()}`, {
                cache: "no-store",
            });

            if (res.status === 403) {
                const data = await res.json();
                if (data.isSalesman === false) {
                    setIsSalesman(false);
                    return;
                }
                throw new Error("Access Denied");
            }

            if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }

            const data: CallSheetAPIResponse & { isSalesman?: boolean } = await res.json();
            
            if (data.isSalesman !== undefined) {
                setIsSalesman(data.isSalesman);
            }

            setCallSheets(data.callsheets || []);
            setMetadata(data.metadata || {
                total_count: 0,
                page: 1,
                pageSize: 10,
                lastUpdated: new Date().toISOString(),
            });
            if (data.filterOptions) {
                setFilterOptions(data.filterOptions);
            }
            hasLoadedRef.current = true;
        } catch (err) {
            setIsError(true);
            setError(err instanceof Error ? err : new Error("Unknown error"));
            console.error("Callsheet fetch error:", err);
        } finally {
            setIsLoading(false);
            setIsInitializing(false);
        }
    }, [page, pageSize, search, customerCode, salesmanId, status]);

    useEffect(() => {
        fetchData(true);
    }, [fetchData]);

    useEffect(() => {
        const handleFocus = () => fetchData(false);
        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [fetchData]);

    const refetch = useCallback(() => fetchData(true), [fetchData]);

    return {
        isInitializing,
        isSalesman,
        callsheets,
        isLoading,
        isError,
        error,
        metadata,
        filterOptions,
        page,
        pageSize,
        search,
        customerCode,
        salesmanId,
        status,
        setPage,
        setPageSize,
        setSearch,
        setCustomerCode,
        setSalesmanId,
        setStatus,
        refetch,
    };
}
