"use client";

import { Filter, Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { ClassificationUserOption } from "../types";

type ClassificationToolbarProps = {
	searchQuery: string;
	createdByFilter: string;
	userOptions: ClassificationUserOption[];
	isLoading: boolean;
	onSearchQueryChange: (value: string) => void;
	onCreatedByFilterChange: (value: string) => void;
	onRefresh: () => void;
	onCreate: () => void;
};

export function ClassificationToolbar({
	searchQuery,
	createdByFilter,
	userOptions,
	isLoading,
	onSearchQueryChange,
	onCreatedByFilterChange,
	onRefresh,
	onCreate,
}: ClassificationToolbarProps) {
	const createdByOptions = [{ value: "all", label: "All Created By" }, ...userOptions];

	return (
		<div className="space-y-3">
			<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
				<Button
					variant="outline"
					className="rounded-xl shadow-sm"
					onClick={onRefresh}
					disabled={isLoading}
				>
					<RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
					Refresh
				</Button>
				<Button className="rounded-xl shadow-sm" onClick={onCreate}>
					<Plus className="mr-2 h-4 w-4" />
					Create
				</Button>
			</div>

			<div className="grid grid-cols-1 gap-3 rounded-xl border bg-card/70 p-3 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
				<div className="relative">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={searchQuery}
						onChange={(event) => onSearchQueryChange(event.target.value)}
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
							onValueChange={onCreatedByFilterChange}
							placeholder="Created By"
							className="h-10 w-full rounded-xl border-border/60 bg-background shadow-sm"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
