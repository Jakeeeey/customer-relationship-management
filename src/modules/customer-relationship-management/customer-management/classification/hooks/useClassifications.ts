"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
    ClassificationItem,
    ClassificationUserOption,
    UpdateClassificationPayload,
    UpsertClassificationPayload,
} from "../types";
import {
    createClassification,
    fetchClassifications,
    updateClassification,
} from "../providers/fetchProvider";

function normalizeName(value: string): string {
    return value.trim().toLowerCase();
}

export function useClassifications() {
    const [items, setItems] = useState<ClassificationItem[]>([]);
    const [userOptions, setUserOptions] = useState<ClassificationUserOption[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [createdByFilter, setCreatedByFilter] = useState("all");
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetchClassifications({
                q: searchQuery,
                createdBy: createdByFilter,
            });
            setItems(res.data || []);
            setUserOptions(res.users || []);
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error("Failed to load classification data.");
            setError(normalized);
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, createdByFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadData();
        }, 250);

        return () => clearTimeout(timer);
    }, [loadData]);

    const create = useCallback(async (payload: UpsertClassificationPayload) => {
        const trimmedName = payload.classification_name.trim();
        if (!trimmedName) {
            throw new Error("Type is required.");
        }

        const duplicated = items.some(
            (item) => normalizeName(item.classification_name) === normalizeName(trimmedName)
        );
        if (duplicated) {
            const duplicateError = new Error("Classification type already exists.");
            toast.error(duplicateError.message);
            throw duplicateError;
        }

        try {
            setIsSubmitting(true);
            await createClassification({ classification_name: trimmedName });
            toast.success("Classification created");
            await loadData();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to create classification.";
            toast.error(message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    }, [items, loadData]);

    const update = useCallback(async (payload: UpdateClassificationPayload) => {
        const trimmedName = payload.classification_name.trim();
        if (!trimmedName) {
            throw new Error("Type is required.");
        }

        const duplicated = items.some(
            (item) => item.id !== payload.id && normalizeName(item.classification_name) === normalizeName(trimmedName)
        );
        if (duplicated) {
            const duplicateError = new Error("Classification type already exists.");
            toast.error(duplicateError.message);
            throw duplicateError;
        }

        try {
            setIsSubmitting(true);
            await updateClassification({
                id: payload.id,
                classification_name: trimmedName,
            });
            toast.success("Classification updated");
            await loadData();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update classification.";
            toast.error(message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    }, [items, loadData]);

    const canShowEmptyState = useMemo(() => !isLoading && items.length === 0, [isLoading, items.length]);

    return {
        items,
        userOptions,
        searchQuery,
        createdByFilter,
        isLoading,
        isSubmitting,
        error,
        canShowEmptyState,
        setSearchQuery,
        setCreatedByFilter,
        refetch: loadData,
        create,
        update,
    };
}
