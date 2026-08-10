import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = "vos_access_token";

interface JwtPayload {
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

export const dynamic = "force-dynamic";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

const fetchHeaders = {
    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    "Content-Type": "application/json",
};

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const salesman_id = formData.get("salesman_id");
        const customer_code = formData.get("customer_code");
        const po_no = formData.get("po_no");
        const supplier_id = formData.get("supplier_id");
        const file_ids_str = formData.get("file_ids") as string;
        const file_names_str = formData.get("file_names") as string;

        const file_ids = file_ids_str ? JSON.parse(file_ids_str) : [];
        const file_names = file_names_str ? JSON.parse(file_names_str) : [];

        if (!salesman_id || !customer_code || file_ids.length === 0 || !po_no) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const now = new Date();
        let prefix = "SO";
        
        if (supplier_id) {
            try {
                const suppRes = await fetch(`${DIRECTUS_URL}/items/suppliers/${supplier_id}?fields=supplier_shortcut`, { headers: fetchHeaders });
                if (suppRes.ok) {
                    const suppData = (await suppRes.json()).data;
                    if (suppData && suppData.supplier_shortcut) {
                        prefix = suppData.supplier_shortcut;
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch supplier shortcut:", e);
            }
        }
        
        const orderNo = `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

        let createdBy: number | null = null;
        try {
            const cookieStore = await cookies();
            const token = cookieStore.get(COOKIE_NAME)?.value;
            if (token) {
                const payload = decodeJwtPayload(token);
                const email = payload?.email || payload?.Email || "";

                if (email && !createdBy) {
                    const res = await fetch(`${DIRECTUS_URL}/items/user?filter[user_email][_eq]=${encodeURIComponent(email)}&fields=user_id&limit=1`, { headers: fetchHeaders });
                    if (res.ok) {
                        const data = (await res.json()).data;
                        if (data && data.length > 0) createdBy = data[0].user_id;
                    }
                }
            }
        } catch (e) {
            console.warn("Failed to decode token / fetch user:", e);
        }

        // 1. Create Sales Order Header
        const soPayload: Record<string, unknown> = {
            order_no: orderNo,
            po_no: po_no.toString(),
            customer_code: customer_code.toString(),
            salesman_id: Number(salesman_id),
            order_type: 1,
            order_status: "Pending",
            order_date: now.toISOString().split("T")[0],
            due_date: now.toISOString().split("T")[0],
            created_by: createdBy,
            created_date: now.toISOString(),
        };

        if (supplier_id) {
            soPayload.supplier_id = Number(supplier_id);
        }

        const createSoRes = await fetch(`${DIRECTUS_URL}/items/sales_order`, {
            method: "POST",
            headers: fetchHeaders,
            body: JSON.stringify(soPayload),
        });

        if (!createSoRes.ok) {
            const errBody = await createSoRes.text();
            throw new Error(`Failed to create sales order: ${errBody}`);
        }

        const soData = (await createSoRes.json()).data;
        const sales_order_id = soData.order_id;

        // 2. Create attachments from pre-uploaded file IDs
        for (let i = 0; i < file_ids.length; i++) {
            const file_id = file_ids[i];
            const file_name = file_names[i] || `Snapshot_${i}`;

            // 3. Create Sales Order Attachment
            const attachmentPayload = {
                sales_order_id,
                salesman_id: Number(salesman_id),
                customer_code: customer_code.toString(),
                file_id,
                attachment_name: file_name,
                sales_order_no: orderNo,
                status: "pending",
                created_by: createdBy,
                created_date: now.toISOString(),
            };

            const attachRes = await fetch(`${DIRECTUS_URL}/items/sales_order_attachment`, {
                method: "POST",
                headers: fetchHeaders,
                body: JSON.stringify(attachmentPayload),
            });

            if (!attachRes.ok) {
                const errBody = await attachRes.text();
                console.error("Failed to create attachment record:", errBody);
            }
        }

        return NextResponse.json({ success: true, order_no: orderNo, sales_order_id });
    } catch (err: unknown) {
        console.error("Snapshot Creation Error:", err);
        const errorMessage = err instanceof Error ? err.message : "Internal Server Error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const urlObj = new URL(req.url);
        const action = urlObj.searchParams.get("action");

        if (action === "init_context") {
            const cookieStore = await cookies();
            const token = cookieStore.get(COOKIE_NAME)?.value;
            if (!token) {
                return NextResponse.json({ isSalesman: false, error: "No token" }, { status: 401 });
            }

            const payload = decodeJwtPayload(token);
            const email = payload?.email || payload?.Email || "";
            if (!email) {
                return NextResponse.json({ isSalesman: false, error: "No email in token" }, { status: 401 });
            }

            let userId: number | null = null;
            const uRes = await fetch(`${DIRECTUS_URL}/items/user?filter[user_email][_eq]=${encodeURIComponent(email)}&fields=user_id&limit=1`, { headers: fetchHeaders });
            if (uRes.ok) {
                const uData = (await uRes.json()).data;
                if (uData && uData.length > 0) userId = uData[0].user_id;
            }

            if (!userId) {
                return NextResponse.json({ isSalesman: false, error: "User not found" }, { status: 404 });
            }

            // Check if they are a salesman
            const sRes = await fetch(`${DIRECTUS_URL}/items/salesman?filter[employee_id][_eq]=${userId}&limit=-1`, { headers: fetchHeaders });
            if (!sRes.ok) {
                return NextResponse.json({ isSalesman: false, error: "Failed to query salesman" }, { status: 500 });
            }

            const salesmen = (await sRes.json()).data || [];
            if (salesmen.length === 0) {
                return NextResponse.json({ isSalesman: false });
            }

            // They have salesman accounts. Now fetch all customers mapped to these salesmen.
            const salesmanIds = salesmen.map((s: { id: number }) => s.id);
            const csRes = await fetch(`${DIRECTUS_URL}/items/customer_salesmen?filter[salesman_id][_in]=${salesmanIds.join(",")}&limit=-1`, { headers: fetchHeaders });
            let customers: Record<string, unknown>[] = [];
            if (csRes.ok) {
                const csData = (await csRes.json()).data || [];
                const customerIds = Array.from(new Set(csData.map((cs: { customer_id: number }) => cs.customer_id).filter(Boolean)));
                if (customerIds.length > 0) {
                    const cRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[id][_in]=${customerIds.join(",")}&filter[isActive][_eq]=1&fields=*,province,city&limit=-1`, { headers: fetchHeaders });
                    if (cRes.ok) {
                        customers = (await cRes.json()).data || [];
                    }
                }
            }

            return NextResponse.json({
                isSalesman: true,
                salesmen,
                customers
            });
        }

        // Fetch all sales_orders where order_type = 2
        // We include salesman and customer details by expanding the relation fields
        // Since Directus relational fields require a deep fetch, we can just get the ID and fetch the rest, or use fields array.
        // Actually, Directus supports nested fields.
        const url = `${DIRECTUS_URL}/items/sales_order?filter[order_type][_eq]=1&fields=*&sort=-created_date&limit=-1`;
        
        const res = await fetch(url, { headers: fetchHeaders });
        
        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Failed to fetch snapshots: ${errBody}`);
        }

        const data = (await res.json()).data || [];

        // Now we should fetch attachments for these orders.
        const orderIds = data.map((o: { order_id: number }) => o.order_id);
        const salesmanIds = Array.from(new Set(data.map((o: { salesman_id: number }) => o.salesman_id).filter(Boolean)));
        const customerCodes = Array.from(new Set(data.map((o: { customer_code: string }) => o.customer_code).filter(Boolean)));
        
        let attachments: { sales_order_id?: number; [key: string]: unknown }[] = [];
        if (orderIds.length > 0) {
            const attUrl = `${DIRECTUS_URL}/items/sales_order_attachment?filter[sales_order_id][_in]=${orderIds.join(",")}&fields=id,sales_order_id,file_id,attachment_name,status`;
            const attRes = await fetch(attUrl, { headers: fetchHeaders });
            if (attRes.ok) {
                attachments = (await attRes.json()).data || [];
            }
        }

        const salesmenMap: Record<number, unknown> = {};
        if (salesmanIds.length > 0) {
            const smUrl = `${DIRECTUS_URL}/items/salesman?filter[id][_in]=${salesmanIds.join(",")}&fields=id,salesman_name,salesman_code`;
            const smRes = await fetch(smUrl, { headers: fetchHeaders });
            if (smRes.ok) {
                const smData = (await smRes.json()).data || [];
                smData.forEach((s: { id: number }) => salesmenMap[s.id] = s);
            }
        }

        const customersMap: Record<string, unknown> = {};
        if (customerCodes.length > 0) {
            // Encode the customer codes to avoid URI issues
            const cUrl = `${DIRECTUS_URL}/items/customer?filter[customer_code][_in]=${customerCodes.map(code => encodeURIComponent(String(code))).join(",")}&fields=id,customer_code,customer_name`;
            const cRes = await fetch(cUrl, { headers: fetchHeaders });
            if (cRes.ok) {
                const cData = (await cRes.json()).data || [];
                cData.forEach((c: { customer_code: string }) => customersMap[c.customer_code] = c);
            }
        }

        // Map attachments to their respective orders
        const finalData = data.map((order: { order_id: number; salesman_id: number; customer_code: string; [key: string]: unknown }) => {
            const orderAttachments = attachments.filter(a => a.sales_order_id === order.order_id);
            return {
                ...order,
                salesman: salesmenMap[order.salesman_id] || { id: order.salesman_id },
                customer: customersMap[order.customer_code] || { customer_code: order.customer_code },
                attachments: orderAttachments,
            };
        });

        return NextResponse.json(finalData);

    } catch (err: unknown) {
        console.error("Snapshot Fetch Error:", err);
        const errorMessage = err instanceof Error ? err.message : "Internal Server Error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

