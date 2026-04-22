import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";
const COOKIE_NAME = "vos_access_token";

type RequestStatus = "Pending" | "Approved" | "Rejected";
type ReviewAction = "APPROVED" | "REJECTED";

type RawCancellationRequest = {
	request_id: number;
	order_id: number;
	requested_by: number;
	requested_at: string | null;
	reason_id: number;
	remarks: string | null;
	request_status: RequestStatus;
};

type RawSalesOrder = {
	order_id: number;
	order_no?: string;
	customer_code?: string;
	supplier_id?: number | string;
	order_date?: string | null;
	total_amount?: number | string | null;
	order_status?: string;
	isCancelled?: number | boolean | null;
	cancelled_at?: string | null;
};

type RawCustomer = {
	customer_code: string;
	customer_name?: string;
};

type RawSupplier = {
	id: number | string;
	supplier_name?: string;
	supplier_shortcut?: string;
};

type RawReason = {
	id: number;
	reason_name?: string;
	description?: string;
};

type RawUser = {
	user_id: number;
	user_fname?: string;
	user_lname?: string;
};

function directusHeaders() {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	if (DIRECTUS_TOKEN) {
		headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
	}

	return headers;
}

async function directusFetch<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${DIRECTUS_BASE}${path}`, {
		cache: "no-store",
		...init,
		headers: {
			...directusHeaders(),
			...(init?.headers || {}),
		},
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(text || `Directus request failed: ${response.status}`);
	}

	return (await response.json()) as T;
}

function decodeUserIdFromJwt(token: string): number | null {
	try {
		const parts = token.split(".");
		if (parts.length < 2) return null;

		const payloadPart = parts[1];
		const padding = "=".repeat((4 - (payloadPart.length % 4)) % 4);
		const base64 = (payloadPart + padding).replace(/-/g, "+").replace(/_/g, "/");
		const json = Buffer.from(base64, "base64").toString("utf8");
		const payload = JSON.parse(json) as { sub?: string | number };

		const userId = Number(payload.sub);
		return Number.isFinite(userId) ? userId : null;
	} catch {
		return null;
	}
}

function parseNumber(value: unknown): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSearchValue(input: string): string {
	return input.trim().toLowerCase();
}

export async function GET(req: NextRequest) {
	try {
		const search = normalizeSearchValue(req.nextUrl.searchParams.get("search") || "");
		const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || "1"));
		const limit = Math.max(1, Number(req.nextUrl.searchParams.get("limit") || "10"));

		const requestsRes = await directusFetch<{ data: RawCancellationRequest[] }>(
			"/items/sales_order_cancellation_requests?filter[request_status][_eq]=Pending&sort=-requested_at&limit=-1&fields=request_id,order_id,requested_by,requested_at,reason_id,remarks,request_status",
		);

		const requests = requestsRes.data || [];

		const orderIds = Array.from(
			new Set(requests.map((item) => Number(item.order_id)).filter((id) => Number.isFinite(id))),
		);
		const reasonIds = Array.from(
			new Set(requests.map((item) => Number(item.reason_id)).filter((id) => Number.isFinite(id))),
		);
		const requesterIds = Array.from(
			new Set(requests.map((item) => Number(item.requested_by)).filter((id) => Number.isFinite(id))),
		);

		const ordersRes =
			orderIds.length > 0
				? await directusFetch<{ data: RawSalesOrder[] }>(
						`/items/sales_order?filter[order_id][_in]=${orderIds.join(",")}&limit=-1&fields=order_id,order_no,customer_code,supplier_id,order_date,total_amount,order_status,isCancelled,cancelled_at`,
					)
				: { data: [] as RawSalesOrder[] };

		const orders = ordersRes.data || [];
		const customerCodes = Array.from(new Set(orders.map((order) => order.customer_code).filter(Boolean))) as string[];
		const supplierIds = Array.from(new Set(orders.map((order) => order.supplier_id).filter(Boolean))) as Array<
			number | string
		>;

		const [customersRes, suppliersRes, reasonsRes, usersRes] = await Promise.all([
			customerCodes.length > 0
				? directusFetch<{ data: RawCustomer[] }>(
						`/items/customer?filter[customer_code][_in]=${encodeURIComponent(customerCodes.join(","))}&limit=-1&fields=customer_code,customer_name`,
					)
				: Promise.resolve({ data: [] as RawCustomer[] }),
			supplierIds.length > 0
				? directusFetch<{ data: RawSupplier[] }>(
						`/items/suppliers?filter[id][_in]=${supplierIds.join(",")}&limit=-1&fields=id,supplier_name,supplier_shortcut`,
					)
				: Promise.resolve({ data: [] as RawSupplier[] }),
			reasonIds.length > 0
				? directusFetch<{ data: RawReason[] }>(
						`/items/cancellation_reason_type?filter[id][_in]=${reasonIds.join(",")}&limit=-1&fields=id,reason_name,description`,
					)
				: Promise.resolve({ data: [] as RawReason[] }),
			requesterIds.length > 0
				? directusFetch<{ data: RawUser[] }>(
						`/items/user?filter[user_id][_in]=${requesterIds.join(",")}&limit=-1&fields=user_id,user_fname,user_lname`,
					)
				: Promise.resolve({ data: [] as RawUser[] }),
		]);

		const ordersMap = new Map(orders.map((order) => [Number(order.order_id), order]));
		const customersMap = new Map(
			(customersRes.data || []).map((customer) => [customer.customer_code, customer.customer_name || "Unknown Customer"]),
		);
		const suppliersMap = new Map(
			(suppliersRes.data || []).map((supplier) => [String(supplier.id), supplier.supplier_name || supplier.supplier_shortcut || "Unknown Supplier"]),
		);
		const reasonsMap = new Map(
			(reasonsRes.data || []).map((reason) => [
				Number(reason.id),
				reason.reason_name || reason.description || "Unspecified Reason",
			]),
		);
		const usersMap = new Map(
			(usersRes.data || []).map((user) => [
				Number(user.user_id),
				`${user.user_fname || ""} ${user.user_lname || ""}`.trim() || "Unknown User",
			]),
		);

		const mergedRows = requests.map((request) => {
			const order = ordersMap.get(Number(request.order_id));
			const customerName = order?.customer_code
				? customersMap.get(order.customer_code) || "Unknown Customer"
				: "Unknown Customer";
			const supplierName = order?.supplier_id
				? suppliersMap.get(String(order.supplier_id)) || "Unknown Supplier"
				: "Unknown Supplier";

			return {
				requestId: Number(request.request_id),
				orderId: Number(request.order_id),
				salesOrderNo: order?.order_no || "-",
				customerName,
				supplierName,
				orderDate: order?.order_date || null,
				totalAmount: parseNumber(order?.total_amount),
				orderStatus: order?.order_status || "",
				isCancelled: Boolean(order?.isCancelled),
				cancelledAt: order?.cancelled_at || null,
				requestStatus: request.request_status,
				requestReason: reasonsMap.get(Number(request.reason_id)) || "Unspecified Reason",
				requestRemarks: request.remarks || "",
				requestedByName: usersMap.get(Number(request.requested_by)) || "Unknown User",
				requestedAt: request.requested_at || null,
			};
		});

		const filteredRows = search
			? mergedRows.filter((row) => {
					const haystack = [
						row.salesOrderNo,
						row.customerName,
						row.supplierName,
						row.requestReason,
						row.requestedByName,
					]
						.join(" ")
						.toLowerCase();
					return haystack.includes(search);
				})
			: mergedRows;

		const total = filteredRows.length;
		const start = (page - 1) * limit;
		const end = start + limit;
		const pagedRows = filteredRows.slice(start, end);

		return NextResponse.json({
			ok: true,
			data: pagedRows,
			meta: {
				page,
				limit,
				total,
				hasMore: end < total,
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Internal server error";
		return NextResponse.json({ ok: false, message }, { status: 500 });
	}
}

export async function PATCH(req: NextRequest) {
	const cookieStore = await cookies();
	const token = cookieStore.get(COOKIE_NAME)?.value;

	if (!token) {
		return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
	}

	const reviewerId = decodeUserIdFromJwt(token);
	if (!reviewerId) {
		return NextResponse.json({ ok: false, message: "Unable to resolve reviewer session." }, { status: 401 });
	}

	try {
		const payload = (await req.json()) as {
			requestId?: number;
			orderId?: number;
			action?: ReviewAction;
			remarks?: string;
		};

		const requestId = Number(payload.requestId);
		const orderId = Number(payload.orderId);
		const action = payload.action;
		const remarks = payload.remarks?.trim() || null;

		if (!Number.isFinite(requestId) || !Number.isFinite(orderId) || !action) {
			return NextResponse.json({ ok: false, message: "Invalid review payload." }, { status: 400 });
		}

		if (action !== "APPROVED" && action !== "REJECTED") {
			return NextResponse.json({ ok: false, message: "Invalid review action." }, { status: 400 });
		}

		const orderPatchData =
			action === "APPROVED"
				? {
						order_status: "Cancelled",
						isCancelled: true,
						cancelled_at: new Date().toISOString(),
						modified_date: new Date().toISOString(),
					}
				: {
						order_status: "Draft",
						isCancelled: false,
						cancelled_at: null,
						modified_date: new Date().toISOString(),
					};

		await directusFetch<{ data: RawSalesOrder }>(`/items/sales_order/${orderId}`, {
			method: "PATCH",
			body: JSON.stringify(orderPatchData),
		});

		await directusFetch<{ data: unknown }>("/items/order_cancellation_approvals", {
			method: "POST",
			body: JSON.stringify({
				order_id: orderId,
				reviewer_id: reviewerId,
				status: action,
				remarks,
			}),
		});

		await directusFetch<{ data: RawCancellationRequest }>(
			`/items/sales_order_cancellation_requests/${requestId}`,
			{
				method: "PATCH",
				body: JSON.stringify({
					request_status: action === "APPROVED" ? "Approved" : "Rejected",
				}),
			},
		);

		return NextResponse.json({ ok: true, message: "Review submitted successfully." });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unable to submit review.";
		return NextResponse.json({ ok: false, message }, { status: 500 });
	}
}

