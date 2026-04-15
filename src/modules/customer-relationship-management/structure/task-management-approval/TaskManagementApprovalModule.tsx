// src/modules/customer-relationship-management/structure/task-management-approval/TaskManagementApprovalModule.tsx
"use client";

import React, { useState } from "react";
import { FilterSection } from "./components/FilterSection";
import { TaskCalendar } from "./components/TaskCalendar";
import { TaskDialog } from "./components/TaskDialog";
import { TaskViewDialog } from "./components/TaskViewDialog";
import { CalendarHeader } from "./components/CalendarHeader";
import { useTaskManagementApproval } from "./hooks/useTaskManagementApproval";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DailyActionPlan } from "./types";

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default function TaskManagementApprovalModule() {
    const {
        data,
        isLoading,
        isRefreshing,
        filteredEmployees,
        filteredSalesmen,
        selectedEmployeeId,
        setSelectedEmployeeId,
        selectedSalesmanId,
        setSelectedSalesmanId,
        daysInMonth,
        getTasksForDay,
        handleApproveTask,
        handleRejectTask,
        handleUpdateTask,
        currentMonth,
        currentYear,
        setMonth,
        setYear,
    } = useTaskManagementApproval();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [editingTask, setEditingTask] = useState<DailyActionPlan | null>(null);

    const handleDayClick = (day: Date) => {
        if (selectedEmployeeId === "all" || selectedSalesmanId === "all") {
            toast.warning("Please select a Salesman and a Salesman Code first.");
            return;
        }

        const dayTasks = getTasksForDay(day);
        setSelectedDate(day);

        if (dayTasks.length > 0) {
            setIsViewDialogOpen(true);
        } else {
            setEditingTask(null);
            setIsDialogOpen(true);
        }
    };

    const handleTaskUpdate = async (id: number, payload: Partial<DailyActionPlan>) => {
        const success = await handleUpdateTask(id, payload);
        if (success) {
            // Optimization: fetchTasks(true) is handled inside hook
        }
        return success;
    };

    const selectedEmployee = filteredEmployees.find(u => String(u.user_id) === selectedEmployeeId);
    const employeeName = selectedEmployee ? `${selectedEmployee.user_fname} ${selectedEmployee.user_lname}` : "All Salesman";

    const selectedSalesman = filteredSalesmen.find(s => String(s.id) === selectedSalesmanId);
    const salesmanAccount = selectedSalesman ? `${selectedSalesman.salesman_name} (${selectedSalesman.salesman_code})` : "All Accounts";

    if (isLoading) {
        return (
            <div className="space-y-8 animate-pulse p-4">
                <div className="space-y-4">
                    <Skeleton className="h-14 w-96 bg-primary/10 rounded-2xl" />
                    <Skeleton className="h-6 w-[500px] bg-muted/20 rounded-lg" />
                </div>
                <div className="grid grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 rounded-3xl bg-muted/10" />
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1 h-[600px]">
                    {Array.from({ length: 35 }).map((_, i) => (
                        <Skeleton key={i} className="bg-muted/5 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-full max-w-[1200px] mx-auto w-full pb-20 relative px-4">
            {isRefreshing && (
                <div className="absolute top-4 right-8 z-50 flex items-center gap-3 bg-white/80 backdrop-blur-xl border border-primary/20 px-4 py-2 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-4">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Syncing with HQ...</span>
                </div>
            )}

            <FilterSection
                users={filteredEmployees}
                salesmen={filteredSalesmen}
                selectedEmployeeId={selectedEmployeeId}
                onEmployeeChange={(id) => {
                    setSelectedEmployeeId(id);
                    setSelectedSalesmanId("all");
                }}
                selectedSalesmanId={selectedSalesmanId}
                onSalesmanChange={setSelectedSalesmanId}
                currentMonth={currentMonth}
                currentYear={currentYear}
                onMonthChange={setMonth}
                onYearChange={setYear}
            />

            <div className="space-y-8">
                <CalendarHeader
                    monthName={months[currentMonth]}
                    year={currentYear}
                    employeeName={employeeName}
                    salesmanAccount={salesmanAccount}
                />

                <div key={`${currentMonth}-${currentYear}`} className="animate-in fade-in zoom-in-95 duration-500">
                    <TaskCalendar
                        days={daysInMonth}
                        getTasksForDay={getTasksForDay}
                        onDayClick={handleDayClick}
                        selectedEmployeeId={selectedEmployeeId}
                        selectedSalesmanId={selectedSalesmanId}
                    />
                </div>
            </div>

            <TaskDialog
                isOpen={isDialogOpen}
                onClose={() => {
                    setIsDialogOpen(false);
                    setEditingTask(null);
                }}
                onSubmit={async () => {
                    // Mirroring basic update logic if supervisor adds a task manually
                    return false; // Creation not primary focus here
                }}
                initialData={editingTask}
                selectedDate={selectedDate}
                tasks={data?.tasks || []}
                customers={data?.customers || []}
                selectedEmployeeId={selectedEmployeeId}
                selectedSalesmanId={selectedSalesmanId}
            />

            <TaskViewDialog
                key={selectedDate ? `view-${selectedDate.toISOString()}` : "view-none"}
                isOpen={isViewDialogOpen}
                onClose={() => setIsViewDialogOpen(false)}
                dayTasks={selectedDate ? getTasksForDay(selectedDate) : []}
                tasks={data?.tasks || []}
                customers={data?.customers || []}
                selectedDate={selectedDate}
                selectedEmployeeId={selectedEmployeeId}
                selectedSalesmanId={selectedSalesmanId}
                onUpdateTask={handleTaskUpdate}
                onApproveTask={handleApproveTask}
                onRejectTask={handleRejectTask}
            />
        </div>
    );
}
