// src/modules/customer-relationship-management/structure/task-management-approval/providers/fetchProvider.ts
import { TaskManagementData, DailyActionPlan } from "../types";

const API_BASE_URL = "/api/crm/structure/task-management-approval";

export const fetchTaskManagementData = async (): Promise<TaskManagementData & { currentUserId: number }> => {
    const res = await fetch(API_BASE_URL);
    if (!res.ok) {
        throw new Error("Failed to fetch task management data");
    }
    return res.json();
};

export const updateActionPlanStatus = async (id: number, status: "approved" | "rejected"): Promise<boolean> => {
    const res = await fetch(API_BASE_URL, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "DAP", id, approval_status: status }),
    });
    return res.ok;
};

export const updateMonthlyPlanStatus = async (id: number, status: "approved" | "rejected"): Promise<boolean> => {
    const res = await fetch(API_BASE_URL, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "MCP", id, status }),
    });
    return res.ok;
};

// Mirroring other methods just in case, although secondary in Approval module
export const updateDailyActionPlan = async (id: number, data: Partial<DailyActionPlan>): Promise<boolean> => {
    const res = await fetch(API_BASE_URL, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "DAP", id, ...data }),
    });
    return res.ok;
};

export const deleteDailyActionPlan = async (id: number): Promise<boolean> => {
    const res = await fetch(`${API_BASE_URL}?id=${id}`, {
        method: "DELETE",
    });
    return res.ok;
};
