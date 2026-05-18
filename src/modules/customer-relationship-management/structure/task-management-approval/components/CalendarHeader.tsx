// src/modules/customer-relationship-management/structure/task-management-approval/components/CalendarHeader.tsx
"use client";

import React from "react";
import { Calendar, User, Briefcase, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarHeaderProps {
    monthName: string;
    year: number;
    employeeName: string;
    salesmanAccount: string;
    onApproveAllDaily?: () => void;
    onApproveAllMonthly?: () => void;
    isApproving?: boolean;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
    monthName,
    year,
    employeeName,
    salesmanAccount,
    onApproveAllDaily,
    onApproveAllMonthly,
    isApproving = false,
}) => {
    return (
        <div className="p-8 rounded-[2rem] bg-gradient-to-br from-card/90 to-card/50 border border-primary/10 shadow-xl backdrop-blur-md relative overflow-hidden group w-full">
            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">
                            {monthName} <span className="text-primary/40 mx-1">|</span> {year}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-1">
                        <div className="flex items-center gap-3 group/item">
                            <div className="p-1.5 rounded-lg bg-muted group-hover/item:bg-primary/20 transition-colors">
                                <User className="w-4 h-4 text-muted-foreground group-hover/item:text-primary" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 leading-none mb-1">
                                    EMPLOYEE
                                </span>
                                <span className="text-sm font-bold text-foreground/90">
                                    {employeeName}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 group/item">
                            <div className="p-1.5 rounded-lg bg-muted group-hover/item:bg-primary/20 transition-colors">
                                <Briefcase className="w-4 h-4 text-muted-foreground group-hover/item:text-primary" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 leading-none mb-1">
                                    SALESMAN ACCOUNT
                                </span>
                                <span className="text-sm font-bold text-foreground/90">
                                    {salesmanAccount}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="hidden lg:flex flex-col items-end justify-center min-w-[300px]">
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">
                            Task Management Context
                        </p>
                        <p className="text-[9px] text-muted-foreground/60 font-medium italic mb-3">
                            Currently viewing active assignments and schedules
                        </p>
                        
                        <div className="flex items-center gap-2 justify-end mt-2">
                            <Button 
                                onClick={onApproveAllDaily}
                                disabled={isApproving || salesmanAccount.includes("All")}
                                variant="outline"
                                size="sm"
                                className="h-8 text-[10px] font-bold uppercase tracking-wider"
                            >
                                {isApproving ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <CheckCheck className="w-3 h-3 mr-1.5" />}
                                Approve All Daily
                            </Button>
                            <Button 
                                onClick={onApproveAllMonthly}
                                disabled={isApproving || salesmanAccount.includes("All")}
                                size="sm"
                                className="h-8 text-[10px] font-bold uppercase tracking-wider"
                            >
                                {isApproving ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <CheckCheck className="w-3 h-3 mr-1.5" />}
                                Approve All Monthly
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
