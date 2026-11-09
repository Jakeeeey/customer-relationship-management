import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";
const DIRECTUS_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

const fetchHeaders: Record<string, string> = {
    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    "Content-Type": "application/json",
};

interface JwtPayload {
    sub?: string | number;
    id?: string | number;
    user_id?: string | number;
    email?: string;
    Email?: string;
    FirstName?: string;
    Firstname?: string;
    firstName?: string;
    firstname?: string;
    LastName?: string;
    Lastname?: string;
    lastName?: string;
    lastname?: string;
}

function decodeJwtPayload(token: string): JwtPayload | null {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        const p = parts[1];
        const b64 = p.replace(/-/g, "+").replace(/_/g, "/");
        const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
        const json = Buffer.from(padded, "base64").toString("utf8");
        return JSON.parse(json);
    } catch {
        return null;
    }
}

async function resolveUserId(): Promise<number | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;
        if (!token) return null;

        const payload = decodeJwtPayload(token);
        if (!payload) return null;

        const directId = payload.user_id || payload.id || payload.sub;
        if (directId && !isNaN(Number(directId))) {
            return Number(directId);
        }

        const email = payload.email || payload.Email;
        if (email) {
            const uRes = await fetch(
                `${DIRECTUS_URL}/items/user?filter[user_email][_eq]=${encodeURIComponent(email)}&fields=user_id&limit=1`,
                { headers: fetchHeaders }
            );
            if (uRes.ok) {
                const uData = (await uRes.json()).data;
                if (Array.isArray(uData) && uData.length > 0) {
                    return Number(uData[0].user_id);
                }
            }
        }
    } catch (e) {
        console.warn("[ServiceInvoicing] Failed to resolve user ID:", e);
    }
    return null;
}

function getPhTimeISO(): string {
    return new Date().toISOString();
}

