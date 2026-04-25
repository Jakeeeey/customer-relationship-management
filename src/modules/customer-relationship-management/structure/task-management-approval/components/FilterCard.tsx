// src/modules/customer-relationship-management/structure/task-management-approval/components/FilterCard.tsx
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

interface FilterCardProps {
    users: User[];
    salesmen: Salesman[];
    selectedEmployeeId: string;
    onEmployeeChange: (id: string) => void;
    selectedSalesmanId: string;
    onSalesmanChange: (id: string) => void;
}

export const FilterCard: React.FC<FilterCardProps> = ({
    users,
    salesmen,
    selectedEmployeeId,
    onEmployeeChange,
    selectedSalesmanId,
    onSalesmanChange,
}) => {
    return (
        <Card className="border-none shadow-xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-md overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-6 lg:p-10 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
                    <div className="space-y-4">
                        <Label className="text-xs font-semibold text-primary/80 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            Salesman
                        </Label>
                        <Select value={selectedEmployeeId} onValueChange={onEmployeeChange}>
                            <SelectTrigger className="bg-background/40 border-primary/10 hover:border-primary/30 transition-all h-12 rounded-xl font-bold">
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

                    <div className="space-y-4">
                        <Label className="text-xs font-semibold text-primary/80 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            SALESMAN CODE
                        </Label>
                        <Select
                            value={selectedSalesmanId}
                            onValueChange={onSalesmanChange}
                            disabled={!selectedEmployeeId || selectedEmployeeId === "all"}
                        >
                            <SelectTrigger className="bg-background/40 border-primary/10 hover:border-primary/30 transition-all h-12 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                                <SelectValue placeholder={!selectedEmployeeId || selectedEmployeeId === "all" ? "Select Salesman first" : "Select Salesman"} />
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
    );
};
