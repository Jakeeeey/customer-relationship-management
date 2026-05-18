// src/modules/customer-relationship-management/structure/task-management/components/FilterSection.tsx
"use client";

import React from "react";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { User, Salesman } from "../types";

interface FilterSectionProps {
    users: User[];
    salesmen: Salesman[];
    selectedEmployeeId: string;
    onEmployeeChange: (id: string) => void;
    selectedSalesmanId: string;
    onSalesmanChange: (id: string) => void;
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

export const FilterSection: React.FC<FilterSectionProps> = ({
    users,
    salesmen,
    selectedEmployeeId,
    onEmployeeChange,
    selectedSalesmanId,
    onSalesmanChange,
    currentMonth,
    onMonthChange,
    currentYear,
    onYearChange,
}) => {
    return (
        <div className="space-y-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Task Management
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Strategize, assign, and track team productivity with precision.
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

            <Card className="border-none shadow-xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-md overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardContent className="p-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-primary/80 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                Salesman
                            </Label>
                            <Select value={selectedEmployeeId} onValueChange={onEmployeeChange}>
                                <SelectTrigger className="bg-background/40 border-primary/10 hover:border-primary/30 transition-all h-11">
                                    <SelectValue placeholder="Select Salesman" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Salesman</SelectItem>
                                    {users.map((u) => (
                                        <SelectItem key={u.user_id} value={String(u.user_id)}>
                                            {u.user_fname} {u.user_lname}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-primary/80 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                Salesman Code
                            </Label>
                            <Select 
                                value={selectedSalesmanId} 
                                onValueChange={onSalesmanChange}
                                disabled={!selectedEmployeeId || selectedEmployeeId === "all"}
                            >
                                <SelectTrigger className="bg-background/40 border-primary/10 hover:border-primary/30 transition-all h-11 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <SelectValue placeholder={!selectedEmployeeId || selectedEmployeeId === "all" ? "Select employee first" : "Select Salesman"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Please Select Salesman Code</SelectItem>
                                    {salesmen.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            {s.salesman_name} ({s.salesman_code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
