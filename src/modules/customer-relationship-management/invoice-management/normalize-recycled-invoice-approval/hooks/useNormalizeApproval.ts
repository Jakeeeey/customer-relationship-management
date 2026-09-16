"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { NormalizeRequest } from "../types";

export function useNormalizeApproval() {
    const [requests, setRequests] = useState<NormalizeRequest[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchRequests = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/crm/invoice-management/normalize-recycled-invoice-approval");
            if (!res.ok) throw new Error("Failed to fetch requests");
            const json = await res.json();
            setRequests(json.data || []);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to load approval queue.";
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const executeAction = useCallback(async (id: number, action: "Approved" | "Rejected") => {
        if (isProcessing) return false;
        setIsProcessing(true);
        try {
            const res = await fetch("/api/crm/invoice-management/normalize-recycled-invoice-approval", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, action })
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({ error: "Action failed" }));
                throw new Error(errJson.error || "Action failed");
            }

            // Optimistic UI update
            setRequests(prev =>
                prev.map(r => r.id === id ? { ...r, status: action } : r)
            );

            const label = action === "Approved" ? "approved" : "rejected";
            toast.success(`Request successfully ${label}.`);
            return true;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            toast.error(message);
            return false;
        } finally {
            setIsProcessing(false);
        }
    }, [isProcessing]);

    const approveRequest = useCallback((id: number) => executeAction(id, "Approved"), [executeAction]);
    const rejectRequest = useCallback((id: number) => executeAction(id, "Rejected"), [executeAction]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    return {
        requests,
        isLoading,
        isProcessing,
        fetchRequests,
        approveRequest,
        rejectRequest
    };
}
