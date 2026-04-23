import {
	GenericApiResponse,
	SupplierBackgroundImageItem,
	SupplierImagesResponse,
	SupplierItem,
	SupplierListResponse,
} from "../types";

const API_BASE_URL = "/api/crm/ecommerce/supplier-information-management";

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
	const json = (await res.json()) as GenericApiResponse<T>;
	if (!res.ok || !json.ok) {
		throw new Error(json.message || "Request failed.");
	}
	return (json.data ?? null) as T;
}

export async function fetchSuppliers(): Promise<SupplierItem[]> {
	const res = await fetch(API_BASE_URL, { cache: "no-store" });
	const data = await parseJsonOrThrow<SupplierListResponse["data"]>(res);
	return Array.isArray(data) ? data : [];
}

export async function fetchSupplierImages(supplierId: number): Promise<SupplierBackgroundImageItem[]> {
	const res = await fetch(`${API_BASE_URL}?supplierId=${supplierId}`, { cache: "no-store" });
	const data = await parseJsonOrThrow<SupplierImagesResponse["data"]>(res);
	return Array.isArray(data) ? data : [];
}

export async function fetchAllSupplierImages(
	supplierId: number
): Promise<SupplierBackgroundImageItem[]> {
	const res = await fetch(`${API_BASE_URL}?supplierId=${supplierId}&includeInactive=true`, {
		cache: "no-store",
	});
	const data = await parseJsonOrThrow<SupplierImagesResponse["data"]>(res);
	return Array.isArray(data) ? data : [];
}

export async function updateSupplierDescription(
	supplierId: number,
	description: string
): Promise<void> {
	const res = await fetch(API_BASE_URL, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ action: "update-description", supplierId, description }),
	});

	await parseJsonOrThrow<unknown>(res);
}

export async function uploadSupplierImage(supplierId: number, file: File): Promise<void> {
	const formData = new FormData();
	formData.append("action", "update-supplier-image");
	formData.append("supplierId", String(supplierId));
	formData.append("file", file);

	const res = await fetch(API_BASE_URL, {
		method: "POST",
		body: formData,
	});

	await parseJsonOrThrow<unknown>(res);
}

export async function clearSupplierImage(supplierId: number): Promise<void> {
	const res = await fetch(API_BASE_URL, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ action: "update-supplier-image", supplierId, supplierImage: "" }),
	});

	await parseJsonOrThrow<unknown>(res);
}

export async function addSupplierImage(supplierId: number, file: File): Promise<void> {
	const formData = new FormData();
	formData.append("action", "add-image");
	formData.append("supplierId", String(supplierId));
	formData.append("file", file);

	const res = await fetch(API_BASE_URL, {
		method: "POST",
		body: formData,
	});

	await parseJsonOrThrow<unknown>(res);
}

export async function replaceSupplierImage(
	imageId: number,
	supplierId: number,
	file: File
): Promise<void> {
	const formData = new FormData();
	formData.append("action", "replace-image");
	formData.append("supplierId", String(supplierId));
	formData.append("imageId", String(imageId));
	formData.append("file", file);

	const res = await fetch(API_BASE_URL, {
		method: "POST",
		body: formData,
	});

	await parseJsonOrThrow<unknown>(res);
}

export async function softDeleteSupplierImage(imageId: number): Promise<void> {
	const res = await fetch(`${API_BASE_URL}?imageId=${imageId}`, {
		method: "DELETE",
	});

	await parseJsonOrThrow<unknown>(res);
}
