"use client";

import { AlertCircle, Shapes } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useClassifications } from "./hooks/useClassifications";
import { ClassificationFormDialog } from "./components/ClassificationFormDialog";
import { ClassificationTable } from "./components/ClassificationTable";
import { ClassificationToolbar } from "./components/ClassificationToolbar";

export default function ClassificationModule() {
	const {
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
		refetch,
	} = useClassifications();

	if (error) {
		return (
			<div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
				<Alert variant="destructive" className="max-w-2xl">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Connection Error</AlertTitle>
					<AlertDescription className="mt-2 text-sm">
						Failed to load classifications: {error.message}
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className="flex-1 space-y-4 p-4 pt-6 animate-in fade-in duration-500 md:p-8">
			<div className="flex items-center gap-2">
				<h2 className="text-3xl font-bold tracking-tight text-foreground">Classification</h2>
				<Shapes className="mt-0.5 h-5 w-5 text-primary" />
			</div>
			<p className="text-sm text-muted-foreground">
				Manage customer classification records and keep type data consistent.
			</p>

			<Separator className="opacity-60" />

			<ClassificationToolbar
				searchQuery={searchQuery}
				createdByFilter={createdByFilter}
				userOptions={userOptions}
				isLoading={isLoading}
				onSearchQueryChange={setSearchQuery}
				onCreatedByFilterChange={setCreatedByFilter}
				onRefresh={() => void refetch()}
				onCreate={openCreateDialog}
			/>

			<ClassificationTable
				data={paginatedItems}
				isLoading={isLoading}
				page={page}
				pageSize={pageSize}
				totalPages={totalPages}
				totalItems={items.length}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				onView={openViewDialog}
				onEdit={openEditDialog}
			/>

			<ClassificationFormDialog
				key={`${dialogMode}-${selectedItem?.id ?? "new"}-${dialogOpen ? "open" : "closed"}`}
				open={dialogOpen}
				mode={dialogMode}
				selectedItem={selectedItem}
				isSubmitting={isSubmitting}
				onOpenChange={setDialogOpen}
				onSubmit={submitDialog}
			/>
		</div>
	);
}
