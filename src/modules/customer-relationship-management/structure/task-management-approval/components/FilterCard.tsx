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
import { LocalSearchableSelect } from "./LocalSearchableSelect";

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
                        <LocalSearchableSelect
                            options={[
                                { value: "all", label: "Please Select Salesman" },
                                ...users.map((u) => ({
                                    value: String(u.user_id),
                                    label: `${u.user_fname} ${u.user_lname}`
                                }))
                            ]}
                            value={selectedEmployeeId}
                            onValueChange={onEmployeeChange}
                            placeholder="Select Salesman"
                        />
                    </div>

                    <div className="space-y-4">
                        <Label className="text-xs font-semibold text-primary/80 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            SALESMAN CODE
                        </Label>
                        <LocalSearchableSelect
                            options={[
                                { value: "all", label: "Please Select Salesman" },
                                ...salesmen.map((s) => ({
                                    value: String(s.id),
                                    label: `${s.salesman_name} (${s.salesman_code})`
                                }))
                            ]}
                            value={selectedSalesmanId}
                            onValueChange={onSalesmanChange}
                            disabled={!selectedEmployeeId || selectedEmployeeId === "all"}
                            placeholder={!selectedEmployeeId || selectedEmployeeId === "all" ? "Select Salesman first" : "Select Salesman"}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
