import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

const fetchHeaders = {
    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    "Content-Type": "application/json",
};

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

            const res = await fetch(url, { headers: fetchHeaders, cache: "no-store" });
            const data = await res.json();

            return NextResponse.json({
                data: data.data || [],
                meta: data.meta || { total_count: 0 }
            });
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

            // STEP 1: Fetch ALL columns from junction
            const junctionUrl = `${DIRECTUS_URL}/items/customer_salesmen?filter[salesman_id][_eq]=${id}&limit=-1&fields=*`;
            const junctionRes = await fetch(junctionUrl, { headers: fetchHeaders, cache: "no-store" });
            const junctionData = await junctionRes.json();
            const junctions = junctionData.data || [];

            if (junctions.length === 0) return NextResponse.json({ data: [] });

            // 🚀 FIX: Typed the map payload to stop linting errors
            interface JunctionRecord { id: number; customer_id?: number; customer?: number }
            const customerIds = junctions.map((j: JunctionRecord) => j.customer_id || j.customer).filter(Boolean);

            if (customerIds.length === 0) return NextResponse.json({ data: [] });

            // STEP 2: Fetch the actual customers
            const customerFilter = { id: { _in: customerIds } };
            const customerUrl = `${DIRECTUS_URL}/items/customer?limit=-1&fields=*,store_type.*,classification.*&filter=${encodeURIComponent(JSON.stringify(customerFilter))}`;

            const customerRes = await fetch(customerUrl, { headers: fetchHeaders, cache: "no-store" });
            const customerData = await customerRes.json();
            const customers = customerData.data || [];

            // STEP 3: Stitch them perfectly together
            // 🚀 FIX: Typed the map payload to stop linting errors
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
            let url = `${DIRECTUS_URL}/items/customer?limit=20&fields=*,store_type.*,classification.*`;

            if (search) {
                const filter = {
                    _or: [
                        { customer_name: { _icontains: search } },
                        { customer_code: { _icontains: search } },
                        { store_name: { _icontains: search } }
                    ]
                };
                url += `&filter=${encodeURIComponent(JSON.stringify(filter))}`;
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