import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
	addSupplierImage,
	fetchSupplierImages,
	fetchSuppliers,
	replaceSupplierImage,
	softDeleteSupplierImage,
	updateSupplierDescription,
} from "../providers/fetchProvider";
import { SupplierBackgroundImageItem, SupplierItem } from "../types";

export function useSupplierInformationData() {
	const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
	const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
	const [descriptionDraft, setDescriptionDraft] = useState("");
	const [images, setImages] = useState<SupplierBackgroundImageItem[]>([]);

	const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);
	const [isLoadingImages, setIsLoadingImages] = useState(false);
	const [isSavingDescription, setIsSavingDescription] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [isReplacingImageId, setIsReplacingImageId] = useState<number | null>(null);
	const [isDeletingImageId, setIsDeletingImageId] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	const selectedSupplier = useMemo(() => {
		if (!selectedSupplierId) return null;
		return suppliers.find((supplier) => supplier.id === selectedSupplierId) ?? null;
	}, [selectedSupplierId, suppliers]);

	const hasDescriptionChanged = (selectedSupplier?.description ?? "") !== descriptionDraft;

	const loadSuppliers = async () => {
		setIsLoadingSuppliers(true);
		setError(null);

		try {
			const rows = await fetchSuppliers();
			setSuppliers(rows);

			if (!rows.length) {
				setSelectedSupplierId(null);
				setDescriptionDraft("");
				setImages([]);
				return;
			}

			setSelectedSupplierId((prev) => {
				if (prev && rows.some((row) => row.id === prev)) {
					return prev;
				}

				return rows[0].id;
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load suppliers.");
		} finally {
			setIsLoadingSuppliers(false);
		}
	};

	const loadImages = async (supplierId: number) => {
		setIsLoadingImages(true);
		try {
			const rows = await fetchSupplierImages(supplierId);
			setImages(rows);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to load supplier images.");
			setImages([]);
		} finally {
			setIsLoadingImages(false);
		}
	};

	useEffect(() => {
		void loadSuppliers();
	}, []);

	useEffect(() => {
		if (!selectedSupplier) {
			setDescriptionDraft("");
			setImages([]);
			return;
		}

		setDescriptionDraft(selectedSupplier.description ?? "");
		void loadImages(selectedSupplier.id);
	}, [selectedSupplier]);

	const saveDescription = async () => {
		if (!selectedSupplier || !hasDescriptionChanged) return;

		setIsSavingDescription(true);
		try {
			await updateSupplierDescription(selectedSupplier.id, descriptionDraft);
			setSuppliers((prev) =>
				prev.map((supplier) =>
					supplier.id === selectedSupplier.id
						? { ...supplier, description: descriptionDraft }
						: supplier
				)
			);
			toast.success("Supplier description updated.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to update supplier description.");
		} finally {
			setIsSavingDescription(false);
		}
	};

	const addImage = async (file: File | null) => {
		if (!selectedSupplier || !file) return;

		setIsUploading(true);
		try {
			await addSupplierImage(selectedSupplier.id, file);
			await loadImages(selectedSupplier.id);
			toast.success("Uploaded 1 image.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to upload image.");
		} finally {
			setIsUploading(false);
		}
	};

	const replaceImage = async (imageId: number, file: File | null) => {
		if (!selectedSupplier || !file) return;

		setIsReplacingImageId(imageId);
		try {
			await replaceSupplierImage(imageId, selectedSupplier.id, file);
			await loadImages(selectedSupplier.id);
			toast.success("Supplier image updated.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to update supplier image.");
		} finally {
			setIsReplacingImageId(null);
		}
	};

	const deleteImage = async (imageId: number) => {
		if (!selectedSupplier) return;

		setIsDeletingImageId(imageId);
		try {
			await softDeleteSupplierImage(imageId);
			setImages((prev) => prev.filter((image) => image.id !== imageId));
			await loadImages(selectedSupplier.id);
			toast.success("Supplier image deleted.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to delete supplier image.");
		} finally {
			setIsDeletingImageId(null);
		}
	};

	return {
		suppliers,
		selectedSupplier,
		selectedSupplierId,
		setSelectedSupplierId,
		descriptionDraft,
		setDescriptionDraft,
		hasDescriptionChanged,
		images,
		error,
		isLoadingSuppliers,
		isLoadingImages,
		isSavingDescription,
		isUploading,
		isReplacingImageId,
		isDeletingImageId,
		loadSuppliers,
		saveDescription,
		addImage,
		replaceImage,
		deleteImage,
	};
}
