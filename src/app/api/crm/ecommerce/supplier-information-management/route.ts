import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const UPLOAD_TIME_ZONE = process.env.UPLOAD_TIME_ZONE ?? "Asia/Manila";

type SupplierRow = {
	id: number;
	supplier_shortcut?: string | null;
	supplier_name?: string | null;
	supplier_type?: string | null;
	supplier_image?: string | null;
	address?: string | null;
	contact_person?: string | null;
	email_address?: string | null;
	phone_number?: string | null;
	description?: string | null;
};

type SupplierBackgroundImageRow = {
	id: number;
	supplier_id: number;
	image_path: string;
	uploaded_at?: string | null;
	is_active?: number | boolean;
};

function requireConfig() {
	if (!DIRECTUS_URL || !STATIC_TOKEN) {
		return NextResponse.json(
			{ ok: false, message: "Missing Directus API configuration." },
			{ status: 500 }
		);
	}

	return null;
}

function buildJsonHeaders() {
	return {
		Authorization: `Bearer ${STATIC_TOKEN}`,
		"Content-Type": "application/json",
	};
}

function buildAuthHeaders() {
	return {
		Authorization: `Bearer ${STATIC_TOKEN}`,
	};
}

function asPositiveInt(value: unknown): number | null {
	const num = Number(value);
	if (!Number.isFinite(num) || num <= 0) {
		return null;
	}
	return num;
}

function getCurrentTimeForDirectus(timeZone: string): string {
	const formatter = new Intl.DateTimeFormat("sv-SE", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});

	// Directus accepts this timestamp shape for datetime fields.
	return formatter.format(new Date()).replace(" ", "T");
}

async function uploadFileToDirectus(file: File): Promise<string> {
	const directusData = new FormData();
	directusData.append("file", file);

	const uploadResponse = await fetch(`${DIRECTUS_URL}/files`, {
		method: "POST",
		headers: buildAuthHeaders(),
		body: directusData,
	});

	if (!uploadResponse.ok) {
		const err = await uploadResponse.text();
		throw new Error(`Failed to upload image to Directus: ${err}`);
	}

	const uploadJson = await uploadResponse.json();
	const uploadedId = String(uploadJson?.data?.id ?? "").trim();

	if (!uploadedId) {
		throw new Error("Directus did not return an uploaded file ID.");
	}

	return uploadedId;
}

export async function GET(req: NextRequest) {
	const configError = requireConfig();
	if (configError) return configError;

	try {
		const { searchParams } = new URL(req.url);
		const supplierIdRaw = searchParams.get("supplierId");

		if (supplierIdRaw) {
			const supplierId = asPositiveInt(supplierIdRaw);
			const includeInactive =
				(searchParams.get("includeInactive") ?? "").trim().toLowerCase() === "true";
			if (!supplierId) {
				return NextResponse.json(
					{ ok: false, message: "Valid supplierId is required." },
					{ status: 400 }
				);
			}

			const activeFilter = includeInactive ? "" : "&filter[is_active][_eq]=1";

			const imagesRes = await fetch(
				`${DIRECTUS_URL}/items/supplier_background_images?filter[supplier_id][_eq]=${supplierId}${activeFilter}&fields=id,supplier_id,image_path,uploaded_at,is_active&sort=-id&limit=-1`,
				{
					headers: buildJsonHeaders(),
					cache: "no-store",
				}
			);

			if (!imagesRes.ok) {
				const err = await imagesRes.text();
				throw new Error(`Failed to fetch supplier images: ${err}`);
			}

			const imageRows: SupplierBackgroundImageRow[] = (await imagesRes.json()).data ?? [];

			return NextResponse.json({
				ok: true,
				data: imageRows,
			});
		}

		const suppliersRes = await fetch(
			`${DIRECTUS_URL}/items/suppliers?filter[supplier_type][_in]=TRADE,Trade&filter[isActive][_eq]=1&fields=id,supplier_shortcut,supplier_name,supplier_type,supplier_image,address,contact_person,email_address,phone_number,description&sort=supplier_name&limit=-1`,
			{
				headers: buildJsonHeaders(),
				cache: "no-store",
			}
		);

		if (!suppliersRes.ok) {
			const err = await suppliersRes.text();
			throw new Error(`Failed to fetch suppliers: ${err}`);
		}

		const suppliers: SupplierRow[] = (await suppliersRes.json()).data ?? [];

		return NextResponse.json({
			ok: true,
			data: suppliers,
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Internal Server Error",
			},
			{ status: 500 }
		);
	}
}

