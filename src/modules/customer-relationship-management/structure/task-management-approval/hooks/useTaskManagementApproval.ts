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
    CustomerAllocation,
    DailyActionPlan,
} from "../types";
import { toast } from "sonner";
import { 
    fetchTaskManagementData, 
    updateActionPlanStatus, 
    updateMonthlyPlanStatus,
    updateDailyActionPlan,
    deleteDailyActionPlan,
    createDailyActionPlan,
    createMCP
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

    const customerAllocations = useMemo((): CustomerAllocation[] => {
        if (!data || selectedSalesmanId === "all") return [];

        // 1. Find the target setting for the selected salesman that covers the current month
        const targetSetting = data.targetSettings.find(ts => {
            if (String(ts.salesman_id) !== selectedSalesmanId) return false;
            
            const from = new Date(ts.date_range_from);
            const to = new Date(ts.date_range_to);
            const calendarMonthStart = startOfMonth(currentDate);
            const calendarMonthEnd = endOfMonth(currentDate);
            
            // Overlap check
            return (from <= calendarMonthEnd && to >= calendarMonthStart);
        });

        if (!targetSetting) return [];

        // 2. Get targets
        const targets = data.customerTargets.filter(ct => ct.target_setting_id === targetSetting.id);

        // 3. Get assignments for the current month to calculate progress
        const currentMonthActions = data.actionPlans.filter(ap => {
            const date = new Date(ap.date);
            return String(ap.salesman_id) === selectedSalesmanId &&
                   date.getMonth() === getMonth(currentDate) &&
                   date.getFullYear() === getYear(currentDate);
        });

        // 4. Map with details and progress
        return targets.map(t => {
            const customer = data.customers.find(c => c.id === t.customer_id);
            const targetAmount = Number(t.target_amount || 0);
            const assignedAmount = currentMonthActions
                .filter(ap => ap.customer_id === t.customer_id)
                .reduce((sum, ap) => sum + Number(ap.sales_amount || 0), 0);
            
            return {
                ...t,
                target_amount: targetAmount,
                customer_name: customer?.customer_name || "Unknown Customer",
                store_name: customer?.store_name || "Unknown Store",
                customer_code: customer?.customer_code || "N/A",
                assignedAmount,
                isFullyAllocated: assignedAmount >= targetAmount && targetAmount > 0,
                remainingAmount: Math.max(0, targetAmount - assignedAmount)
            };
        });
    }, [data, selectedSalesmanId, currentDate]);

    const handleCreateMCP = async () => {
        if (!data || !data.currentUserId || !selectedSalesmanId || !selectedEmployeeId) return undefined;
        try {
            const salesman = data.salesmen.find(s => String(s.id) === selectedSalesmanId);
            if (!salesman) throw new Error("Salesman not found");

            const newMcp = await createMCP({
                salesman_id: parseInt(selectedSalesmanId),
                employee_id: salesman.employee_id,
                month: getMonth(currentDate) + 1,
                year: getYear(currentDate),
                created_by: data.currentUserId
            });
            return newMcp;
        } catch {
            toast.error("Failed to create Monthly Coverage Plan");
            return undefined;
        }
    };

    const handleUpdateTask = useCallback(async (id: number, payload: Partial<DailyActionPlan>) => {
        const success = await updateDailyActionPlan(id, payload);
        if (success) fetchTasks(true);
        return success;
    }, [fetchTasks]);

    const handleDeleteTask = useCallback(async (id: number) => {
        const success = await deleteDailyActionPlan(id);
        if (success) fetchTasks(true);
        return success;
    }, [fetchTasks]);

    const handleSetDailyTarget = async (customerId: number, date: string, amount: number) => {
        if (!data) return false;

        // 1. Identify "Sales" Task ID
        const salesTask = data.tasks.find(t => t.name.toLowerCase() === "sales");
        if (!salesTask) {
            toast.error("Required task type 'Sales' not found in system");
            return false;
        }

        // 2. Find existing task on that day for this customer (if any)
        const existing = data.actionPlans.find(ap => 
            ap.customer_id === customerId && 
            ap.date === date && 
            ap.task_id === salesTask.id &&
            String(ap.salesman_id) === selectedSalesmanId
        );

        // 3. Validation: Check if this new amount would exceed the total target
        const allocation = customerAllocations.find(a => a.customer_id === customerId);
        if (allocation) {
            // Calculate what the new total would be
            const currentTotal = allocation.assignedAmount;
            const existingDayAmount = existing ? Number(existing.sales_amount || 0) : 0;
            const projectedTotal = currentTotal - existingDayAmount + amount;

            if (projectedTotal > allocation.target_amount) {
                const maxAllowedForThisDay = allocation.target_amount - (currentTotal - existingDayAmount);
                toast.error("Target Exceeded", {
                    description: `Total target is ₱${allocation.target_amount.toLocaleString()}. Current total elsewhere is ₱${(currentTotal - existingDayAmount).toLocaleString()}. Max you can set for this day is ₱${maxAllowedForThisDay.toLocaleString()}.`,
                    duration: 6000
                });
                return false;
            }
        }

        try {
            if (existing) {
                return await handleUpdateTask(existing.id, { sales_amount: amount });
            }

            // 3. Ensure MCP exists
            let mcp = data.monthlyCoveragePlans.find(mp => 
                String(mp.salesman_id) === selectedSalesmanId && 
                mp.month === (getMonth(new Date(date)) + 1) && 
                mp.year === getYear(new Date(date))
            );

            if (!mcp) {
                mcp = await handleCreateMCP();
                if (!mcp) return false;
            }

            // 4. Create new task
            const salesman = data.salesmen.find(s => String(s.id) === selectedSalesmanId);
            const payload: Partial<DailyActionPlan> = {
                mcp_id: mcp.id,
                task_id: salesTask.id,
                customer_id: customerId,
                salesman_id: parseInt(selectedSalesmanId),
                employee_id: salesman?.employee_id,
                date: date,
                sales_amount: amount,
                approval_status: "pending", // Supervisors' assignments are pending for final review/visibility
                priority_level: "mid",
                additional_description: "Sales Target Allocation",
                is_completed: 0,
                created_at: new Date().toISOString(),
                created_by: data.currentUserId
            };

            const result = await createDailyActionPlan(payload);
            if (result) {
                toast.success("Sales target assigned");
                fetchTasks(true);
                return true;
            }
            return false;
        } catch {
            toast.error("Failed to set daily target");
            return false;
        }
    };

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
        customerAllocations,
        setMonth: (m: number) => setCurrentDate(setMonth(currentDate, m)),
        setYear: (y: number) => setCurrentDate(setYear(currentDate, y)),
        currentMonth: getMonth(currentDate),
        currentYear: getYear(currentDate),
        handleUpdateTask,
        handleDeleteTask,
        handleSetDailyTarget,
    };
};
