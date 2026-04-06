// src/modules/customer-relationship-management/structure/task-management/TaskManagementModule.tsx
"use client";

import React, { useState } from "react";
import { FilterSection } from "./components/FilterSection";
import { TaskCalendar } from "./components/TaskCalendar";
import { TaskDialog } from "./components/TaskDialog";
import { TaskViewDialog } from "./components/TaskViewDialog";
import { useTaskManagement } from "./hooks/useTaskManagement";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { DailyActionPlan } from "./types";

export default function TaskManagementModule() {
    const {
        data,
        isLoading,
        filteredEmployees,
        filteredSalesmen,
        selectedEmployeeId,
        setSelectedEmployeeId,
        selectedSalesmanId,
        setSelectedSalesmanId,
        daysInMonth,
        getTasksForDay,
        handleCreateTask,
        handleUpdateTask,
        handleDeleteTask,
        currentMonth,
        currentYear,
        setMonth,
        setYear,
    } = useTaskManagement();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [editingTask, setEditingTask] = useState<DailyActionPlan | null>(null);

    const handleDayClick = (day: Date) => {
        if (selectedEmployeeId === "all" || selectedSalesmanId === "all") {
            toast.warning("Please select an Employee and a Salesman account first.");
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

    const handleSubmit = async (payload: Partial<DailyActionPlan>) => {
        if (editingTask) {
            return await handleUpdateTask(editingTask.id, payload);
        } else {
            return await handleCreateTask(payload);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-8 animate-pulse p-4">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-64 bg-primary/10" />
                    <Skeleton className="h-4 w-96 bg-muted/20" />
                </div>
                <Skeleton className="h-32 w-full rounded-2xl bg-muted/20" />
                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 35 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 bg-muted/10 rounded-sm" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-full max-w-[1200px] mx-auto w-full pb-10">
            <FilterSection
                users={filteredEmployees}
                salesmen={filteredSalesmen}
                selectedEmployeeId={selectedEmployeeId}
                onEmployeeChange={(id) => {
                    setSelectedEmployeeId(id);
                    setSelectedSalesmanId("all"); // Reset salesman when employee changes
                }}
                selectedSalesmanId={selectedSalesmanId}
                onSalesmanChange={setSelectedSalesmanId}
                currentMonth={currentMonth}
                currentYear={currentYear}
                onMonthChange={setMonth}
                onYearChange={setYear}
            />

            <div key={`${currentMonth}-${currentYear}`}>
                <TaskCalendar
                    days={daysInMonth}
                    getTasksForDay={getTasksForDay}
                    onDayClick={handleDayClick}
                    selectedEmployeeId={selectedEmployeeId}
                    selectedSalesmanId={selectedSalesmanId}
                />
            </div>

            <TaskDialog
                isOpen={isDialogOpen}
                onClose={() => {
                    setIsDialogOpen(false);
                    setEditingTask(null);
                }}
                onSubmit={handleSubmit}
                onDelete={handleDeleteTask}
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
                attachments={data?.attachments || []}
                tasks={data?.tasks || []}
                customers={data?.customers || []}
                selectedDate={selectedDate}
                selectedEmployeeId={selectedEmployeeId}
                selectedSalesmanId={selectedSalesmanId}
                onCreateTask={handleCreateTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
            />
        </div>
    );
}
