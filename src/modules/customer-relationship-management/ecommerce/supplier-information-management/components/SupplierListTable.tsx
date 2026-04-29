import { Eye, MoreVertical, Pencil, ImagePlus, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";

import { SupplierItem } from "../types";

type SupplierListTableProps = {
	suppliers: SupplierItem[];
	isLoading: boolean;
	onViewSupplier: (supplier: SupplierItem) => void;
	onEditSupplier: (supplier: SupplierItem) => void;
	onAddImages: (supplier: SupplierItem) => void;
};

export default function SupplierListTable({
	suppliers,
	isLoading,
	onViewSupplier,
	onEditSupplier,
	onAddImages,
}: SupplierListTableProps) {
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;
	const totalPages = Math.ceil(suppliers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedSuppliers = suppliers.slice(startIndex, endIndex);

	return (
		<div className="space-y-4">
			<div className="overflow-hidden rounded-2xl border border-slate-300/90 bg-card shadow-[0_14px_34px_rgba(15,23,42,0.14)] dark:border-zinc-700/80 dark:bg-zinc-950/90 dark:shadow-[0_16px_36px_rgba(0,0,0,0.62)]">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-input dark:border-zinc-700">
							<TableHead className="w-16 font-semibold">NO.</TableHead>
							<TableHead className="w-32 font-semibold">CODE</TableHead>
							<TableHead className="font-semibold">NAME</TableHead>
							<TableHead className="font-semibold">DESCRIPTION</TableHead>
							<TableHead className="w-20 text-right font-semibold">ACTIONS</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow className="border-b border-input dark:border-zinc-700 hover:bg-muted/30">
								<TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
									<span className="inline-flex items-center gap-2">
										<Loader2 className="h-4 w-4 animate-spin" />
										Loading suppliers...
									</span>
								</TableCell>
							</TableRow>
						) : paginatedSuppliers.length ? (
							paginatedSuppliers.map((item, index) => (
								<TableRow key={item.id} className="border-b border-input dark:border-zinc-700 hover:bg-muted/50">
									<TableCell className="text-sm">{startIndex + index + 1}</TableCell>
									<TableCell className="font-medium text-sm">{item.supplier_shortcut}</TableCell>
									<TableCell className="text-sm">{item.supplier_name}</TableCell>
									<TableCell className="max-w-xs text-sm text-muted-foreground">
										<Tooltip>
											<TooltipTrigger asChild>
												<span className="block truncate">{item.description || "-"}</span>
											</TooltipTrigger>
											<TooltipContent side="top" className="max-w-md wrap-break-word">
												{item.description || "No description"}
											</TooltipContent>
										</Tooltip>
									</TableCell>
									<TableCell className="text-right">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
													<MoreVertical className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={() => onViewSupplier(item)}>
													<Eye className="mr-2 h-4 w-4" />
													View
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => onEditSupplier(item)}>
													<Pencil className="mr-2 h-4 w-4" />
													Edit
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => onAddImages(item)}>
													<ImagePlus className="mr-2 h-4 w-4" />
													Add Image
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow className="border-b border-input dark:border-zinc-700 hover:bg-muted/30">
								<TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
									No suppliers found.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{suppliers.length > 0 && (
				<div className="flex items-center justify-between px-1">
					<p className="text-sm text-muted-foreground">
						Page {currentPage} of {totalPages} ({suppliers.length} records)
					</p>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							disabled={currentPage === 1 || isLoading}
						>
							<ChevronLeft className="h-4 w-4" />
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							disabled={currentPage === totalPages || isLoading}
						>
							Next
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
