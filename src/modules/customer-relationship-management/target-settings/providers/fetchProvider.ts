import { TargetSetting, TacticalSKU } from "@/modules/customer-relationship-management/target-settings/types";

export const targetSettingsProvider = {
    async getTargets(month: number, year: number) {
        const res = await fetch(`/api/crm/target-settings?month=${month}&year=${year}`);
        if (!res.ok) throw new Error("Failed to fetch targets");
        return await res.json();
    },

    async saveTarget(data: { target: Partial<TargetSetting>; tacticalSkus: Partial<TacticalSKU>[] }) {
        const res = await fetch(`/api/crm/target-settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to save target");
        return await res.json();
    }
};
