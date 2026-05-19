import { useState, useCallback } from "react";
import { toast } from "sonner";
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
import { PdfTemplate, pdfTemplateService } from "@/components/pdf-layout-design/services/pdf-template";

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
    companyData: Record<string, unknown> | null;
    templates: PdfTemplate[];

    // Actions
    fetchWorklist: (params: WorklistFilters) => Promise<void>;
    fetchStats: (params: WorklistFilters) => Promise<void>;
    fetchDetails: (invoiceId: number | string) => Promise<{ details: SalesInvoiceDetail[], linkedDocs: LinkedDocument[] }>;
    fetchUtilityData: () => Promise<void>;
    fetchAllForExport: (params: WorklistFilters) => Promise<SalesInvoiceHeader[]>;
}

export const useSiteSalesSummary = (): UseSiteSalesSummaryReturn => {
    const [worklist, setWorklist] = useState<SalesInvoiceHeader[]>([]);
    const [salesmen, setSalesmen] = useState<Salesman[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [salesTypes, setSalesTypes] = useState<SalesType[]>([]);
    const [companyData, setCompanyData] = useState<Record<string, unknown> | null>(null);
    const [templates, setTemplates] = useState<PdfTemplate[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [stats, setStats] = useState<SiteSalesSummaryStats>({ totalGross: 0, totalReturns: 0, totalCredits: 0, totalDebits: 0, totalBalance: 0 });
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

    const fetchAllForExport = useCallback(async (params: WorklistFilters) => {
        setIsLoading(true);
        try {
            // Using a very high limit to get all filtered records
            const response = await siteSalesSummaryProvider.getWorklist({ ...params, limit: 10000, page: 1 });
            return response?.data || [];
        } catch (err) {
            console.error("Failed to fetch all data for export:", err);
            return [];
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

            // Fetch company data for PDF headers
            const compRes = await fetch("/api/pdf/company");
            if (compRes.ok) {
                const result = await compRes.json();
                const company = result.data?.[0] || (Array.isArray(result.data) ? null : result.data);
                setCompanyData(company);
            }

            // Fetch PDF templates
            const tpls = await pdfTemplateService.fetchTemplates();
            setTemplates(tpls);
            if (tpls.length === 0) {
                console.warn("No PDF templates found or API error.");
            }
        } catch (err) {
            console.error("Utility fetch error:", err);
            toast.error("Failed to load some report assets. Please check your connection.");
        }
    }, []);

    return {
        worklist,
        salesmen,
        customers,
        salesTypes,
        companyData,
        templates,
        isLoading,
        isStatsLoading,
        error,
        totalCount,
        stats,
        fetchWorklist,
        fetchStats,
        fetchDetails,
        fetchUtilityData,
        fetchAllForExport,
    };
};
