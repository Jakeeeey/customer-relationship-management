import { TargetSetting, TacticalSKU } from "@/modules/customer-relationship-management/structure/target-settings/types";

export const targetSettingsProvider = {
    async getTargets(month: number, year: number) {
        const res = await fetch(`/api/crm/structure/target-settings?month=${month}&year=${year}`);
        if (!res.ok) throw new Error("Failed to fetch targets");
        return await res.json();
    },

    async saveTarget(data: {
        target: Partial<TargetSetting>;
        tacticalSkus: Partial<TacticalSKU>[];
        customerTargets: { customer_id: number; target_amount: number }[];
        supplierTargets: { supplier_id: number; target_amount: number }[];
    }) {
        const res = await fetch(`/api/crm/structure/target-settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to save target");
        return await res.json();
    }
};
