import { useState, useCallback } from "react";
import { siteSalesPostingProvider } from "../providers/fetchProvider";
import {
    SalesInvoiceHeader,
    SalesInvoiceDetail,
    LinkedDocument,
    Salesman,
    MasterUser,
    Customer,
    SalesType,
    WorklistFilters,
    Supplier,
    InvoiceType,
    PriceType,
    Branch,
    PaymentTerm,
    SearchProduct,
    CustomerSalesmanLink
} from "../types";

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
    fetchModalData: () => Promise<{
        suppliers: Supplier[],
        invoiceTypes: InvoiceType[],
        priceTypes: PriceType[],
        branches: Branch[],
        payment_terms: PaymentTerm[],
        masterUsers: MasterUser[]
    }>;
    getCustomerSalesman: (customerId: number) => Promise<CustomerSalesmanLink | null>;
    getSalesmanByCustomer: (customerId: number) => Promise<MasterUser[]>;
    getAccounts: (userId: number | string) => Promise<Salesman[]>;
    searchProducts: (params: {
        search: string,
        priceTypeId: number,
        priceType?: string | null,
        supplierId?: number | null,
        branchId?: number | string | null,
        customerCode?: string | null
    }) => Promise<SearchProduct[]>;
    createInvoice: (payload: Record<string, unknown>) => Promise<{ success: boolean; invoiceId: number }>;
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
            // Sequential fetches to reduce concurrent server pressure
            const sm = await siteSalesPostingProvider.getSalesmen();
            setSalesmen(sm);

            const cs = await siteSalesPostingProvider.getCustomers();
            setCustomers(cs);

            const st = await siteSalesPostingProvider.getSalesTypes();
            setSalesTypes(st);
        } catch (err) {
            console.error("Utility fetch error:", err);
        }
    }, []);

    const fetchModalData = useCallback(async () => {
        try {
            const [suppliers, utilities, mu] = await Promise.all([
                siteSalesPostingProvider.getSuppliers(),
                siteSalesPostingProvider.getUtilityInfo(),
                siteSalesPostingProvider.getMasterUsers()
            ]);
            return {
                suppliers,
                invoiceTypes: utilities.invoice_types,
                priceTypes: utilities.price_types,
                branches: utilities.branches,
                payment_terms: utilities.payment_terms,
                masterUsers: mu
            };
        } catch (err) {
            console.error("Modal data fetch error:", err);
            throw err;
        }
    }, []);

    const getCustomerSalesman = useCallback(async (customerId: number) => {
        try {
            return await siteSalesPostingProvider.getCustomerSalesman(customerId);
        } catch (err) {
            console.error("Customer salesman fetch error:", err);
            throw err;
        }
    }, []);

    const getSalesmanByCustomer = useCallback(async (customerId: number) => {
        try {
            return await siteSalesPostingProvider.getSalesmanByCustomer(customerId);
        } catch (err) {
            console.error("Salesman by customer fetch error:", err);
            throw err;
        }
    }, []);

    const getAccounts = useCallback(async (userId: number | string) => {
        try {
            return await siteSalesPostingProvider.getAccounts(userId);
        } catch (err) {
            console.error("Accounts fetch error:", err);
            throw err;
        }
    }, []);

    const searchProducts = useCallback(async (params: {
        search: string,
        priceTypeId: number,
        priceType?: string | null,
        supplierId?: number | null,
        branchId?: number | string | null,
        customerCode?: string | null
    }) => {
        try {
            return await siteSalesPostingProvider.searchProducts(params);
        } catch (err) {
            console.error("Product search error:", err);
            throw err;
        }
    }, []);

    const createInvoice = useCallback(async (payload: Record<string, unknown>) => {
        try {
            return await siteSalesPostingProvider.createInvoice(payload);
        } catch (err) {
            console.error("Create invoice error:", err);
            throw err;
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
        fetchUtilityData,
        fetchModalData,
        getCustomerSalesman,
        getSalesmanByCustomer,
        getAccounts,
        searchProducts,
        createInvoice
    };
};
