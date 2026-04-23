"use client";

import { AlertCircle, RefreshCw, Search } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import EditSupplierInformationModal from "./components/EditSupplierInformationModal";
import NameFilterCombobox from "./components/NameFilterCombobox";
import SupplierListTable from "./components/SupplierListTable";
import ViewSupplierInformationModal from "./components/ViewSupplierInformationModal";
import AddBackgroundImagesModal from "./components/SupplierBackgroundImagesModal";
import { useSupplierFilters } from "./hooks/useSupplierFilters";
import { useSupplierInformationData } from "./hooks/useSupplierInformationData";
import { useSupplierModals } from "./hooks/useSupplierModals";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export default function SupplierInformationManagementModule() {
	const {
		suppliers,
		selectedSupplier,
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
		isUploadingSupplierImage,
		isRemovingSupplierImage,
		isDeletingImageId,
		loadSuppliers,
		saveDescription,
		addImage,
		addSupplierImageFile,
		removeSupplierImageFile,
		deleteImage,
	} = useSupplierInformationData();

	const { search, setSearch, nameFilter, setNameFilter, supplierNames, filteredSuppliers } =
		useSupplierFilters({ suppliers });

	const {
		isViewModalOpen,
		setIsViewModalOpen,
		isEditModalOpen,
		setIsEditModalOpen,
		isAddImagesModalOpen,
		setIsAddImagesModalOpen,
		openViewModal,
		openEditModal,
		openAddImagesModal,
	} = useSupplierModals({ onSupplierSelect: setSelectedSupplierId });

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
			<div className="px-4 md:px-6">
				<Card className="rounded-3xl border border-slate-300/90 bg-card/95 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.14)] dark:border-slate-600/80 dark:bg-slate-950/75 dark:shadow-[0_16px_36px_rgba(0,0,0,0.62)]">
					<CardContent className="px-4 sm:px-6">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
							<div className="relative w-full sm:max-w-md">
								<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Search code..."
									className="h-10 border border-slate-300 bg-white/95 pl-9 shadow-sm focus-visible:ring-slate-400/40 dark:border-slate-500 dark:bg-slate-900/95 dark:text-slate-100 dark:placeholder:text-slate-400"
								/>
							</div>

							<div className="w-full sm:w-65">
								<NameFilterCombobox
									value={nameFilter}
									onValueChange={setNameFilter}
									names={supplierNames}
								/>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Table Container */}
			<div className="px-4 md:px-6">
				<SupplierListTable
					suppliers={filteredSuppliers}
					isLoading={isLoadingSuppliers}
					onViewSupplier={openViewModal}
					onEditSupplier={openEditModal}
					onAddImages={openAddImagesModal}
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
				onSaveDescription={() => void saveDescription()}
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
				isUploadingSupplierImage={isUploadingSupplierImage}
				isRemovingSupplierImage={isRemovingSupplierImage}
				onAddImages={(files) => void addImage(files)}
				onAddSupplierImage={(file) => void addSupplierImageFile(file)}
				onRemoveSupplierImage={() => void removeSupplierImageFile()}
				onDeleteImage={(imageId) => void deleteImage(imageId)}
				isDeletingImageId={isDeletingImageId}
			/>
		</div>
	);
}
