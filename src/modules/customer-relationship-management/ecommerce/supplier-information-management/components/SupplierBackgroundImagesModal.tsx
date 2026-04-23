import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";

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
import { Slider } from "@/components/ui/slider";

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
	const PREVIEW_SIZE = 224;
	const EXPORT_SIZE = 600;

	const [pendingSupplierFile, setPendingSupplierFile] = useState<File | null>(null);
	const [pendingSupplierImageUrl, setPendingSupplierImageUrl] = useState<string | null>(null);
	const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
	const [previewImageAlt, setPreviewImageAlt] = useState("Image preview");
	const [pendingScale, setPendingScale] = useState(1);
	const [pendingOffset, setPendingOffset] = useState({ x: 0, y: 0 });
	const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
	const [dragState, setDragState] = useState<{
		active: boolean;
		startX: number;
		startY: number;
		originX: number;
		originY: number;
	}>({
		active: false,
		startX: 0,
		startY: 0,
		originX: 0,
		originY: 0,
	});
	const previewRef = useRef<HTMLDivElement | null>(null);

	const toAssetUrl = (value?: string | null) => {
		const normalized = String(value ?? "").trim();
		if (!normalized) return "";
		if (/^https?:\/\//i.test(normalized)) return normalized;
		if (normalized.startsWith("/assets/")) return `${apiBase}${normalized}`;
		return `${apiBase}/assets/${normalized}`;
	};

	const supplierImageUrl = toAssetUrl(supplier?.supplier_image);

	const openImagePreview = (url: string, alt: string) => {
		setPreviewImageUrl(url);
		setPreviewImageAlt(alt);
	};

	const getMetricsAtScale = (scale: number) => {
		const width = imageNaturalSize.width || PREVIEW_SIZE;
		const height = imageNaturalSize.height || PREVIEW_SIZE;
		const baseScale = Math.min(PREVIEW_SIZE / width, PREVIEW_SIZE / height);
		const finalScale = baseScale * scale;
		const displayWidth = width * finalScale;
		const displayHeight = height * finalScale;
		const maxX = Math.max(0, (displayWidth - PREVIEW_SIZE) / 2);
		const maxY = Math.max(0, (displayHeight - PREVIEW_SIZE) / 2);

		return {
			baseScale,
			finalScale,
			displayWidth,
			displayHeight,
			maxX,
			maxY,
		};
	};

	const coverScaleMultiplier = useMemo(() => {
		const width = imageNaturalSize.width || PREVIEW_SIZE;
		const height = imageNaturalSize.height || PREVIEW_SIZE;
		const containScale = Math.min(PREVIEW_SIZE / width, PREVIEW_SIZE / height);
		const coverScale = Math.max(PREVIEW_SIZE / width, PREVIEW_SIZE / height);
		return coverScale / containScale;
	}, [PREVIEW_SIZE, imageNaturalSize.height, imageNaturalSize.width]);

	const renderedSupplierImageMetrics = getMetricsAtScale(pendingScale);

	const hasPlacementAdjusted =
		pendingScale > 1.001 || Math.abs(pendingOffset.x) > 0.5 || Math.abs(pendingOffset.y) > 0.5;

	const clampOffset = (nextX: number, nextY: number) => {
		return {
			x: Math.min(renderedSupplierImageMetrics.maxX, Math.max(-renderedSupplierImageMetrics.maxX, nextX)),
			y: Math.min(renderedSupplierImageMetrics.maxY, Math.max(-renderedSupplierImageMetrics.maxY, nextY)),
		};
	};

	const resetPendingSupplierEditor = () => {
		if (pendingSupplierImageUrl) {
			URL.revokeObjectURL(pendingSupplierImageUrl);
		}
		setPendingSupplierFile(null);
		setPendingSupplierImageUrl(null);
		setPendingScale(1);
		setPendingOffset({ x: 0, y: 0 });
		setImageNaturalSize({ width: 0, height: 0 });
		setDragState((prev) => ({ ...prev, active: false }));
	};

	const handlePendingSupplierImageSelect = (file: File | null) => {
		if (!file) return;
		if (pendingSupplierImageUrl) {
			URL.revokeObjectURL(pendingSupplierImageUrl);
		}

		const objectUrl = URL.createObjectURL(file);
		setPendingSupplierFile(file);
		setPendingSupplierImageUrl(objectUrl);
		setPendingScale(1);
		setPendingOffset({ x: 0, y: 0 });
		setImageNaturalSize({ width: 0, height: 0 });
	};

	const handleScaleChange = (value: number[]) => {
		const nextScale = value[0] ?? 1;
		const metrics = getMetricsAtScale(nextScale);
		setPendingScale(nextScale);
		setPendingOffset((prev) => {
			return {
				x: Math.min(metrics.maxX, Math.max(-metrics.maxX, prev.x)),
				y: Math.min(metrics.maxY, Math.max(-metrics.maxY, prev.y)),
			};
		});
	};

	const startDrag = (clientX: number, clientY: number) => {
		if (!pendingSupplierImageUrl) return;

		const dragScale = Math.max(pendingScale, coverScaleMultiplier);
		const metrics = getMetricsAtScale(dragScale);
		const clampedOrigin = {
			x: Math.min(metrics.maxX, Math.max(-metrics.maxX, pendingOffset.x)),
			y: Math.min(metrics.maxY, Math.max(-metrics.maxY, pendingOffset.y)),
		};

		if (dragScale !== pendingScale) {
			setPendingScale(dragScale);
		}
		if (clampedOrigin.x !== pendingOffset.x || clampedOrigin.y !== pendingOffset.y) {
			setPendingOffset(clampedOrigin);
		}

		setDragState({
			active: true,
			startX: clientX,
			startY: clientY,
			originX: clampedOrigin.x,
			originY: clampedOrigin.y,
		});
	};

	const moveDrag = (clientX: number, clientY: number) => {
		if (!dragState.active) return;
		const nextX = dragState.originX + (clientX - dragState.startX);
		const nextY = dragState.originY + (clientY - dragState.startY);
		setPendingOffset(clampOffset(nextX, nextY));
	};

	const endDrag = () => {
		setDragState((prev) => ({ ...prev, active: false }));
	};

	const generateAdjustedSupplierImageFile = async () => {
		if (!pendingSupplierImageUrl) return null;

		const image = await new Promise<HTMLImageElement>((resolve, reject) => {
			const imageElement = new window.Image();
			imageElement.onload = () => resolve(imageElement);
			imageElement.onerror = () => reject(new Error("Failed to process supplier image."));
			imageElement.src = pendingSupplierImageUrl;
		});

		const canvas = document.createElement("canvas");
		canvas.width = EXPORT_SIZE;
		canvas.height = EXPORT_SIZE;
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			throw new Error("Canvas is not available.");
		}

		const left = (PREVIEW_SIZE - renderedSupplierImageMetrics.displayWidth) / 2 + pendingOffset.x;
		const top = (PREVIEW_SIZE - renderedSupplierImageMetrics.displayHeight) / 2 + pendingOffset.y;
		const sourceX = (0 - left) / renderedSupplierImageMetrics.finalScale;
		const sourceY = (0 - top) / renderedSupplierImageMetrics.finalScale;
		const sourceWidth = PREVIEW_SIZE / renderedSupplierImageMetrics.finalScale;
		const sourceHeight = PREVIEW_SIZE / renderedSupplierImageMetrics.finalScale;

		ctx.drawImage(
			image,
			sourceX,
			sourceY,
			sourceWidth,
			sourceHeight,
			0,
			0,
			EXPORT_SIZE,
			EXPORT_SIZE
		);

		const blob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob(resolve, "image/jpeg", 0.92);
		});

		if (!blob) return null;
		const baseName = pendingSupplierFile?.name?.replace(/\.[^/.]+$/, "") || "supplier-image";
		return new File([blob], `${baseName}-adjusted.jpg`, { type: "image/jpeg" });
	};

	const saveAdjustedSupplierImage = async () => {
		if (!hasPlacementAdjusted && pendingSupplierFile) {
			onAddSupplierImage(pendingSupplierFile);
			resetPendingSupplierEditor();
			return;
		}

		const adjustedFile = await generateAdjustedSupplierImageFile();
		if (!adjustedFile) return;
		onAddSupplierImage(adjustedFile);
		resetPendingSupplierEditor();
	};

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="w-[95vw] max-w-3xl border border-slate-300 bg-white/95 shadow-[0_18px_40px_rgba(15,23,42,0.18)] dark:border-zinc-700 dark:bg-zinc-950/95 dark:shadow-[0_22px_46px_rgba(0,0,0,0.62)]">
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
								className="border-slate-300 bg-white/95 text-transparent file:text-foreground dark:border-zinc-700 dark:bg-zinc-900"
								disabled={isUploadingSupplierImage || isRemovingSupplierImage}
								onChange={(e) => {
									handlePendingSupplierImageSelect(e.target.files?.[0] ?? null);
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
							{pendingSupplierImageUrl ? (
								<div className="space-y-3 rounded-lg border border-dashed border-slate-300/90 bg-white/80 p-3 dark:border-zinc-700/80 dark:bg-zinc-900/60">
									<div className="flex justify-center">
										<div
											ref={previewRef}
											className="relative h-56 w-56 cursor-grab touch-none select-none overflow-hidden rounded-full border-2 border-primary/70 bg-muted/30 active:cursor-grabbing"
											onPointerDown={(event) => {
												event.currentTarget.setPointerCapture(event.pointerId);
												startDrag(event.clientX, event.clientY);
											}}
											onPointerMove={(event) => moveDrag(event.clientX, event.clientY)}
											onPointerUp={(event) => {
												event.currentTarget.releasePointerCapture(event.pointerId);
												endDrag();
											}}
											onPointerCancel={endDrag}
										>
											<Image
												src={pendingSupplierImageUrl}
												alt="Supplier image adjustment preview"
												fill
												unoptimized
												draggable={false}
												sizes="224px"
												onLoad={(event) => {
													const target = event.target as HTMLImageElement;
													setImageNaturalSize({
														width: target.naturalWidth,
														height: target.naturalHeight,
													});
													setPendingScale(1);
													setPendingOffset({ x: 0, y: 0 });
												}}
												className="pointer-events-none object-contain"
												style={{
													transform: `translate(${pendingOffset.x}px, ${pendingOffset.y}px) scale(${pendingScale})`,
													transformOrigin: "center",
												}}
											/>
										</div>
									</div>

									<div className="space-y-1">
										<Label className="text-xs text-muted-foreground">Zoom</Label>
										<Slider
											value={[pendingScale]}
											onValueChange={handleScaleChange}
											min={1}
											max={4}
											step={0.01}
											className="w-full"
										/>
									</div>

									<p className="text-xs text-muted-foreground">
										Drag the image to position it inside the circle, then save.
									</p>

									<div className="flex items-center justify-end gap-2">
										<Button
											type="button"
											variant="outline"
											onClick={resetPendingSupplierEditor}
											disabled={isUploadingSupplierImage}
										>
											Cancel
										</Button>
										<Button
											type="button"
											onClick={() => void saveAdjustedSupplierImage()}
											disabled={isUploadingSupplierImage}
										>
											{isUploadingSupplierImage ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Saving...
												</>
											) : (
												"Save Adjusted Supplier Image"
											)}
										</Button>
									</div>
								</div>
							) : supplierImageUrl ? (
								<div className="mx-auto w-full max-w-sm">
									<div className="space-y-2 rounded-lg border border-slate-300 bg-white/90 p-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90">
										<button
											type="button"
											onClick={() => openImagePreview(supplierImageUrl, "Supplier")}
											className="mx-auto block"
										>
											<div className="relative h-32 w-32 overflow-hidden rounded-full border border-slate-300 bg-muted/40 dark:border-zinc-700">
												<Image
													src={supplierImageUrl}
													alt="Supplier"
													fill
													unoptimized
													sizes="128px"
													className="object-cover object-center"
												/>
											</div>
										</button>
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
								<div className="mx-auto w-full max-w-sm rounded-lg border border-dashed border-slate-300/90 bg-white/60 p-4 text-center text-sm text-muted-foreground dark:border-zinc-700/80 dark:bg-zinc-900/60">
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
								className="border-slate-300 bg-white/95 text-transparent file:text-foreground dark:border-zinc-700 dark:bg-zinc-900"
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
