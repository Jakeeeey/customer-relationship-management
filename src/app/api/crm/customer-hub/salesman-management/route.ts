import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

const fetchHeaders = {
    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    "Content-Type": "application/json",
};

// 🚀 SHADCN/TS FIX: Created interfaces for our raw objects to kill the 'any' errors
interface RawSalesman {
    division_id?: string | number | Record<string, unknown>;
    [key: string]: unknown;
}

interface RawDivision {
    division_id: string | number;
    [key: string]: unknown;
}

export async function GET(req: NextRequest) {
    const action = req.nextUrl.searchParams.get("action");

    try {
        if (action === "list") {
            const page = req.nextUrl.searchParams.get("page") || "1";
            const limit = req.nextUrl.searchParams.get("limit") || "20";
            const search = req.nextUrl.searchParams.get("search") || "";
            const isActive = req.nextUrl.searchParams.get("isActive");

            let url = `${DIRECTUS_URL}/items/salesman?page=${page}&limit=${limit}&fields=*,division_id.*,branch_code.*,operation.*&meta=total_count`;

            const filters: Record<string, unknown>[] = [];
            if (search) {
                filters.push({
                    _or: [
                        { salesman_name: { _icontains: search } },
                        { salesman_code: { _icontains: search } }
                    ]
                });
            }
            if (isActive !== null) {
                filters.push({ isActive: { _eq: isActive === "true" ? 1 : 0 } });
            }

            if (filters.length > 0) {
                const filter = filters.length === 1 ? filters[0] : { _and: filters };
                url += `&filter=${encodeURIComponent(JSON.stringify(filter))}`;
            }

            const [salesmanRes, divisionRes] = await Promise.all([
                fetch(url, { headers: fetchHeaders, cache: "no-store" }),
                fetch(`${DIRECTUS_URL}/items/division?limit=-1`, { headers: fetchHeaders, cache: "no-store" })
            ]);

            const data = await salesmanRes.json();
            const divData = await divisionRes.json();
            const divisions: RawDivision[] = divData.data || [];

            // 🚀 FIX: Replaced 'any' with our strict interfaces!
            const enrichedSalesmen = (data.data || []).map((s: RawSalesman) => {
                if (s.division_id && typeof s.division_id !== "object") {
                    const matchedDiv = divisions.find((d: RawDivision) => String(d.division_id) === String(s.division_id));
                    if (matchedDiv) {
                        s.division_id = matchedDiv;
                    }
                }
                return s;
            });

            return NextResponse.json({
                data: enrichedSalesmen,
                meta: data.meta || { total_count: 0 }
            });
        }

        if (action === "vehicles") {
            const res = await fetch(`${DIRECTUS_URL}/items/vehicle_registration?limit=-1&fields=id,plate_number`, { headers: fetchHeaders, cache: "no-store" });
            const data = await res.json();
            return NextResponse.json({ data: data.data || [] });
        }

        if (action === "supporting-data") {
            const [branchesRes, divisionsRes, operationsRes, usersRes] = await Promise.all([
                fetch(`${DIRECTUS_URL}/items/branches?limit=-1&fields=id,branch_name,branch_code`, { headers: fetchHeaders }),
                fetch(`${DIRECTUS_URL}/items/division?limit=-1&fields=division_id,division_name,division_code`, { headers: fetchHeaders }),
                fetch(`${DIRECTUS_URL}/items/operation?limit=-1&fields=id,operation_name,operation_code`, { headers: fetchHeaders }),
                fetch(`${DIRECTUS_URL}/items/user?limit=-1&fields=user_id,user_fname,user_lname,user_position`, { headers: fetchHeaders })
            ]);

            const [branches, divisions, operations, users] = await Promise.all([
                branchesRes.json(),
                divisionsRes.json(),
                operationsRes.json(),
                usersRes.json()
            ]);

            return NextResponse.json({
                branches: branches.data || [],
                divisions: divisions.data || [],
                operations: operations.data || [],
                users: users.data || []
            });
        }

        if (action === "customer-count") {
            const id = req.nextUrl.searchParams.get("id");
            if (!id) return NextResponse.json({ count: 0 });
            const res = await fetch(`${DIRECTUS_URL}/items/customer_salesmen?filter[salesman_id][_eq]=${id}&limit=1&aggregate[count]=*`, { headers: fetchHeaders });
            const data = await res.json();
            const count = data.data?.[0]?.count || 0;
            return NextResponse.json({ count });
        }

        if (action === "assigned-customers") {
            const id = req.nextUrl.searchParams.get("id");
            if (!id) return NextResponse.json({ data: [] });

            const junctionUrl = `${DIRECTUS_URL}/items/customer_salesmen?filter[salesman_id][_eq]=${id}&limit=-1&fields=*`;
            const junctionRes = await fetch(junctionUrl, { headers: fetchHeaders, cache: "no-store" });
            const junctionData = await junctionRes.json();
            const junctions = junctionData.data || [];

            if (junctions.length === 0) return NextResponse.json({ data: [] });

            interface JunctionRecord { id: number; customer_id?: number; customer?: number }
            const customerIds = junctions.map((j: JunctionRecord) => j.customer_id || j.customer).filter(Boolean);

            if (customerIds.length === 0) return NextResponse.json({ data: [] });

            const customerFilter = { id: { _in: customerIds } };

            const customerUrl = `${DIRECTUS_URL}/items/customer?limit=-1&fields=*,store_type.*,classification.*,payment_term.*&filter=${encodeURIComponent(JSON.stringify(customerFilter))}`;

            const customerRes = await fetch(customerUrl, { headers: fetchHeaders, cache: "no-store" });
            const customerData = await customerRes.json();
            const customers = customerData.data || [];

            interface BaseCustomer { id: number; [key: string]: unknown }
            const formatted = junctions.map((j: JunctionRecord) => {
                const cId = j.customer_id || j.customer;
                const customerObj = customers.find((c: BaseCustomer) => c.id === cId) || {};

                return {
                    junction_id: j.id,
                    ...customerObj
                };
            });

            return NextResponse.json({ data: formatted });
        }

        if (action === "search-customers") {
            const search = req.nextUrl.searchParams.get("search") || "";
            const priceType = req.nextUrl.searchParams.get("priceType");

            let url = `${DIRECTUS_URL}/items/customer?limit=30&fields=*,store_type.*,classification.*,payment_term.*`;
            const filters: Record<string, unknown>[] = [];

            if (search) {
                filters.push({
                    _or: [
                        { customer_name: { _icontains: search } },
                        { customer_code: { _icontains: search } },
                        { store_name: { _icontains: search } }
                    ]
                });
            }

            if (priceType) {
                filters.push({ price_type: { _eq: priceType } });
            }

            if (filters.length > 0) {
                const finalFilter = filters.length === 1 ? filters[0] : { _and: filters };
                url += `&filter=${encodeURIComponent(JSON.stringify(finalFilter))}`;
            }

            const res = await fetch(url, { headers: fetchHeaders, cache: "no-store" });
            const data = await res.json();
            return NextResponse.json({ data: data.data || [] });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (e: unknown) {
        const err = e as Error;
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const id = req.nextUrl.searchParams.get("id");
    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get("action");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    try {
        const body = await req.json();

        if (action === "deactivate-reassign") {
            const { targetSalesmanId } = body;

            await fetch(`${DIRECTUS_URL}/items/salesman/${id}`, {
                method: "PATCH",
                headers: fetchHeaders,
                body: JSON.stringify({ isActive: 0 })
            });

            const assignmentsRes = await fetch(`${DIRECTUS_URL}/items/customer_salesmen?filter[salesman_id][_eq]=${id}&fields=id&limit=-1`, { headers: fetchHeaders });
            const assignments = (await assignmentsRes.json()).data || [];

            if (assignments.length > 0 && targetSalesmanId) {
                const assignmentIds = assignments.map((a: { id: number }) => a.id);
                await fetch(`${DIRECTUS_URL}/items/customer_salesmen`, {
                    method: "PATCH",
                    headers: fetchHeaders,
                    body: JSON.stringify({
                        keys: assignmentIds,
                        data: { salesman_id: Number(targetSalesmanId) }
                    })
                });
            }

            return NextResponse.json({ success: true });
        }

        const res = await fetch(`${DIRECTUS_URL}/items/salesman/${id}`, {
            method: "PATCH",
            headers: fetchHeaders,
            body: JSON.stringify(body)
        });
        const data = await res.json();
        return NextResponse.json({ success: true, data: data.data });
    } catch (e: unknown) {
        const err = e as Error;
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const action = req.nextUrl.searchParams.get("action");

    try {
        const body = await req.json();

        if (action === "assign-customer") {
            const res = await fetch(`${DIRECTUS_URL}/items/customer_salesmen`, {
                method: "POST",
                headers: fetchHeaders,
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.errors) throw new Error(data.errors[0].message);
            return NextResponse.json({ success: true, data: data.data });
        }

        const res = await fetch(`${DIRECTUS_URL}/items/salesman`, {
            method: "POST",
            headers: fetchHeaders,
            body: JSON.stringify(body)
        });
        const data = await res.json();
        return NextResponse.json({ success: true, id: data.data?.id });
    } catch (e: unknown) {
        const err = e as Error;
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const action = req.nextUrl.searchParams.get("action");

    try {
        if (action === "unassign-customer") {
            const junctionId = req.nextUrl.searchParams.get("junctionId");
            if (!junctionId) throw new Error("Junction ID required");

            const res = await fetch(`${DIRECTUS_URL}/items/customer_salesmen/${junctionId}`, {
                method: "DELETE",
                headers: fetchHeaders
            });
            if (!res.ok && res.status !== 204) throw new Error("Failed to delete junction record");
            return NextResponse.json({ success: true });
        }

        const id = req.nextUrl.searchParams.get("id");
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const assignmentsRes = await fetch(
            `${DIRECTUS_URL}/items/customer_salesmen?filter[salesman_id][_eq]=${id}&fields=id&limit=-1`,
            { headers: fetchHeaders }
        );
        const assignments = (await assignmentsRes.json()).data || [];

        if (assignments.length > 0) {
            const assignmentIds = assignments.map((a: { id: number }) => a.id);
            await fetch(`${DIRECTUS_URL}/items/customer_salesmen`, {
                method: "DELETE",
                headers: fetchHeaders,
                body: JSON.stringify(assignmentIds)
            });
        }

        const delRes = await fetch(`${DIRECTUS_URL}/items/salesman/${id}`, {
            method: "DELETE",
            headers: fetchHeaders
        });

        if (!delRes.ok && delRes.status !== 204) {
            const errText = await delRes.text();
            return NextResponse.json({ success: false, error: errText }, { status: 500 });
        }

        return NextResponse.json({ success: true, deletedAssignments: assignments.length });
    } catch (e: unknown) {
        const err = e as Error;
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}