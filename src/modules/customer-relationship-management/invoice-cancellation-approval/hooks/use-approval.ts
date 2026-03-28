"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { CancellationRequest, ApprovalParams } from "../../invoice-cancellation/types";

export function useApprovals() {
  const [allData, setAllData] = useState<CancellationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/crm/invoice-cancellation-approval", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        }
      });
      if (!res.ok) {
        toast.error("Failed to fetch approval queue");
        return;
      }

      const result = await res.json();
      setAllData(result.data || []);
    } catch {
      toast.error("Failed to load approval queue.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAction = useCallback(
      async (action: "APPROVE" | "REJECT", paramsArray: ApprovalParams[]) => {
        if (isProcessing) return;

        setIsProcessing(true);
        try {
          const res = await fetch("/api/crm/invoice-cancellation-approval", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ action, updates: paramsArray }),
          });

          if (!res.ok) {
            const resData = await res.json().catch(() => ({ message: "Action failed" }));
            toast.error(resData.message || "Action failed");
            return;
          }

          toast.success(`Requests successfully ${action === "APPROVE" ? "approved" : "rejected"}!`);
          await fetchRequests();
        } catch (err) {
          if (err instanceof Error) {
            toast.error(err.message);
          } else {
            toast.error("An unknown error occurred.");
          }
        } finally {
          setIsProcessing(false);
        }
      },
      [fetchRequests, isProcessing]
  );

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  return {
    allRequests: allData,
    isLoading,
    isProcessing,
    refresh: fetchRequests,
    handleAction,
  };
}
