"use client";

import { useState, useEffect, useRef } from "react";
import { useSalesOrderApproval, SalesOrder } from "./hooks/useSalesOrderApproval";
import { ApprovalModal } from "./components";
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
import { format } from "date-fns";

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
        orders,
        statusFilter,
        setStatusFilter,
        searchTerm,
        setSearchTerm,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        handleApprove,
        handleHold,
        handleCancel,
        handleSubmitForApproval,
        handleSaveDetails,
        refreshOrders
    } = useSalesOrderApproval();

    const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && !loadingOrders) {
                    loadNextPage();
                }
            },
            { rootMargin: "100px" }
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
                        Review, monitor payments, and process individual sales orders.
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
                            <SelectItem value="For Approval">For Approval</SelectItem>
                            <SelectItem value="On Hold">On Hold</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Main List */}
            <div className="rounded-md border bg-card overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[120px]">Order No</TableHead>
                            <TableHead className="w-[120px]">PO No</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Order Date</TableHead>
                            <TableHead className="text-right">Total Amt</TableHead>
                            <TableHead className="text-right">Net Amt</TableHead>
                            <TableHead className="text-right">Alloc Amt</TableHead>
                            <TableHead className="w-[150px] text-center">Status</TableHead>
                            <TableHead className="w-[100px] text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loadingOrders ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                                    <TableCell className="text-center"><Skeleton className="h-6 w-24 mx-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : orders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                    No orders found matching your criteria.
                                </TableCell>
                            </TableRow>
                        ) : (
                            orders.map((order) => {
                                const status = order.order_status;

                                let badgeColor = "bg-secondary text-secondary-foreground border-border";
                                if (status === "For Approval") badgeColor = "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30";
                                else if (status === "For Consolidation") badgeColor = "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30";
                                else if (status === "Delivered") badgeColor = "bg-success/10 text-success border-success/20 dark:bg-success/20 dark:text-success dark:border-success/30";
                                else if (status === "Cancelled") badgeColor = "bg-destructive/10 text-destructive border-destructive/20";
                                else if (status === "On Hold") badgeColor = "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-500/30";

                                return (
                                    <TableRow
                                        key={order.order_id}
                                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        <TableCell className="font-bold">{order.order_no}</TableCell>
                                        <TableCell className="text-muted-foreground">{order.po_no || "N/A"}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{order.customer_name}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase">{order.customer_code}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {order.order_date ? format(new Date(order.order_date), "MMM d, yyyy") : "-"}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {formatCurrency(order.total_amount)}
                                        </TableCell>
                                        <TableCell className="text-right text-slate-400 font-bold tabular-nums">
                                            {formatCurrency(order.net_amount)}
                                        </TableCell>
                                        <TableCell className="text-right text-success font-black tabular-nums">
                                            {formatCurrency(order.allocated_amount || 0)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={`${badgeColor} whitespace-nowrap font-bold`}>
                                                {status.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedOrder(order);
                                            }} className="font-bold">
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
                            <span className="text-sm font-bold uppercase tracking-widest">Loading orders...</span>
                        </div>
                    )}
                </div>
            ) : (
                orders.length > 0 && (
                    <div className="flex justify-center p-6 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        End of transaction list.
                    </div>
                )
            )}

            <ApprovalModal
                order={selectedOrder}
                open={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onApprove={handleApprove}
                onHold={handleHold}
                onCancel={handleCancel}
                onSubmitForApproval={handleSubmitForApproval}
                onSaveDetails={handleSaveDetails}
            />
        </div>
    );
}