export async function PATCH(req: NextRequest) {
	const configError = requireConfig();
	if (configError) return configError;

	try {
		const body = await req.json();
		const action = String(body?.action ?? "update-description").trim();

		if (action === "update-description") {
			const supplierId = asPositiveInt(body?.supplierId);
			const description = typeof body?.description === "string" ? body.description : "";

			if (!supplierId) {
				return NextResponse.json(
					{ ok: false, message: "Valid supplierId is required." },
					{ status: 400 }
				);
			}

			// Intentionally update ONLY suppliers.description as required.
			const res = await fetch(`${DIRECTUS_URL}/items/suppliers/${supplierId}`, {
				method: "PATCH",
				headers: buildJsonHeaders(),
				body: JSON.stringify({ description }),
			});

			if (!res.ok) {
				const err = await res.text();
				throw new Error(`Failed to update supplier description: ${err}`);
			}

			const json = await res.json();
			return NextResponse.json({ ok: true, data: json.data });
		}

		if (action === "update-image") {
			const imageId = asPositiveInt(body?.imageId);
			const imagePath = String(body?.imagePath ?? "").trim();

			if (!imageId || !imagePath) {
				return NextResponse.json(
					{ ok: false, message: "Valid imageId and imagePath are required." },
					{ status: 400 }
				);
			}

			const res = await fetch(`${DIRECTUS_URL}/items/supplier_background_images/${imageId}`, {
				method: "PATCH",
				headers: buildJsonHeaders(),
				body: JSON.stringify({ image_path: imagePath, is_active: 1 }),
			});

			if (!res.ok) {
				const err = await res.text();
				throw new Error(`Failed to update supplier image: ${err}`);
			}

			const json = await res.json();
			return NextResponse.json({ ok: true, data: json.data });
		}

		if (action === "update-supplier-image") {
			const supplierId = asPositiveInt(body?.supplierId);
			const supplierImage =
				typeof body?.supplierImage === "string" ? body.supplierImage.trim() : "";

			if (!supplierId) {
				return NextResponse.json(
					{ ok: false, message: "Valid supplierId is required." },
					{ status: 400 }
				);
			}

			const res = await fetch(`${DIRECTUS_URL}/items/suppliers/${supplierId}`, {
				method: "PATCH",
				headers: buildJsonHeaders(),
				body: JSON.stringify({ supplier_image: supplierImage || null }),
			});

			if (!res.ok) {
				const err = await res.text();
				throw new Error(`Failed to update supplier image: ${err}`);
			}

			const json = await res.json();
			return NextResponse.json({ ok: true, data: json.data });
		}

		return NextResponse.json(
			{ ok: false, message: "Unsupported PATCH action." },
			{ status: 400 }
		);
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Internal Server Error",
			},
			{ status: 500 }
		);
	}
}

