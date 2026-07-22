"use client";

import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo } from "react";
import { SummaryMetrics } from "../types";
import { EmployeeStockPurchase } from "../../creation/types";

export interface SummaryFiltersState {
    date_from?: string;
    date_to?: string;
    company_id?: number;
    user_id?: number;
}

interface EmployeeStockPurchaseSummaryContextValue {
    metrics: SummaryMetrics | null;
    rawData: EmployeeStockPurchase[];
    isLoading: boolean;
    error: string | null;
    filters: SummaryFiltersState;
    setFilters: (filters: SummaryFiltersState) => void;
    refresh: () => void;
}

const EmployeeStockPurchaseSummaryContext = createContext<EmployeeStockPurchaseSummaryContextValue | undefined>(undefined);

export function EmployeeStockPurchaseSummaryProvider({ children }: { children: ReactNode }) {
    const [metrics, setMetrics] = useState<SummaryMetrics | null>(null);
    const [rawData, setRawData] = useState<EmployeeStockPurchase[]>([]);
    const [filters, setFilters] = useState<SummaryFiltersState>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (filters.date_from) params.append("date_from", filters.date_from);
            if (filters.date_to) params.append("date_to", filters.date_to);
            if (filters.company_id) params.append("company_id", filters.company_id.toString());
            if (filters.user_id) params.append("user_id", filters.user_id.toString());

            const res = await fetch(`/api/crm/employee-stock-purchase/summary?${params.toString()}`);
            if (!res.ok) {
                throw new Error("Failed to fetch summary metrics");
            }
            const data = await res.json();
            setMetrics(data.metrics);
            setRawData(data.rawData || []);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Unknown error");
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    const value = useMemo(() => ({
        metrics,
        rawData,
        isLoading,
        error,
        filters,
        setFilters,
        refresh: fetchSummary,
    }), [metrics, rawData, isLoading, error, filters, fetchSummary]);

    return (
        <EmployeeStockPurchaseSummaryContext.Provider value={value}>
            {children}
        </EmployeeStockPurchaseSummaryContext.Provider>
    );
}

export function useEmployeeStockPurchaseSummaryContext() {
    const context = useContext(EmployeeStockPurchaseSummaryContext);
    if (context === undefined) {
        throw new Error("useEmployeeStockPurchaseSummaryContext must be used within a EmployeeStockPurchaseSummaryProvider");
    }
    return context;
}
