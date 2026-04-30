import { useState, useCallback } from "react";
import { siteSalesPostingProvider } from "../providers/fetchProvider";
import { SalesInvoiceHeader, SalesInvoiceDetail, LinkedDocument, Salesman, Customer, SalesType, WorklistFilters } from "../types";

interface UseSiteSalesPostingReturn {
    // State
    worklist: SalesInvoiceHeader[];
    isLoading: boolean;
    error: string | null;
    totalCount: number;
    salesmen: Salesman[];
    customers: Customer[];
    salesTypes: SalesType[];

    // Actions
    fetchWorklist: (params: WorklistFilters) => Promise<void>;
    fetchDetails: (invoiceId: number | string) => Promise<{ details: SalesInvoiceDetail[], linkedDocs: LinkedDocument[] }>;
    saveAdjustments: (invoiceId: number | string, payload: { 
        customer_code?: string | null; 
        invoice_date?: string | null;
        due_date?: string | null;
        remarks?: string | null;
        details: SalesInvoiceDetail[];
        deletedDetailIds: number[]; 
    }) => Promise<void>;
    finalizeSettlement: (invoiceIds: (number | string)[]) => Promise<void>;
    fetchUtilityData: () => Promise<void>;
}

export const useSiteSalesPosting = (): UseSiteSalesPostingReturn => {
    const [worklist, setWorklist] = useState<SalesInvoiceHeader[]>([]);
    const [salesmen, setSalesmen] = useState<Salesman[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [salesTypes, setSalesTypes] = useState<SalesType[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchWorklist = useCallback(async (params: WorklistFilters) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await siteSalesPostingProvider.getWorklist(params);
            setWorklist(data?.data || []);
            setTotalCount(data?.metadata?.totalCount || 0);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to fetch worklist";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchDetails = useCallback(async (invoiceId: number | string) => {
        try {
            const data = await siteSalesPostingProvider.getInvoiceDetails(invoiceId.toString());
            return {
                details: data?.details || [],
                linkedDocs: data?.linkedDocs || []
            };
        } catch (err: unknown) {
            console.error("Failed to fetch details:", err);
            throw err;
        }
    }, []);

    const saveAdjustments = useCallback(async (invoiceId: number | string, payload: { 
        customer_code?: string | null; 
        invoice_date?: string | null;
        due_date?: string | null;
        remarks?: string | null;
        details: SalesInvoiceDetail[];
        deletedDetailIds: number[]; 
    }) => {
        setIsLoading(true);
        try {
            await siteSalesPostingProvider.saveAdjustments(invoiceId, payload);
        } catch (err: unknown) {
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
        } catch (err: unknown) {
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

