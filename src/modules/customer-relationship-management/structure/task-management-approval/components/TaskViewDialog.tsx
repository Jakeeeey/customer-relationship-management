// src/modules/customer-relationship-management/structure/task-management-approval/components/TaskViewDialog.tsx
"use client";

import React, { useState } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
} from "@/components/ui/dialog";
import { 
    DailyActionPlan, 
    Task, 
    Customer, 
} from "../types";
import { TaskForm } from "./TaskForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Clock, 
    Calendar,
    Info,
    Plus
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskViewDialogProps {
    isOpen: boolean;
    onClose: () => void;
    dayTasks: DailyActionPlan[];
    tasks: Task[];
    customers: Customer[];
    selectedDate: Date | null;
    selectedEmployeeId: string;
    selectedSalesmanId: string;
    onUpdateTask: (id: number, data: Partial<DailyActionPlan>) => Promise<boolean>;
    onApproveTask: (id: number) => Promise<boolean>;
    onRejectTask: (id: number) => Promise<boolean>;
}

export const TaskViewDialog: React.FC<TaskViewDialogProps> = ({
    isOpen,
    onClose,
    dayTasks,
    tasks,
    customers,
    selectedDate,
    selectedEmployeeId,
    selectedSalesmanId,
    onUpdateTask,
    onApproveTask,
    onRejectTask,
}) => {
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(() => {
        if (dayTasks.length > 0) return dayTasks[0].id;
        return null;
    });

    // Reset selection when dialog opens with new tasks
    React.useEffect(() => {
        if (isOpen && dayTasks.length > 0 && !selectedTaskId) {
            setSelectedTaskId(dayTasks[0].id);
        }
    }, [isOpen, dayTasks, selectedTaskId]);

    const onOpenChange = (open: boolean) => {
        if (!open) {
            onClose();
            setSelectedTaskId(null);
        }
    };

    const selectedTask = dayTasks.find(t => t.id === selectedTaskId);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent 
                style={{ width: '1250px', maxWidth: '95vw' }}
                className="p-0 overflow-hidden border-none shadow-2xl bg-gradient-to-br from-card to-card/95 h-[90dvh] flex flex-col gap-0 text-foreground"
            >
                <div className="flex h-full min-h-0">
                    {/* Left Panel: Task List */}
                    <div className="w-80 flex flex-col bg-muted/30 shrink-0 min-h-0 border-r border-primary/5 z-20">
                        <div className="p-8 border-b border-primary/5 space-y-5 bg-muted/40 shrink-0">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary/70">Daily Schedule</h3>
                                <Badge variant="outline" className="bg-primary/10 text-[10px] px-2.5 py-0.5 border-primary/20 font-black">
                                    {dayTasks.length} {dayTasks.length === 1 ? 'Task' : 'Tasks'}
                                </Badge>
                            </div>
                            <Button 
                                className="w-full justify-start gap-4 h-12 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 font-black px-5 rounded-2xl group transition-all active:scale-[0.98]"
                            >
                                <div className="w-6 h-6 rounded-lg bg-primary-foreground/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
                                    <Plus className="w-4 h-4 text-primary-foreground" />
                                </div>
                                Create New Task
                            </Button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                            {dayTasks.map((t) => {
                                const isSelected = selectedTaskId === t.id;
                                const taskType = tasks.find(v => v.id === t.task_id)?.name || "Task";
                                const customer = customers.find(c => c.id === t.customer_id)?.store_name || "Unknown Customer";

                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelectedTaskId(t.id)}
                                        className={cn(
                                            "w-full text-left p-4 rounded-2xl transition-all border group relative",
                                            isSelected 
                                                ? "bg-card border-amber-500/40 shadow-xl ring-1 ring-amber-500/20 scale-[1.02] z-10" 
                                                : "hover:bg-card/70 border-transparent hover:border-amber-500/10"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 overflow-hidden">
                                                <div className={cn(
                                                    "text-sm font-black tracking-tight truncate leading-none mb-1.5",
                                                    isSelected ? "text-amber-600" : "text-foreground/90"
                                                )}>{taskType}</div>
                                                <div className="text-[10px] opacity-60 truncate uppercase font-extrabold tracking-widest block font-heavy">
                                                    {customer}
                                                </div>
                                            </div>
                                            <div className="w-7 h-7 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                                                <Clock className="w-4 h-4 text-amber-500" />
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "mt-4 h-1.5 w-full rounded-full bg-muted/40 overflow-hidden relative",
                                            isSelected ? "opacity-100" : "opacity-30"
                                        )}>
                                            <div className="h-full bg-amber-500 w-1/3 transition-all duration-1000 ease-in-out absolute left-0 top-0" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Panel: Content */}
                    <div className="flex-1 flex flex-col bg-card min-h-0 overflow-hidden relative">
                        <DialogHeader className="px-10 py-8 border-b border-primary/5 bg-gradient-to-r from-amber-500/5 to-transparent shrink-0">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse ring-4 ring-amber-500/10" />
                                    <span className="text-[11px] font-black uppercase tracking-[0.4em] text-amber-600/80">Pending Assignment</span>
                                </div>
                                <DialogTitle className="text-3xl font-black tracking-tighter text-primary leading-none flex items-center gap-3">
                                    Manage Assignment
                                </DialogTitle>
                                <div className="flex items-center gap-5 text-sm text-muted-foreground mt-4 font-heavy uppercase tracking-widest text-[11px]">
                                    <Calendar className="w-4 h-4 text-primary/70" />
                                    {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "No date"}
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto custom-scrollbar px-10 py-8 min-h-0">
                            {selectedTask ? (
                                <div className="pb-24">
                                    <TaskForm
                                        initialData={selectedTask}
                                        tasks={tasks}
                                        customers={customers}
                                        selectedSalesmanId={selectedSalesmanId}
                                        selectedEmployeeId={selectedEmployeeId}
                                        selectedDate={selectedDate}
                                        onSubmit={async (p) => await onUpdateTask(selectedTask.id, p)}
                                        onApprove={async (id) => {
                                            const success = await onApproveTask(id);
                                            if (success) {
                                                const next = dayTasks.find(t => t.id !== id);
                                                setSelectedTaskId(next?.id || null);
                                            }
                                            return success;
                                        }}
                                        onReject={async (id) => {
                                            const success = await onRejectTask(id);
                                            if (success) {
                                                const next = dayTasks.find(t => t.id !== id);
                                                setSelectedTaskId(next?.id || null);
                                            }
                                            return success;
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center space-y-6 text-muted-foreground py-20">
                                    <div className="w-16 h-16 rounded-[2rem] bg-muted/20 flex items-center justify-center border-2 border-dashed border-primary/20">
                                        <Info className="w-8 h-8 text-primary opacity-40" />
                                    </div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.5em] text-primary/60">Select a task for review</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
