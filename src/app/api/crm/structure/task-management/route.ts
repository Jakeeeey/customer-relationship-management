// src/app/api/crm/structure/task-management/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

const fetchHeaders = {
    Authorization: `Bearer ${STATIC_TOKEN}`,
    "Content-Type": "application/json",
};

function decodeUserIdFromJwt(token: string): number | null {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        const payloadPart = parts[1];
        const pad = "=".repeat((4 - (payloadPart.length % 4)) % 4);
        const b64 = (payloadPart + pad).replace(/-/g, "+").replace(/_/g, "/");
        const jsonStr = Buffer.from(b64, "base64").toString("utf8");
        const payload = JSON.parse(jsonStr);
        const userId = Number(payload.sub);
        return Number.isFinite(userId) ? userId : null;
    } catch {
        return null;
    }
}

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const userId = decodeUserIdFromJwt(token);

    if (!userId) {
        return NextResponse.json({ ok: false, message: "User not found in session" }, { status: 401 });
    }

    try {
        const [
            usersRes,
            salesmenRes,
            mappingRes,
            supervisorsRes,
            taskTypesRes,
            customersRes,
            tasksRes,
            actionPlanRes,
            attachmentsRes,
            mcpRes
        ] = await Promise.all([
            fetch(`${DIRECTUS_URL}/items/user?limit=-1`, { headers: fetchHeaders }),
            fetch(`${DIRECTUS_URL}/items/salesman?limit=-1`, { headers: fetchHeaders }),
            fetch(`${DIRECTUS_URL}/items/salesman_per_supervisor?limit=-1`, { headers: fetchHeaders }),
            fetch(`${DIRECTUS_URL}/items/supervisor_per_division?limit=-1`, { headers: fetchHeaders }),
            fetch(`${DIRECTUS_URL}/items/task_type?limit=-1`, { headers: fetchHeaders }),
            fetch(`${DIRECTUS_URL}/items/customer?limit=-1`, { headers: fetchHeaders }),
            fetch(`${DIRECTUS_URL}/items/task?limit=-1`, { headers: fetchHeaders }),
            fetch(`${DIRECTUS_URL}/items/daily_action_plan?limit=-1`, { headers: fetchHeaders }),
            fetch(`${DIRECTUS_URL}/items/daily_action_plan_attachment?limit=-1`, { headers: fetchHeaders }),
            fetch(`${DIRECTUS_URL}/items/monthly_coverage_plan?limit=-1`, { headers: fetchHeaders })
        ]);

        const [users, salesmen, mapping, supervisors, taskTypes, customers, tasks, actionPlans, attachments, monthlyCoveragePlans] = await Promise.all([
            usersRes.json().then(j => j.data || []),
            salesmenRes.json().then(j => j.data || []),
            mappingRes.json().then(j => j.data || []),
            supervisorsRes.json().then(j => j.data || []),
            taskTypesRes.json().then(j => j.data || []),
            customersRes.json().then(j => j.data || []),
            tasksRes.json().then(j => j.data || []),
            actionPlanRes.json().then(j => j.data || []),
            attachmentsRes.json().then(j => j.data || []),
            mcpRes.json().then(j => j.data || [])
        ]);

        return NextResponse.json({
            users,
            salesmen,
            mapping,
            supervisors,
            taskTypes,
            customers,
            tasks,
            actionPlans,
            attachments,
            monthlyCoveragePlans,
            currentUserId: userId
        });
    } catch (error) {
        console.error("Task Management BFF Error:", error);
        return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    const userId = token ? decodeUserIdFromJwt(token) : null;

    if (!userId) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { date, salesman_id } = body;

        if (!date || !salesman_id) {
            throw new Error("Date and Salesman ID are required");
        }

        const taskDate = new Date(date);
        const month = taskDate.getMonth() + 1; // MySQL tinyint 1-12
        const year = taskDate.getFullYear();

        // 1. Fetch current user role to determine initial status for both MCP and DAP
        const userRes = await fetch(`${DIRECTUS_URL}/items/user/${userId}?fields=role,user_position`, { headers: fetchHeaders });
        const userResData = await userRes.json();
        const currentUser = userResData.data || {};
        
        const isSupervisorOrAdmin = 
            currentUser.role === "ADMIN" || 
            (currentUser.user_position && /supervisor/i.test(currentUser.user_position));

        const initialStatus = isSupervisorOrAdmin ? "approved" : "pending";

        // 2. Check if MCP exists
        const mcpCheckRes = await fetch(
            `${DIRECTUS_URL}/items/monthly_coverage_plan?filter[salesman_id][_eq]=${salesman_id}&filter[month][_eq]=${month}&filter[year][_eq]=${year}`,
            { headers: fetchHeaders }
        );
        const mcpCheckData = await mcpCheckRes.json();
        let mcp_id: number;

        if (mcpCheckData.data && mcpCheckData.data.length > 0) {
            mcp_id = mcpCheckData.data[0].id;
            
            // If supervisor is adding to a pending plan, auto-approve the plan itself
            if (isSupervisorOrAdmin && mcpCheckData.data[0].status === "pending") {
                await fetch(`${DIRECTUS_URL}/items/monthly_coverage_plan/${mcp_id}`, {
                    method: "PATCH",
                    headers: fetchHeaders,
                    body: JSON.stringify({ status: "approved" })
                });
            }
        } else {
            // 3. Create MCP
            const createMcpRes = await fetch(`${DIRECTUS_URL}/items/monthly_coverage_plan`, {
                method: "POST",
                headers: fetchHeaders,
                body: JSON.stringify({
                    month,
                    year,
                    salesman_id,
                    created_by: userId,
                    created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
                    status: initialStatus
                }),
            });

            if (!createMcpRes.ok) {
                const err = await createMcpRes.text();
                throw new Error(`Failed to create Monthly Plan: ${err}`);
            }

            const newMcp = await createMcpRes.json();
            mcp_id = newMcp.data.id;
        }

        // 4. Save to directus daily_action_plan table
        const res = await fetch(`${DIRECTUS_URL}/items/daily_action_plan`, {
            method: "POST",
            headers: fetchHeaders,
            body: JSON.stringify({
                ...body,
                mcp_id,
                approval_status: initialStatus, // Always approve if creator is supervisor
                created_by: userId,
                created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Failed to create task: ${err}`);
        }

        const data = await res.json();
        return NextResponse.json({ ok: true, data: data.data });
    } catch (error) {
        return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    const userId = token ? decodeUserIdFromJwt(token) : null;
    
    if (!userId) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) throw new Error("Task ID is required for update");
        
        const res = await fetch(`${DIRECTUS_URL}/items/daily_action_plan/${id}`, {
            method: "PATCH",
            headers: fetchHeaders,
            body: JSON.stringify(updateData),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Failed to update task: ${err}`);
        }

        const data = await res.json();
        return NextResponse.json({ ok: true, data: data.data });
    } catch (error) {
        return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    const userId = token ? decodeUserIdFromJwt(token) : null;
    
    if (!userId) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!id) {
        return NextResponse.json({ ok: false, message: "ID is required" }, { status: 400 });
    }

    try {
        const res = await fetch(`${DIRECTUS_URL}/items/daily_action_plan/${id}`, {
            method: "DELETE",
            headers: fetchHeaders,
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Failed to delete task: ${err}`);
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
