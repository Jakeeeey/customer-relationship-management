import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function buildFetchHeaders() {
    return {
        Authorization: `Bearer ${STATIC_TOKEN}`,
        "Content-Type": "application/json",
    };
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

function decodeUserIdFromJwt(token: string): number | null {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        const payloadPart = parts[1];
        const pad = "=".repeat((4 - (payloadPart.length % 4)) % 4);
        const b64 = (payloadPart + pad).replace(/-/g, "+").replace(/_/g, "/");
        const jsonStr = Buffer.from(b64, "base64").toString("utf8");
        const payload = JSON.parse(jsonStr);
        return Number(payload.id || payload.user_id || payload.sub);
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

export async function GET(req: NextRequest) {
    const configError = requireApiConfig();
    if (configError) return configError;

    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (id) {
            const res = await fetch(`${DIRECTUS_URL}/items/customer_group/${id}?fields=*,primary_customer_id.*`, {
                headers: buildFetchHeaders(),
                cache: "no-store",
            });
            if (!res.ok) throw new Error("Failed to fetch customer group");
            const json = await res.json();
            return NextResponse.json({ ok: true, data: json.data });
        }

        const q = (searchParams.get("q") ?? "").trim().toLowerCase();
        const url = `${DIRECTUS_URL}/items/customer_group?limit=-1&sort=-id&fields=*,primary_customer_id.customer_name`;
        
        const res = await fetch(url, {
            headers: buildFetchHeaders(),
            cache: "no-store",
        });

        if (!res.ok) throw new Error("Failed to fetch customer groups");
        const json = await res.json();
        let data = json.data || [];

        if (q) {
            data = data.filter((item: { group_name?: string; group_code?: string }) => 
                item.group_name?.toLowerCase().includes(q) || 
                item.group_code?.toLowerCase().includes(q)
            );
        }

        return NextResponse.json({ ok: true, data });
    } catch (error: unknown) {
        return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const configError = requireApiConfig();
    if (configError) return configError;

    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { customer_ids, ...groupData } = body;

        // 1. Create the customer group
        const res = await fetch(`${DIRECTUS_URL}/items/customer_group`, {
            method: "POST",
            headers: buildFetchHeaders(),
            body: JSON.stringify({
                ...groupData,
                isActive: groupData.isActive ?? 1
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Failed to create customer group: ${err}`);
        }

        const groupJson = await res.json();
        const groupId = groupJson.data.id;

        // 2. Update customers to belong to this group
        if (customer_ids && Array.isArray(customer_ids) && customer_ids.length > 0) {
            await fetch(`${DIRECTUS_URL}/items/customer`, {
                method: "PATCH",
                headers: buildFetchHeaders(),
                body: JSON.stringify({
                    keys: customer_ids,
                    data: { customer_group_id: groupId }
                }),
            });
        }

        return NextResponse.json({ ok: true, data: groupJson.data });
    } catch (error: unknown) {
        return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const configError = requireApiConfig();
    if (configError) return configError;

    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { id, customer_ids, removed_customer_ids, ...groupData } = body;

        if (!id) return NextResponse.json({ ok: false, message: "ID is required" }, { status: 400 });

        // 1. Update the customer group
        const res = await fetch(`${DIRECTUS_URL}/items/customer_group/${id}`, {
            method: "PATCH",
            headers: buildFetchHeaders(),
            body: JSON.stringify(groupData),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Failed to update customer group: ${err}`);
        }

        // 2. Add new customers to the group
        if (customer_ids && Array.isArray(customer_ids) && customer_ids.length > 0) {
            await fetch(`${DIRECTUS_URL}/items/customer`, {
                method: "PATCH",
                headers: buildFetchHeaders(),
                body: JSON.stringify({
                    keys: customer_ids,
                    data: { customer_group_id: id }
                }),
            });
        }

        // 3. Remove customers from the group
        if (removed_customer_ids && Array.isArray(removed_customer_ids) && removed_customer_ids.length > 0) {
            await fetch(`${DIRECTUS_URL}/items/customer`, {
                method: "PATCH",
                headers: buildFetchHeaders(),
                body: JSON.stringify({
                    keys: removed_customer_ids,
                    data: { customer_group_id: null }
                }),
            });
        }

        const json = await res.json();
        return NextResponse.json({ ok: true, data: json.data });
    } catch (error: unknown) {
        return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const configError = requireApiConfig();
    if (configError) return configError;

    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ ok: false, message: "ID is required" }, { status: 400 });

        // Before deleting, reset group ID for all customers in this group
        // Directus might handle this if ON DELETE SET NULL is configured, 
        // but let's be safe. Actually, the SQL provided says ON DELETE SET NULL.
        
        const res = await fetch(`${DIRECTUS_URL}/items/customer_group/${id}`, {
            method: "DELETE",
            headers: buildFetchHeaders(),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Failed to delete customer group: ${err}`);
        }

        return NextResponse.json({ ok: true });
    } catch (error: unknown) {
        return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
