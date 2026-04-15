// src/modules/customer-relationship-management/structure/task-management-approval/hooks/useTaskManagementApproval.ts
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { 
    startOfMonth, 
    endOfMonth, 
    eachDayOfInterval, 
    getYear, 
    getMonth,
    setMonth,
    setYear,
} from "date-fns";
import { 
    TaskManagementData, 
    SalesmanPerSupervisor,
    SupervisorPerDivision,
} from "../types";
import { toast } from "sonner";
import { 
    fetchTaskManagementData, 
    updateActionPlanStatus, 
    updateMonthlyPlanStatus,
    updateDailyActionPlan,
    deleteDailyActionPlan 
} from "../providers/fetchProvider";

export const useTaskManagementApproval = () => {
    const [data, setData] = useState<TaskManagementData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
    const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>("all");
    const [currentDate, setCurrentDate] = useState(new Date());

    const fetchTasks = useCallback(async (isBackground = false) => {
        if (!isBackground) setIsLoading(true);
        else setIsRefreshing(true);

        try {
            const result = await fetchTaskManagementData();
            setData(result);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to load tasks");
        } finally {
            if (!isBackground) setIsLoading(false);
            else setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Filtering logic based on Supervisor mapping (Mirrored)
    const filteredEmployees = useMemo(() => {
        if (!data) return [];
        const supervisorDivisionIds = data.supervisors
            .filter((s: SupervisorPerDivision) => s.supervisor_id === data.currentUserId)
            .map((s: SupervisorPerDivision) => s.id);
        if (supervisorDivisionIds.length === 0) return [];
        const mappedSalesmanIds = data.mapping
            .filter((m: SalesmanPerSupervisor) => supervisorDivisionIds.includes(m.supervisor_per_division_id))
            .map((m: SalesmanPerSupervisor) => m.salesman_id);
        const relevantSalesmen = data.salesmen.filter(s => mappedSalesmanIds.includes(s.id));
        const employeeIds = Array.from(new Set(relevantSalesmen.map(s => s.employee_id)));
        return data.users.filter(u => employeeIds.includes(u.user_id));
    }, [data]);

    const filteredSalesmen = useMemo(() => {
        if (!data) return [];
        const supervisorDivisionIds = data.supervisors
            .filter((s: SupervisorPerDivision) => s.supervisor_id === data.currentUserId)
            .map((s: SupervisorPerDivision) => s.id);
        if (supervisorDivisionIds.length === 0) return [];
        const mappedSalesmanIds = data.mapping
            .filter((m: SalesmanPerSupervisor) => supervisorDivisionIds.includes(m.supervisor_per_division_id))
            .map((m: SalesmanPerSupervisor) => m.salesman_id);
        let salesmen = data.salesmen.filter(s => mappedSalesmanIds.includes(s.id));
        if (selectedEmployeeId !== "all") {
            salesmen = salesmen.filter(s => String(s.employee_id) === selectedEmployeeId);
        }
        return salesmen;
    }, [data, selectedEmployeeId]);

    // Calendar logic
    const daysInMonth = useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        return eachDayOfInterval({ start, end });
    }, [currentDate]);

    const getTasksForDay = useCallback((day: Date) => {
        if (!data) return [];
        return data.actionPlans.filter(t => {
            const taskDate = new Date(t.date);
            const isSameDate = taskDate.getDate() === day.getDate() &&
                               taskDate.getMonth() === day.getMonth() &&
                               taskDate.getFullYear() === day.getFullYear();
            
            if (!isSameDate) return false;

            // Only show tasks that are PENDING for approval
            if (t.approval_status !== "pending") return false;

            // Optional: Filter by specific Salesman/Employee
            if (selectedSalesmanId !== "all") {
                return String(t.salesman_id) === selectedSalesmanId;
            }
            if (selectedEmployeeId !== "all") {
                const employeeSalesmanIds = data.salesmen
                    .filter(s => String(s.employee_id) === selectedEmployeeId)
                    .map(s => String(s.id));
                return employeeSalesmanIds.includes(String(t.salesman_id));
            }
            return true;
        });
    }, [data, selectedEmployeeId, selectedSalesmanId]);

    // Approval Handlers
    const handleApproveTask = async (id: number) => {
        try {
            const success = await updateActionPlanStatus(id, "approved");
            if (success) {
                toast.success("Task approved");
                fetchTasks(true);
            }
            return success;
        } catch {
            toast.error("Failed to approve task");
            return false;
        }
    };

    const handleRejectTask = async (id: number) => {
        try {
            const success = await updateActionPlanStatus(id, "rejected");
            if (success) {
                toast.success("Task rejected");
                fetchTasks(true);
            }
            return success;
        } catch {
            toast.error("Failed to reject task");
            return false;
        }
    };

    const handleApproveMonthlyPlan = async (id: number) => {
        try {
            const success = await updateMonthlyPlanStatus(id, "approved");
            if (success) {
                toast.success("Monthly plan approved");
                fetchTasks(true);
            }
            return success;
        } catch {
            toast.error("Failed to approve monthly plan");
            return false;
        }
    };

    const handleRejectMonthlyPlan = async (id: number) => {
        try {
            const success = await updateMonthlyPlanStatus(id, "rejected");
            if (success) {
                toast.success("Monthly plan rejected");
                fetchTasks(true);
            }
            return success;
        } catch {
            toast.error("Failed to reject monthly plan");
            return false;
        }
    };

    // Lists for Table View
    const pendingActionPlans = useMemo(() => {
        if (!data) return [];
        return data.actionPlans.filter(ap => ap.approval_status === "pending");
    }, [data]);

    const pendingMonthlyPlans = useMemo(() => {
        if (!data) return [];
        return data.monthlyCoveragePlans.filter(mp => mp.status === "pending");
    }, [data]);

    return {
        data,
        isLoading,
        isRefreshing,
        filteredEmployees,
        filteredSalesmen,
        selectedEmployeeId,
        setSelectedEmployeeId,
        selectedSalesmanId,
        setSelectedSalesmanId,
        currentDate,
        setCurrentDate,
        daysInMonth,
        getTasksForDay,
        handleApproveTask,
        handleRejectTask,
        handleApproveMonthlyPlan,
        handleRejectMonthlyPlan,
        pendingActionPlans,
        pendingMonthlyPlans,
        setMonth: (m: number) => setCurrentDate(setMonth(currentDate, m)),
        setYear: (y: number) => setCurrentDate(setYear(currentDate, y)),
        currentMonth: getMonth(currentDate),
        currentYear: getYear(currentDate),
        // Mirrored update/delete just in case
        handleUpdateTask: updateDailyActionPlan,
        handleDeleteTask: deleteDailyActionPlan,
    };
};
