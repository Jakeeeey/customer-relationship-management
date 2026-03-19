"use client";

import { useState, useCallback, useEffect } from "react";
import { SalesInvoice } from "../types";

export function useInvoices() {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/crm/invoice-cancellation");
      if (!res.ok) throw new Error("Failed to fetch");

      const result = await res.json();
      const data = Array.isArray(result) ? result : result.data || [];
      setInvoices(data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return {
    invoices,
    isLoading,
    refresh: fetchInvoices,
  };
}
