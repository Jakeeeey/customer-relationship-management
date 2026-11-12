import "server-only";
import { cookies } from "next/headers";
import type { AllocationContext, Warehouse } from "@/modules/customer-relationship-management/customer-hub/sales-order-allocation/types";

export const MODULE_PATH = "/crm/customer-hub/sales-order-allocation";
export class AllocationError extends Error {
    constructor(public code: string, message: string, public status = 403) { super(message); }
}
export type RecordRow = Record<string, unknown>;

export async function directusPage<T>(collection: string, filter: object, fields: string, limit = 200, offset = 0, sort = "id"): Promise<T[]> {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    if (!base || !token) throw new AllocationError("DATA_UNAVAILABLE", "Directus configuration is unavailable", 503);
    const query = new URLSearchParams({ filter: JSON.stringify(filter), fields, limit: String(limit), offset: String(offset), sort });
    const response = await fetch(`${base}/items/${collection}?${query}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new AllocationError("DATA_UNAVAILABLE", `Required ${collection} read failed`, 503);
    const json = await response.json();
    if (!Array.isArray(json.data)) throw new AllocationError("DATA_UNAVAILABLE", "Unexpected database response", 503);
    return json.data;
}

export async function readAll<T>(collection: string, filter: object, fields: string, sort = "id"): Promise<T[]> {
    const result: T[] = [];
    for (let offset = 0; offset < 20_000; offset += 200) {
        const page = await directusPage<T>(collection, filter, fields, 200, offset, sort);
        result.push(...page);
        if (page.length < 200) return result;
    }
    throw new AllocationError("INCOMPLETE_SNAPSHOT", "Snapshot exceeds the safe read limit; no partial order list will be used", 503);
}

export interface ReadContext extends AllocationContext { sessionToken: string }

export async function resolveAllocationAccess(): Promise<ReadContext> {
    const token = (await cookies()).get("vos_access_token")?.value;
    if (!token) throw new AllocationError("SIGN_IN_REQUIRED", "Please sign in", 401);
    const spring = process.env.SPRING_API_BASE_URL?.replace(/\/+$/, "");
    if (!spring) throw new AllocationError("AUTH_UNAVAILABLE", "Session verification is unavailable", 503);
    let verified: Response;
    try {
        verified = await fetch(`${spring}/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(5000) });
    } catch { throw new AllocationError("AUTH_UNAVAILABLE", "Session verification is unavailable", 503); }
    if (!verified.ok) throw new AllocationError("INVALID_SESSION", "Session verification failed", verified.status >= 500 ? 503 : 401);
    let claims: RecordRow;
    try { claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")); }
    catch { throw new AllocationError("INVALID_SESSION", "Invalid session", 401); }
    if (claims.role !== "ADMIN" && (!Array.isArray(claims.subsystems) || !claims.subsystems.includes("crm"))) throw new AllocationError("CRM_DENIED", "CRM access is required");
    if (typeof claims.email !== "string") throw new AllocationError("IDENTITY_UNRESOLVED", "The verified session has no canonical email");
    const users = await directusPage<{ user_id: number; user_fname: string; user_lname: string }>("user", { user_email: { _eq: claims.email } }, "user_id,user_fname,user_lname", 2, 0, "user_id");
    if (users.length !== 1) throw new AllocationError("IDENTITY_UNRESOLVED", "Cannot uniquely identify the current VOS user");
    const user = users[0];
    const modules = await directusPage<{ id: number }>("modules", { base_path: { _eq: MODULE_PATH }, status: { _eq: "active" } }, "id", 2);
    if (modules.length !== 1) throw new AllocationError("MODULE_NOT_REGISTERED", "An administrator must register Sales Order Allocation under Customer Hub before granting access");
    const grants = await directusPage<{ id: number }>("user_access_modules", { user_id: { _eq: user.user_id }, module_id: { _eq: modules[0].id } }, "id", 1);
    if (claims.role !== "ADMIN" && !grants.length) throw new AllocationError("ALLOCATION_DENIED", "An explicit Allocation module grant is required. Salesman access does not grant allocation access.");
    // Verified existing FK: branches.branch_head -> user.user_id. Do not infer
    // warehouse authority from salesman assignments, encoder links or browser IDs.
    // Allocation module access is the explicit capability granting warehouse-wide
    // read scope. Salesman and branch-head assignments must not narrow the queue.
    const branches = await readAll<{ id: number; branch_name: string }>("branches", {}, "id,branch_name");
    if (!branches.length) throw new AllocationError("WAREHOUSE_DENIED", "No warehouses are available for allocation review.");
    return { user: { id: user.user_id, name: `${user.user_fname} ${user.user_lname}`.trim() },
        warehouses: branches.map(branch => ({ id: branch.id, name: branch.branch_name })), sessionToken: token,
        capabilities: { read: true, preview: true, confirm: false, release: false, history: true, inventory: true } };
}

export function requireWarehouse(context: AllocationContext, value: unknown): Warehouse {
    const id = Number(value);
    const warehouse = context.warehouses.find(row => row.id === id);
    if (!Number.isSafeInteger(id) || !warehouse) throw new AllocationError("WAREHOUSE_DENIED", "Warehouse access denied");
    return warehouse;
}
