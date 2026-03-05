import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// CONFIG
// ============================================================================

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================================
// HELPERS
// ============================================================================

async function fetchAll<T>(path: string): Promise<T[]> {
    const res = await fetch(`${DIRECTUS_URL}${path}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Directus error fetching ${path}: ${res.statusText}`);
    const json = await res.json();
    return json.data || [];
}

// ============================================================================
// GET - List Pending Attachments enriched with Salesman & Customer names
// ============================================================================

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const pageSize = parseInt(searchParams.get("pageSize") || "10");
        const search = searchParams.get("search") || "";
        const customerCode = searchParams.get("customer_code") || "";
        const salesmanId = searchParams.get("salesman_id") || "";
        
        const offset = (page - 1) * pageSize;

        // Fetch lookup tables first to support name-based searching
        const [salesmen, customers] = await Promise.all([
            fetchAll<{ id: number; salesman_name: string }>("/items/salesman?limit=-1&fields=id,salesman_name"),
            fetchAll<{ id: number; customer_code: string; customer_name: string }>(
                "/items/customer?limit=-1&fields=id,customer_code,customer_name"
            ),
        ]);

        // Build filters for Directus
        interface DirectusFilter {
            _and?: (DirectusFilter | Record<string, unknown>)[];
            _or?: (DirectusFilter | Record<string, unknown>)[];
            [key: string]: unknown;
        }

        const filter: DirectusFilter = {
            _and: [
                { status: { _eq: "pending" } }
            ]
        };

        if (customerCode) {
            filter._and?.push({ customer_code: { _eq: customerCode } });
        }

        if (salesmanId) {
            filter._and?.push({ salesman_id: { _eq: parseInt(salesmanId) } });
        }

        if (search) {
            const searchLower = search.toLowerCase();
            
            // Find customers matching search name (with null checks)
            // Limit to 100 to avoid 431 Request Header Too Large
            const matchingCustomerCodes = customers
                .filter(c => 
                    (c.customer_name?.toLowerCase().includes(searchLower)) || 
                    (c.customer_code?.toLowerCase().includes(searchLower))
                )
                .slice(0, 100)
                .map(c => c.customer_code);
            
            // Find salesmen matching search name (with null checks)
            // Limit to 100 to avoid 431 Request Header Too Large
            const matchingSalesmanIds = salesmen
                .filter(s => s.salesman_name?.toLowerCase().includes(searchLower))
                .slice(0, 100)
                .map(s => s.id);

            const searchFilter: DirectusFilter = {
                _or: [
                    { sales_order_no: { _icontains: search } },
                    { attachment_name: { _icontains: search } }
                ]
            };

            if (matchingCustomerCodes.length > 0) {
                searchFilter._or?.push({ customer_code: { _in: matchingCustomerCodes } });
            }

            if (matchingSalesmanIds.length > 0) {
                searchFilter._or?.push({ salesman_id: { _in: matchingSalesmanIds } });
            }

            filter._and?.push(searchFilter);
        }

        const attachmentParams = new URL(DIRECTUS_URL + "/items/sales_order_attachment");
        attachmentParams.searchParams.append("limit", pageSize.toString());
        attachmentParams.searchParams.append("offset", offset.toString());
        attachmentParams.searchParams.append("meta", "*");
        attachmentParams.searchParams.append("sort", "-created_date");
        attachmentParams.searchParams.append("filter", JSON.stringify(filter));

        const attachmentRes = await fetch(attachmentParams.toString(), { cache: "no-store" });

        if (!attachmentRes.ok) {
            const errorText = await attachmentRes.text();
            throw new Error(`Directus error fetching attachments: ${attachmentRes.status} ${errorText}`);
        }

        const attachmentJson = await attachmentRes.json();

        // Build lookup maps for O(1) enrichment
        const salesmanMap = new Map<number, string>(
            salesmen.map((s) => [s.id, s.salesman_name])
        );
        const customerMap = new Map<string, string>(
            customers.map((c) => [c.customer_code, c.customer_name])
        );

        // Enrich each record with resolved names
        const enriched = (attachmentJson.data || []).map((row: Record<string, unknown>) => ({
            ...row,
            salesman_name: salesmanMap.get(row.salesman_id as number) ?? `Salesman #${row.salesman_id}`,
            customer_name: customerMap.get(row.customer_code as string) ?? row.customer_code,
        }));

        // Sort filter options safely
        const sortedSalesmen = [...salesmen].sort((a, b) => 
            (a.salesman_name || "").localeCompare(b.salesman_name || "")
        );
        const sortedCustomers = [...customers].sort((a, b) => 
            (a.customer_name || "").localeCompare(b.customer_name || "")
        );

        return NextResponse.json({
            callsheets: enriched,
            metadata: {
                total_count: attachmentJson.meta?.total_count || 0,
                filter_count: attachmentJson.meta?.filter_count ?? attachmentJson.meta?.total_count ?? 0,
                page,
                pageSize,
                lastUpdated: new Date().toISOString(),
            },
            filterOptions: {
                salesmen: sortedSalesmen,
                customers: sortedCustomers,
            }
        });
    } catch (e) {
        console.error("Callsheet API GET error:", e);
        return NextResponse.json(
            { error: "Failed to fetch callsheets", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}
