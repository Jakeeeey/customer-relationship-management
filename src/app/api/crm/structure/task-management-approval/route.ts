// src/app/api/crm/structure/task-management-approval/route.ts
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
        console.error("Task Management Approval BFF Error:", error);
        return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

// Approval status update
export async function PATCH(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    const userId = token ? decodeUserIdFromJwt(token) : null;
    
    if (!userId) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { type, id, ...updateData } = body;

        if (!id || !type) throw new Error("ID and Type are required for update");
        
        const itemTable = type === "MCP" ? "monthly_coverage_plan" : "daily_action_plan";
        
        const res = await fetch(`${DIRECTUS_URL}/items/${itemTable}/${id}`, {
            method: "PATCH",
            headers: fetchHeaders,
            body: JSON.stringify({
                ...updateData,
                reviewed_by: userId,
                reviewed_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Failed to update ${type}: ${err}`);
        }

        const data = await res.json();
        return NextResponse.json({ ok: true, data: data.data });
    } catch (error) {
        return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
