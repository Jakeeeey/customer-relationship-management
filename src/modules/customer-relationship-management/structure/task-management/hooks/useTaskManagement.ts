// src/modules/customer-relationship-management/structure/task-management/hooks/useTaskManagement.ts
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
    format,
} from "date-fns";
import { 
    TaskManagementData, 
    SalesmanPerSupervisor,
    SupervisorPerDivision,
    DailyActionPlan
} from "../types";
import { toast } from "sonner";
import { 
    fetchTaskManagementData, 
    createDailyActionPlan, 
    updateDailyActionPlan, 
    deleteDailyActionPlan 
} from "../providers/fetchProvider";

export const useTaskManagement = () => {
    const [data, setData] = useState<TaskManagementData & { currentUserId?: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
    const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>("all");
    const [currentDate, setCurrentDate] = useState(new Date());

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await fetchTaskManagementData();
            setData(result);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to load tasks");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Filtering logic based on Supervisor mapping
    const filteredEmployees = useMemo(() => {
        if (!data) return [];
        
        // 1. Find supervisor_per_division IDs for current user
        const supervisorDivisionIds = data.supervisors
            .filter((s: SupervisorPerDivision) => s.supervisor_id === data.currentUserId)
            .map((s: SupervisorPerDivision) => s.id);

        if (supervisorDivisionIds.length === 0) return [];

        // 2. Find mapped salesman IDs
        const mappedSalesmanIds = data.mapping
            .filter((m: SalesmanPerSupervisor) => supervisorDivisionIds.includes(m.supervisor_per_division_id))
            .map((m: SalesmanPerSupervisor) => m.salesman_id);
            
        // 3. Find unique employee (User) IDs
        const relevantSalesmen = data.salesmen.filter(s => 
            mappedSalesmanIds.includes(s.id)
        );

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

            // 1. Filter by specific Salesman
            if (selectedSalesmanId !== "all") {
                return String(t.salesman_id) === selectedSalesmanId;
            }

            // 2. Filter by Employee (Show all their salesmen's tasks)
            if (selectedEmployeeId !== "all") {
                const employeeSalesmanIds = data.salesmen
                    .filter(s => String(s.employee_id) === selectedEmployeeId)
                    .map(s => String(s.id));
                return employeeSalesmanIds.includes(String(t.salesman_id));
            }
            
            return true;
        });
    }, [data, selectedEmployeeId, selectedSalesmanId]);

    const handleCreateTask = async (taskData: Partial<DailyActionPlan>) => {
        try {
            const employeeId = taskData.employee_id || parseInt(selectedEmployeeId);
            const employee = data?.users.find(u => u.user_id === employeeId);
            const employeeName = employee ? `${employee.user_fname} ${employee.user_lname}` : null;
            const employeeEmail = employee?.user_email || null;

            const payload = {
                ...taskData,
                employee_name: employeeName,
                employee_email: employeeEmail,
                date: taskData.date || format(new Date(), "yyyy-MM-dd"),
                created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
                created_by: data?.currentUserId,
                is_completed: 0,
                mcp_id: 1 // Default
            };

            const success = await createDailyActionPlan(payload as Partial<DailyActionPlan>);
            if (success) {
                toast.success("Task created successfully");
                fetchTasks(); // Refresh
            }
            return success;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create task");
            return false;
        }
    };

    const handleUpdateTask = async (id: number, taskData: Partial<DailyActionPlan>) => {
        try {
            const employeeId = taskData.employee_id || parseInt(selectedEmployeeId);
            const employee = data?.users.find(u => u.user_id === employeeId);
            const employeeName = employee ? `${employee.user_fname} ${employee.user_lname}` : null;
            const employeeEmail = employee?.user_email || null;

            const payload = {
                ...taskData,
                employee_name: employeeName,
                employee_email: employeeEmail,
            };

            const success = await updateDailyActionPlan(id, payload);
            if (success) {
                toast.success("Task updated successfully");
                fetchTasks(); // Refresh
            }
            return success;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update task");
            return false;
        }
    };

    const handleDeleteTask = async (id: number) => {
        try {
            const success = await deleteDailyActionPlan(id);
            if (success) {
                toast.success("Task deleted successfully");
                fetchTasks(); // Refresh
            }
            return success;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete task");
            return false;
        }
    };

    return {
        data,
        isLoading,
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
        handleCreateTask,
        handleUpdateTask,
        handleDeleteTask,
        // Helper to change month/year
        setMonth: (m: number) => setCurrentDate(setMonth(currentDate, m)),
        setYear: (y: number) => setCurrentDate(setYear(currentDate, y)),
        currentMonth: getMonth(currentDate),
        currentYear: getYear(currentDate),
    };
};
