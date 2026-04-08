import type {
	ClassificationFilters,
	ClassificationItem,
	ClassificationListResponse,
	UpdateClassificationPayload,
	UpsertClassificationPayload,
} from "../types";

function toQueryString(filters: ClassificationFilters): string {
	const params = new URLSearchParams();

	if (filters.q?.trim()) {
		params.set("q", filters.q.trim());
	}

	if (filters.createdBy?.trim()) {
		params.set("createdBy", filters.createdBy.trim());
	}

	params.set("t", Date.now().toString());
	return params.toString();
}

function extractErrorMessage(json: unknown, fallback: string): string {
	if (typeof json === "object" && json !== null && "message" in json) {
		const message = (json as { message?: unknown }).message;
		if (typeof message === "string" && message.trim()) {
			return message;
		}
	}

	return fallback;
}

export async function fetchClassifications(
	filters: ClassificationFilters
): Promise<ClassificationListResponse> {
	const query = toQueryString(filters);
	const response = await fetch(`/api/crm/customer-management/classification?${query}`, {
		method: "GET",
		cache: "no-store",
	});

	const json = (await response.json()) as ClassificationListResponse;

	if (!response.ok || !json.ok) {
		throw new Error(json.message || "Failed to fetch classifications.");
	}

	return json;
}

export async function getClassificationById(id: number): Promise<ClassificationItem | null> {
	const list = await fetchClassifications({});
	return list.data.find((item) => item.id === id) ?? null;
}

export async function createClassification(payload: UpsertClassificationPayload): Promise<void> {
	const response = await fetch("/api/crm/customer-management/classification", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	const json = (await response.json()) as unknown;
	if (!response.ok || !(typeof json === "object" && json !== null && "ok" in json && (json as { ok: boolean }).ok)) {
		throw new Error(extractErrorMessage(json, "Failed to create classification."));
	}
}

export async function updateClassification(payload: UpdateClassificationPayload): Promise<void> {
	const response = await fetch("/api/crm/customer-management/classification", {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	const json = (await response.json()) as unknown;
	if (!response.ok || !(typeof json === "object" && json !== null && "ok" in json && (json as { ok: boolean }).ok)) {
		throw new Error(extractErrorMessage(json, "Failed to update classification."));
	}
}
