"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Card, CardContent } from "@/components/ui/card";
import { Salesman, Branch, Supplier } from "../types";
import { Search, Calendar } from "lucide-react";
import { useEffect, useState } from "react";

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
    supplierId: string;
    status: string;
}

interface SalesOrderFormFieldsProps {
    appliedFilters: AppliedFilters;
    onSearch: (filters: AppliedFilters) => void;
    salesmen: Salesman[];
    branches: Branch[];
    suppliers: Supplier[];
}

export function SalesOrderFormFields({ appliedFilters, onSearch, salesmen, branches, suppliers }: SalesOrderFormFieldsProps) {
    const [draftFilters, setDraftFilters] = useState<AppliedFilters>(appliedFilters);

    const handleInputChange = (key: keyof AppliedFilters, value: string) => {
        const next = { ...draftFilters, [key]: value };
        setDraftFilters(next);
        
        // Automatically reset search results if the search bar is cleared
        if (key === "search" && value.trim() === "") {
            onSearch(next);
        }
    };

    // For other filters, we search immediately
    useEffect(() => {
        onSearch(draftFilters);
        // Explicit dependencies to satisfy ESLint while avoiding infinite loops
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        onSearch,
        draftFilters.startDate,
        draftFilters.endDate,
        draftFilters.salesmanId,
        draftFilters.branchId,
        draftFilters.supplierId,
        draftFilters.status,
        draftFilters.dateCreated,
        draftFilters.orderDate,
        draftFilters.deliveryDate,
        draftFilters.dueDate
    ]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            onSearch(draftFilters);
        }
    };

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
                                placeholder="Order No, Customer Name, Code... (Press Enter)"
                                value={draftFilters.search}
                                onChange={(e) => handleInputChange("search", e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                    </div>

                    {/* Salesman */}
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase pl-1">Salesman</Label>
                        <SearchableSelect
                            options={[
                                { value: "none", label: "All Salesmen" },
                                ...salesmen.map(sm => ({ 
                                    value: sm.id.toString(), 
                                    label: sm.salesman_code ? `${sm.salesman_name} (${sm.salesman_code})` : sm.salesman_name 
                                }))
                            ]}
                            value={draftFilters.salesmanId}
                            onValueChange={(val) => handleInputChange("salesmanId", val)}
                            placeholder="All Salesmen"
                            className="h-9 text-sm shadow-sm"
                        />
                    </div>

                    {/* Branch */}
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase pl-1">Branch</Label>
                        <SearchableSelect
                            options={[
                                { value: "none", label: "All Branches" },
                                ...branches.map(b => ({ value: b.id.toString(), label: b.branch_name }))
                            ]}
                            value={draftFilters.branchId}
                            onValueChange={(val) => handleInputChange("branchId", val)}
                            placeholder="All Branches"
                            className="h-9 text-sm shadow-sm"
                        />
                    </div>

                    {/* Supplier */}
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase pl-1">Supplier</Label>
                        <SearchableSelect
                            options={[
                                { value: "none", label: "All Suppliers" },
                                ...suppliers.map(s => ({ 
                                    value: s.id.toString(), 
                                    label: s.supplier_name ? `${s.supplier_name} (${s.supplier_shortcut})` : (s.supplier_shortcut || `Supplier ${s.id}`)
                                }))
                            ]}
                            value={draftFilters.supplierId}
                            onValueChange={(val) => handleInputChange("supplierId", val)}
                            placeholder="All Suppliers"
                            className="h-9 text-sm shadow-sm"
                        />
                    </div>

                    {/* Status */}
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase pl-1">Status</Label>
                        <SearchableSelect
                            options={[
                                { value: "none", label: "All Status" },
                                { value: "Draft", label: "Draft" },
                                { value: "Pending", label: "Pending" },
                                { value: "For Approval", label: "For Approval" },
                                { value: "For Consolidation", label: "For Consolidation" },
                                { value: "For Picking", label: "For Picking" },
                                { value: "For Invoicing", label: "For Invoicing" },
                                { value: "For Loading", label: "For Loading" },
                                { value: "For Shipping", label: "For Shipping" },
                                { value: "En Route", label: "En Route" },
                                { value: "Delivered", label: "Delivered" },
                                { value: "On Hold", label: "On Hold" },
                                { value: "Cancelled", label: "Cancelled" },
                                { value: "Not Fulfilled", label: "Not Fulfilled" },
                            ]}
                            value={draftFilters.status}
                            onValueChange={(val) => handleInputChange("status", val)}
                            placeholder="All Status"
                            className="h-9 text-sm shadow-sm"
                        />
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
