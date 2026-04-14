import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

type DirectusUser = {
	user_id?: number;
	id?: number;
	user_fname?: string | null;
	user_mname?: string | null;
	user_lname?: string | null;
};

type ClassificationRow = {
	id: number;
	classification_name?: string | null;
	created_by?: number | null;
	created_at?: string | null;
	updated_by?: number | null;
	updated_at?: string | null;
};

function buildFetchHeaders() {
	return {
		Authorization: `Bearer ${STATIC_TOKEN}`,
		"Content-Type": "application/json",
	};
}

function normalizeClassificationName(value: string): string {
	return value.trim().replace(/\s+/g, " ").toLowerCase();
}

async function isClassificationDuplicate(classificationName: string, excludeId?: number): Promise<boolean> {
	const response = await fetch(
		`${DIRECTUS_URL}/items/customer_classification?limit=-1&fields=id,classification_name`,
		{
			headers: buildFetchHeaders(),
			cache: "no-store",
		}
	);

	if (!response.ok) {
		const err = await response.text();
		throw new Error(`Failed to validate classification uniqueness: ${err}`);
	}

	const rows: Array<Pick<ClassificationRow, "id" | "classification_name">> =
		(await response.json()).data ?? [];
	const normalizedInput = normalizeClassificationName(classificationName);

	return rows.some((row) => {
		if (excludeId && row.id === excludeId) {
			return false;
		}
		return normalizeClassificationName(row.classification_name ?? "") === normalizedInput;
	});
}

function decodeUserIdFromJwt(token: string): number | null {
	try {
		const parts = token.split(".");
		if (parts.length < 2) return null;

		const payloadPart = parts[1];
		const pad = "=".repeat((4 - (payloadPart.length % 4)) % 4);
		const b64 = (payloadPart + pad).replace(/-/g, "+").replace(/_/g, "/");
		const jsonStr = Buffer.from(b64, "base64").toString("utf8");
		const payload = JSON.parse(jsonStr);
		const userId = Number(payload.sub);
		return Number.isFinite(userId) ? userId : null;
	} catch {
		return null;
	}
}

function buildFullName(user: DirectusUser): string {
	const parts = [user.user_fname, user.user_mname, user.user_lname]
		.map((part) => (part ?? "").trim())
		.filter(Boolean);

	return parts.join(" ");
}

function requireApiConfig() {
	if (!DIRECTUS_URL || !STATIC_TOKEN) {
		return NextResponse.json(
			{ ok: false, message: "Missing API configuration." },
			{ status: 500 }
		);
	}

	return null;
}

async function getCurrentUserId(): Promise<number | null> {
	const cookieStore = await cookies();
	const token = cookieStore.get("vos_access_token")?.value;
	if (!token) return null;
	return decodeUserIdFromJwt(token);
}

