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
        // Fetch all necessary data
        // 1. Get supervisor link (assuming user_id is in supervisor_per_division)
        // 2. We skip step 1 for now if we can't find the table and just fetch all to join
        const [
            usersRes,
            salesmenRes,
            mappingRes,
            supervisorsRes,
            taskTypesRes,
            customersRes,
            tasksRes,
            actionPlanRes,
            attachmentsRes
        ] = await Promise.all([
            fetch(`${DIRECTUS_URL}/items/user?limit=-1`, { headers: fetchHeaders }),
            fetch(`${DIRECTUS_URL}/items/salesman?limit=-1`, { headers: fetchHeaders }),
            fetch(`${DIRECTUS_URL}/items/salesman_per_supervisor?limit=-1`, { headers: fetchHeaders }),
            fetch(`${DIRECTUS_URL}/items/supervisor_per_division?limit=-1`, { headers: fetchHeaders }),
            fetch(`${DIRECTUS_URL}/items/task_type?limit=-1`, { headers: fetchHeaders }),
            fetch(`${DIRECTUS_URL}/items/customer?limit=-1`, { headers: fetchHeaders }),
            fetch(`${DIRECTUS_URL}/items/task?limit=-1`, { headers: fetchHeaders }),
            fetch(`${DIRECTUS_URL}/items/daily_action_plan?limit=-1`, { headers: fetchHeaders }),
            fetch(`${DIRECTUS_URL}/items/daily_action_plan_attachment?limit=-1`, { headers: fetchHeaders })
        ]);

        const [users, salesmen, mapping, supervisors, taskTypes, customers, tasks, actionPlans, attachments] = await Promise.all([
            usersRes.json().then(j => j.data || []),
            salesmenRes.json().then(j => j.data || []),
            mappingRes.json().then(j => j.data || []),
            supervisorsRes.json().then(j => j.data || []),
            taskTypesRes.json().then(j => j.data || []),
            customersRes.json().then(j => j.data || []),
            tasksRes.json().then(j => j.data || []),
            actionPlanRes.json().then(j => j.data || []),
            attachmentsRes.json().then(j => j.data || [])
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

        // Save to directus daily_action_plan table
        const res = await fetch(`${DIRECTUS_URL}/items/daily_action_plan`, {
            method: "POST",
            headers: fetchHeaders,
            body: JSON.stringify(body),
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
