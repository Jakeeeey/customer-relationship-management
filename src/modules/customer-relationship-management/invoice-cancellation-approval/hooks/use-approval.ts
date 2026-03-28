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
      if (!res.ok) throw new Error("Failed to fetch approval queue");

      const result = await res.json();
      setAllData(result.data || []);
    } catch (err) {
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
            const resData = await res.json();
            throw new Error(resData.message || "Action failed");
          }

          toast.success(`Requests successfully ${action === "APPROVE" ? "approved" : "rejected"}!`);
          await fetchRequests();
        } catch (err: any) {
          toast.error(err.message);
        } finally {
          setIsProcessing(false);
        }
      },
      [fetchRequests, isProcessing]
  );

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return {
    allRequests: allData,
    isLoading,
    isProcessing,
    refresh: fetchRequests,
    handleAction,
  };
}