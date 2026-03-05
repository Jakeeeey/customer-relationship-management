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
        const offset = (page - 1) * pageSize;

        // Fetch attachments + lookup tables in parallel
        const attachmentParams = new URLSearchParams({
            limit: pageSize.toString(),
            offset: offset.toString(),
            meta: "*",
            "filter[status][_eq]": "pending",
            sort: "-created_date",
        });

        const [attachmentRes, salesmen, customers] = await Promise.all([
            fetch(`${DIRECTUS_URL}/items/sales_order_attachment?${attachmentParams}`, { cache: "no-store" }),
            fetchAll<{ id: number; salesman_name: string }>("/items/salesman?limit=-1&fields=id,salesman_name"),
            fetchAll<{ id: number; customer_code: string; customer_name: string }>(
                "/items/customer?limit=-1&fields=id,customer_code,customer_name"
            ),
        ]);

        if (!attachmentRes.ok) {
            throw new Error(`Directus error fetching attachments: ${attachmentRes.statusText}`);
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

        return NextResponse.json({
            callsheets: enriched,
            metadata: {
                total_count: attachmentJson.meta?.total_count || 0,
                filter_count: attachmentJson.meta?.filter_count ?? attachmentJson.meta?.total_count ?? 0,
                page,
                pageSize,
                lastUpdated: new Date().toISOString(),
            },
        });
    } catch (e) {
        console.error("Callsheet API GET error:", e);
        return NextResponse.json(
            { error: "Failed to fetch callsheets", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}
