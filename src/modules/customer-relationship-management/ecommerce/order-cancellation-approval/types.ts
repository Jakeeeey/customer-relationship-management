export type CancellationRequestStatus = "Pending" | "Approved" | "Rejected";

export type CancellationReviewAction = "APPROVED" | "REJECTED";

export type OrderCancellationApprovalRow = {
	requestId: number;
	orderId: number;
	salesOrderNo: string;
	customerName: string;
	supplierName: string;
	orderDate: string | null;
	totalAmount: number;
	orderStatus: string;
	isCancelled: boolean;
	cancelledAt: string | null;
	requestStatus: CancellationRequestStatus;
	requestReason: string;
	requestRemarks: string;
	requestedByName: string;
	requestedAt: string | null;
};

export type OrderCancellationApprovalListMeta = {
	page: number;
	limit: number;
	total: number;
	hasMore: boolean;
};

export type OrderCancellationApprovalListResponse = {
	ok: boolean;
	data: OrderCancellationApprovalRow[];
	meta: OrderCancellationApprovalListMeta;
	message?: string;
};

export type FetchOrderCancellationApprovalParams = {
	search?: string;
	page?: number;
	limit?: number;
};

export type SubmitOrderCancellationReviewPayload = {
	requestId: number;
	orderId: number;
	action: CancellationReviewAction;
	remarks: string;
};

