// src/modules/customer-relationship-management/structure/task-management/components/TaskViewDialog.tsx
"use client";

import React, { useState } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { 
    DailyActionPlan, 
    Task, 
    Customer, 
    DailyActionPlanAttachment 
} from "../types";
import { TaskForm } from "./TaskForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
    Plus, 
    CheckCircle2, 
    Clock, 
    MapPin, 
    ExternalLink, 
    ImageIcon, 
    Calendar,
    Info,
    Loader2
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskViewDialogProps {
    isOpen: boolean;
    onClose: () => void;
    dayTasks: DailyActionPlan[];
    attachments: DailyActionPlanAttachment[];
    tasks: Task[];
    customers: Customer[];
    selectedDate: Date | null;
    selectedEmployeeId: string;
    selectedSalesmanId: string;
    onCreateTask: (data: Partial<DailyActionPlan>) => Promise<boolean>;
    onUpdateTask: (id: number, data: Partial<DailyActionPlan>) => Promise<boolean>;
    onDeleteTask: (id: number) => Promise<boolean>;
}

export const TaskViewDialog: React.FC<TaskViewDialogProps> = ({
    isOpen,
    onClose,
    dayTasks,
    attachments,
    tasks,
    customers,
    selectedDate,
    selectedEmployeeId,
    selectedSalesmanId,
    onCreateTask,
    onUpdateTask,
    onDeleteTask,
}) => {
    const [selectedTaskId, setSelectedTaskId] = useState<number | "new" | null>(() => {
        if (dayTasks.length === 0) return "new";
        return dayTasks[0].id;
    });

    const onOpenChange = (open: boolean) => {
        if (!open) {
            onClose();
            setSelectedTaskId(null);
        }
    };

    const selectedTask = dayTasks.find(t => t.id === selectedTaskId);

    const taskAttachments = attachments.filter(a => a.dap_id === selectedTaskId);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-7xl w-[98dvw] p-0 overflow-hidden border-none shadow-2xl bg-gradient-to-br from-card to-card/95 h-[90dvh] flex flex-col gap-0">
                <div className="flex h-full min-h-0">
                    {/* Left Panel: Task List - Wider and more robust */}
                    <div className="w-96 flex flex-col bg-muted/30 shrink-0 min-h-0 border-r border-primary/5 shadow-[20px_0_40px_-20px_rgba(0,0,0,0.05)] z-20">
                        <div className="p-8 border-b border-primary/5 space-y-5 bg-muted/40 shrink-0">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary/70">Daily Schedule</h3>
                                <Badge variant="outline" className="bg-primary/10 text-[10px] px-2.5 py-0.5 border-primary/20 font-black">
                                    {dayTasks.length} {dayTasks.length === 1 ? 'Task' : 'Tasks'}
                                </Badge>
                            </div>
                            <Button 
                                onClick={() => setSelectedTaskId("new")}
                                className="w-full justify-start gap-4 h-12 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 font-black px-5 rounded-2xl group transition-all active:scale-[0.98]"
                            >
                                <div className="w-6 h-6 rounded-lg bg-primary-foreground/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
                                    <Plus className="w-4 h-4 text-primary-foreground" />
                                </div>
                                Create New Task
                            </Button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                            <div className="pl-8 pr-10 py-10 space-y-8 pb-60">
                                {dayTasks.map((t) => {
                                    const isSelected = selectedTaskId === t.id;
                                    const taskType = tasks.find(v => v.id === t.task_id)?.name || "Task";
                                    const customer = customers.find(c => c.id === t.customer_id)?.store_name || "Unknown Customer";

                                    return (
                                        <div key={t.id} className="relative group/item">
                                            <button
                                                onClick={() => setSelectedTaskId(t.id)}
                                                className={cn(
                                                    "w-full text-left p-6 rounded-3xl transition-all border group relative",
                                                    isSelected 
                                                        ? "bg-card border-primary/40 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.15)] ring-1 ring-primary/20 -translate-y-1.5 scale-[1.03] z-10" 
                                                        : "hover:bg-card/70 text-muted-foreground hover:text-foreground border-transparent hover:border-primary/10 hover:shadow-2xl hover:-translate-y-1"
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-5">
                                                    <div className="flex-1 overflow-hidden">
                                                        <div className={cn(
                                                            "text-[15px] font-black tracking-tight truncate leading-none mb-2",
                                                            isSelected ? "text-primary" : "text-foreground/90"
                                                        )}>{taskType}</div>
                                                        <div className="text-[11px] opacity-60 truncate uppercase font-extrabold tracking-[0.15em] leading-relaxed block max-w-full">
                                                            {customer}
                                                        </div>
                                                    </div>
                                                    {t.is_completed === 1 ? (
                                                        <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-inner">
                                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20 shadow-inner">
                                                            <Clock className="w-5 h-5 text-orange-500" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={cn(
                                                    "mt-6 h-2 w-full rounded-full bg-muted/40 overflow-hidden relative",
                                                    isSelected ? "opacity-100" : "opacity-30"
                                                )}>
                                                    <div className={cn(
                                                        "h-full transition-all duration-1000 ease-in-out absolute left-0 top-0",
                                                        t.is_completed === 1 ? "bg-emerald-500 w-full" : "bg-orange-500 w-1/3"
                                                    )} />
                                                </div>

                                                {isSelected && (
                                                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-2 h-14 bg-primary rounded-full shadow-[0_0_20px_rgba(var(--primary),0.6)]" />
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}

                                {dayTasks.length === 0 && (
                                    <div className="py-32 text-center space-y-5 opacity-40">
                                        <div className="w-20 h-20 rounded-[2.5rem] bg-muted/20 flex items-center justify-center mx-auto rotate-12 border-2 border-dashed border-primary/20">
                                            <Info className="w-10 h-10 -rotate-12 text-primary" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/50">No Activities Found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Content */}
                    <div className="flex-1 flex flex-col bg-card min-h-0 overflow-hidden relative">
                        <DialogHeader className="px-12 py-10 border-b border-primary/5 bg-gradient-to-r from-primary/5 to-transparent shrink-0">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={cn(
                                            "w-2.5 h-2.5 rounded-full ring-4",
                                            selectedTaskId === "new" ? "bg-primary animate-pulse ring-primary/10" : (selectedTask?.is_completed === 1 ? "bg-emerald-500 ring-emerald-500/10" : "bg-orange-500 ring-orange-500/10")
                                        )} />
                                        <span className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground/60">
                                            {selectedTaskId === "new" ? "Drafting Mode" : (selectedTask?.is_completed === 1 ? "Finalized Record" : "Pending Assignment")}
                                        </span>
                                    </div>
                                    <DialogTitle className="text-4xl font-black tracking-tighter text-primary leading-none">
                                        {selectedTaskId === "new" ? "Create New Plan" : (selectedTask?.is_completed === 1 ? "Task Accomplished" : "Manage Assignment")}
                                    </DialogTitle>
                                    <div className="flex items-center gap-5 text-sm text-muted-foreground mt-4">
                                        <span className="flex items-center gap-2 font-black uppercase tracking-widest text-[11px]">
                                            <Calendar className="w-4.5 h-4.5 text-primary/70" />
                                            {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "No date"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-12 py-10 min-h-0">
                            {selectedTaskId === "new" ? (
                                <div className="max-w-3xl pb-24">
                                    <TaskForm
                                        tasks={tasks}
                                        customers={customers}
                                        selectedSalesmanId={selectedSalesmanId}
                                        selectedEmployeeId={selectedEmployeeId}
                                        selectedDate={selectedDate}
                                        onSubmit={async (p) => {
                                            const success = await onCreateTask(p);
                                            if (success) setSelectedTaskId(null);
                                            return success;
                                        }}
                                    />
                                </div>
                            ) : selectedTask ? (
                                selectedTask.is_completed === 1 ? (
                                    <div className="space-y-12 max-w-5xl pb-24">
                                        {/* Completed Info View - Improved Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="p-8 rounded-[2rem] bg-muted/20 border border-primary/5 space-y-3 group hover:bg-muted/30 transition-all hover:shadow-2xl hover:-translate-y-1">
                                                <Label className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-black opacity-60">Planned Activity</Label>
                                                <div className="text-2xl font-black text-primary leading-tight tracking-tight">
                                                    {tasks.find(v => v.id === selectedTask.task_id)?.name}
                                                </div>
                                            </div>
                                            <div className="p-8 rounded-[2rem] bg-muted/20 border border-primary/5 space-y-3 group hover:bg-muted/30 transition-all hover:shadow-2xl hover:-translate-y-1">
                                                <Label className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-black opacity-60">Target Customer</Label>
                                                <div className="text-2xl font-black text-primary leading-tight tracking-tight">
                                                    {customers.find(c => c.id === selectedTask.customer_id)?.store_name}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-10 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 space-y-6 relative overflow-hidden group hover:bg-emerald-500/[0.08] transition-all">
                                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                                                <CheckCircle2 className="w-32 h-32 text-emerald-500" />
                                            </div>
                                            <Label className="text-[12px] uppercase tracking-[0.3em] text-emerald-600 font-black flex items-center gap-3">
                                                <div className="w-6 h-1 bg-emerald-500/50 rounded-full" />
                                                Reported Outcome
                                            </Label>
                                            <p className="text-xl leading-relaxed text-emerald-950/80 font-bold italic tracking-tight relative z-10">
                                                &quot;{selectedTask.additional_description || "The salesman completed this task successfully with no additional notes."}&quot;
                                            </p>
                                        </div>

                                        {/* Attachments Section */}
                                        <div className="space-y-8 pt-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-xl shadow-primary/5">
                                                        <ImageIcon className="w-7 h-7 text-primary" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-2xl font-black tracking-tight">Visit Evidence</h4>
                                                        <p className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em] opacity-60">Photographic & Geographic Verification</p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {taskAttachments.length > 0 ? (
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
                                                    {taskAttachments.map(att => (
                                                        <div key={att.id} className="group relative rounded-[2.5rem] border border-primary/10 overflow-hidden bg-white shadow-2xl transition-all hover:shadow-primary/20 hover:-translate-y-2">
                                                            <div className="aspect-[4/3] relative bg-muted flex items-center justify-center overflow-hidden">
                                                                <Image 
                                                                    src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${att.attachment_address}`} 
                                                                    alt="Visit Evidence"
                                                                    width={600}
                                                                    height={450}
                                                                    unoptimized
                                                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                                                />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 p-8 flex flex-col justify-end">
                                                                    <Button variant="secondary" className="w-full h-12 font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-2xl" asChild>
                                                                        <a href={`${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${att.attachment_address}`} target="_blank" rel="noreferrer">
                                                                            Open HQ Source <ExternalLink className="w-4 h-4 ml-3" />
                                                                        </a>
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            <div className="p-6 bg-muted/10 backdrop-blur-md border-t border-primary/5 flex items-center justify-between">
                                                                <div className="space-y-1.5">
                                                                    <div className="flex items-center gap-2 text-[11px] font-black text-muted-foreground uppercase tracking-tighter opacity-70">
                                                                        <MapPin className="w-3.5 h-3.5 text-primary" />
                                                                        {att.latitude}, {att.longitude}
                                                                    </div>
                                                                    {att.latitude && att.longitude && (
                                                                        <a 
                                                                            href={`https://www.google.com/maps?q=${att.latitude},${att.longitude}`} 
                                                                            target="_blank" 
                                                                            rel="noreferrer"
                                                                            className="text-xs text-primary font-black uppercase tracking-widest hover:underline flex items-center gap-1"
                                                                        >
                                                                            Locate on Maps <ExternalLink className="w-3 h-3" />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-24 rounded-[3rem] border-2 border-dashed border-primary/10 bg-primary/[0.02] flex flex-col items-center justify-center text-muted-foreground text-center">
                                                    <div className="w-20 h-20 rounded-[2.5rem] bg-muted flex items-center justify-center mb-6 shadow-inner">
                                                        <ImageIcon className="w-10 h-10 opacity-20" />
                                                    </div>
                                                    <h5 className="font-black text-foreground text-lg uppercase tracking-widest leading-none">No Evidence Captured</h5>
                                                    <p className="text-xs max-w-[240px] mt-3 font-bold opacity-60 uppercase tracking-widest leading-relaxed">The salesman has not uploaded any verification media for this task yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="max-w-3xl pb-24">
                                        <TaskForm
                                            initialData={selectedTask}
                                            tasks={tasks}
                                            customers={customers}
                                            selectedSalesmanId={selectedSalesmanId}
                                            selectedEmployeeId={selectedEmployeeId}
                                            selectedDate={selectedDate}
                                            onSubmit={async (p) => await onUpdateTask(selectedTask.id, p)}
                                            onDelete={async (id) => {
                                                const success = await onDeleteTask(id);
                                                if (success) setSelectedTaskId(null);
                                                return success;
                                            }}
                                        />
                                    </div>
                                )
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center space-y-6 text-muted-foreground py-32">
                                    <div className="relative">
                                        <Loader2 className="w-16 h-16 animate-spin text-primary opacity-20" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-3 h-3 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),1)]" />
                                        </div>
                                    </div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.5em] animate-pulse text-primary/60">Synchronizing Vault</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(var(--primary), 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(var(--primary), 0.1);
                }
            `}</style>
        </Dialog>
    );
};
