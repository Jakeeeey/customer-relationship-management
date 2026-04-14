import { OPSOrder } from "../types";

export const opsDashboardProvider = {
    async getAllOrders(): Promise<OPSOrder[]> {
        const res = await fetch("/api/crm/customer-hub/ops-dashboard", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch OPS Dashboard data: ${res.statusText}`);
        }

        return await res.json();
    },
};
