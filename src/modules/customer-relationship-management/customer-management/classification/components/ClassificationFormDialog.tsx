"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ClassificationDialogMode, ClassificationItem } from "../types";

type ClassificationFormDialogProps = {
	open: boolean;
	mode: ClassificationDialogMode;
	selectedItem: ClassificationItem | null;
	isSubmitting: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (classificationName: string) => Promise<void>;
};

export function ClassificationFormDialog({
	open,
	mode,
	selectedItem,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: ClassificationFormDialogProps) {
	const initialName = selectedItem?.classification_name ?? "";
	const [classificationName, setClassificationName] = useState(initialName);
	const dialogKey = `${mode}-${selectedItem?.id ?? "new"}-${open ? "open" : "closed"}`;

	const isView = mode === "view";
	const modeLabel = mode === "create" ? "New" : mode === "edit" ? "Editing" : "Read-only";
	const title =
		mode === "create"
			? "Create Classification"
			: mode === "edit"
			? "Edit Classification"
			: "View Classification";

	const description =
		mode === "create"
			? "Add a new classification type."
			: mode === "edit"
			? "Update the selected classification type."
			: "Review the selected classification details.";

	const handleSubmit = async () => {
		try {
			await onSubmit(classificationName);
		} catch {
			// Error toast is already handled by the hook/provider flow.
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				key={dialogKey}
				className="overflow-hidden border-0 p-0 shadow-2xl sm:max-w-[560px]"
			>
				<DialogHeader className="relative border-b bg-gradient-to-r from-sky-500/10 via-cyan-500/10 to-emerald-500/10 px-6 py-5">
					<div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sky-500 via-cyan-500 to-emerald-500" />
					<div className="space-y-2 pl-2">
						<span className="inline-flex rounded-full border border-sky-300/40 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
							{modeLabel}
						</span>
						<DialogTitle className="text-xl font-semibold tracking-tight">{title}</DialogTitle>
						<DialogDescription className="max-w-[46ch] text-sm leading-relaxed">
							{description}
						</DialogDescription>
					</div>
				</DialogHeader>

				<div className="space-y-5 px-6 py-6">
					<div className="rounded-xl border bg-card p-4 shadow-sm">
						<div className="mb-3 flex items-center justify-between">
							<label className="text-sm font-semibold leading-none">Type</label>
							<span className="text-xs text-muted-foreground">{classificationName.trim().length}/50</span>
						</div>
						<Input
							value={classificationName}
							onChange={(event) => setClassificationName(event.target.value)}
							placeholder="Enter classification type"
							disabled={isView || isSubmitting}
							maxLength={50}
							className="h-11"
						/>
						<p className="mt-2 text-xs text-muted-foreground">
							This type is used for customer grouping and reports.
						</p>
					</div>

					{mode !== "create" && selectedItem?.created_by_name ? (
						<div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
							Created by: <span className="font-medium text-foreground/90">{selectedItem.created_by_name}</span>
						</div>
					) : null}
				</div>

				<DialogFooter className="border-t bg-muted/30 px-6 py-4">
					
					{!isView ? (
						<Button
							onClick={() => void handleSubmit()}
							disabled={isSubmitting || !classificationName.trim()}
							className="min-w-32 bg-gradient-to-r from-sky-600 to-cyan-600 text-white hover:from-sky-700 hover:to-cyan-700"
						>
							{isSubmitting ? "Saving..." : mode === "create" ? "Create" : "Save Changes"}
						</Button>
					) : null}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
