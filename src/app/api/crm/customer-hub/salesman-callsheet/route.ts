import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// ============================================================================
// CONFIG
// ============================================================================

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const COOKIE_NAME = "vos_access_token";
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================================
// HELPERS
// ============================================================================

const fetchHeaders = {
    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    "Content-Type": "application/json",
};

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

async function fetchAll<T>(path: string): Promise<T[]> {
    const res = await fetch(`${DIRECTUS_URL}${path}`, { headers: fetchHeaders, cache: "no-store" });
    if (!res.ok) throw new Error(`Directus error fetching ${path}: ${res.statusText}`);
    const json = await res.json();
    return json.data || [];
}

// ============================================================================
// GET - List Pending Attachments enriched with Salesman & Customer names
// ============================================================================

export async function GET(req: NextRequest) {
    try {
        // Authenticate & Verify Salesman
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;
        if (!token) {
            return NextResponse.json({ isSalesman: false, error: "No token" }, { status: 403 });
        }

        const payload = decodeJwtPayload(token);
        const email = payload?.email || payload?.Email || "";
        if (!email) {
            return NextResponse.json({ isSalesman: false, error: "No email in token" }, { status: 403 });
        }

        let userId: number | null = null;
        const uRes = await fetch(`${DIRECTUS_URL}/items/user?filter[user_email][_eq]=${encodeURIComponent(email)}&fields=user_id&limit=1`, { headers: fetchHeaders });
        if (uRes.ok) {
            const uData = (await uRes.json()).data;
            if (uData && uData.length > 0) userId = uData[0].user_id;
        }

        if (!userId) {
            return NextResponse.json({ isSalesman: false, error: "User not found" }, { status: 403 });
        }

        const sRes = await fetch(`${DIRECTUS_URL}/items/salesman?filter[employee_id][_eq]=${userId}&limit=-1`, { headers: fetchHeaders });
        if (!sRes.ok) {
            return NextResponse.json({ isSalesman: false, error: "Failed to query salesman" }, { status: 500 });
        }

        const authSalesmen = (await sRes.json()).data || [];
        if (authSalesmen.length === 0) {
            return NextResponse.json({ isSalesman: false }, { status: 403 });
        }
        
        const authSalesmanIds = authSalesmen.map((s: { id: number }) => s.id);

        const { searchParams } = new URL(req.url);
        const action = searchParams.get("action");
        if (action === "init_context") {
            return NextResponse.json({ isSalesman: true, salesmen: authSalesmen });
        }

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filter: any = {
            _and: [
                { status: { _eq: statusParam } },
                { salesman_id: { _in: authSalesmanIds } }
            ]
        };

        if (customerCode) {
            filter._and.push({ customer_code: { _eq: customerCode } });
        }

        if (salesmanId && authSalesmanIds.includes(parseInt(salesmanId))) {
            filter._and.push({ salesman_id: { _eq: parseInt(salesmanId) } });
        }

        if (search) {
            const searchLower = search.toLowerCase();

            // Find customers matching search name (with null checks)
            const matchingCustomerCodes = customers
                .filter(c =>
                    (c.customer_name?.toLowerCase().includes(searchLower)) ||
                    (c.customer_code?.toLowerCase().includes(searchLower))
                )
                .slice(0, 100)
                .map(c => c.customer_code);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const searchFilter: any = {
                _or: [
                    { sales_order_no: { _icontains: search } },
                    { attachment_name: { _icontains: search } }
                ]
            };

            if (matchingCustomerCodes.length > 0) {
                searchFilter._or.push({ customer_code: { _in: matchingCustomerCodes } });
            }

            filter._and.push(searchFilter);
        }

        const attachmentParams = new URL(DIRECTUS_URL + "/items/sales_order_attachment");
        attachmentParams.searchParams.append("limit", "-1");
        attachmentParams.searchParams.append("meta", "*");
        attachmentParams.searchParams.append("sort", "-created_date");
        attachmentParams.searchParams.append("filter", JSON.stringify(filter));

        const attachmentRes = await fetch(attachmentParams.toString(), { headers: fetchHeaders, cache: "no-store" });

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sortedSalesmen = [...authSalesmen].sort((a: any, b: any) =>
            (a.salesman_name || "").localeCompare(b.salesman_name || "")
        );
        const sortedCustomers = [...customers].sort((a, b) =>
            (a.customer_name || "").localeCompare(b.customer_name || "")
        );

        return NextResponse.json({
            isSalesman: true,
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
