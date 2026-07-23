"use client";

import { useEmployeeStockPurchaseSummary } from "../hooks/useEmployeeStockPurchaseSummary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

export function SummaryFilters() {
    const { filters, setFilters, rawData } = useEmployeeStockPurchaseSummary();

    // Extract unique companies and users from rawData for the dropdown options
    // Note: Ideally these come from a master list API, but deriving from rawData is a pragmatic fallback.
    const uniqueCompanies = useMemo(() => {
        const map = new Map<number, string>();
        rawData.forEach(r => {
            if (r.company_id && r.company_name) {
                map.set(r.company_id, r.company_name);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [rawData]);

    const uniqueUsers = useMemo(() => {
        const map = new Map<number, string>();
        rawData.forEach(r => {
            if (r.user_id && r.employee_name) {
                map.set(r.user_id, r.employee_name);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [rawData]);

    const handleClear = () => {
        setFilters({});
    };

    return (
        <div className="flex flex-col sm:flex-row gap-4 p-4 items-center bg-card rounded-lg shadow-sm mb-4 mx-4 border">
            <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Date From</label>
                <Input 
                    type="date" 
                    value={filters.date_from || ""} 
                    onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                />
            </div>
            
            <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Date To</label>
                <Input 
                    type="date" 
                    value={filters.date_to || ""} 
                    onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                />
            </div>

            <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Company</label>
                <Select
                    value={filters.company_id?.toString() || "all"}
                    onValueChange={(val) => setFilters({ ...filters, company_id: val === "all" ? undefined : Number(val) })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="All Companies" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Companies</SelectItem>
                        {uniqueCompanies.map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Employee</label>
                <Select
                    value={filters.user_id?.toString() || "all"}
                    onValueChange={(val) => setFilters({ ...filters, user_id: val === "all" ? undefined : Number(val) })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="All Employees" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {uniqueUsers.map(u => (
                            <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-end h-full pt-5">
                <Button variant="outline" onClick={handleClear} className="w-full sm:w-auto flex gap-2">
                    <X className="h-4 w-4" />
                    Clear
                </Button>
            </div>
        </div>
    );
}