export async function GET(req: NextRequest) {
    const action = req.nextUrl.searchParams.get("action");
    const searchParams = req.nextUrl.searchParams;

    try {
        // 1. SALESMEN (Master Users linked to active salesman accounts - identical to Sales Order)
        if (action === "salesmen") {
            const res = await fetch(`${DIRECTUS_URL}/items/salesman?filter[isActive][_eq]=1&limit=-1`, { headers: fetchHeaders });
            const smData = (await res.json()).data || [];
            const userIds = new Set<string>();

            smData.forEach((s: { employee_id?: number | string; encoder_id?: number | string }) => {
                const uid = s.employee_id || s.encoder_id;
                if (uid) userIds.add(uid.toString());
            });
            if (userIds.size === 0) return NextResponse.json([]);

            const uRes = await fetch(`${DIRECTUS_URL}/items/user?filter[user_id][_in]=${Array.from(userIds).join(",")}&limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await uRes.json()).data || []);
        }

        // 2. ACCOUNTS (Salesman accounts for a selected user_id)
        if (action === "accounts") {
            const userId = searchParams.get("user_id");
            const url = `${DIRECTUS_URL}/items/salesman?filter[_or][0][employee_id][_eq]=${userId}&filter[_or][1][encoder_id][_eq]=${userId}&filter[isActive][_eq]=1&fields=id,salesman_name,salesman_code,price_type,price_type_id,truck_plate,branch_code&limit=-1`;
            const res = await fetch(url, { headers: fetchHeaders });
            return NextResponse.json((await res.json()).data || []);
        }

        // 3. BRANCHES
        if (action === "branches") {
            const res = await fetch(`${DIRECTUS_URL}/items/branches?filter[isActive][_eq]=1&limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await res.json()).data || []);
        }

        // 4. PRICE TYPES
        if (action === "price_types") {
            const res = await fetch(`${DIRECTUS_URL}/items/price_types?sort=sort&limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await res.json()).data || []);
        }

        // 5. CUSTOMERS BY SALESMAN ACCOUNT
        if (action === "customers") {
            const salesmanId = searchParams.get("salesman_id");
            if (!salesmanId) return NextResponse.json({ error: "salesman_id required" }, { status: 400 });
            const csRes = await fetch(`${DIRECTUS_URL}/items/customer_salesmen?filter[salesman_id][_eq]=${salesmanId}&limit=-1`, { headers: fetchHeaders });
            const csData = (await csRes.json()).data || [];
            const ids = csData.map((cs: { customer_id: number | string }) => cs.customer_id);
            if (ids.length === 0) return NextResponse.json([]);
            const cRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[id][_in]=${ids.join(",")}&filter[isActive][_eq]=1&fields=*,province,city&limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await cRes.json()).data || []);
        }

        // 6. ALL CUSTOMERS (Paginated + Search)
        if (action === "all_customers") {
            const search = searchParams.get("search");
            const offset = searchParams.get("offset") || "0";
            let url = `${DIRECTUS_URL}/items/customer?filter[isActive][_eq]=1&fields=*,province,city&limit=30&offset=${offset}`;
            if (search) {
                url += `&filter[_or][0][customer_name][_icontains]=${encodeURIComponent(search)}&filter[_or][1][store_name][_icontains]=${encodeURIComponent(search)}&filter[_or][2][customer_code][_icontains]=${encodeURIComponent(search)}`;
            }
            const cRes = await fetch(url, { headers: fetchHeaders });
            return NextResponse.json((await cRes.json()).data || []);
        }

        // 7. SALESMAN BY CUSTOMER (Smart mapping of linked accounts - identical to Sales Order)
        if (action === "salesman_by_customer") {
            const customerId = searchParams.get("customer_id");
            if (!customerId) return NextResponse.json({ error: "customer_id required" }, { status: 400 });

            const csRes = await fetch(`${DIRECTUS_URL}/items/customer_salesmen?filter[customer_id][_eq]=${customerId}&limit=-1`, { headers: fetchHeaders });
            const csData = (await csRes.json()).data || [];
            if (csData.length === 0) return NextResponse.json([]);

            const salesmanIds = csData.map((cs: { salesman_id?: number | string }) => cs.salesman_id).filter(Boolean);
            if (salesmanIds.length === 0) return NextResponse.json([]);

            const sRes = await fetch(`${DIRECTUS_URL}/items/salesman?filter[id][_in]=${salesmanIds.join(",")}&limit=-1`, { headers: fetchHeaders });
            const sData = (await sRes.json()).data || [];
            if (sData.length === 0) return NextResponse.json([]);

            const userIds = new Set<string>();
            sData.forEach((s: { employee_id?: number | string; encoder_id?: number | string; user_id?: number | string }) => {
                const uid = s.employee_id || s.encoder_id || s.user_id;
                if (uid) userIds.add(uid.toString());
            });
            if (userIds.size === 0) return NextResponse.json([]);

            const uRes = await fetch(`${DIRECTUS_URL}/items/user?filter[user_id][_in]=${Array.from(userIds).join(",")}&limit=-1`, { headers: fetchHeaders });
            const uData = (await uRes.json()).data || [];

            const finalUsers = uData.map((user: { user_id: number | string }) => {
                const myLinkedAccounts = sData
                    .filter((s: { employee_id?: number | string; encoder_id?: number | string; user_id?: number | string; id: number | string }) => {
                        const sid = (s.employee_id || s.encoder_id || s.user_id)?.toString();
                        return sid === user.user_id.toString();
                    })
                    .map((s: { id: number | string }) => s.id);

                return {
                    ...user,
                    linked_account_ids: myLinkedAccounts,
                };
            });

            return NextResponse.json(finalUsers);
        }

        // 8. SUPPLIERS / INVOICE TYPES / OPERATIONS / PAYMENT TERMS
        if (action === "suppliers") {
            const res = await fetch(`${DIRECTUS_URL}/items/suppliers?filter[isActive][_eq]=1&limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await res.json()).data || []);
        }

        if (action === "invoice_types") {
            const res = await fetch(`${DIRECTUS_URL}/items/sales_invoice_type?limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await res.json()).data || []);
        }

        if (action === "operations") {
            const res = await fetch(`${DIRECTUS_URL}/items/operation?limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await res.json()).data || []);
        }

        if (action === "payment_terms") {
            const res = await fetch(`${DIRECTUS_URL}/items/payment_terms?limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await res.json()).data || []);
        }

        // 9. CHECK INVOICE NO / ORDER ID UNIQUENESS
        if (action === "check_invoice_no") {
            const invoiceNo = searchParams.get("invoice_no")?.trim();
            if (!invoiceNo) return NextResponse.json({ exists: false });

            const res = await fetch(
                `${DIRECTUS_URL}/items/sales_invoice?filter[invoice_no][_eq]=${encodeURIComponent(invoiceNo)}&fields=invoice_id,invoice_no&limit=1`,
                { headers: fetchHeaders }
            );
            if (!res.ok) return NextResponse.json({ exists: false });
            const data = (await res.json()).data || [];
            return NextResponse.json({ exists: data.length > 0, existing: data[0] || null });
        }

        // 10. FETCH SERVICE INVOICES (Invoices linked to `sales_invoice_details_other`)
        if (action === "service_invoices") {
            const search = searchParams.get("search")?.trim() || "";
            const limit = searchParams.get("limit") || "50";

            // First get distinct invoice_ids from sales_invoice_details_other
            const detailsRes = await fetch(
                `${DIRECTUS_URL}/items/sales_invoice_details_other?sort=-detail_id&limit=500`,
                { headers: fetchHeaders }
            );

            let otherDetails: Record<string, unknown>[] = [];
            if (detailsRes.ok) {
                otherDetails = (await detailsRes.json()).data || [];
            }

            const invoiceIds = Array.from(
                new Set(
                    otherDetails
                        .map((d) => {
                            const invId = d.invoice_id;
                            if (typeof invId === "object" && invId !== null) {
                                return (invId as { invoice_id?: number; id?: number }).invoice_id || (invId as { id?: number }).id;
                            }
                            return Number(invId);
                        })
                        .filter((v): v is number => Boolean(v && !isNaN(v)))
                )
            );

            if (invoiceIds.length === 0) {
                return NextResponse.json([]);
            }

            const filterObj: Record<string, unknown> = {
                _and: [{ invoice_id: { _in: invoiceIds.slice(0, 100) } }],
            };

            if (search) {
                (filterObj._and as Record<string, unknown>[]).push({
                    _or: [
                        { invoice_no: { _icontains: search } },
                        { order_id: { _icontains: search } },
                        { customer_code: { _icontains: search } },
                    ],
                });
            }

            const query = new URLSearchParams({
                filter: JSON.stringify(filterObj),
                sort: "-invoice_id",
                limit,
                fields: "*,salesman_id.id,salesman_id.salesman_name,salesman_id.salesman_code,branch_id.id,branch_id.branch_name,branch_id.branch_code,invoice_type.id,invoice_type.type,invoice_type.shortcut,sales_type.id,sales_type.operation_name",
            });

            const invRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice?${query.toString()}`, {
                headers: fetchHeaders,
            });

            if (!invRes.ok) {
                return NextResponse.json([]);
            }

            const invoices = (await invRes.json()).data || [];

            // Resolve customer names
            const customerCodes = Array.from(
                new Set(invoices.map((inv: { customer_code?: string }) => inv.customer_code).filter(Boolean))
            ) as string[];

            const customerMap: Record<string, string> = {};
            if (customerCodes.length > 0) {
                const cRes = await fetch(
                    `${DIRECTUS_URL}/items/customer?filter[customer_code][_in]=${customerCodes.map(encodeURIComponent).join(",")}&fields=customer_code,customer_name,store_name&limit=-1`,
                    { headers: fetchHeaders }
                );
                if (cRes.ok) {
                    const cData = (await cRes.json()).data || [];
                    cData.forEach((c: { customer_code: string; customer_name?: string; store_name?: string }) => {
                        customerMap[c.customer_code] = c.customer_name || c.store_name || c.customer_code;
                    });
                }
            }

            // Group details by invoice_id
            const detailsByInvoice: Record<number, Record<string, unknown>[]> = {};
            otherDetails.forEach((d) => {
                const invId =
                    typeof d.invoice_id === "object" && d.invoice_id !== null
                        ? (d.invoice_id as { invoice_id?: number; id?: number }).invoice_id || (d.invoice_id as { id?: number }).id
                        : Number(d.invoice_id);
                if (invId) {
                    if (!detailsByInvoice[invId]) detailsByInvoice[invId] = [];
                    detailsByInvoice[invId].push(d);
                }
            });

            const enriched = invoices.map((inv: Record<string, unknown>) => {
                const id = Number(inv.invoice_id);
                const cCode = (inv.customer_code as string) || "";
                return {
                    ...inv,
                    customer_name: customerMap[cCode] || cCode || "N/A",
                    details_other: (detailsByInvoice[id] || []).reverse(),
                };
            });

            return NextResponse.json(enriched);
        }

        // 11. FETCH SINGLE SERVICE INVOICE BY ID
        if (action === "invoice_by_id") {
            const invoiceId = searchParams.get("invoice_id");
            if (!invoiceId) return NextResponse.json({ error: "invoice_id required" }, { status: 400 });

            const [invRes, detRes] = await Promise.all([
                fetch(
                    `${DIRECTUS_URL}/items/sales_invoice/${invoiceId}?fields=*,salesman_id.id,salesman_id.salesman_name,salesman_id.salesman_code,branch_id.id,branch_id.branch_name,branch_id.branch_code,invoice_type.id,invoice_type.type,invoice_type.shortcut,sales_type.id,sales_type.operation_name`,
                    { headers: fetchHeaders }
                ),
                fetch(
                    `${DIRECTUS_URL}/items/sales_invoice_details_other?filter[invoice_id][_eq]=${invoiceId}&sort=detail_id&limit=-1`,
                    { headers: fetchHeaders }
                ),
            ]);

            if (!invRes.ok) {
                return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
            }

            const header = (await invRes.json()).data;
            const details = detRes.ok ? (await detRes.json()).data || [] : [];

            return NextResponse.json({ header, details });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (e: unknown) {
        console.error("[ServiceInvoicing GET Error]:", e);
        return NextResponse.json({ error: (e as Error).message || "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const userId = await resolveUserId();
        const now = getPhTimeISO();

        const {
            header,
            items,
        }: {
            header: {
                order_id?: string | null;
                customer_code: string;
                invoice_no: string;
                salesman_id: number | null;
                branch_id: number | null;
                invoice_date?: string | null;
                dispatch_date?: string | null;
                due_date?: string | null;
                payment_terms?: number | null;
                transaction_status?: string;
                payment_status?: string;
                total_amount: number;
                sales_type?: number | null;
                invoice_type?: number | null;
                price_type?: string | null;
                vat_amount: number;
                gross_amount: number;
                discount_amount: number;
                net_amount: number;
                ewt_amount: number;
                remarks?: string | null;
                isReceipt?: number | boolean | null;
                isPosted?: number | boolean | null;
                isDispatched?: number | boolean | null;
            };
            items: {
                item_description: string;
                unit?: string | null;
                quantity: number;
                unit_price: number;
                gross_amount: number;
                discount_amount: number;
                vat_amount: number;
                ewt_amount: number;
                total_amount: number;
                remarks?: string | null;
            }[];
        } = body;

        if (!header || !header.customer_code) {
            return NextResponse.json({ error: "Customer is required." }, { status: 400 });
        }

        if (!header.invoice_no || !header.invoice_no.trim()) {
            return NextResponse.json({ error: "Invoice No. is required." }, { status: 400 });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "At least one dynamic line item is required." }, { status: 400 });
        }

        const formatTimestamp = (d?: string | null) => {
            if (!d) return now;
            if (d.includes("T")) return d;
            return `${d}T00:00:00`;
        };

        const headerPayload = {
            order_id: header.order_id?.trim() || header.invoice_no.trim(),
            customer_code: header.customer_code,
            invoice_no: header.invoice_no.trim(),
            salesman_id: header.salesman_id ? Number(header.salesman_id) : null,
            branch_id: header.branch_id ? Number(header.branch_id) : null,
            invoice_date: formatTimestamp(header.invoice_date),
            dispatch_date: header.dispatch_date ? formatTimestamp(header.dispatch_date) : null,
            due_date: header.due_date ? formatTimestamp(header.due_date) : null,
            payment_terms: header.payment_terms ? Number(header.payment_terms) : null,
            transaction_status: header.transaction_status || "New Invoice",
            payment_status: header.payment_status || "Unpaid",
            total_amount: Number(header.total_amount) || 0,
            sales_type: header.sales_type ? Number(header.sales_type) : null,
            invoice_type: header.invoice_type ? Number(header.invoice_type) : null,
            price_type: header.price_type || "A",
            vat_amount: Number(header.vat_amount) || 0,
            gross_amount: Number(header.gross_amount) || 0,
            discount_amount: Number(header.discount_amount) || 0,
            net_amount: Number(header.net_amount) || 0,
            ewt_amount: Number(header.ewt_amount) || 0,
            created_by: userId,
            created_date: now,
            remarks: header.remarks || "",
            isReceipt: header.isReceipt ? 1 : 0,
            isPosted: header.isPosted ? 1 : 0,
            isDispatched: header.isDispatched ? 1 : 0,
            isRemitted: 0,
            isReplaced: 0,
        };

        // 1. Create `sales_invoice` header
        const hRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice`, {
            method: "POST",
            headers: fetchHeaders,
            body: JSON.stringify(headerPayload),
        });

        if (!hRes.ok) {
            const errJson = await hRes.json().catch(() => ({}));
            const msg = errJson?.errors?.[0]?.message || `Failed to create sales_invoice header (HTTP ${hRes.status})`;
            return NextResponse.json({ error: msg }, { status: hRes.status });
        }

        const createdHeader = (await hRes.json()).data;
        const newInvoiceId = createdHeader?.invoice_id || createdHeader?.id;

        if (!newInvoiceId) {
            return NextResponse.json({ error: "Invoice header created, but no invoice_id was returned." }, { status: 500 });
        }

        // 2. Create `sales_invoice_details_other` rows
        const detailsPayload = items.map((item) => ({
            invoice_id: Number(newInvoiceId),
            order_id: headerPayload.order_id,
            item_description: item.item_description?.trim() || "Service Item",
            unit: item.unit?.trim() || "LOT",
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price) || 0,
            gross_amount: Number(item.gross_amount) || 0,
            discount_amount: Number(item.discount_amount) || 0,
            vat_amount: Number(item.vat_amount) || 0,
            ewt_amount: Number(item.ewt_amount) || 0,
            total_amount: Number(item.total_amount) || 0,
            remarks: item.remarks?.trim() || null,
            created_by: userId,
            created_date: now,
        }));

        const dRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice_details_other`, {
            method: "POST",
            headers: fetchHeaders,
            body: JSON.stringify(detailsPayload),
        });

        if (!dRes.ok) {
            // Rollback header if details table fails
            await fetch(`${DIRECTUS_URL}/items/sales_invoice/${newInvoiceId}`, {
                method: "DELETE",
                headers: fetchHeaders,
            }).catch(() => {});

            const errJson = await dRes.json().catch(() => ({}));
            const msg =
                errJson?.errors?.[0]?.message ||
                "Failed to save dynamic items to sales_invoice_details_other. Ensure the table exists and is exposed in Directus.";
            return NextResponse.json({ error: msg }, { status: dRes.status });
        }

        const createdDetails = (await dRes.json()).data;

        return NextResponse.json({
            success: true,
            invoice_id: newInvoiceId,
            invoice_no: headerPayload.invoice_no,
            header: createdHeader,
            details: createdDetails,
        });
    } catch (e: unknown) {
        console.error("[ServiceInvoicing POST Error]:", e);
        return NextResponse.json({ error: (e as Error).message || "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const userId = await resolveUserId();
        const now = getPhTimeISO();

        const { action, invoice_id, header, items, deletedDetailIds } = body;

        if (!invoice_id) {
            return NextResponse.json({ error: "invoice_id is required" }, { status: 400 });
        }

        if (action === "post_invoice") {
            const res = await fetch(`${DIRECTUS_URL}/items/sales_invoice/${invoice_id}`, {
                method: "PATCH",
                headers: fetchHeaders,
                body: JSON.stringify({
                    isPosted: 1,
                    posted_by: userId,
                    posted_date: now,
                    transaction_status: "Posted",
                    modified_by: userId,
                    modified_date: now,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                return NextResponse.json({ error: err?.errors?.[0]?.message || "Failed to post invoice" }, { status: res.status });
            }

            return NextResponse.json({ success: true });
        }

        if (action === "update_invoice") {
            // Delete removed detail rows
            if (Array.isArray(deletedDetailIds) && deletedDetailIds.length > 0) {
                for (const detailId of deletedDetailIds) {
                    await fetch(`${DIRECTUS_URL}/items/sales_invoice_details_other/${detailId}`, {
                        method: "DELETE",
                        headers: fetchHeaders,
                    });
                }
            }

            // Upsert detail rows
            if (Array.isArray(items)) {
                for (const item of items) {
                    const payload: Record<string, unknown> = {
                        invoice_id: Number(invoice_id),
                        order_id: header?.order_id || header?.invoice_no || null,
                        item_description: item.item_description?.trim() || "Service Item",
                        unit: item.unit?.trim() || "LOT",
                        quantity: Number(item.quantity) || 1,
                        unit_price: Number(item.unit_price) || 0,
                        gross_amount: Number(item.gross_amount) || 0,
                        discount_amount: Number(item.discount_amount) || 0,
                        vat_amount: Number(item.vat_amount) || 0,
                        ewt_amount: Number(item.ewt_amount) || 0,
                        total_amount: Number(item.total_amount) || 0,
                        remarks: item.remarks?.trim() || null,
                    };

                    if (item.detail_id) {
                        payload.modified_by = userId;
                        payload.modified_date = now;
                        await fetch(`${DIRECTUS_URL}/items/sales_invoice_details_other/${item.detail_id}`, {
                            method: "PATCH",
                            headers: fetchHeaders,
                            body: JSON.stringify(payload),
                        });
                    } else {
                        payload.created_by = userId;
                        payload.created_date = now;
                        await fetch(`${DIRECTUS_URL}/items/sales_invoice_details_other`, {
                            method: "POST",
                            headers: fetchHeaders,
                            body: JSON.stringify(payload),
                        });
                    }
                }
            }

            // Update header
            if (header) {
                const headerUpdate: Record<string, unknown> = {
                    ...header,
                    modified_by: userId,
                    modified_date: now,
                };
                await fetch(`${DIRECTUS_URL}/items/sales_invoice/${invoice_id}`, {
                    method: "PATCH",
                    headers: fetchHeaders,
                    body: JSON.stringify(headerUpdate),
                });
            }

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (e: unknown) {
        console.error("[ServiceInvoicing PATCH Error]:", e);
        return NextResponse.json({ error: (e as Error).message || "Internal server error" }, { status: 500 });
    }
}

