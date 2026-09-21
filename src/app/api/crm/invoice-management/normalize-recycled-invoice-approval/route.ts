import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            if (res.ok) return res;
        } catch (err) {
            if (i === retries - 1) throw err;
        }
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
    throw new Error("Fetch failed after retries");
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

async function getCurrentUserId(): Promise<number | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;
    if (!token) return null;
    return decodeUserIdFromJwt(token);
}

interface DirectusRequestRow {
    id: number;
    invoice_id: number;
    invoice_no: string;
    order_id: number;
    requested_by: number;
    requested_date: string;
    status: string;
    remarks: string | null;
}

interface DirectusUserRow {
    user_id: number;
    user_fname?: string;
    user_lname?: string;
}

interface DirectusInvoiceDetailRow {
    invoice_no: number;
    product_id: number;
    quantity: number;
    unit_price: number;
    total_amount: number;
}

interface DirectusProductRow {
    product_id: number;
    product_name: string;
}

interface DirectusOrderDetailRow {
    detail_id: number;
    product_id: number;
    served_quantity: number;
}

// GET: Fetch all normalize requests, enriched with requester name
export async function GET() {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
        // Fetch all requests (all statuses)
        const requestsUrl = `${DIRECTUS_URL}/items/normalize_recycled_invoice_requests?sort[]=-requested_date&limit=-1`;
        const requestsRes = await fetchWithRetry(requestsUrl, { headers, cache: "no-store" });
        const requestsJson = await requestsRes.json();
        const requests: DirectusRequestRow[] = requestsJson.data || [];

        if (requests.length === 0) {
            return NextResponse.json({ data: [] });
        }

        // Resolve user names: fetch unique user IDs
        const userIds = Array.from(new Set(requests.map((r) => r.requested_by).filter(Boolean)));
        const userMap: Record<number, string> = {};
        if (userIds.length > 0) {
            try {
                const userUrl = `${DIRECTUS_URL}/items/user?filter[user_id][_in]=${userIds.join(",")}&fields=user_id,user_fname,user_lname`;
                const userRes = await fetchWithRetry(userUrl, { headers, cache: "no-store" });
                const userJson = await userRes.json();
                const users: DirectusUserRow[] = userJson.data || [];
                users.forEach((u) => {
                    userMap[u.user_id] = [u.user_fname, u.user_lname].filter(Boolean).join(" ") || `User #${u.user_id}`;
                });
            } catch {
                // fallback to raw ID if user fetch fails
            }
        }

        // Fetch invoice details using invoice_id
        const invoiceIds = Array.from(new Set(requests.map((r) => r.invoice_id).filter(Boolean)));
        const detailsMap: Record<number, (DirectusInvoiceDetailRow & { product_name: string | null })[]> = {};
        if (invoiceIds.length > 0) {
            try {
                const detailsUrl = `${DIRECTUS_URL}/items/sales_invoice_details?filter[invoice_no][_in]=${invoiceIds.join(",")}&fields=invoice_no,product_id,quantity,unit_price,total_amount`;
                const detailsRes = await fetchWithRetry(detailsUrl, { headers, cache: "no-store" });
                const detailsJson = await detailsRes.json();
                const details: DirectusInvoiceDetailRow[] = detailsJson.data || [];

                // Fetch product names
                const productIds = Array.from(new Set(details.map((d) => d.product_id).filter(Boolean)));
                const productMap: Record<number, string> = {};
                if (productIds.length > 0) {
                    try {
                        const prodUrl = `${DIRECTUS_URL}/items/products?filter[product_id][_in]=${productIds.join(",")}&fields=product_id,product_name`;
                        const prodRes = await fetchWithRetry(prodUrl, { headers, cache: "no-store" });
                        const prodJson = await prodRes.json();
                        const products: DirectusProductRow[] = prodJson.data || [];
                        products.forEach((p) => {
                            productMap[p.product_id] = p.product_name;
                        });
                    } catch {
                        // Ignore error if fetching products fails
                    }
                }

                details.forEach((d) => {
                    const invId = Number(d.invoice_no);
                    if (!detailsMap[invId]) detailsMap[invId] = [];
                    detailsMap[invId].push({
                        ...d,
                        product_name: productMap[d.product_id] || null
                    });
                });
            } catch {
                // Ignore
            }
        }

        const enriched = requests.map((r) => ({
            ...r,
            requested_by_name: userMap[r.requested_by] ?? `User #${r.requested_by}`,
            invoice_details: detailsMap[r.invoice_id] || []
        }));

        return NextResponse.json({ data: enriched });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// PATCH: Approve or Reject a request
export async function PATCH(req: NextRequest) {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    try {
        const body = await req.json();
        const { id, action } = body;

        if (!id || !action) {
            return NextResponse.json({ error: "id and action are required" }, { status: 400 });
        }

        if (action !== "Approved" && action !== "Rejected") {
            return NextResponse.json({ error: "action must be 'Approved' or 'Rejected'" }, { status: 400 });
        }

        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized. Could not identify the logged-in user." }, { status: 401 });
        }

        // Get exact PH Time (UTC+8) literal in YYYY-MM-DD HH:mm:ss format
        const utcNow = new Date();
        const phTime = new Date(utcNow.getTime() + (8 * 60 * 60 * 1000));
        const phLiteral = `${phTime.getUTCFullYear()}-${String(phTime.getUTCMonth() + 1).padStart(2, '0')}-${String(phTime.getUTCDate()).padStart(2, '0')} ${String(phTime.getUTCHours()).padStart(2, '0')}:${String(phTime.getUTCMinutes()).padStart(2, '0')}:${String(phTime.getUTCSeconds()).padStart(2, '0')}`;
        
        const updatePayload: Record<string, unknown> = { status: action };

        if (action === "Approved") {
            updatePayload.approved_by = userId;
            updatePayload.approved_at = phLiteral;
        } else if (action === "Rejected") {
            updatePayload.rejected_by = userId;
            updatePayload.rejected_at = phLiteral;
        }

        const patchRes = await fetchWithRetry(
            `${DIRECTUS_URL}/items/normalize_recycled_invoice_requests/${id}?fields=*`,
            {
                method: "PATCH",
                headers,
                body: JSON.stringify(updatePayload)
            }
        );

        if (!patchRes.ok) {
            const errText = await patchRes.text();
            throw new Error(`Failed to update request: ${errText}`);
        }

        const json = await patchRes.json();
        const requestData = json.data as DirectusRequestRow;

        const warnings: string[] = [];

        // If approved, update the actual sales_invoice and sales_order records
        if (action === "Approved" && requestData?.invoice_id && requestData?.invoice_no && requestData?.order_id) {
            // 1. Update sales_invoice
            const currentInvoiceNo = String(requestData.invoice_no);
            const newInvoiceNo = currentInvoiceNo.startsWith("~") ? currentInvoiceNo : `~${currentInvoiceNo}`;
            
            const invoiceUpdatePayload = {
                transaction_status: "Normalized",
                invoice_no: newInvoiceNo
            };

            const invoicePatchRes = await fetchWithRetry(
                `${DIRECTUS_URL}/items/sales_invoice/${requestData.invoice_id}`,
                {
                    method: "PATCH",
                    headers,
                    body: JSON.stringify(invoiceUpdatePayload)
                }
            );

            if (!invoicePatchRes.ok) {
                const errText = await invoicePatchRes.text();
                warnings.push(`Failed to update sales invoice: ${errText}`);
            }

            // 2. Update sales_order
            const orderUpdatePayload = {
                not_fulfilled_at: null
            };

            const orderPatchRes = await fetchWithRetry(
                `${DIRECTUS_URL}/items/sales_order/${requestData.order_id}`,
                {
                    method: "PATCH",
                    headers,
                    body: JSON.stringify(orderUpdatePayload)
                }
            );

            if (!orderPatchRes.ok) {
                const errText = await orderPatchRes.text();
                warnings.push(`Failed to update sales order: ${errText}`);
            }

            // 3. Update sales_order_details (Quantity deduction)
            try {
                // Fetch invoice details
                const invDetailsRes = await fetchWithRetry(
                    `${DIRECTUS_URL}/items/sales_invoice_details?filter[invoice_no][_eq]=${requestData.invoice_id}&fields=product_id,quantity`,
                    { headers, cache: "no-store" }
                );
                const invDetailsJson = await invDetailsRes.json();
                const invoiceDetails: DirectusInvoiceDetailRow[] = invDetailsJson.data || [];

                // Fetch order details
                const ordDetailsRes = await fetchWithRetry(
                    `${DIRECTUS_URL}/items/sales_order_details?filter[order_id][_eq]=${requestData.order_id}&fields=detail_id,product_id,served_quantity`,
                    { headers, cache: "no-store" }
                );
                const ordDetailsJson = await ordDetailsRes.json();
                const orderDetails: DirectusOrderDetailRow[] = ordDetailsJson.data || [];

                // Map and compute
                for (const invItem of invoiceDetails) {
                    const matchOrder = orderDetails.find((o) => o.product_id === invItem.product_id);
                    if (!matchOrder) {
                        warnings.push(`No matching product_id ${invItem.product_id} found in sales_order_details`);
                        continue;
                    }

                    const currentServed = Number(matchOrder.served_quantity) || 0;
                    const deduction = Number(invItem.quantity) || 0;
                    let newServed = currentServed - deduction;
                    if (newServed < 0) newServed = 0; // Cap at 0

                    const detailPatchRes = await fetchWithRetry(
                        `${DIRECTUS_URL}/items/sales_order_details/${matchOrder.detail_id}`,
                        {
                            method: "PATCH",
                            headers,
                            body: JSON.stringify({ served_quantity: newServed })
                        }
                    );

                    if (!detailPatchRes.ok) {
                        const errText = await detailPatchRes.text();
                        warnings.push(`Failed to update served_quantity for product ${invItem.product_id}: ${errText}`);
                    }
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Error processing details";
                warnings.push(`Failed to process sales_order_details update: ${message}`);
            }
        }

        const responsePayload: { data: DirectusRequestRow; warning?: string } = { data: requestData };
        if (warnings.length > 0) {
            responsePayload.warning = `Request approved, but with warnings: ${warnings.join(' | ')}`;
        }

        return NextResponse.json(responsePayload);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
