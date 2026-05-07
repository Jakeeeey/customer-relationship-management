import { useState, useCallback } from "react";
import { siteSalesSummaryProvider } from "../providers/fetchProvider";
import { 
    SalesInvoiceHeader, 
    SalesInvoiceDetail, 
    LinkedDocument, 
    Salesman, 
    Customer, 
    SalesType, 
    WorklistFilters,
    SiteSalesSummaryStats
} from "../types";

interface UseSiteSalesSummaryReturn {
    // State
    worklist: SalesInvoiceHeader[];
    isLoading: boolean;
    isStatsLoading: boolean;
    error: string | null;
    totalCount: number;
    stats: SiteSalesSummaryStats;
    salesmen: Salesman[];
    customers: Customer[];
    salesTypes: SalesType[];

    // Actions
    fetchWorklist: (params: WorklistFilters) => Promise<void>;
    fetchStats: (params: WorklistFilters) => Promise<void>;
    fetchDetails: (invoiceId: number | string) => Promise<{ details: SalesInvoiceDetail[], linkedDocs: LinkedDocument[] }>;
    fetchUtilityData: () => Promise<void>;
}

export const useSiteSalesSummary = (): UseSiteSalesSummaryReturn => {
    const [worklist, setWorklist] = useState<SalesInvoiceHeader[]>([]);
    const [salesmen, setSalesmen] = useState<Salesman[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [salesTypes, setSalesTypes] = useState<SalesType[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [stats, setStats] = useState<SiteSalesSummaryStats>({ totalGross: 0, totalReturns: 0, totalMemos: 0 });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isStatsLoading, setIsStatsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchWorklist = useCallback(async (params: WorklistFilters) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await siteSalesSummaryProvider.getWorklist(params);
            setWorklist(data?.data || []);
            setTotalCount(data?.metadata?.totalCount || 0);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to fetch worklist";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchStats = useCallback(async (params: WorklistFilters) => {
        setIsStatsLoading(true);
        try {
            const data = await siteSalesSummaryProvider.getSummaryStats(params);
            setStats(data);
        } catch (err) {
            console.error("Failed to fetch stats:", err);
        } finally {
            setIsStatsLoading(false);
        }
    }, []);

    const fetchDetails = useCallback(async (invoiceId: number | string) => {
        setIsLoading(true);
        try {
            const data = await siteSalesSummaryProvider.getInvoiceDetails(invoiceId.toString());
            return {
                details: data?.details || [],
                linkedDocs: data?.linkedDocs || []
            };
        } catch (err: unknown) {
            console.error("Failed to fetch details:", err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchUtilityData = useCallback(async () => {
        try {
            // Sequential fetches to reduce concurrent server pressure
            const sm = await siteSalesSummaryProvider.getSalesmen();
            setSalesmen(sm);

            const cs = await siteSalesSummaryProvider.getCustomers();
            setCustomers(cs);

            const st = await siteSalesSummaryProvider.getSalesTypes();
            setSalesTypes(st);
        } catch (err) {
            console.error("Utility fetch error:", err);
        }
    }, []);

    return {
        worklist,
        salesmen,
        customers,
        salesTypes,
        isLoading,
        isStatsLoading,
        error,
        totalCount,
        stats,
        fetchWorklist,
        fetchStats,
        fetchDetails,
        fetchUtilityData,
    };
};
