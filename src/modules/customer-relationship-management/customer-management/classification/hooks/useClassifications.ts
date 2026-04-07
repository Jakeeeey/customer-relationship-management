"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	createClassification,
	fetchClassifications,
	updateClassification,
} from "../providers/fetchProvider";
import type {
	ClassificationDialogMode,
	ClassificationItem,
	ClassificationUserOption,
	UpdateClassificationPayload,
	UpsertClassificationPayload,
} from "../types";
import {
	hasDuplicateClassificationName,
	validateAndNormalizeClassificationName,
} from "../utils/businessRules";

export function useClassifications() {
	const [items, setItems] = useState<ClassificationItem[]>([]);
	const [userOptions, setUserOptions] = useState<ClassificationUserOption[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [createdByFilter, setCreatedByFilter] = useState("all");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);

	const [dialogOpen, setDialogOpen] = useState(false);
	const [dialogMode, setDialogMode] = useState<ClassificationDialogMode>("create");
	const [selectedItem, setSelectedItem] = useState<ClassificationItem | null>(null);

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
			const normalized =
				err instanceof Error ? err : new Error("Failed to load classification data.");
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

	useEffect(() => {
		setPage(1);
	}, [searchQuery, createdByFilter]);

	const totalPages = useMemo(
		() => Math.max(1, Math.ceil(items.length / pageSize)),
		[items.length, pageSize]
	);

	useEffect(() => {
		if (page > totalPages) {
			setPage(totalPages);
		}
	}, [page, totalPages]);

	const paginatedItems = useMemo(() => {
		const start = (page - 1) * pageSize;
		return items.slice(start, start + pageSize);
	}, [items, page, pageSize]);

	const openCreateDialog = useCallback(() => {
		setDialogMode("create");
		setSelectedItem(null);
		setDialogOpen(true);
	}, []);

	const openViewDialog = useCallback((item: ClassificationItem) => {
		setDialogMode("view");
		setSelectedItem(item);
		setDialogOpen(true);
	}, []);

	const openEditDialog = useCallback((item: ClassificationItem) => {
		setDialogMode("edit");
		setSelectedItem(item);
		setDialogOpen(true);
	}, []);

	const create = useCallback(
		async (payload: UpsertClassificationPayload) => {
			const classificationName = validateAndNormalizeClassificationName(
				payload.classification_name
			);

			if (hasDuplicateClassificationName(items, classificationName)) {
				const duplicateError = new Error("Type already exists.");
				toast.error(duplicateError.message);
				throw duplicateError;
			}

			try {
				setIsSubmitting(true);
				await createClassification({ classification_name: classificationName });
				toast.success("Classification created");
				await loadData();
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Failed to create classification.";
				toast.error(message);
				throw err;
			} finally {
				setIsSubmitting(false);
			}
		},
		[items, loadData]
	);

	const update = useCallback(
		async (payload: UpdateClassificationPayload) => {
			const classificationName = validateAndNormalizeClassificationName(
				payload.classification_name
			);

			if (hasDuplicateClassificationName(items, classificationName, payload.id)) {
				const duplicateError = new Error("Type already exists.");
				toast.error(duplicateError.message);
				throw duplicateError;
			}

			try {
				setIsSubmitting(true);
				await updateClassification({
					id: payload.id,
					classification_name: classificationName,
				});
				toast.success("Classification updated");
				await loadData();
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Failed to update classification.";
				toast.error(message);
				throw err;
			} finally {
				setIsSubmitting(false);
			}
		},
		[items, loadData]
	);

	const submitDialog = useCallback(
		async (classificationName: string) => {
			if (dialogMode === "create") {
				await create({ classification_name: classificationName });
				setDialogOpen(false);
				return;
			}

			if (dialogMode === "edit" && selectedItem) {
				await update({
					id: selectedItem.id,
					classification_name: classificationName,
				});
				setDialogOpen(false);
			}
		},
		[create, dialogMode, selectedItem, update]
	);

	return {
		items,
		paginatedItems,
		userOptions,
		searchQuery,
		createdByFilter,
		page,
		pageSize,
		totalPages,
		dialogOpen,
		dialogMode,
		selectedItem,
		isLoading,
		isSubmitting,
		error,
		setSearchQuery,
		setCreatedByFilter,
		setPage,
		setPageSize,
		setDialogOpen,
		openCreateDialog,
		openViewDialog,
		openEditDialog,
		submitDialog,
		refetch: loadData,
	};
}
