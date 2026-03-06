"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Salesman, Branch } from "../types";
import { Search, Calendar } from "lucide-react";
import { useEffect, useState, useRef } from "react";

interface AppliedFilters {
    search: string;
    dateCreated: string;
    orderDate: string;
    deliveryDate: string;
    dueDate: string;
    startDate: string;
    endDate: string;
    salesmanId: string;
    branchId: string;
    status: string;
}

interface SalesOrderFormFieldsProps {
    appliedFilters: AppliedFilters;
    onSearch: (filters: AppliedFilters) => void;
    salesmen: Salesman[];
    branches: Branch[];
}

export function SalesOrderFormFields({ appliedFilters, onSearch, salesmen, branches }: SalesOrderFormFieldsProps) {
    const [draftFilters, setDraftFilters] = useState<AppliedFilters>(appliedFilters);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleInputChange = (key: keyof AppliedFilters, value: string) => {
        setDraftFilters(prev => ({ ...prev, [key]: value }));
    };

    // Auto-search logic for text search (debounced)
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            onSearch(draftFilters);
        }, 500);

        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
        // We only want to re-run this when search changes or when onSearch changes
    }, [draftFilters.search, onSearch]);

    // For other filters, we search immediately
    useEffect(() => {
        onSearch(draftFilters);
        // Explicit dependencies to satisfy ESLint while avoiding infinite loops
    }, [
        onSearch,
        draftFilters.startDate,
        draftFilters.endDate,
        draftFilters.salesmanId,
        draftFilters.branchId,
        draftFilters.status,
        draftFilters.dateCreated,
        draftFilters.orderDate,
        draftFilters.deliveryDate,
        draftFilters.dueDate
    ]);

    return (
        <Card className="border shadow-sm bg-muted/30">
            <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                    {/* General Search */}
                    <div className="lg:col-span-2 xl:col-span-2 flex flex-col gap-1.5">
                        <Label htmlFor="unifiedSearch" className="text-[10px] font-bold text-muted-foreground uppercase pl-1">
                            Search Order / Customer
                        </Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                            <Input
                                id="unifiedSearch"
                                className="pl-9 h-9 text-sm shadow-sm focus-visible:ring-primary/50"
                                placeholder="Order No, Customer Code..."
                                value={draftFilters.search}
                                onChange={(e) => handleInputChange("search", e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Salesman */}
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase pl-1">Salesman</Label>
                        <Select
                            value={draftFilters.salesmanId}
                            onValueChange={(val) => handleInputChange("salesmanId", val)}
                        >
                            <SelectTrigger className="h-9 text-sm shadow-sm">
                                <SelectValue placeholder="All Salesmen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">All Salesmen</SelectItem>
                                {salesmen.map(sm => (
                                    <SelectItem key={sm.id} value={sm.id.toString()}>{sm.salesman_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Branch */}
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase pl-1">Branch</Label>
                        <Select
                            value={draftFilters.branchId}
                            onValueChange={(val) => handleInputChange("branchId", val)}
                        >
                            <SelectTrigger className="h-9 text-sm shadow-sm">
                                <SelectValue placeholder="All Branches" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">All Branches</SelectItem>
                                {branches.map(b => (
                                    <SelectItem key={b.id} value={b.id.toString()}>{b.branch_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Status */}
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase pl-1">Status</Label>
                        <Select
                            value={draftFilters.status}
                            onValueChange={(val) => handleInputChange("status", val)}
                        >
                            <SelectTrigger className="h-9 text-sm shadow-sm">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">All Status</SelectItem>
                                <SelectItem value="For Approval">For Approval</SelectItem>
                                <SelectItem value="For Consolidation">For Consolidation</SelectItem>
                                <SelectItem value="For Picking">For Picking</SelectItem>
                                <SelectItem value="For Invoicing">For Invoicing</SelectItem>
                                <SelectItem value="For Loading">For Loading</SelectItem>
                                <SelectItem value="For Shipping">For Shipping</SelectItem>
                                <SelectItem value="En Route">En Route</SelectItem>
                                <SelectItem value="Delivered">Delivered</SelectItem>
                                <SelectItem value="On Hold">On Hold</SelectItem>
                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                                <SelectItem value="Not Fulfilled">Not Fulfilled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Range */}
                    <div className="lg:col-span-2 flex flex-col gap-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase pl-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Order Date Range
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="date"
                                className="h-9 text-sm shadow-sm px-2 bg-background"
                                value={draftFilters.startDate}
                                onChange={(e) => handleInputChange("startDate", e.target.value)}
                            />
                            <span className="text-muted-foreground text-xs font-bold uppercase">to</span>
                            <Input
                                type="date"
                                className="h-9 text-sm shadow-sm px-2 bg-background"
                                value={draftFilters.endDate}
                                onChange={(e) => handleInputChange("endDate", e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
