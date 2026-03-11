"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSalesOrderApproval, CustomerGroup } from "./hooks/useSalesOrderApproval";
import { ApprovalModal } from "./components/ApprovalModal";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search, Loader2 } from "lucide-react";
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

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
    }).format(amount);
};

export default function SalesOrderApprovalModule() {
    const {
        loadingOrders,
        loadingMore,
        hasMore,
        loadNextPage,
        groupedCustomers,
        statusFilter,
        setStatusFilter,
        searchTerm,
        setSearchTerm,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        handleApproveBulk,
        refreshOrders
    } = useSalesOrderApproval();

    const [selectedGroup, setSelectedGroup] = useState<CustomerGroup | null>(null);
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && !loadingOrders) {
                    loadNextPage();
                }
            },
            { rootMargin: "100px" } // trigger slightly before reaching bottom
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loadingMore, loadingOrders, loadNextPage]);

    return (
        <div className="flex flex-col gap-6 w-full">
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
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search customer, order no, or PO no..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase text-muted-foreground whitespace-nowrap">From:</span>
                        <Input
                            type="date"
                            className="w-[140px] text-xs h-9"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase text-muted-foreground whitespace-nowrap">To:</span>
                        <Input
                            type="date"
                            className="w-[140px] text-xs h-9"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="w-full lg:w-[200px]">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Statuses</SelectItem>
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
            </div>

            {/* Main List */}
            <div className="rounded-md border bg-card overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[120px]">Customer Code</TableHead>
                            <TableHead>Customer Name</TableHead>
                            <TableHead className="text-right">Orders</TableHead>
                            <TableHead className="text-right">Total Net Amount</TableHead>
                            <TableHead className="w-[150px] text-center">Status</TableHead>
                            <TableHead className="w-[100px] text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loadingOrders ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                                    <TableCell className="text-center"><Skeleton className="h-6 w-24 mx-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : groupedCustomers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    No orders found matching your criteria.
                                </TableCell>
                            </TableRow>
                        ) : (
                            groupedCustomers.map((group) => {
                                const statuses = Array.from(new Set(group.orders.map(o => o.order_status)));
                                const status = statuses.length > 1 ? "MIXED" : (statuses[0] || "UNKNOWN");

                                let badgeColor = "bg-secondary text-secondary-foreground";
                                if (status === "For Approval") badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
                                else if (status === "For Consolidation") badgeColor = "bg-purple-100 text-purple-800 border-purple-200";
                                else if (status === "Delivered") badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                                else if (status === "Cancelled") badgeColor = "bg-destructive/10 text-destructive border-destructive/20";
                                else if (status === "MIXED") badgeColor = "bg-secondary text-secondary-foreground border-border";

                                return (
                                    <TableRow
                                        key={group.customer_code}
                                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => setSelectedGroup(group)}
                                    >
                                        <TableCell className="font-medium">{group.customer_code}</TableCell>
                                        <TableCell>{group.customer_name}</TableCell>
                                        <TableCell className="text-right font-medium">{group.orders.length}</TableCell>
                                        <TableCell className="text-right text-emerald-600 font-medium">
                                            {formatCurrency(group.total_net_amount)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={`${badgeColor} whitespace-nowrap`}>
                                                {status.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedGroup(group);
                                            }}>
                                                Review
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Infinite Scroll Target */}
            {hasMore ? (
                <div ref={observerTarget} className="flex justify-center p-6">
                    {(loadingMore || loadingOrders) && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-sm">Loading more...</span>
                        </div>
                    )}
                </div>
            ) : (
                groupedCustomers.length > 0 && (
                    <div className="flex justify-center p-6 text-sm text-muted-foreground">
                        No more orders to load.
                    </div>
                )
            )}

            <ApprovalModal
                group={selectedGroup}
                open={!!selectedGroup}
                onClose={() => setSelectedGroup(null)}
                onApprove={handleApproveBulk}
            />
        </div>
    );
}
