// src/modules/customer-relationship-management/structure/task-management-approval/components/FilterHeader.tsx
"use client";

import React from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface FilterHeaderProps {
    currentMonth: number;
    onMonthChange: (m: number) => void;
    currentYear: number;
    onYearChange: (y: number) => void;
}

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const years = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i);

export const FilterHeader: React.FC<FilterHeaderProps> = ({
    currentMonth,
    onMonthChange,
    currentYear,
    onYearChange,
}) => {
    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div className="space-y-1">
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Task Management Approval
                </h1>
                <p className="text-muted-foreground text-sm font-medium">
                    Review, audit and approve team productivity plans with precision.
                </p>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1.5">
                    <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Month</Label>
                    <Select value={String(currentMonth)} onValueChange={(v) => onMonthChange(parseInt(v))}>
                        <SelectTrigger className="w-[140px] bg-background/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors shadow-sm">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map((m, i) => (
                                <SelectItem key={m} value={String(i)}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Year</Label>
                    <Select value={String(currentYear)} onValueChange={(v) => onYearChange(parseInt(v))}>
                        <SelectTrigger className="w-[100px] bg-background/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-colors shadow-sm">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((y) => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
};
