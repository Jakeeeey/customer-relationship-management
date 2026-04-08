import {
	StoreTypeListResponse,
	UpdateStoreTypePayload,
	UpsertStoreTypePayload,
} from "../types";

export type StoreTypeFilters = {
	q?: string;
	createdBy?: string;
};

function toQueryString(filters: StoreTypeFilters): string {
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

export async function fetchStoreTypes(filters: StoreTypeFilters): Promise<StoreTypeListResponse> {
	const query = toQueryString(filters);
	const res = await fetch(`/api/crm/customer-management/store-type?${query}`, {
		method: "GET",
		cache: "no-store",
	});

	const json = (await res.json()) as StoreTypeListResponse;

	if (!res.ok || !json.ok) {
		throw new Error(json.message || "Failed to fetch store types.");
	}

	return json;
}

export async function createStoreType(payload: UpsertStoreTypePayload): Promise<void> {
	const res = await fetch("/api/crm/customer-management/store-type", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	const json = await res.json();
	if (!res.ok || !json.ok) {
		throw new Error(json.message || "Failed to create store type.");
	}
}

export async function updateStoreType(payload: UpdateStoreTypePayload): Promise<void> {
	const res = await fetch("/api/crm/customer-management/store-type", {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	const json = await res.json();
	if (!res.ok || !json.ok) {
		throw new Error(json.message || "Failed to update store type.");
	}
}
