"use client";

import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

interface FilterHeaderProps {
    month: string;
    year: string;
    searchTerm: string;
    onFilterChange: (month: string, year: string) => void;
    onSearchChange: (search: string) => void;
}

export function FilterHeader({
    month,
    year,
    searchTerm,
    onFilterChange,
    onSearchChange
}: FilterHeaderProps) {
    const months = [
        { value: "1", label: "January" },
        { value: "2", label: "February" },
        { value: "3", label: "March" },
        { value: "4", label: "April" },
        { value: "5", label: "May" },
        { value: "6", label: "June" },
        { value: "7", label: "July" },
        { value: "8", label: "August" },
        { value: "9", label: "September" },
        { value: "10", label: "October" },
        { value: "11", label: "November" },
        { value: "12", label: "December" },
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 21 }, (_, i) => String(currentYear - 10 + i));

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-start">
                <div className="space-y-1.5">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Target Settings</h1>
                    <p className="text-sm text-muted-foreground font-medium">Manage and track salesman targets and performance</p>
                </div>

                <div className="flex items-end gap-3">
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-0.5">Month</Label>
                        <div className="flex items-center bg-white rounded-lg border shadow-sm px-4 h-10">
                            <Select value={month} onValueChange={(val) => onFilterChange(val, year)}>
                                <SelectTrigger className="w-[120px] border-none focus:ring-0 shadow-none text-sm font-medium">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map(m => (
                                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-0.5">Year</Label>
                        <div className="flex items-center bg-white rounded-lg border shadow-sm px-1 h-10">
                            <Select value={year} onValueChange={(val) => onFilterChange(month, val)}>
                                <SelectTrigger className="w-[80px] border-none focus:ring-0 shadow-none text-sm font-medium">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(y => (
                                        <SelectItem key={y} value={y}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1.5 flex-1 max-w-sm">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-0.5">Search Salesman</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Enter salesman name..."
                            className="pl-9 h-10 bg-white border-muted/60"
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
