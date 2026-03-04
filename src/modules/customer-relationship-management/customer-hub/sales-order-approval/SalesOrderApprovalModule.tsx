"use client";

import React, { useState } from "react";
import { useSalesOrderApproval, CustomerGroup } from "./hooks/useSalesOrderApproval";
import { CustomerGroupCard } from "./components/CustomerGroupCard";
import { ApprovalDrawer } from "./components/ApprovalDrawer";
import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function SalesOrderApprovalModule() {
    const {
        loadingOrders,
        groupedCustomers,
        statusFilter,
        setStatusFilter,
        searchTerm,
        setSearchTerm,
        handleApproveBulk,
        refreshOrders
    } = useSalesOrderApproval();

    const [selectedGroup, setSelectedGroup] = useState<CustomerGroup | null>(null);

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Sales Order Approval</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Review, monitor payments, and approve sales orders in bulk.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshOrders}
                        disabled={loadingOrders}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${loadingOrders ? "animate-spin" : ""}`} />
                        {loadingOrders ? "Refreshing..." : "Refresh"}
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search customer, order no, or PO no..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-[200px]">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="For Approval">For Approval</SelectItem>
                            <SelectItem value="For Consolidation">For Consolidation</SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Main List */}
            {loadingOrders ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-xl" />
                    ))}
                </div>
            ) : groupedCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl border-dashed">
                    <h3 className="text-lg font-semibold mb-1">No Orders Found</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        There are no orders matching your current search and filter criteria.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedCustomers.map((group) => (
                        <CustomerGroupCard
                            key={group.customer_code}
                            group={group}
                            onClick={() => setSelectedGroup(group)}
                        />
                    ))}
                </div>
            )}

            <ApprovalDrawer
                group={selectedGroup}
                open={!!selectedGroup}
                onClose={() => setSelectedGroup(null)}
                onApprove={handleApproveBulk}
            />
        </div>
    );
}
