import { NextRequest, NextResponse } from "next/server";
import { fetchWithRetry } from "@/modules/customer-relationship-management/customer-management/customer/fetch-with-retry";

// ============================================================================
// CONFIG
// ============================================================================

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const LIMIT = 1000;

const COLLECTIONS = {
    CUSTOMER: "customer",
    BANK_ACCOUNTS: "customer_bank_account",
    DIVISION: "division",
    DEPARTMENT: "department",
    CUSTOMER_SALESMEN: "customer_salesmen",
    SALESMAN: "salesman",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================================
// HELPERS
// ============================================================================

async function fetchAll<T>(collection: string, offset = 0, acc: T[] = []): Promise<T[]> {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    const url = `${DIRECTUS_URL}/items/${collection}?limit=${LIMIT}&offset=${offset}`;
    const res = await fetchWithRetry(url, {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error(`Directus error fetching ${collection}: ${res.statusText}`);

    const json = await res.json();
    const items = json.data || [];
    const all = [...acc, ...items];

    if (items.length === LIMIT) {
        return fetchAll(collection, offset + LIMIT, all);
    }

    return all;
}

// 🚀 GEOJSON PARSER HELPER
function parseGeometry(locationStr?: string | null) {
    if (!locationStr || locationStr.trim() === "") return null;

    // Assume user entered "Lat, Lon" (e.g. "16.0433, 120.3333")
    const coords = locationStr.split(',').map(c => parseFloat(c.trim()));

    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        // Directus/MySQL GeoJSON requires [Longitude, Latitude]
        return {
            type: "Point",
            coordinates: [coords[1], coords[0]]
        };
    }
    return null; // Return null if format is invalid to prevent DB crash
}

// ============================================================================
// GET - List All Customers & Related Data
// ============================================================================

export async function GET(req: NextRequest) {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (id) {
            // Fetch single customer and their bank accounts
            const [customerRes, bankRes] = await Promise.all([
                fetchWithRetry(`${DIRECTUS_URL}/items/${COLLECTIONS.CUSTOMER}/${id}`, {
                    cache: "no-store",
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                }),
                fetchWithRetry(`${DIRECTUS_URL}/items/${COLLECTIONS.BANK_ACCOUNTS}?filter[customer_id][_eq]=${id}`, {
                    cache: "no-store",
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                })
            ]);

            if (!customerRes.ok) throw new Error(`Customer not found: ${id}`);
            const customerData = await customerRes.json();
            const bankData = await bankRes.json();

            return NextResponse.json({
                ...customerData.data,
                bank_accounts: bankData.data || []
            });
        }

        const page = parseInt(searchParams.get("page") || "1");
        const pageSize = parseInt(searchParams.get("pageSize") || "10");
        const searchQuery = searchParams.get("q") || "";

        const statusFilter = searchParams.get("status") || "all";
        const storeTypeFilter = searchParams.get("storeType") || "all";
        const classificationFilter = searchParams.get("classification") || "all";

        const offset = (page - 1) * pageSize;

        const params = new URLSearchParams();
        params.append("limit", pageSize.toString());
        params.append("offset", offset.toString());
        params.append("meta", "*");

        if (searchQuery) params.append("search", searchQuery);

        if (statusFilter !== "all") {
            const isActive = statusFilter === "active" ? 1 : 0;
            params.append("filter[isActive][_eq]", isActive.toString());
        }
        if (storeTypeFilter !== "all") params.append("filter[store_type][_eq]", storeTypeFilter);
        if (classificationFilter !== "all") params.append("filter[classification][_eq]", classificationFilter);

        const customersUrl = `${DIRECTUS_URL}/items/${COLLECTIONS.CUSTOMER}?${params.toString()}`;
        const customersRes = await fetchWithRetry(customersUrl, {
            cache: "no-store",
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!customersRes.ok) throw new Error(`Directus error fetching customers: ${customersRes.statusText}`);
        const customersJson = await customersRes.json();

        const [bankAccounts, customerSalesmen, salesmen] = await Promise.all([
            fetchAll<Record<string, unknown>>(COLLECTIONS.BANK_ACCOUNTS),
            fetchAll<Record<string, unknown>>(COLLECTIONS.CUSTOMER_SALESMEN),
            fetchAll<Record<string, unknown>>(COLLECTIONS.SALESMAN)
        ]);

        const enrichedCustomers = (customersJson.data || []).map((customer: Record<string, unknown>) => {
            const myBanks = bankAccounts.filter((acc: Record<string, unknown>) => String(acc.customer_id) === String(customer.id));

            const mySalesmenLinks = customerSalesmen.filter((cs: Record<string, unknown>) => String(cs.customer_id) === String(customer.id));
            const firstLink = mySalesmenLinks[0];
            let mappedSalesmanName = "N/A";
            let mappedSalesmanCode = null;

            if (firstLink) {
                const salesmanData = salesmen.find((s: Record<string, unknown>) => String(s.id) === String(firstLink.salesman_id));
                if (salesmanData) {
                    mappedSalesmanName = String(salesmanData.salesman_name || "Unknown Salesman");
                    mappedSalesmanCode = salesmanData.salesman_code ? String(salesmanData.salesman_code) : null;
                }
            }

            // Convert Point back to String for UI
            let mappedLocation = customer.location;
            if (mappedLocation && typeof mappedLocation === 'object' && 'coordinates' in mappedLocation && Array.isArray((mappedLocation as { coordinates: unknown }).coordinates)) {
                const coords = (mappedLocation as { coordinates: [number, number] }).coordinates;
                mappedLocation = `${coords[1]}, ${coords[0]}`; // Lat, Lon
            }

            return {
                ...customer,
                location: mappedLocation,
                bank_accounts: myBanks,
                salesman_name: mappedSalesmanName,
                salesman_code: mappedSalesmanCode
            };
        });

        return NextResponse.json({
            customers: enrichedCustomers,
            bank_accounts: bankAccounts,
            metadata: {
                total_count: customersJson.meta?.total_count || 0,
                filter_count: customersJson.meta?.filter_count ?? customersJson.meta?.total_count ?? 0,
                page,
                pageSize,
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
    if (!token) return NextResponse.json({ error: "Server Error: DIRECTUS_STATIC_TOKEN is missing" }, { status: 500 });

    try {
        const body = await req.json();

        const newCustomerData = { ...body };
        delete newCustomerData.bank_accounts;

        const createRes = await fetchWithRetry(`${DIRECTUS_URL}/items/${COLLECTIONS.CUSTOMER}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(newCustomerData),
        });

        if (!createRes.ok) {
            const errorText = await createRes.text();
            throw new Error(`Directus customer create failed: ${createRes.statusText} - ${errorText}`);
        }

        const createJson = await createRes.json();
        const newId = createJson.data.id;

        const generatedCode = `MAIN-${String(newId).padStart(4, '0')}`;

        const patchRes = await fetchWithRetry(`${DIRECTUS_URL}/items/${COLLECTIONS.CUSTOMER}/${newId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ customer_code: generatedCode }),
        });

        if (!patchRes.ok) {
            console.warn(`Failed to patch customer code for ID ${newId}`);
            return NextResponse.json(createJson.data);
        }

        const patchJson = await patchRes.json();
        return NextResponse.json(patchJson.data);

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
    if (!token) return NextResponse.json({ error: "Server Error: DIRECTUS_STATIC_TOKEN is missing" }, { status: 500 });

    try {
        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });

        if (!updateData.customer_code || updateData.customer_code.trim() === "") {
            delete updateData.customer_code;
        }

        // 🚀 CRITICAL FIX: Handle Geometry formatting on Updates
        if (updateData.location !== undefined) {
            const geoJson = parseGeometry(updateData.location);
            if (geoJson) {
                updateData.location = geoJson;
            } else {
                updateData.location = null; // Clears the database location if user deletes it
            }
        }

        const res = await fetchWithRetry(`${DIRECTUS_URL}/items/${COLLECTIONS.CUSTOMER}/${id}`, {
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
    if (!token) return NextResponse.json({ error: "Server Error: DIRECTUS_STATIC_TOKEN is missing" }, { status: 500 });

    try {
        const id = req.nextUrl.searchParams.get("id");
        if (!id) return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });

        if (!id) {
            return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
        }

        const res = await fetchWithRetry(`${DIRECTUS_URL}/items/${COLLECTIONS.CUSTOMER}/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` },
        });

        if (!res.ok) throw new Error(`Failed to delete customer: ${res.statusText}`);

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Customer API DELETE error:", e);
        return NextResponse.json(
            { error: "Failed to delete customer", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}