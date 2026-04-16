// src/modules/customer-relationship-management/structure/task-management-approval/components/ApprovalTables.tsx
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, User, ClipboardList } from "lucide-react";
import { DailyActionPlan, Task, Customer } from "../types";
import { format } from "date-fns";

interface ApprovalTablesProps {
    pendingDaps: DailyActionPlan[];
    tasks: Task[];
    customers: Customer[];
    onApproveDap: (id: number) => Promise<boolean>;
    onRejectDap: (id: number) => Promise<boolean>;
}

export const ApprovalTables: React.FC<ApprovalTablesProps> = ({
    pendingDaps,
    tasks,
    customers,
    onApproveDap,
    onRejectDap,
}) => {
    return (
        <div className="space-y-12 pb-20 pt-8">

            {/* Daily Action Plans Table */}
            <section className="space-y-6">
                <div className="flex items-center gap-4 px-2">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center shadow-lg shadow-orange-500/5">
                        <ClipboardList className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black tracking-tighter text-orange-600">Daily Action Plans</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Review individual daily tasks and assignments</p>
                    </div>
                    <Badge className="ml-auto bg-orange-500/10 text-orange-600 border-orange-500/20 font-black px-4 py-1">
                        {pendingDaps.length} PENDING
                    </Badge>
                </div>

                <div className="rounded-[2.5rem] border border-orange-500/10 bg-card shadow-2xl overflow-hidden">
                    <Table>
                        <TableHeader className="bg-orange-50/50">
                            <TableRow className="hover:bg-transparent border-orange-500/10">
                                <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 pl-8">Date</TableHead>
                                <TableHead className="font-black uppercase tracking-widest text-[10px]">Salesman & Task</TableHead>
                                <TableHead className="font-black uppercase tracking-widest text-[10px]">Customer</TableHead>
                                <TableHead className="font-black uppercase tracking-widest text-[10px]">Priority</TableHead>
                                <TableHead className="font-black uppercase tracking-widest text-[10px] text-right pr-8">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingDaps.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-heavy uppercase tracking-widest text-xs opacity-40">
                                        No pending daily plans found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pendingDaps.map((dap) => {
                                    const task = tasks.find(t => t.id === dap.task_id);
                                    const customer = customers.find(c => c.id === dap.customer_id);

                                    let priorityColor = "bg-blue-500/10 text-blue-600";
                                    if (dap.priority_level === "high") priorityColor = "bg-red-500/10 text-red-600";
                                    else if (dap.priority_level === "mid") priorityColor = "bg-orange-500/10 text-orange-600";

                                    return (
                                        <TableRow key={dap.id} className="hover:bg-orange-500/[0.02] border-orange-500/5 transition-colors group">
                                            <TableCell className="py-6 pl-8 font-black text-orange-600">{format(new Date(dap.date), "MMM d, yyyy")}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm tracking-tight">{task?.name || "Task"}</span>
                                                    <span className="text-[10px] text-muted-foreground uppercase font-heavy flex items-center gap-1">
                                                        <User className="w-3 h-3" /> {dap.employee_name || "Unknown"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm tracking-tight">{customer?.store_name || "Unknown"}</span>
                                                    <span className="text-[10px] text-muted-foreground uppercase font-heavy">{customer?.customer_code}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn("font-black tracking-widest text-[9px] uppercase border-none", priorityColor)}>
                                                    {dap.priority_level}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-8">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl border-red-500/20 text-red-500 hover:bg-red-50 font-black text-[10px] uppercase tracking-widest" onClick={() => onRejectDap(dap.id)}>
                                                        <X className="w-3.5 h-3.5 mr-2" /> Reject
                                                    </Button>
                                                    <Button size="sm" className="h-9 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20" onClick={() => onApproveDap(dap.id)}>
                                                        <Check className="w-3.5 h-3.5 mr-2" /> Approve
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </section>
        </div>
    );
};
