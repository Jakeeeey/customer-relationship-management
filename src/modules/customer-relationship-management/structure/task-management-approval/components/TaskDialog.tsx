// src/modules/customer-relationship-management/structure/task-management-approval/components/TaskDialog.tsx
"use client";

import React from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle 
} from "@/components/ui/dialog";
import { DailyActionPlan, Task, Customer } from "../types";
import { TaskForm } from "./TaskForm";
import { format } from "date-fns";

interface TaskDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<DailyActionPlan>) => Promise<boolean>;
    initialData?: DailyActionPlan | null;
    selectedDate: Date | null;
    tasks: Task[];
    customers: Customer[];
    selectedEmployeeId: string;
    selectedSalesmanId: string;
}

export const TaskDialog: React.FC<TaskDialogProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    selectedDate,
    tasks,
    customers,
    selectedEmployeeId,
    selectedSalesmanId,
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl bg-card rounded-[2.5rem] border-primary/10 shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="px-10 py-8 border-b border-primary/5 bg-gradient-to-r from-primary/5 to-transparent">
                    <DialogTitle className="text-3xl font-black tracking-tighter text-primary">
                        {initialData ? "Refine Task Details" : "Create Review Task"}
                    </DialogTitle>
                    <div className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mt-2">
                        Assignment for {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Selected Date"}
                    </div>
                </DialogHeader>
                <div className="p-10 max-h-[70dvh] overflow-y-auto custom-scrollbar">
                    <TaskForm
                        initialData={initialData}
                        tasks={tasks}
                        customers={customers}
                        selectedSalesmanId={selectedSalesmanId}
                        selectedEmployeeId={selectedEmployeeId}
                        selectedDate={selectedDate}
                        onSubmit={async (data) => {
                            const success = await onSubmit(data);
                            if (success) onClose();
                            return success;
                        }}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};
