// src/modules/customer-relationship-management/structure/task-management/components/TaskDialog.tsx
"use client";

import React from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogTitle,
} from "@/components/ui/dialog";
import { Task, Customer, DailyActionPlan } from "../types";
import { TaskForm } from "./TaskForm";
import { format } from "date-fns";
import { Calendar } from "lucide-react";

interface TaskDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<DailyActionPlan>) => Promise<boolean>;
    onDelete?: (id: number) => Promise<boolean>;
    selectedDate: Date | null;
    tasks: Task[];
    customers: Customer[];
    selectedEmployeeId: string;
    selectedSalesmanId: string;
    initialData?: DailyActionPlan | null;
}

export const TaskDialog: React.FC<TaskDialogProps> = ({
    isOpen,
    onClose,
    onSubmit,
    onDelete,
    selectedDate,
    tasks,
    customers,
    selectedEmployeeId,
    selectedSalesmanId,
    initialData,
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-xl w-[95dvw] max-h-[90dvh] p-0 flex flex-col overflow-hidden border-none shadow-2xl bg-gradient-to-br from-card to-card/95">
                <div className="bg-primary/5 p-6 border-b border-primary/10 shrink-0">
                    <DialogTitle className="text-2xl font-bold tracking-tight text-primary">
                        {initialData ? "Update Task Assignment" : "New Task Assignment"}
                    </DialogTitle>
                    <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4 text-primary" />
                        {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "No date selected"}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar overscroll-contain">
                    <div className="p-6">
                        <TaskForm
                            initialData={initialData}
                            tasks={tasks}
                            customers={customers}
                            selectedSalesmanId={selectedSalesmanId}
                            selectedEmployeeId={selectedEmployeeId}
                            selectedDate={selectedDate}
                            onSubmit={onSubmit}
                            onDelete={onDelete}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
