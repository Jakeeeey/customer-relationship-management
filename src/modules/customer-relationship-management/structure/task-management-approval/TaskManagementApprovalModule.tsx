// src/modules/customer-relationship-management/structure/task-management-approval/TaskManagementApprovalModule.tsx
"use client";

import React, { useState } from "react";
import { FilterHeader } from "./components/FilterHeader";
import { FilterCard } from "./components/FilterCard";
import { AllocationSidePanel } from "./components/AllocationSidePanel";
import { TaskCalendar } from "./components/TaskCalendar";
import { TaskDialog } from "./components/TaskDialog";
import { TaskViewDialog } from "./components/TaskViewDialog";
import { CalendarHeader } from "./components/CalendarHeader";
import { useTaskManagementApproval } from "./hooks/useTaskManagementApproval";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DailyActionPlan } from "./types";
import { 
    DndContext, 
    DragEndEvent, 
    PointerSensor, 
    useSensor, 
    useSensors 
} from "@dnd-kit/core";
import { SetDailyTargetDialog } from "./components/SetDailyTargetDialog";

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
        customerAllocations,
        handleSetDailyTarget,
    } = useTaskManagementApproval();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [editingTask, setEditingTask] = useState<DailyActionPlan | null>(null);

    // Target Allocation Modal State
    const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);
    const [allocationData, setAllocationData] = useState<{ 
        customerId: number; 
        customerName: string; 
        date: string;
        initialAmount: number;
    } | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

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

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || !active) return;

        if (selectedSalesmanId === "all") {
            toast.error("Please select a Salesman and Account first.");
            return;
        }

        // active.id is "customer-{id}"
        const customerId = parseInt(active.id.toString().replace("customer-", ""));
        // over.id is the date ISO string
        const dateStr = over.id.toString();

        const customer = customerAllocations.find(a => a.customer_id === customerId);
        if (!customer) return;

        // Check for existing amount on that day
        const existingTask = data?.actionPlans.find(ap => 
            ap.customer_id === customerId && 
            ap.date === dateStr &&
            String(ap.salesman_id) === selectedSalesmanId
        );

        setAllocationData({
            customerId,
            customerName: customer.store_name,
            date: dateStr,
            initialAmount: existingTask?.sales_amount || 0
        });
        setIsTargetDialogOpen(true);
    };

    const selectedEmployee = filteredEmployees.find(u => String(u.user_id) === selectedEmployeeId);
    const employeeName = selectedEmployee ? `${selectedEmployee.user_fname} ${selectedEmployee.user_lname}` : "All Salesman";

    const selectedSalesman = filteredSalesmen.find(s => String(s.id) === selectedSalesmanId);
    const salesmanAccount = selectedSalesman ? `${selectedSalesman.salesman_name} (${selectedSalesman.salesman_code})` : "All Accounts";

    if (isLoading) {
        return (
            <div className="space-y-8 animate-pulse p-4">
                <div className="flex justify-between items-end mb-4">
                    <div className="space-y-4">
                        <Skeleton className="h-14 w-96 bg-primary/10 rounded-2xl" />
                        <Skeleton className="h-6 w-[500px] bg-muted/20 rounded-lg" />
                    </div>
                    <div className="flex gap-3">
                        <Skeleton className="h-10 w-32 rounded-xl" />
                        <Skeleton className="h-10 w-24 rounded-xl" />
                    </div>
                </div>
                
                <div className="space-y-8">
                    <div className="md:pl-0 lg:pl-[380px] transition-all duration-500">
                        <Skeleton className="h-20 w-full bg-primary/10 rounded-2xl" />
                    </div>
                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-20 transition-all duration-500">
                        <Skeleton className="w-full lg:w-[300px] h-48 lg:h-[800px] rounded-3xl lg:rounded-[2.5rem] bg-muted/10 shrink-0" />
                        <div className="flex-1 space-y-6 lg:space-y-8">
                            <Skeleton className="h-40 rounded-3xl bg-muted/10" />
                            <Skeleton className="h-28 rounded-3xl bg-muted/10" />
                            <div className="grid grid-cols-7 gap-1 h-64 lg:h-[600px]">
                                {Array.from({ length: 35 }).map((_, i) => (
                                    <Skeleton key={i} className="bg-muted/5 rounded-2xl" />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex flex-col min-h-full max-w-[1600px] mx-auto w-full pb-20 relative px-4">
            {isRefreshing && (
                <div className="absolute top-4 right-8 z-50 flex items-center gap-3 bg-white/80 backdrop-blur-xl border border-primary/20 px-4 py-2 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-4">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Syncing with HQ...</span>
                </div>
            )}

            {/* Layout Container */}
            <div className="flex flex-col gap-8 lg:gap-10 animate-in fade-in duration-700">
                {/* Header aligned on desktop: Sidebar Width (300px) + Gap (80px) = 380px */}
                <div className="transition-all duration-500 md:pl-0 lg:pl-[380px]">
                    <FilterHeader
                        currentMonth={currentMonth}
                        currentYear={currentYear}
                        onMonthChange={setMonth}
                        onYearChange={setYear}
                    />
                </div>

                {/* Main Grid Sidebar + Content */}
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-20 items-stretch pb-20 lg:pb-32">
                    {/* Left Sidebar Card */}
                    <aside className=" self-stretch">
                        <AllocationSidePanel 
                             customerAllocations={customerAllocations}
                        />
                    </aside>

                    {/* Right Content Area */}
                    <main className="flex-1 flex flex-col gap-8 w-full">
                        <FilterCard
                            users={filteredEmployees}
                            salesmen={filteredSalesmen}
                            selectedEmployeeId={selectedEmployeeId}
                            onEmployeeChange={(id) => {
                                setSelectedEmployeeId(id);
                                setSelectedSalesmanId("all");
                            }}
                            selectedSalesmanId={selectedSalesmanId}
                            onSalesmanChange={setSelectedSalesmanId}
                        />

                        <CalendarHeader
                            monthName={months[currentMonth]}
                            year={currentYear}
                            employeeName={employeeName}
                            salesmanAccount={salesmanAccount}
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
                    </main>
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

            {allocationData && (
                <SetDailyTargetDialog
                    isOpen={isTargetDialogOpen}
                    onClose={() => setIsTargetDialogOpen(false)}
                    customerId={allocationData.customerId}
                    customerName={allocationData.customerName}
                    date={allocationData.date}
                    initialAmount={allocationData.initialAmount}
                    onConfirm={async (amount) => {
                        return await handleSetDailyTarget(
                            allocationData.customerId,
                            allocationData.date,
                            amount
                        );
                    }}
                />
            )}
            </div>
        </DndContext>
    );
}
