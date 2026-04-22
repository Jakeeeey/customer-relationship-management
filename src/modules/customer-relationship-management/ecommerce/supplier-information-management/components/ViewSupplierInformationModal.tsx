import { ImagePlus, Loader2 } from "lucide-react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { SupplierBackgroundImageItem, SupplierItem } from "../types";

type ViewSupplierInformationModalProps = {
	apiBase: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	supplier: SupplierItem | null;
	images: SupplierBackgroundImageItem[];
	isLoadingImages: boolean;
};

export default function ViewSupplierInformationModal({
	apiBase,
	open,
	onOpenChange,
	supplier,
	images,
	isLoadingImages,
}: ViewSupplierInformationModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] max-w-3xl border border-border dark:border-slate-700">
				<DialogHeader>
					<DialogTitle>View Supplier Information</DialogTitle>
					<DialogDescription>
						Read-only supplier details and active background images.
					</DialogDescription>
				</DialogHeader>

				{!supplier ? (
					<p className="text-sm text-muted-foreground">Select a supplier from the table first.</p>
				) : (
					<div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">Code</Label>
							<p className="font-medium">{supplier.supplier_shortcut}</p>
						</div>

						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">Supplier Name</Label>
							<p className="font-medium">{supplier.supplier_name}</p>
						</div>

						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">Description</Label>
							<p className="whitespace-pre-wrap rounded-md border border-border bg-muted/20 px-3 py-2 text-sm dark:border-slate-700">
								{supplier.description || "-"}
							</p>
						</div>

						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<ImagePlus className="h-4 w-4 text-muted-foreground" />
								<p className="text-sm font-medium">Background Images</p>
							</div>

							{isLoadingImages ? (
								<p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
									<Loader2 className="h-4 w-4 animate-spin" />
									Loading images...
								</p>
							) : images.length ? (
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
									{images.map((image) => (
										<div
											key={image.id}
											className="space-y-2 rounded-lg border border-border p-2 dark:border-slate-700"
										>
											<div className="h-28 overflow-hidden rounded-md bg-muted/40">
												<img
													src={`${apiBase}/assets/${image.image_path}`}
													alt="Supplier background"
													className="h-full w-full object-cover"
												/>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-sm text-muted-foreground">No active images for this supplier.</p>
							)}
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
