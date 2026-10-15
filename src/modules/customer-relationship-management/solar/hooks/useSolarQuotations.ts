"use client";

import { useState, useEffect, useCallback } from "react";
import { SolarQuotation } from "../types/solar.schema";
import { solarService, CreateQuotationPayload } from "../services/solar.service";
import { toast } from "sonner";

export function useSolarQuotations() {
  const [quotations, setQuotations] = useState<SolarQuotation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await solarService.getAll();
      setQuotations(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load quotations";
      setError(message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const saveQuotation = async (payload: CreateQuotationPayload): Promise<SolarQuotation | null> => {
    try {
      setIsSaving(true);
      const created = await solarService.create(payload);
      toast.success("Solar quotation saved successfully!", {
        description: `Quotation code: ${created.quotation_code}`,
      });
      await fetchQuotations();
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error saving quotation";
      toast.error("Failed to save quotation", { description: message });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteQuotation = async (id: string | number) => {
    try {
      await solarService.delete(id);
      toast.success("Quotation deleted");
      setQuotations((prev) => prev.filter((q) => String(q.id) !== String(id)));
    } catch {
      toast.error("Failed to delete quotation");
    }
  };

  return {
    quotations,
    isLoading,
    isSaving,
    error,
    refresh: fetchQuotations,
    saveQuotation,
    deleteQuotation,
  };
}
