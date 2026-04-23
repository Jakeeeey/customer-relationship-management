import { ImagePlus, Loader2, Trash2 } from "lucide-react";

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
	onAddImages: (file: File | null) => void;
	onReplaceImage: (imageId: number, file: File | null) => void;
	isReplacingImageId: number | null;
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
	onAddImages,
	onReplaceImage,
	isReplacingImageId,
	onDeleteImage,
	isDeletingImageId,
}: AddBackgroundImagesModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] max-w-3xl border border-slate-300 bg-white/95 shadow-[0_18px_40px_rgba(15,23,42,0.18)] dark:border-slate-500 dark:bg-slate-900/95 dark:shadow-[0_22px_46px_rgba(0,0,0,0.62)]">
				<DialogHeader>
					<DialogTitle>Add Background Images</DialogTitle>
					<DialogDescription>
						{supplier ? `Manage images for ${supplier.supplier_name}` : "Select a supplier first"}
					</DialogDescription>
				</DialogHeader>

				{!supplier ? (
					<p className="text-sm text-muted-foreground">Select a supplier from the table first.</p>
				) : (
					<div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
						<div className="space-y-2">
							<Label htmlFor="background-images">Choose Image File</Label>
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

						<Separator />

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
											<div className="h-28 overflow-hidden rounded-md bg-muted/40">
												<img
													src={`${apiBase}/assets/${image.image_path}`}
													alt="Supplier background"
													className="h-full w-full object-cover"
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
