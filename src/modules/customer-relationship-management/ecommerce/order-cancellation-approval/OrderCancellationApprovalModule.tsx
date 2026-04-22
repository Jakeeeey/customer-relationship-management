"use client";

import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	OrderCancellationApprovalFilters,
	OrderCancellationApprovalModal,
	OrderCancellationApprovalStats,
	OrderCancellationApprovalTable,
} from "./components";
import { useOrderCancellationApproval } from "./hooks/useOrderCancellationApproval";

export default function OrderCancellationApprovalModule() {
	const {
		rows,
		searchKeyword,
		page,
		totalPages,
		isLoading,
		isSubmitting,
		error,
		selectedRow,
		reviewerRemarks,
		stats,
		setPage,
		onSearchChange,
		setReviewerRemarks,
		openReview,
		closeReview,
		refresh,
		approve,
		reject,
	} = useOrderCancellationApproval();

	return (
		<div className="flex-1 space-y-4 p-4 md:p-8 pt-6 animate-in fade-in duration-500">
			<div>
				<h2 className="text-3xl font-bold tracking-tight text-foreground">Sales Order Cancellation Approval</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Review all pending cancellation requests and decide whether to approve or reject.
				</p>
			</div>

			{error ? (
				<Alert variant="destructive" className="max-w-2xl">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Connection Error</AlertTitle>
					<AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<span className="text-sm">Failed to load cancellation queue: {error.message}</span>
						<Button variant="outline" size="sm" onClick={() => void refresh()}>
							Retry
						</Button>
					</AlertDescription>
				</Alert>
			) : null}

			<OrderCancellationApprovalStats
				queueCount={stats.queueCount}
				visibleCount={stats.visibleCount}
				visibleAmount={stats.visibleAmount}
			/>

			<OrderCancellationApprovalFilters
				searchKeyword={searchKeyword}
				isLoading={isLoading}
				onSearchChange={onSearchChange}
				onRefresh={() => void refresh()}
			/>

			<OrderCancellationApprovalTable rows={rows} isLoading={isLoading} onReview={openReview} />

			<div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-sm">
				<p className="text-muted-foreground">
					Page {page} of {totalPages}
				</p>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={page <= 1 || isLoading}
						onClick={() => setPage((prev) => Math.max(1, prev - 1))}
					>
						Previous
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={page >= totalPages || isLoading}
						onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
					>
						Next
					</Button>
				</div>
			</div>

			<OrderCancellationApprovalModal
				open={!!selectedRow}
				row={selectedRow}
				reviewerRemarks={reviewerRemarks}
				isSubmitting={isSubmitting}
				onOpenChange={(open) => {
					if (!open) closeReview();
				}}
				onRemarksChange={setReviewerRemarks}
				onApprove={() => void approve()}
				onReject={() => void reject()}
			/>
		</div>
	);
}

