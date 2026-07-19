import { useState, useCallback } from "react";
import { EmployeeStockPurchase, EmployeeStockPurchaseAPIResponse } from "../types";
import { toast } from "sonner";

export function useEmployeeStockPurchase() {
    const [data, setData] = useState<EmployeeStockPurchase[]>([]);
    const [metadata, setMetadata] = useState<EmployeeStockPurchaseAPIResponse["metadata"] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPurchases = useCallback(async (page = 1, pageSize = 10, searchQuery = "") => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                q: searchQuery,
            });
            const res = await fetch(`/api/crm/employee-stock-purchase?${params.toString()}`);
            if (!res.ok) {
                throw new Error("Failed to fetch employee stock purchases");
            }
            const json: EmployeeStockPurchaseAPIResponse = await res.json();
            setData(json.purchases);
            setMetadata(json.metadata);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "An unknown error occurred";
            setError(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createPurchase = async (payload: Partial<EmployeeStockPurchase>) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/crm/employee-stock-purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || "Failed to create purchase");
            }
            toast.success("Employee stock purchase created successfully");
            await fetchPurchases(); // Refresh list
            return true;
        } catch (err) {
            const msg = err instanceof Error ? err.message : "An unknown error occurred";
            setError(msg);
            toast.error(msg);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        data,
        metadata,
        isLoading,
        error,
        fetchPurchases,
        createPurchase,
    };
}
