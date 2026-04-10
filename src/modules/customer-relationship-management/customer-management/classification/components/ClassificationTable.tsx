"use client";

import {
	ChevronLeft,
	ChevronRight,
	MoreHorizontal,
	Shapes,
	User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { ClassificationItem } from "../types";

type ClassificationTableProps = {
	data: ClassificationItem[];
	isLoading: boolean;
	page: number;
	pageSize: number;
	totalPages: number;
	totalItems: number;
	onPageChange: (value: number) => void;
	onPageSizeChange: (value: number) => void;
	onView: (item: ClassificationItem) => void;
	onEdit: (item: ClassificationItem) => void;
};

function getInitials(name: string): string {
	const parts = name.split(" ").filter(Boolean);
	if (parts.length === 0) return "SY";
	return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "SY";
}

export function ClassificationTable({
	data,
	isLoading,
	page,
	pageSize,
	totalPages,
	totalItems,
	onPageChange,
	onPageSizeChange,
	onView,
	onEdit,
}: ClassificationTableProps) {
	const startEntry = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
	const endEntry = Math.min(page * pageSize, totalItems);

	return (
		<div className="overflow-hidden rounded-xl border bg-card shadow-sm">
			<div className="w-full overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/30 hover:bg-muted/30">
							<TableHead className="w-[90px] text-xs font-bold uppercase tracking-wider">No.</TableHead>
							<TableHead className="min-w-[220px] text-xs font-bold uppercase tracking-wider">Name</TableHead>
							<TableHead className="min-w-[200px] text-xs font-bold uppercase tracking-wider">Created By</TableHead>
							<TableHead className="w-[110px] text-right text-xs font-bold uppercase tracking-wider">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 6 }).map((_, index) => (
								<TableRow key={index}>
									<TableCell><Skeleton className="h-4 w-10" /></TableCell>
									<TableCell><Skeleton className="h-4 w-48" /></TableCell>
									<TableCell><Skeleton className="h-4 w-40" /></TableCell>
									<TableCell className="text-right"><Skeleton className="ml-auto h-8 w-8 rounded-md" /></TableCell>
								</TableRow>
							))
						) : totalItems === 0 ? (
							<TableRow>
								<TableCell colSpan={4} className="h-28 text-center text-sm text-muted-foreground">
									No classification records found.
								</TableCell>
							</TableRow>
						) : (
							data.map((item, index) => (
								<TableRow key={item.id} className="group transition-colors hover:bg-muted/20">
									<TableCell className="font-medium text-foreground/90">
										{(page - 1) * pageSize + index + 1}
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											<div className="rounded-md bg-primary/10 p-1.5 text-primary">
												<Shapes className="h-3.5 w-3.5" />
											</div>
											<div className="flex flex-col">
												<span className="font-semibold leading-none">{item.classification_name}</span>
												
											</div>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2.5">
											<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
												{getInitials(item.created_by_name || "System")}
											</div>
											<span className="flex items-center gap-1.5 text-sm">
												<User className="h-3.5 w-3.5 text-muted-foreground" />
												{item.created_by_name || "System"}
											</span>
										</div>
									</TableCell>
									<TableCell className="text-right">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 rounded-lg border border-transparent group-hover:border-border/50"
												>
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end" className="w-36">
												<DropdownMenuItem onClick={() => onView(item)}>View</DropdownMenuItem>
												<DropdownMenuItem onClick={() => onEdit(item)}>Edit</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<div className="flex flex-col gap-3 border-t bg-background/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="text-sm text-muted-foreground">
					Showing {startEntry}-{endEntry} of {totalItems}
				</div>

				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">Rows</span>
						<Select
							value={String(pageSize)}
							onValueChange={(value) => onPageSizeChange(Number(value))}
							disabled={isLoading}
						>
							<SelectTrigger className="h-8 w-[86px] rounded-lg">
								<SelectValue />
							</SelectTrigger>
							<SelectContent align="end">
								<SelectItem value="5">5</SelectItem>
								<SelectItem value="10">10</SelectItem>
								<SelectItem value="20">20</SelectItem>
								<SelectItem value="50">50</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="flex items-center justify-between gap-2 sm:justify-start">
						<span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
						<div className="flex items-center gap-1">
							<Button
								variant="outline"
								size="icon"
								className="h-8 w-8 rounded-lg"
								onClick={() => onPageChange(Math.max(1, page - 1))}
								disabled={isLoading || page === 1}
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								className="h-8 w-8 rounded-lg"
								onClick={() => onPageChange(Math.min(totalPages, page + 1))}
								disabled={isLoading || page === totalPages}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
