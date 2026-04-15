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
        const statusParam = searchParams.get("status") || "pending";

        const offset = (page - 1) * pageSize;

        // Fetch lookup tables first to support name-based searching
        const [salesmen, customers] = await Promise.all([
            fetchAll<{ id: number; salesman_name: string; salesman_code: string }>("/items/salesman?limit=-1&fields=id,salesman_name,salesman_code"),
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
                { status: { _eq: statusParam } }
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
        attachmentParams.searchParams.append("limit", "-1"); // Fetch all to allow accurate post-grouping pagination
        attachmentParams.searchParams.append("meta", "*");
        attachmentParams.searchParams.append("sort", "-created_date");
        attachmentParams.searchParams.append("filter", JSON.stringify(filter));

        const attachmentRes = await fetch(attachmentParams.toString(), { cache: "no-store" });

        if (!attachmentRes.ok) {
            const errorText = await attachmentRes.text();
            throw new Error(`Directus error fetching attachments: ${attachmentRes.status} ${errorText}`);
        }

        const attachmentJson = await attachmentRes.json();

        // Prepare IDs for resolving PO Numbers mapped to existing Sales Orders
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const validSalesOrderIds = Array.from(new Set((attachmentJson.data || []).map((r: any) => r.sales_order_id).filter(Boolean)));
        let soMetaMap = new Map<number, { po_no: string; order_status: string }>();
        if (validSalesOrderIds.length > 0) {
            try {
                const soFilter = `?filter[order_id][_in]=${validSalesOrderIds.join(",")}&fields=order_id,po_no,order_status&limit=-1`;
                const soData = await fetchAll<{ order_id: number; po_no: string; order_status: string }>(`/items/sales_order${soFilter}`);
                soMetaMap = new Map(soData.map(so => [so.order_id, { po_no: so.po_no, order_status: so.order_status }]));
            } catch (e) {
                console.error("[Callsheet API] Failed to fetch sales orders for PO Number and Status resolution", e);
            }
        }

        // Build lookup maps for O(1) enrichment
        const salesmanMap = new Map<number, string>(
            salesmen.map((s) => [s.id, s.salesman_name])
        );
        const customerMap = new Map<string, string>(
            customers.map((c) => [c.customer_code, c.customer_name])
        );

        // Enrich each record with resolved names and order metadata
        const enriched = (attachmentJson.data || [])
            .map((row: Record<string, unknown>) => {
                const soMeta = row.sales_order_id ? soMetaMap.get(row.sales_order_id as number) : null;
                return {
                    ...row,
                    salesman_name: salesmanMap.get(row.salesman_id as number) ?? `Salesman #${row.salesman_id}`,
                    customer_name: customerMap.get(row.customer_code as string) ?? row.customer_code,
                    po_no: soMeta?.po_no ?? null,
                    parent_order_status: soMeta?.order_status ?? null
                };
            })
            .filter((item: Record<string, unknown>) => {
                // EXCLUDE any attachment if it has a sales order AND its status is NO LONGER strictly "Pending"
                if (item.sales_order_id) {
                     const status = item.parent_order_status as string | null;
                     if (!status || status.trim().toLowerCase() !== "pending") {
                         return false; 
                     }
                }
                return true;
            });

        // Grouping logic based on sales_order_id or sales_order_no
        const groupedMap = new Map<string, Record<string, unknown>>();

        for (const item of enriched) {
            const groupKey = item.sales_order_id ? `id_${item.sales_order_id}` : `no_${item.sales_order_no}`;
            if (!groupedMap.has(groupKey)) {
                groupedMap.set(groupKey, {
                    ...item,
                    related_attachments: item.file_id ? [{
                        file_id: item.file_id,
                        attachment_name: item.attachment_name
                    }] : []
                });
            } else {
                const existing = groupedMap.get(groupKey);
                if (existing && item.file_id) {
                    const related = (existing.related_attachments as { file_id: number; attachment_name: string }[]) || [];
                    related.push({
                        file_id: item.file_id as number,
                        attachment_name: item.attachment_name as string
                    });
                    existing.related_attachments = related;
                }
            }
        }

        const groupedCallsheets = Array.from(groupedMap.values());
        
        // Accurate counting and pagination based on the purely grouped elements
        const trueTotalCount = groupedCallsheets.length;
        const paginatedCallsheets = groupedCallsheets.slice(offset, offset + pageSize);

        // Sort filter options safely
        const sortedSalesmen = [...salesmen].sort((a, b) =>
            (a.salesman_name || "").localeCompare(b.salesman_name || "")
        );
        const sortedCustomers = [...customers].sort((a, b) =>
            (a.customer_name || "").localeCompare(b.customer_name || "")
        );

        return NextResponse.json({
            callsheets: paginatedCallsheets,
            metadata: {
                total_count: trueTotalCount,
                filter_count: trueTotalCount,
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
