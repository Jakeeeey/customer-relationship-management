import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const dynamic = "force-dynamic";

// ============================================================================
// GET - Fetch Reference Lists
// ============================================================================
export async function GET(req: NextRequest) {
    const type = req.nextUrl.searchParams.get("type");

    if (!type) {
        return NextResponse.json({ error: "Reference type is required" }, { status: 400 });
    }

    try {
        let collection = "";
        switch (type) {
            case "store_type":
                collection = "store_type";
                break;
            case "classification": // 🚀 Added Classification support
                collection = "customer_classification";
                break;
            case "discount_type":
                collection = "discount_type";
                break;
            case "user":
                collection = "user";
                break;
            case "salesman":
                collection = "salesman";
                break;
            case "payment_term":
                collection = "payment_terms";
                break;
            case "bank_name": // 🚀 Added Bank Name support
                collection = "bank_names";
                break;
            default:
                return NextResponse.json({ error: "Invalid reference type" }, { status: 400 });
        }

        const token = process.env.DIRECTUS_STATIC_TOKEN;
        const res = await fetch(`${DIRECTUS_URL}/items/${collection}?limit=1000`, { // Increased limit for larger lists
            cache: "no-store",
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch ${type}: ${res.statusText}`);
        }

        const json = await res.json();
        return NextResponse.json({ data: json.data });
    } catch (e) {
        console.error(`Reference API error (${type}):`, e);
        return NextResponse.json(
            { error: `Failed to fetch ${type}`, message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}

// ============================================================================
// POST - On-The-Fly Reference Creation
// ============================================================================
export async function POST(req: NextRequest) {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    if (!token) {
        return NextResponse.json({ error: "Server Error: DIRECTUS_STATIC_TOKEN is missing" }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { type, name } = body;

        if (!type || !name) {
            return NextResponse.json({ error: "Type and name are required" }, { status: 400 });
        }

        let collection = "";
        let payload = {};

        // 🚀 Map the generic 'name' to the specific Directus database columns
        if (type === "store_type") {
            collection = "store_type";
            payload = { store_type: name };
        } else if (type === "classification") {
            collection = "customer_classification";
            payload = { classification_name: name };
        } else {
            return NextResponse.json({ error: "Invalid reference type for creation" }, { status: 400 });
        }

        const res = await fetch(`${DIRECTUS_URL}/items/${collection}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Directus create failed: ${res.statusText} - ${errorText}`);
        }

        const json = await res.json();
        return NextResponse.json({ data: json.data }); // Returns the newly created DB record with its ID
    } catch (e) {
        console.error("Reference API POST error:", e);
        return NextResponse.json(
            { error: "Failed to create reference item", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}