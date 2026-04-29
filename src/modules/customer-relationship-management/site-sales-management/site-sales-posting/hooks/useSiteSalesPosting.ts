import { useState, useCallback } from "react";
import { siteSalesPostingProvider } from "../providers/fetchProvider";
import { SalesInvoiceHeader, SalesInvoiceDetail, LinkedDocument } from "../types";

interface UseSiteSalesPostingReturn {
    // State
    worklist: SalesInvoiceHeader[];
    isLoading: boolean;
    error: string | null;
    totalCount: number;
    salesmen: any[];
    customers: any[];
    salesTypes: any[];

    // Actions
    fetchWorklist: (params: any) => Promise<void>;
    fetchDetails: (invoiceId: number | string) => Promise<{ details: SalesInvoiceDetail[], linkedDocs: LinkedDocument[] }>;
    saveAdjustments: (invoiceId: number | string, payload: any) => Promise<void>;
    finalizeSettlement: (invoiceIds: (number | string)[]) => Promise<void>;
    fetchUtilityData: () => Promise<void>;
}

export const useSiteSalesPosting = (): UseSiteSalesPostingReturn => {
    const [worklist, setWorklist] = useState<SalesInvoiceHeader[]>([]);
    const [salesmen, setSalesmen] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [salesTypes, setSalesTypes] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchWorklist = useCallback(async (params: any) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await siteSalesPostingProvider.getWorklist(params);
            setWorklist(data?.data || []);
            setTotalCount(data?.metadata?.totalCount || 0);
        } catch (err: any) {
            setError(err.message || "Failed to fetch worklist");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchDetails = useCallback(async (invoiceId: number | string) => {
        try {
            const data = await siteSalesPostingProvider.getInvoiceDetails(invoiceId);
            return {
                details: data?.details || [],
                linkedDocs: data?.linkedDocs || []
            };
        } catch (err: any) {
            console.error("Failed to fetch details:", err);
            throw err;
        }
    }, []);

    const saveAdjustments = useCallback(async (invoiceId: number | string, payload: any) => {
        setIsLoading(true);
        try {
            await siteSalesPostingProvider.saveAdjustments(invoiceId, payload);
        } catch (err: any) {
            console.error("Failed to save adjustments:", err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const finalizeSettlement = useCallback(async (invoiceIds: (number | string)[]) => {
        setIsLoading(true);
        try {
            await siteSalesPostingProvider.finalizeSettlement(invoiceIds);
        } catch (err: any) {
            console.error("Failed to finalize settlement:", err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchUtilityData = useCallback(async () => {
        try {
            const [sm, cs, st] = await Promise.all([
                siteSalesPostingProvider.getSalesmen(),
                siteSalesPostingProvider.getCustomers(),
                siteSalesPostingProvider.getSalesTypes()
            ]);
            setSalesmen(sm);
            setCustomers(cs);
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
        error,
        totalCount,
        fetchWorklist,
        fetchDetails,
        saveAdjustments,
        finalizeSettlement,
        fetchUtilityData
    };
};

