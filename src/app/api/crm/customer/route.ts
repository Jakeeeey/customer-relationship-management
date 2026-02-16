import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// CONFIG
// ============================================================================

const DIRECTUS_URL = "http://100.110.197.61:8056";
const LIMIT = 1000;

const COLLECTIONS = {
    CUSTOMER: "customer",
    BANK_ACCOUNTS: "customer_bank_account",
    DIVISION: "division",
    DEPARTMENT: "department",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================================
// HELPERS
// ============================================================================

async function fetchAll<T>(collection: string, offset = 0, acc: T[] = []): Promise<T[]> {
    const url = `${DIRECTUS_URL}/items/${collection}?limit=${LIMIT}&offset=${offset}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Directus error fetching ${collection}: ${res.statusText}`);

    const json = await res.json();
    const items = json.data || [];
    const all = [...acc, ...items];

    if (items.length === LIMIT) {
        return fetchAll(collection, offset + LIMIT, all);
    }

    return all;
}

// ============================================================================
// GET - List All Customers & Related Data
// ============================================================================

export async function GET(req: NextRequest) {
    try {
        const id = req.nextUrl.searchParams.get("id");

        if (id) {
            // Fetch single customer
            const res = await fetch(`${DIRECTUS_URL}/items/${COLLECTIONS.CUSTOMER}/${id}`, { cache: "no-store" });
            if (!res.ok) throw new Error(`Customer not found: ${id}`);
            const data = await res.json();
            return NextResponse.json(data.data);
        }

        // Fetch all customers and related data for enrichment
        const [customers, bankAccounts] = await Promise.all([
            fetchAll<any>(COLLECTIONS.CUSTOMER),
            fetchAll<any>(COLLECTIONS.BANK_ACCOUNTS),
        ]);

        // Basic enrichment: Link bank accounts to customers if there's a logical link
        // For now, we'll return them separately or try to match if a field exists
        // Since the SQL doesn't show a direct link, we'll return the full lists
        // and let the frontend handle specific association if needed.

        return NextResponse.json({
            customers,
            bank_accounts: bankAccounts,
            metadata: {
                total: customers.length,
                lastUpdated: new Date().toISOString(),
            },
        });
    } catch (e) {
        console.error("Customer API GET error:", e);
        return NextResponse.json(
            { error: "Failed to fetch customers", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}

// ============================================================================
// POST - Create Customer
// ============================================================================

export async function POST(req: NextRequest) {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    if (!token) {
        return NextResponse.json({ error: "Server Error: DIRECTUS_STATIC_TOKEN is missing" }, { status: 500 });
    }

    try {
        const body = await req.json();

        // Basic validation and sanitization
        const newCustomerData = { ...body };
        delete newCustomerData.bank_accounts; // Don't send this to customer collection

        const res = await fetch(`${DIRECTUS_URL}/items/${COLLECTIONS.CUSTOMER}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(newCustomerData),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Directus customer create failed: ${res.statusText} - ${errorText}`);
        }

        const json = await res.json();
        return NextResponse.json(json.data);
    } catch (e) {
        console.error("Customer API POST error:", e);
        return NextResponse.json(
            { error: "Failed to create customer", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}

// ============================================================================
// PATCH - Update Customer
// ============================================================================

export async function PATCH(req: NextRequest) {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    if (!token) {
        return NextResponse.json({ error: "Server Error: DIRECTUS_STATIC_TOKEN is missing" }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
        }

        const res = await fetch(`${DIRECTUS_URL}/items/${COLLECTIONS.CUSTOMER}/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(updateData),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Directus customer update failed: ${res.statusText} - ${errorText}`);
        }

        const json = await res.json();
        return NextResponse.json(json.data);
    } catch (e) {
        console.error("Customer API PATCH error:", e);
        return NextResponse.json(
            { error: "Failed to update customer", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}

// ============================================================================
// DELETE - Delete Customer
// ============================================================================

export async function DELETE(req: NextRequest) {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    if (!token) {
        return NextResponse.json({ error: "Server Error: DIRECTUS_STATIC_TOKEN is missing" }, { status: 500 });
    }

    try {
        const id = req.nextUrl.searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
        }

        const res = await fetch(`${DIRECTUS_URL}/items/${COLLECTIONS.CUSTOMER}/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            },
        });

        if (!res.ok) {
            throw new Error(`Failed to delete customer: ${res.statusText}`);
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Customer API DELETE error:", e);
        return NextResponse.json(
            { error: "Failed to delete customer", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}