export async function GET(req: NextRequest) {
	const configError = requireApiConfig();
	if (configError) return configError;

	const userId = await getCurrentUserId();
	if (!userId) {
		return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
	}

	try {
		const { searchParams } = new URL(req.url);
		const q = (searchParams.get("q") ?? "").trim().toLowerCase();
		const createdBy = (searchParams.get("createdBy") ?? "all").trim();

		const [classificationRes, usersRes] = await Promise.all([
			fetch(`${DIRECTUS_URL}/items/customer_classification?limit=-1&sort=-id`, {
				headers: buildFetchHeaders(),
				cache: "no-store",
			}),
			fetch(`${DIRECTUS_URL}/items/user?limit=-1&fields=user_id,user_fname,user_mname,user_lname`, {
				headers: buildFetchHeaders(),
				cache: "no-store",
			}),
		]);

		if (!classificationRes.ok) {
			const err = await classificationRes.text();
			throw new Error(`Failed to fetch classifications: ${err}`);
		}

		if (!usersRes.ok) {
			const err = await usersRes.text();
			throw new Error(`Failed to fetch users: ${err}`);
		}

		const rows: ClassificationRow[] = (await classificationRes.json()).data ?? [];
		const users: DirectusUser[] = (await usersRes.json()).data ?? [];

		const userMap: Record<number, string> = {};
		for (const user of users) {
			const id = Number(user.user_id ?? user.id);
			if (!Number.isFinite(id)) continue;
			userMap[id] = buildFullName(user) || `User #${id}`;
		}

		let filtered = rows.map((row) => ({
			id: row.id,
			classification_name: (row.classification_name ?? "").trim(),
			created_by: row.created_by ?? null,
			created_at: row.created_at ?? null,
			updated_by: row.updated_by ?? null,
			updated_at: row.updated_at ?? null,
			created_by_name: row.created_by ? userMap[row.created_by] ?? `User #${row.created_by}` : "System",
		}));

		if (createdBy !== "all") {
			const selectedId = Number(createdBy);
			if (Number.isFinite(selectedId)) {
				filtered = filtered.filter((item) => item.created_by === selectedId);
			}
		}

		if (q) {
			filtered = filtered.filter((item) => {
				const nameText = item.classification_name.toLowerCase();
				const createdByText = item.created_by_name.toLowerCase();
				return nameText.includes(q) || createdByText.includes(q);
			});
		}

		const userOptions = Object.entries(userMap)
			.map(([value, label]) => ({ value, label }))
			.sort((a, b) => a.label.localeCompare(b.label));

		return NextResponse.json({
			ok: true,
			data: filtered,
			users: userOptions,
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

export async function POST(req: NextRequest) {
	const configError = requireApiConfig();
	if (configError) return configError;

	const userId = await getCurrentUserId();
	if (!userId) {
		return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = await req.json();
		const classificationName = String(body?.classification_name ?? "").trim();

		if (!classificationName) {
			return NextResponse.json({ ok: false, message: "Type is required." }, { status: 400 });
		}

		if (classificationName.length > 50) {
			return NextResponse.json(
				{ ok: false, message: "Type must be 50 characters or less." },
				{ status: 400 }
			);
		}

		if (await isClassificationDuplicate(classificationName)) {
			return NextResponse.json({ ok: false, message: "Type already exists." }, { status: 409 });
		}

		const payload = {
			classification_name: classificationName,
			created_by: userId,
			updated_by: userId,
		};

		const response = await fetch(`${DIRECTUS_URL}/items/customer_classification`, {
			method: "POST",
			headers: buildFetchHeaders(),
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const err = await response.text();
			throw new Error(`Failed to create classification: ${err}`);
		}

		const json = await response.json();
		return NextResponse.json({ ok: true, data: json.data });
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
	const configError = requireApiConfig();
	if (configError) return configError;

	const userId = await getCurrentUserId();
	if (!userId) {
		return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = await req.json();
		const id = Number(body?.id);
		const classificationName = String(body?.classification_name ?? "").trim();

		if (!Number.isFinite(id) || id <= 0) {
			return NextResponse.json({ ok: false, message: "Valid ID is required." }, { status: 400 });
		}

		if (!classificationName) {
			return NextResponse.json({ ok: false, message: "Type is required." }, { status: 400 });
		}

		if (classificationName.length > 50) {
			return NextResponse.json(
				{ ok: false, message: "Type must be 50 characters or less." },
				{ status: 400 }
			);
		}

		if (await isClassificationDuplicate(classificationName, id)) {
			return NextResponse.json({ ok: false, message: "Type already exists." }, { status: 409 });
		}

		const payload = {
			classification_name: classificationName,
			updated_by: userId,
		};

		const response = await fetch(`${DIRECTUS_URL}/items/customer_classification/${id}`, {
			method: "PATCH",
			headers: buildFetchHeaders(),
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const err = await response.text();
			throw new Error(`Failed to update classification: ${err}`);
		}

		const json = await response.json();
		return NextResponse.json({ ok: true, data: json.data });
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
