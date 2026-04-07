"use client";

import { useMemo, useState } from "react";
import { Search, Plus, RefreshCw, Filter, AlertCircle, Shapes } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Separator } from "@/components/ui/separator";
import { useStoreTypes } from "./hooks/useStoreTypes";
import { StoreTypeTable } from "./components/StoreTypeTable";
import { StoreTypeFormDialog } from "./components/StoreTypeFormDialog";
import type { StoreTypeItem } from "./types";

type DialogMode = "create" | "edit" | "view";

export default function StoreTypeModule() {
	const {
		items,
		userOptions,
		searchQuery,
		createdByFilter,
		isLoading,
		isSubmitting,
		error,
		setSearchQuery,
		setCreatedByFilter,
		refetch,
		create,
		update,
	} = useStoreTypes();

	const [open, setOpen] = useState(false);
	const [dialogMode, setDialogMode] = useState<DialogMode>("create");
	const [selectedItem, setSelectedItem] = useState<StoreTypeItem | null>(null);

	const createdByOptions = useMemo(
		() => [{ value: "all", label: "All Created By" }, ...userOptions],
		[userOptions]
	);

	const openCreateDialog = () => {
		setDialogMode("create");
		setSelectedItem(null);
		setOpen(true);
	};

	const openViewDialog = (item: StoreTypeItem) => {
		setDialogMode("view");
		setSelectedItem(item);
		setOpen(true);
	};

	const openEditDialog = (item: StoreTypeItem) => {
		setDialogMode("edit");
		setSelectedItem(item);
		setOpen(true);
	};

	const handleSubmit = async (typeValue: string) => {
		if (dialogMode === "create") {
			await create({ store_type: typeValue });
			setOpen(false);
			return;
		}

		if (dialogMode === "edit" && selectedItem) {
			await update({ id: selectedItem.id, store_type: typeValue });
			setOpen(false);
		}
	};

	if (error) {
		return (
			<div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
				<Alert variant="destructive" className="max-w-2xl">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Connection Error</AlertTitle>
					<AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<span className="text-sm">Failed to load store types: {error.message}</span>
						<Button variant="outline" size="sm" onClick={() => void refetch()}>
							<RefreshCw className="mr-2 h-4 w-4" />
							Retry
						</Button>
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className="flex-1 space-y-4 p-4 md:p-8 pt-6 animate-in fade-in duration-500">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2">
						<h2 className="text-3xl font-bold tracking-tight text-foreground">Store Type</h2>
						<Shapes className="mt-0.5 h-5 w-5 text-primary" />
					</div>
					<p className="mt-1 text-sm text-muted-foreground">
						Manage store type records and maintain classification consistency.
					</p>
				</div>

				<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
					<Button variant="outline" className="rounded-xl shadow-sm" onClick={() => void refetch()} disabled={isLoading}>
						<RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
						Refresh
					</Button>
					<Button className="rounded-xl shadow-sm" onClick={openCreateDialog}>
						<Plus className="mr-2 h-4 w-4" />
						Create
					</Button>
				</div>
			</div>

			<Separator className="opacity-60" />

			<div className="grid grid-cols-1 gap-3 rounded-xl border bg-card/70 p-3 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
				<div className="relative">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search type or created by..."
						className="h-10 rounded-xl border-border/60 bg-background pl-9 shadow-sm"
					/>
				</div>

				<div className="flex min-w-0 items-center gap-2">
					<div className="hidden rounded-lg border border-border/50 bg-background p-2 text-sm text-muted-foreground lg:block">
						<Filter className="h-4 w-4" />
					</div>
					<div className="min-w-0 flex-1">
						<SearchableSelect
							options={createdByOptions}
							value={createdByFilter}
							onValueChange={setCreatedByFilter}
							placeholder="Created By"
							className="h-10 w-full rounded-xl border-border/60 bg-background shadow-sm"
						/>
					</div>
				</div>
			</div>

			<StoreTypeTable
				data={items}
				isLoading={isLoading}
				onView={openViewDialog}
				onEdit={openEditDialog}
			/>

			<StoreTypeFormDialog
				key={`${dialogMode}-${selectedItem?.id ?? "new"}-${open ? "open" : "closed"}`}
				open={open}
				mode={dialogMode}
				selectedItem={selectedItem}
				isSubmitting={isSubmitting}
				onOpenChange={setOpen}
				onSubmit={handleSubmit}
			/>
		</div>
	);
}
