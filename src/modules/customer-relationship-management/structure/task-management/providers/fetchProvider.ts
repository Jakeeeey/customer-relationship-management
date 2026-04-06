import { TaskManagementData, DailyActionPlan } from "../types";

const API_ENDPOINT = "/api/crm/structure/task-management";

export const fetchTaskManagementData = async (): Promise<TaskManagementData & { currentUserId: number }> => {
    const res = await fetch(API_ENDPOINT);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to fetch task management data");
    }
    return res.json();
};

export const createDailyActionPlan = async (data: Partial<DailyActionPlan>): Promise<boolean> => {
    const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create task");
    }
    return true;
};

export const updateDailyActionPlan = async (id: number, data: Partial<DailyActionPlan>): Promise<boolean> => {
    const res = await fetch(API_ENDPOINT, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
    });
    
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update task");
    }
    return true;
};

export const deleteDailyActionPlan = async (id: number): Promise<boolean> => {
    const res = await fetch(`${API_ENDPOINT}?id=${id}`, {
        method: "DELETE",
    });
    
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete task");
    }
    return true;
};
