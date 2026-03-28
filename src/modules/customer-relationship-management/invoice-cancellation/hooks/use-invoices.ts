"use client";

import { useState, useCallback, useEffect } from "react";
import { SalesInvoice } from "../types";
import { toast } from "sonner";

export function useInvoices() {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    try {
      setIsLoading(true);

      // Grab token safely, fallback to empty string if null to prevent "Bearer null"
      const rawToken = localStorage.getItem("token");
      const token = rawToken ? `Bearer ${rawToken}` : "";

      const res = await fetch("/api/crm/invoice-cancellation", {
        headers: {
          "Authorization": token,
        }
      });

      // 🚀 THE FIX: If it fails, extract the REAL error message from the BFF
      if (!res.ok) {
        let errorMessage = `HTTP Error ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // Fallback if the response isn't JSON (e.g., a hard 404 or 500 page)
          errorMessage = await res.text();
        }
        // Replaced throw with direct error handling to fix "throw of exception caught locally" warning
        console.error("Fetch error detailed:", new Error(errorMessage));
        toast.error(`Failed to load: ${errorMessage}`);
        return;
      }

      const data = await res.json();
      setInvoices(data);
    } catch (err) {
      console.error("Fetch error detailed:", err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to load: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInvoices();
  }, [fetchInvoices]);

  return {
    invoices,
    isLoading,
    refresh: fetchInvoices,
  };
}
