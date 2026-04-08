"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
    StoreTypeItem,
    StoreTypeUserOption,
    UpdateStoreTypePayload,
    UpsertStoreTypePayload,
} from "../types";
import {
    createStoreType,
    fetchStoreTypes,
    updateStoreType,
} from "../providers/fetchProvider";

export function useStoreTypes() {
    const [items, setItems] = useState<StoreTypeItem[]>([]);
    const [userOptions, setUserOptions] = useState<StoreTypeUserOption[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [createdByFilter, setCreatedByFilter] = useState("all");
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetchStoreTypes({
                q: searchQuery,
                createdBy: createdByFilter,
            });
            setItems(res.data || []);
            setUserOptions(res.users || []);
        } catch (err) {
            const normalized = err instanceof Error ? err : new Error("Failed to load store type data.");
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

    const create = useCallback(async (payload: UpsertStoreTypePayload) => {
        const trimmedType = payload.store_type.trim();
        if (!trimmedType) {
            throw new Error("Type is required.");
        }

        try {
            setIsSubmitting(true);
            await createStoreType({ store_type: trimmedType });
            toast.success("Store type created");
            await loadData();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to create store type.";
            toast.error(message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    }, [loadData]);

    const update = useCallback(async (payload: UpdateStoreTypePayload) => {
        const trimmedType = payload.store_type.trim();
        if (!trimmedType) {
            throw new Error("Type is required.");
        }

        try {
            setIsSubmitting(true);
            await updateStoreType({
                id: payload.id,
                store_type: trimmedType,
            });
            toast.success("Store type updated");
            await loadData();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update store type.";
            toast.error(message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    }, [loadData]);

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
