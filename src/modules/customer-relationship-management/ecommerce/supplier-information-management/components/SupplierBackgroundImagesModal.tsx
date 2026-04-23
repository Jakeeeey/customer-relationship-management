import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { SupplierBackgroundImageItem, SupplierItem } from "../types";

type AddBackgroundImagesModalProps = {
	apiBase: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	supplier: SupplierItem | null;
	images: SupplierBackgroundImageItem[];
	isLoadingImages: boolean;
	isUploading: boolean;
	isUploadingSupplierImage: boolean;
	isRemovingSupplierImage: boolean;
	onAddImages: (file: File | null) => void;
	onAddSupplierImage: (file: File | null) => void;
	onRemoveSupplierImage: () => void;
	onDeleteImage: (imageId: number) => void;
	isDeletingImageId: number | null;
};

export default function AddBackgroundImagesModal({
	apiBase,
	open,
	onOpenChange,
	supplier,
	images,
	isLoadingImages,
	isUploading,
	isUploadingSupplierImage,
	isRemovingSupplierImage,
	onAddImages,
	onAddSupplierImage,
	onRemoveSupplierImage,
	onDeleteImage,
	isDeletingImageId,
}: AddBackgroundImagesModalProps) {
	const toAssetUrl = (value?: string | null) => {
		const normalized = String(value ?? "").trim();
		if (!normalized) return "";
		if (/^https?:\/\//i.test(normalized)) return normalized;
		if (normalized.startsWith("/assets/")) return `${apiBase}${normalized}`;
		return `${apiBase}/assets/${normalized}`;
	};

	const supplierImageUrl = toAssetUrl(supplier?.supplier_image);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] max-w-3xl border border-slate-300 bg-white/95 shadow-[0_18px_40px_rgba(15,23,42,0.18)] dark:border-slate-500 dark:bg-slate-900/95 dark:shadow-[0_22px_46px_rgba(0,0,0,0.62)]">
				<DialogHeader>
					<DialogTitle>Add Images</DialogTitle>
					<DialogDescription>
						{supplier ? `Manage images for ${supplier.supplier_name}` : "Select a supplier first"}
					</DialogDescription>
				</DialogHeader>

				{!supplier ? (
					<p className="text-sm text-muted-foreground">Select a supplier from the table first.</p>
				) : (
					<div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
						<div className="space-y-2">
							<Label htmlFor="supplier-image" className="text-xs text-muted-foreground">
								Choose Supplier Image File
							</Label>
							<Input
								id="supplier-image"
								type="file"
								accept="image/*"
								className="border-slate-300 bg-white/95 text-transparent file:text-foreground dark:border-slate-500 dark:bg-slate-900/95"
								disabled={isUploadingSupplierImage || isRemovingSupplierImage}
								onChange={(e) => {
									onAddSupplierImage(e.target.files?.[0] ?? null);
									e.currentTarget.value = "";
								}}
							/>
							<div className="flex items-center gap-2">
								<ImagePlus className="h-4 w-4 text-muted-foreground" />
								<p className="text-sm font-medium">Supplier Image</p>
							</div>
							{isUploadingSupplierImage && (
								<p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
									<Loader2 className="h-4 w-4 animate-spin" />
									Uploading supplier image...
								</p>
							)}
							{supplierImageUrl ? (
								<div className="mx-auto w-full max-w-sm">
									<div className="space-y-2 rounded-lg border border-slate-300 bg-white/90 p-2 shadow-sm dark:border-slate-500 dark:bg-slate-900/90">
										<div className="relative h-28 overflow-hidden rounded-md bg-muted/40">
											<Image
												src={supplierImageUrl}
												alt="Supplier"
												fill
												unoptimized
												sizes="(max-width: 640px) 100vw, 384px"
												className="object-cover object-center"
											/>
										</div>
										<Button
											type="button"
											variant="destructive"
											className="w-full"
											disabled={isRemovingSupplierImage}
											onClick={onRemoveSupplierImage}
										>
											{isRemovingSupplierImage ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Removing...
												</>
											) : (
												<>
													<Trash2 className="mr-2 h-4 w-4" />
													Delete Supplier Image
												</>
											)}
										</Button>
									</div>
								</div>
							) : (
								<div className="mx-auto w-full max-w-sm rounded-lg border border-dashed border-slate-300/90 bg-white/60 p-4 text-center text-sm text-muted-foreground dark:border-slate-500/80 dark:bg-slate-900/50">
									No supplier image uploaded.
									</div>
							)}
						</div>

						<Separator />

						<div className="space-y-2">
							<Label htmlFor="background-images" className="text-xs text-muted-foreground">
								Choose Background Image File
							</Label>
							<Input
								id="background-images"
								type="file"
								accept="image/*"
								className="border-slate-300 bg-white/95 text-transparent file:text-foreground dark:border-slate-500 dark:bg-slate-900/95"
								disabled={isUploading}
								onChange={(e) => {
									onAddImages(e.target.files?.[0] ?? null);
									e.currentTarget.value = "";
								}}
							/>
							{isUploading && (
								<p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
									<Loader2 className="h-4 w-4 animate-spin" />
									Uploading image...
								</p>
							)}
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
											className="space-y-2 rounded-lg border border-slate-300 bg-white/90 p-2 shadow-sm dark:border-slate-500 dark:bg-slate-900/90"
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
											<Button
												type="button"
												variant="destructive"
												className="w-full"
												disabled={isDeletingImageId === image.id}
												onClick={() => onDeleteImage(image.id)}
											>
												{isDeletingImageId === image.id ? (
													<>
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
														Deleting...
													</>
												) : (
													<>
														<Trash2 className="mr-2 h-4 w-4" />
														Delete Image
													</>
												)}
											</Button>
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
