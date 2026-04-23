import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import { SupplierItem } from "../types";

type EditSupplierInformationModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	supplier: SupplierItem | null;
	descriptionDraft: string;
	onDescriptionChange: (value: string) => void;
	hasDescriptionChanged: boolean;
	onSaveDescription: () => void;
	isSavingDescription: boolean;
};

export default function EditSupplierInformationModal({
	open,
	onOpenChange,
	supplier,
	descriptionDraft,
	onDescriptionChange,
	hasDescriptionChanged,
	onSaveDescription,
	isSavingDescription,
}: EditSupplierInformationModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] max-w-3xl overflow-x-hidden border border-slate-300 bg-white/95 shadow-[0_18px_40px_rgba(15,23,42,0.18)] dark:border-slate-500 dark:bg-slate-900/95 dark:shadow-[0_22px_46px_rgba(0,0,0,0.62)]">
				<DialogHeader>
					<DialogTitle>Edit Supplier Description</DialogTitle>
					<DialogDescription>Update supplier details and description.</DialogDescription>
				</DialogHeader>

				{!supplier ? (
					<p className="text-sm text-muted-foreground">Select a supplier from the table first.</p>
				) : (
					<div className="space-y-4">
						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">Code</Label>
							<p className="font-medium">{supplier.supplier_shortcut}</p>
						</div>

						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">Supplier Name</Label>
							<p className="font-medium">{supplier.supplier_name}</p>
						</div>

						<Separator />

						<div className="space-y-2 rounded-md border border-slate-300 bg-white/90 p-3 shadow-sm dark:border-slate-500 dark:bg-slate-900/90">
							<Label htmlFor="supplier-description">Description (editable field)</Label>
							<Textarea
								id="supplier-description"
								value={descriptionDraft}
								onChange={(e) => onDescriptionChange(e.target.value)}
								rows={6}
								placeholder="Enter supplier description"
								className="field-sizing-fixed max-w-full resize-y wrap-anywhere border-slate-300 bg-white/95 dark:border-slate-500 dark:bg-slate-900/95"
							/>
						</div>

						<Button
							type="button"
							onClick={onSaveDescription}
							disabled={!hasDescriptionChanged || isSavingDescription}
						>
							{isSavingDescription ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Save className="mr-2 h-4 w-4" />
									Save Description
								</>
							)}
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
