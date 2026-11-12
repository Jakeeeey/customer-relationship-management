"use client";
import type { AllocationContext, AllocationSnapshot } from "../types";

const BASE = "/api/crm/customer-hub/allocations";
async function read<T>(url: string, signal?: AbortSignal): Promise<T> {
    const response = await fetch(url, { cache: "no-store", signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Allocation data is unavailable");
    return data;
}
export const allocationProvider = {
    context: (signal?: AbortSignal) => read<AllocationContext>(`${BASE}/context`, signal),
    snapshot: (warehouseId: number | "all", historyPage: number, signal?: AbortSignal) => read<AllocationSnapshot>(`${BASE}/overview?warehouseId=${warehouseId}&page=${historyPage}`, signal),
    preview: async (warehouseId: number, orderIds: number[]) => {
        const response = await fetch(`${BASE}/preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ warehouseId, orderIds }) });
        const data = await response.json();
        if (!response.ok) throw new Error([data.message, ...(data.blockers || [])].filter(Boolean).join("\n"));
        return data;
    },
};
