import { NextRequest, NextResponse } from "next/server";
import { fetchWithRetry } from "@/modules/customer-relationship-management/customer-management/customer/fetch-with-retry";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const COLLECTION = "customer_bank_account";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const customer_id = req.nextUrl.searchParams.get("customer_id");

        let url = `${DIRECTUS_URL}/items/${COLLECTION}`;
        if (customer_id) {
            url += `?filter[customer_id][_eq]=${customer_id}`;
        }

        const token = process.env.DIRECTUS_STATIC_TOKEN;
        const res = await fetchWithRetry(url, {
            cache: "no-store",
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error(`Directus error fetching bank accounts: ${res.statusText}`);

        const json = await res.json();
        return NextResponse.json(json.data);
    } catch (e) {
        console.error("Bank Account API GET error:", e);
        return NextResponse.json(
            { error: "Failed to fetch bank accounts", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    if (!token) {
        return NextResponse.json({ error: "Server Error: DIRECTUS_STATIC_TOKEN is missing" }, { status: 500 });
    }

    try {
        const body = await req.json();
        const res = await fetchWithRetry(`${DIRECTUS_URL}/items/${COLLECTION}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Directus bank account create failed: ${res.statusText} - ${errorText}`);
        }

        const json = await res.json();
        return NextResponse.json(json.data);
    } catch (e) {
        console.error("Bank Account API POST error:", e);
        return NextResponse.json(
            { error: "Failed to create bank account", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    if (!token) {
        return NextResponse.json({ error: "Server Error: DIRECTUS_STATIC_TOKEN is missing" }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: "Bank Account ID is required" }, { status: 400 });
        }

        const res = await fetchWithRetry(`${DIRECTUS_URL}/items/${COLLECTION}/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(updateData),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Directus bank account update failed: ${res.statusText} - ${errorText}`);
        }

        const json = await res.json();
        return NextResponse.json(json.data);
    } catch (e) {
        console.error("Bank Account API PATCH error:", e);
        return NextResponse.json(
            { error: "Failed to update bank account", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    if (!token) {
        return NextResponse.json({ error: "Server Error: DIRECTUS_STATIC_TOKEN is missing" }, { status: 500 });
    }

    try {
        const id = req.nextUrl.searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Bank Account ID is required" }, { status: 400 });
        }

        const res = await fetchWithRetry(`${DIRECTUS_URL}/items/${COLLECTION}/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            },
        });

        if (!res.ok) {
            throw new Error(`Failed to delete bank account: ${res.statusText}`);
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Bank Account API DELETE error:", e);
        return NextResponse.json(
            { error: "Failed to delete bank account", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}
