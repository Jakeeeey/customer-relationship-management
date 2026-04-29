import { ImagePlus, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

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
	const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
	const [previewImageAlt, setPreviewImageAlt] = useState("Image preview");

	const toAssetUrl = (value?: string | null) => {
		const normalized = String(value ?? "").trim();
		if (!normalized) return "";
		if (/^https?:\/\//i.test(normalized)) return normalized;
		if (normalized.startsWith("/assets/")) return `${apiBase}${normalized}`;
		return `${apiBase}/assets/${normalized}`;
	};

	const openImagePreview = (url: string, alt: string) => {
		setPreviewImageUrl(url);
		setPreviewImageAlt(alt);
	};

	const supplierImageUrl = toAssetUrl(supplier?.supplier_image);

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="w-[95vw] max-w-3xl overflow-x-hidden border border-slate-300 bg-white/95 shadow-[0_18px_40px_rgba(15,23,42,0.18)] dark:border-zinc-700 dark:bg-zinc-950/95 dark:shadow-[0_22px_46px_rgba(0,0,0,0.62)]">
				<DialogHeader>
					<DialogTitle>View Supplier Information</DialogTitle>
					<DialogDescription>
						Read-only supplier details and active images.
					</DialogDescription>
				</DialogHeader>

				{!supplier ? (
					<p className="text-sm text-muted-foreground">Select a supplier from the table first.</p>
				) : (
					<div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
						<div className="space-y-2 ">
							<div className="flex items-center gap-2">
								<ImagePlus className="h-4 w-4 text-muted-foreground" />
								<p className="text-sm font-medium">Supplier Images</p>
							</div>
							{supplierImageUrl ? (
								<button
									type="button"
									onClick={() => openImagePreview(supplierImageUrl, "Supplier")}
									className="mx-auto block"
								>
									<div className="relative h-32 w-32 overflow-hidden rounded-full border border-slate-300 bg-muted/40 shadow-sm dark:border-zinc-700">
										<Image
											src={supplierImageUrl}
											alt="Supplier"
											fill
											unoptimized
											sizes="128px"
											className="object-cover"
										/>
									</div>
								</button>
							) : (
								<p className="text-sm font-medium">-</p>
							)}
						</div>

						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">Code</Label>
							<p className="font-medium">{supplier.supplier_shortcut}</p>
						</div>

						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">Supplier Name</Label>
							<p className="font-medium">{supplier.supplier_name}</p>
						</div>

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div className="space-y-1">
								<Label className="text-xs text-muted-foreground">Supplier Type</Label>
								<p className="text-sm font-medium">{supplier.supplier_type || "-"}</p>
							</div>

							<div className="space-y-1">
								<Label className="text-xs text-muted-foreground">Contact Person</Label>
								<p className="text-sm font-medium">{supplier.contact_person || "-"}</p>
							</div>

							<div className="space-y-1">
								<Label className="text-xs text-muted-foreground">Email</Label>
								<p className="text-sm font-medium wrap-anywhere">{supplier.email_address || "-"}</p>
							</div>

							<div className="space-y-1">
								<Label className="text-xs text-muted-foreground">Phone Number</Label>
								<p className="text-sm font-medium">{supplier.phone_number || "-"}</p>
							</div>
						</div>

						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">Address</Label>
							<p className="max-w-full whitespace-pre-wrap wrap-anywhere rounded-md border border-slate-300 bg-white/85 px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900/85">
								{supplier.address || "-"}
							</p>
						</div>

						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">Description</Label>
							<p className="max-w-full whitespace-pre-wrap wrap-anywhere rounded-md border border-slate-300 bg-white/85 px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900/85">
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
											className="space-y-2 rounded-lg border border-slate-300 bg-white/90 p-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90"
										>
											<button
												type="button"
												onClick={() => openImagePreview(`${apiBase}/assets/${image.image_path}`, "Supplier background")}
												className="block w-full"
											>
												<div className="relative h-28 overflow-hidden rounded-md bg-muted/40">
													<Image
														src={`${apiBase}/assets/${image.image_path}`}
														alt="Supplier background"
														fill
														unoptimized
														sizes="(max-width: 640px) 100vw, 50vw"
														className="object-cover"
													/>
												</div>
											</button>
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

			<Dialog open={Boolean(previewImageUrl)} onOpenChange={(next) => !next && setPreviewImageUrl(null)}>
				<DialogContent className="w-[95vw] max-w-4xl border border-slate-300 bg-white/95 dark:border-zinc-700 dark:bg-zinc-950/95">
					<DialogHeader>
						<DialogTitle>Image Preview</DialogTitle>
						<DialogDescription>Full-size preview</DialogDescription>
					</DialogHeader>
					{previewImageUrl && (
						<div className="relative aspect-4/3 w-full overflow-hidden rounded-lg bg-muted/40">
							<Image
								src={previewImageUrl}
								alt={previewImageAlt}
								fill
								unoptimized
								sizes="95vw"
								className="object-contain"
							/>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
