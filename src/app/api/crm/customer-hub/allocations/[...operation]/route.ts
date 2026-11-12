import { NextRequest, NextResponse } from "next/server";
import { AllocationError, readAll, requireWarehouse, resolveAllocationAccess } from "../_lib/access";
import { allocationSnapshot, READINESS_BLOCKERS } from "../_lib/read-model";
import { quantity, quantityText } from "@/modules/customer-relationship-management/customer-hub/sales-order-allocation/domain/quantities";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ operation: string[] }> };
async function mapLimited<T, R>(items: T[], concurrency: number, task: (item: T) => Promise<R>): Promise<R[]> {
    const results = new Array<R>(items.length);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (true) {
            const index = next++;
            if (index >= items.length) return;
            results[index] = await task(items[index]);
        }
    }));
    return results;
}
function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } }); }
function failure(error: unknown) {
    return error instanceof AllocationError ? json({ code: error.code, message: error.message }, error.status)
        : json({ code: "ALLOCATION_READ_UNAVAILABLE", message: "Allocation data could not be read. No changes were made." }, 503);
}

export async function GET(request: NextRequest, route: RouteContext) {
    try {
        const context = await resolveAllocationAccess();
        const operation = (await route.params).operation;
        if (operation.length === 1 && operation[0] === "context") {
            // Never serialize the session token to the browser.
            return json({ user: context.user, warehouses: context.warehouses, capabilities: context.capabilities, mode: "shadow-read-only", blockers: READINESS_BLOCKERS });
        }
        if (!(operation.length === 1 && ["overview", "queue", "inventory", "shortages", "history"].includes(operation[0])) && !(operation.length === 2 && operation[0] === "orders" && /^\d+$/.test(operation[1]))) throw new AllocationError("NOT_FOUND", "Unknown allocation operation", 404);
        const requestedWarehouse = request.nextUrl.searchParams.get("warehouseId");
        const page = Number(request.nextUrl.searchParams.get("page") || "1");
        let snapshots;
        if (requestedWarehouse === "all") {
            // Only warehouses that actually have Draft orders can contribute
            // rows to this matrix. Avoid an inventory/read-model fan-out for the
            // other 90+ active warehouses on every page load.
            const drafts = await readAll<{ order_id: number; branch_id: number | null }>("sales_order", { order_status: { _eq: "Draft" } }, "order_id,branch_id", "order_id");
            const warehouseIds = [...new Set(drafts.map(row => row.branch_id == null ? 0 : Number(row.branch_id)))];
            const byId = new Map(context.warehouses.map(warehouse => [warehouse.id, warehouse]));
            const scopes = warehouseIds.map(id => id === 0 ? { id: 0, name: "Warehouse not assigned" } : byId.get(id) || { id, name: `Warehouse ${id}` });
            if (!scopes.length) scopes.push(context.warehouses[0]);
            snapshots = await mapLimited(scopes, 6, warehouse => allocationSnapshot(context, warehouse, page));
        } else {
            snapshots = [await allocationSnapshot(context, requireWarehouse(context, requestedWarehouse), page)];
        }
        const snapshot = requestedWarehouse !== "all" ? snapshots[0] : {
            ...snapshots[0],
            warehouse: { id: 0, name: "All warehouses" },
            readAt: new Date().toISOString(),
            orders: snapshots.flatMap(row => row.orders).sort((a, b) => a.id - b.id),
            inventory: snapshots.flatMap(row => row.inventory),
            inventoryError: snapshots.map(row => row.inventoryError).filter(Boolean).join(" ") || null,
            blockers: [...new Set(snapshots.flatMap(row => row.blockers))],
            history: { ...snapshots[0].history, rows: snapshots.flatMap(row => row.history.rows).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 25), hasMore: snapshots.some(row => row.history.hasMore) },
            summary: {
                orders: snapshots.reduce((sum, row) => sum + row.summary.orders, 0),
                fullLegacy: snapshots.reduce((sum, row) => sum + row.summary.fullLegacy, 0),
                partialLegacy: snapshots.reduce((sum, row) => sum + row.summary.partialLegacy, 0),
                unallocated: snapshots.reduce((sum, row) => sum + row.summary.unallocated, 0),
                excludedDrafts: snapshots.reduce((sum, row) => sum + row.summary.excludedDrafts, 0),
                excludedClosed: snapshots.reduce((sum, row) => sum + row.summary.excludedClosed, 0),
                allocatedByUnit: Object.fromEntries(snapshots.flatMap(row => Object.entries(row.summary.allocatedByUnit)).reduce((map, [unit, value]) => map.set(unit, quantityText((map.has(unit) ? quantity(map.get(unit)!) : 0n) + quantity(value))), new Map<string, string>())),
            },
        };
        if (operation[0] === "orders") {
            const order = snapshot.orders.find(row => row.id === Number(operation[1]));
            if (!order) throw new AllocationError("ORDER_DENIED", "Order not found in the authorized warehouse", 404);
            return json({ order, mode: snapshot.mode, blockers: snapshot.blockers });
        }
        if (operation[0] === "overview") return json(snapshot);
        if (operation[0] === "queue") return json({ rows: snapshot.orders, mode: snapshot.mode, blockers: snapshot.blockers });
        if (operation[0] === "history") return json(snapshot.history);
        return json({ rows: snapshot.inventory, error: snapshot.inventoryError, mode: snapshot.mode, blockers: snapshot.blockers });
    } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest, route: RouteContext) {
    try {
        const context = await resolveAllocationAccess();
        const operation = (await route.params).operation.join("/");
        if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) throw new AllocationError("ORIGIN_DENIED", "Cross-origin allocation requests are not allowed");
        if (operation === "preview") {
            let body: unknown;
            try { body = await request.json(); } catch { throw new AllocationError("INVALID_REQUEST", "Invalid preview request", 400); }
            if (!body || typeof body !== "object" || !Number.isSafeInteger((body as { warehouseId?: unknown }).warehouseId)) throw new AllocationError("INVALID_REQUEST", "warehouseId must be a numeric ID", 400);
            requireWarehouse(context, (body as { warehouseId: number }).warehouseId);
            // This endpoint does not calculate automatic proposals. Allocation
            // planning is manual and remains unsaved until a reservation backend exists.
            return json({ code: "MANUAL_PLANNING_ONLY", message: "Automatic proposals are not supported. Manual plans are not saved or reserved.", blockers: READINESS_BLOCKERS, proposal: null }, 412);
        }
        if (operation === "confirm") return json({ code: "ALLOCATION_CONFIRMATION_UNAVAILABLE", message: "Transactional reservations, warehouse capabilities and durable idempotency must be supplied by the authoritative backend. No writes were performed.", blockers: READINESS_BLOCKERS }, 503);
        if (/^\d+\/release$/.test(operation)) throw new AllocationError("RELEASE_DENIED", "Reservation release requires a separate permission and lifecycle integration");
        throw new AllocationError("NOT_FOUND", "Unknown allocation operation", 404);
    } catch (error) { return failure(error); }
}
