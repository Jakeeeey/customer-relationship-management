"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw, Search, Info } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import EditSupplierInformationModal from "./components/EditSupplierInformationModal";
import SupplierListTable from "./components/SupplierListTable";
import ViewSupplierInformationModal from "./components/ViewSupplierInformationModal";
import AddBackgroundImagesModal from "./components/SupplierBackgroundImagesModal";
import {
	addSupplierImage,
	fetchSupplierImages,
	replaceSupplierImage,
	fetchSuppliers,
	updateSupplierDescription,
	softDeleteSupplierImage,
} from "./providers/fetchProvider";
import { SupplierBackgroundImageItem, SupplierItem } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export default function SupplierInformationManagementModule() {
	const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
	const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
	const [descriptionDraft, setDescriptionDraft] = useState("");
	const [images, setImages] = useState<SupplierBackgroundImageItem[]>([]);
	const [search, setSearch] = useState("");
	const [nameFilter, setNameFilter] = useState("all");
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isAddImagesModalOpen, setIsAddImagesModalOpen] = useState(false);

	const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);
	const [isLoadingImages, setIsLoadingImages] = useState(false);
	const [isSavingDescription, setIsSavingDescription] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [isReplacingImageId, setIsReplacingImageId] = useState<number | null>(null);
	const [isDeletingImageId, setIsDeletingImageId] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Get unique supplier names for filter
	const supplierNames = useMemo(() => {
		const names = [...new Set(suppliers.map((s) => s.supplier_name))].sort();
		return names;
	}, [suppliers]);

	const filteredSuppliers = useMemo(() => {
		let result = suppliers;

		// Filter by search query
		const q = search.trim().toLowerCase();
		if (q) {
			result = result.filter((item) => {
				return (
					item.supplier_shortcut.toLowerCase().includes(q) ||
					item.supplier_name.toLowerCase().includes(q) ||
					(item.description ?? "").toLowerCase().includes(q)
				);
			});
		}

		// Filter by name filter
		if (nameFilter !== "all") {
			result = result.filter((item) => item.supplier_name === nameFilter);
		}

		return result;
	}, [search, suppliers, nameFilter]);

	const selectedSupplier = useMemo(() => {
		if (!selectedSupplierId) return null;
		return suppliers.find((item) => item.id === selectedSupplierId) ?? null;
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

	const handleSaveDescription = async () => {
		if (!selectedSupplier || !hasDescriptionChanged) return;

		setIsSavingDescription(true);
		try {
			await updateSupplierDescription(selectedSupplier.id, descriptionDraft);

			setSuppliers((prev) =>
				prev.map((item) =>
					item.id === selectedSupplier.id ? { ...item, description: descriptionDraft } : item
				)
			);

			toast.success("Supplier description updated.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to update supplier description.");
		} finally {
			setIsSavingDescription(false);
		}
	};

	const handleAddImages = async (file: File | null) => {
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

	const handleReplaceImage = async (imageId: number, file: File | null) => {
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

	const handleDeleteImage = async (imageId: number) => {
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

	const handleOpenViewModal = (supplier: SupplierItem) => {
		setSelectedSupplierId(supplier.id);
		setIsViewModalOpen(true);
	};

	const handleOpenEditModal = (supplier: SupplierItem) => {
		setSelectedSupplierId(supplier.id);
		setIsEditModalOpen(true);
	};

	const handleOpenAddImagesModal = (supplier: SupplierItem) => {
		setSelectedSupplierId(supplier.id);
		setIsAddImagesModalOpen(true);
	};

	if (error) {
		return (
			<div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
				<Alert variant="destructive" className="max-w-2xl">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Connection Error</AlertTitle>
					<AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<span className="text-sm">{error}</span>
						<Button variant="outline" size="sm" onClick={() => void loadSuppliers()}>
							<RefreshCw className="mr-2 h-4 w-4" />
							Retry
						</Button>
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className="flex-1 space-y-6 py-6 md:py-8 animate-in fade-in duration-500">
			{/* Header with Title and Refresh */}
			<div className="flex items-start justify-between px-4 md:px-6">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<h1 className="text-3xl font-bold tracking-tight">
							Supplier Information Management
						</h1>
					</div>
					<p className="text-sm text-muted-foreground">
						Edit supplier descriptions and manage background images for active suppliers.
					</p>
				</div>

				<Button
					variant="outline"
					size="sm"
					onClick={() => void loadSuppliers()}
					disabled={isLoadingSuppliers}
					className="shrink-0"
				>
					<RefreshCw className={`mr-2 h-4 w-4 ${isLoadingSuppliers ? "animate-spin" : ""}`} />
					Refresh
				</Button>
			</div>

				{/* Search and Filters */}
				<div className="space-y-4 px-4 md:px-6">
					<div className="flex flex-col gap-3 sm:flex-row">
						<div className="relative w-full sm:w-80">
							<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search code..."
								className="pl-9 h-10 bg-background border border-input dark:border-slate-700"
							/>
						</div>

						<div className="w-full sm:min-w-56 sm:w-auto">
							<Select value={nameFilter} onValueChange={setNameFilter}>
								<SelectTrigger className="w-full h-10 bg-background border border-input dark:border-slate-700">
									<SelectValue />
								</SelectTrigger>
								<SelectContent position="popper" side="bottom" sideOffset={8}>
									<SelectItem value="all">All Suppliers</SelectItem>
									{supplierNames.map((name) => (
										<SelectItem key={name} value={name}>
											{name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

			{/* Table Container */}
			<div className="px-4 md:px-6">
				<SupplierListTable
					suppliers={filteredSuppliers}
					isLoading={isLoadingSuppliers}
					onViewSupplier={handleOpenViewModal}
					onEditSupplier={handleOpenEditModal}
					onAddImages={handleOpenAddImagesModal}
				/>
			</div>

			<ViewSupplierInformationModal
				apiBase={API_BASE}
				open={isViewModalOpen}
				onOpenChange={setIsViewModalOpen}
				supplier={selectedSupplier}
				images={images}
				isLoadingImages={isLoadingImages}
			/>

			<EditSupplierInformationModal
				open={isEditModalOpen}
				onOpenChange={setIsEditModalOpen}
				supplier={selectedSupplier}
				descriptionDraft={descriptionDraft}
				onDescriptionChange={setDescriptionDraft}
				hasDescriptionChanged={hasDescriptionChanged}
				onSaveDescription={() => void handleSaveDescription()}
				isSavingDescription={isSavingDescription}
			/>

			<AddBackgroundImagesModal
				apiBase={API_BASE}
				open={isAddImagesModalOpen}
				onOpenChange={setIsAddImagesModalOpen}
				supplier={selectedSupplier}
				images={images}
				isLoadingImages={isLoadingImages}
				isUploading={isUploading}
				onAddImages={(files) => void handleAddImages(files)}
				onReplaceImage={(imageId, file) => void handleReplaceImage(imageId, file)}
				isReplacingImageId={isReplacingImageId}
				onDeleteImage={(imageId) => void handleDeleteImage(imageId)}
				isDeletingImageId={isDeletingImageId}
			/>
		</div>
	);
}
