import type {
	FetchOrderCancellationApprovalParams,
	OrderCancellationApprovalListResponse,
	SubmitOrderCancellationReviewPayload,
} from "../types";

function buildQueryString(params: FetchOrderCancellationApprovalParams): string {
	const query = new URLSearchParams();

	if (params.search?.trim()) {
		query.set("search", params.search.trim());
	}

	query.set("page", String(params.page ?? 1));
	query.set("limit", String(params.limit ?? 10));
	query.set("t", String(Date.now()));

	return query.toString();
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
	try {
		const json = await response.json();
		if (typeof json?.message === "string" && json.message.trim()) {
			return json.message;
		}
		if (typeof json?.error === "string" && json.error.trim()) {
			return json.error;
		}
	} catch {
		// Ignore parse errors and use fallback
	}

	return fallback;
}

export async function fetchOrderCancellationApprovals(
	params: FetchOrderCancellationApprovalParams,
): Promise<OrderCancellationApprovalListResponse> {
	const query = buildQueryString(params);
	const response = await fetch(`/api/crm/ecommerce/order-cancellation-approval?${query}`, {
		method: "GET",
		cache: "no-store",
	});

	const json = (await response.json()) as OrderCancellationApprovalListResponse;

	if (!response.ok || !json.ok) {
		const message =
			json.message ||
			(await readErrorMessage(response, "Failed to fetch order cancellation approvals."));
		throw new Error(message);
	}

	return json;
}

export async function submitOrderCancellationReview(
	payload: SubmitOrderCancellationReviewPayload,
): Promise<void> {
	const response = await fetch("/api/crm/ecommerce/order-cancellation-approval", {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const message = await readErrorMessage(response, "Failed to submit cancellation review.");
		throw new Error(message);
	}
}

