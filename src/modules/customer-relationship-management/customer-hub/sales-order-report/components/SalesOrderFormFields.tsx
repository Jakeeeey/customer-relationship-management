"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

import { Search, Calendar } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SalesOrderFormFieldsProps {
    appliedFilters: {
        search: string;
        dateCreated: string;
        orderDate: string;
        deliveryDate: string;
        dueDate: string;
    };
    onSearch: (filters: SalesOrderFormFieldsProps["appliedFilters"]) => void;
}

export function SalesOrderFormFields({ appliedFilters, onSearch }: SalesOrderFormFieldsProps) {
    const [draftFilters, setDraftFilters] = useState(appliedFilters);

    const handleInputChange = (key: string, value: string) => {
        setDraftFilters(prev => ({ ...prev, [key]: value }));
    };

    return (
        <Card className="border-none shadow-none">
            <CardContent className="p-0 space-y-8">
                {/* Unified Search Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-primary">
                            <Search className="h-4 w-4" />
                            <h3 className="text-sm font-semibold uppercase tracking-wider">Search Filters</h3>
                        </div>
                        <Button
                            onClick={() => onSearch(draftFilters)}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8"
                        >
                            <Search className="mr-2 h-4 w-4" />
                            Search
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="unifiedSearch" className="text-xs font-bold text-muted-foreground uppercase">
                                General Search
                            </Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="unifiedSearch"
                                    className="pl-10 h-12 text-base shadow-sm border-2 focus-visible:ring-primary"
                                    placeholder="Search by Order No, Customer Code, or PO No..."
                                    value={draftFilters.search}
                                    onChange={(e) => handleInputChange("search", e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Date Filters Section */}
                <div className="space-y-4 pt-6 border-t">
                    <div className="flex items-center gap-2 text-primary">
                        <Calendar className="h-4 w-4" />
                        <h3 className="text-sm font-semibold uppercase tracking-wider">Date Filters</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="dateCreated" className="text-xs font-bold text-muted-foreground uppercase">Date Created</Label>
                            <Input
                                id="dateCreated"
                                type="date"
                                className="h-11 border-2 shadow-sm"
                                value={draftFilters.dateCreated}
                                onChange={(e) => handleInputChange("dateCreated", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="orderDate" className="text-xs font-bold text-muted-foreground uppercase">Order Date</Label>
                            <Input
                                id="orderDate"
                                type="date"
                                className="h-11 border-2 shadow-sm"
                                value={draftFilters.orderDate}
                                onChange={(e) => handleInputChange("orderDate", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="deliveryDate" className="text-xs font-bold text-muted-foreground uppercase">Delivery Date</Label>
                            <Input
                                id="deliveryDate"
                                type="date"
                                className="h-11 border-2 shadow-sm"
                                value={draftFilters.deliveryDate}
                                onChange={(e) => handleInputChange("deliveryDate", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dueDate" className="text-xs font-bold text-muted-foreground uppercase">Due Date</Label>
                            <Input
                                id="dueDate"
                                type="date"
                                className="h-11 border-2 shadow-sm"
                                value={draftFilters.dueDate}
                                onChange={(e) => handleInputChange("dueDate", e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