export async function POST(req: NextRequest) {
	const configError = requireConfig();
	if (configError) return configError;

	try {
		const contentType = (req.headers.get("content-type") ?? "").toLowerCase();
		if (!contentType.includes("multipart/form-data")) {
			return NextResponse.json(
				{ ok: false, message: "Invalid upload request. Expected multipart form data." },
				{ status: 415 }
			);
		}

		let formData: FormData;
		try {
			formData = await req.formData();
		} catch {
			return NextResponse.json(
				{ ok: false, message: "Failed to parse upload payload as FormData." },
				{ status: 400 }
			);
		}

		const action = String(formData.get("action") ?? "add-image").trim();
		const supplierId = asPositiveInt(formData.get("supplierId"));
		const imageId = asPositiveInt(formData.get("imageId"));
		const files = formData.getAll("file").filter((entry): entry is File => entry instanceof File);
		const file = files[0] ?? null;

		if (!supplierId) {
			return NextResponse.json(
				{ ok: false, message: "Valid supplierId is required." },
				{ status: 400 }
			);
		}

		if (!file) {
			return NextResponse.json(
				{ ok: false, message: "Image file is required." },
				{ status: 400 }
			);
		}

		if (action === "replace-image") {
			if (!imageId) {
				return NextResponse.json(
					{ ok: false, message: "Valid imageId is required for replace-image." },
					{ status: 400 }
				);
			}

			const uploadedFileId = await uploadFileToDirectus(file);
			const uploadedAt = getCurrentTimeForDirectus(UPLOAD_TIME_ZONE);

			const replaceRes = await fetch(`${DIRECTUS_URL}/items/supplier_background_images/${imageId}`, {
				method: "PATCH",
				headers: buildJsonHeaders(),
				body: JSON.stringify({
					image_path: uploadedFileId,
					is_active: true,
					uploaded_at: uploadedAt,
				}),
			});

			if (!replaceRes.ok) {
				const err = await replaceRes.text();
				throw new Error(`Failed to replace supplier image: ${err}`);
			}

			const replaceJson = await replaceRes.json();
			return NextResponse.json({ ok: true, data: replaceJson.data });
		}

		if (action === "update-supplier-image") {
			const uploadedFileId = await uploadFileToDirectus(file);
			const supplierRes = await fetch(`${DIRECTUS_URL}/items/suppliers/${supplierId}`, {
				method: "PATCH",
				headers: buildJsonHeaders(),
				body: JSON.stringify({ supplier_image: uploadedFileId }),
			});

			if (!supplierRes.ok) {
				const err = await supplierRes.text();
				throw new Error(`Failed to update supplier image: ${err}`);
			}

			const supplierJson = await supplierRes.json();
			return NextResponse.json({ ok: true, data: supplierJson.data });
		}

		const createdRows: unknown[] = [];
		for (const selectedFile of files) {
			const uploadedFileId = await uploadFileToDirectus(selectedFile);
			const uploadedAt = getCurrentTimeForDirectus(UPLOAD_TIME_ZONE);
			const createRes = await fetch(`${DIRECTUS_URL}/items/supplier_background_images`, {
				method: "POST",
				headers: buildJsonHeaders(),
				body: JSON.stringify({
					supplier_id: supplierId,
					image_path: uploadedFileId,
					is_active: true,
					uploaded_at: uploadedAt,
				}),
			});

			if (!createRes.ok) {
				const err = await createRes.text();
				throw new Error(`Failed to create supplier image record: ${err}`);
			}

			const createJson = await createRes.json();
			createdRows.push(createJson.data);
		}

		return NextResponse.json({ ok: true, data: createdRows });
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Internal Server Error",
			},
			{ status: 500 }
		);
	}
}

export async function DELETE(req: NextRequest) {
	const configError = requireConfig();
	if (configError) return configError;

	try {
		const { searchParams } = new URL(req.url);
		const imageId = asPositiveInt(searchParams.get("imageId"));

		if (!imageId) {
			return NextResponse.json(
				{ ok: false, message: "Valid imageId is required." },
				{ status: 400 }
			);
		}

		const res = await fetch(`${DIRECTUS_URL}/items/supplier_background_images/${imageId}`, {
			method: "DELETE",
			headers: buildJsonHeaders(),
		});

		if (!res.ok) {
			const err = await res.text();
			throw new Error(`Failed to delete supplier image: ${err}`);
		}

		return NextResponse.json({ ok: true });
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message: error instanceof Error ? error.message : "Internal Server Error",
			},
			{ status: 500 }
		);
	}
}
