"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSalesOrderApproval } from "../sales-order-approval/hooks/useSalesOrderApproval";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search, Loader2, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
    }).format(amount);
};

export default function SalesOrderDraftModule() {
    const {
        loadingOrders,
        loadingMore,
        hasMore,
        loadNextPage,
        orders,
        setStatusFilter,
        searchTerm,
        setSearchTerm,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        refreshOrders
    } = useSalesOrderApproval();
    const router = useRouter();

    const observerTarget = useRef<HTMLDivElement>(null);

    // Force "Draft" filter on mount for this module
    useEffect(() => {
        setStatusFilter("Draft");
    }, [setStatusFilter]);

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
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
            {/* Header section with icon mask */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 shadow-inner">
                        <PackagePlus className="h-7 w-7" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Sales Order Draft</h1>
                        </div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1 opacity-70">
                            Allocate stock for transaction drafts before formal approval
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={refreshOrders}
                        disabled={loadingOrders}
                        className="h-9 hover:bg-slate-100 font-bold text-xs uppercase tracking-widest gap-2"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loadingOrders ? "animate-spin" : ""}`} />
                        Sync
                    </Button>
                </div>
            </div>

            {/* Filters Area */}
            <div className="flex flex-col lg:flex-row gap-4 bg-muted/20 p-4 rounded-xl border border-dashed">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search customer, order no, or PO no..."
                        className="pl-10 h-10 border-none bg-background shadow-sm rounded-lg text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">From</span>
                        <Input
                            type="date"
                            className="w-[150px] text-xs h-10 rounded-lg border-none bg-background shadow-sm"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">To</span>
                        <Input
                            type="date"
                            className="w-[150px] text-xs h-10 rounded-lg border-none bg-background shadow-sm"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* List content area */}
            <div className="rounded-2xl border bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
                <div className="overflow-x-auto min-w-[700px]">
                    <Table>
                        <TableHeader className="bg-muted/40 border-b border-border">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="h-11 uppercase text-[10px] font-black text-muted-foreground tracking-widest pl-6">Order No</TableHead>
                                <TableHead className="h-11 uppercase text-[10px] font-black text-muted-foreground tracking-widest whitespace-nowrap">PO No</TableHead>
                                <TableHead className="h-11 uppercase text-[10px] font-black text-muted-foreground tracking-widest">Customer</TableHead>
                                <TableHead className="h-11 uppercase text-[10px] font-black text-muted-foreground tracking-widest">Draft Date</TableHead>
                                <TableHead className="text-right h-11 uppercase text-[10px] font-black text-muted-foreground tracking-widest">Net Amount</TableHead>
                                <TableHead className="text-right h-11 uppercase text-[10px] font-black text-muted-foreground tracking-widest w-[120px]">Allocation</TableHead>
                                <TableHead className="text-right h-11 uppercase text-[10px] font-black text-muted-foreground tracking-widest pr-6 w-[100px]">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingOrders ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="pl-6"><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                                        <TableCell className="text-right pr-6"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : orders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-48 text-center bg-muted/5">
                                        <div className="flex flex-col items-center justify-center gap-2 opacity-40">
                                            <PackagePlus className="h-10 w-10 text-muted-foreground" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">No active drafts detected</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orders.map((order) => (
                                    <TableRow
                                        key={order.order_id}
                                        className="group cursor-pointer hover:bg-muted/30 transition-all border-slate-50"
                                        onClick={() => router.push(`/crm/customer-hub/create-sales-order?orderId=${order.order_id}`)}
                                    >
                                        <TableCell className="pl-6 py-4">
                                            <span className="font-black text-foreground text-sm group-hover:text-primary transition-colors">{order.order_no}</span>
                                        </TableCell>
                                        <TableCell className="font-bold text-slate-400 text-xs tabular-nums">{order.po_no || "—"}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-bold text-slate-900 text-sm">{order.customer_name}</span>
                                                <span className="text-[10px] text-muted-foreground font-bold tracking-tighter uppercase">{order.customer_code}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium text-slate-500">
                                            {order.order_date ? format(new Date(order.order_date), "MMM d, yyyy") : "—"}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-400 tabular-nums">
                                            {formatCurrency(order.total_amount)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-primary font-black text-base tabular-nums leading-none">{formatCurrency(order.allocated_amount || 0)}</span>
                                                <Badge variant="outline" className="text-[8px] h-4 mt-1 bg-primary/5 text-primary border-primary/10 uppercase font-black">Partial Draft</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button variant="outline" size="sm" className="h-8 font-black uppercase tracking-tighter text-[10px] shadow-sm hover:bg-primary hover:text-white transition-all">
                                                Allocate
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination & Footer summary area */}
            {hasMore && (
                <div ref={observerTarget} className="flex flex-col items-center justify-center p-8 gap-3 border-t-2 border-dashed">
                    {(loadingMore || loadingOrders) ? (
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Fetching Data Stream</span>
                        </div>
                    ) : (
                        <Button variant="ghost" size="sm" onClick={loadNextPage} className="font-black text-[10px] tracking-widest uppercase opacity-40 hover:opacity-100">
                            View More Records
                        </Button>
                    )}
                </div>
            )}

            {!hasMore && orders.length > 0 && (
                <div className="flex justify-center p-8">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-30">Archive end reached</p>
                </div>
            )}

            {/* Linkage and Modal logic removed to favor workbench redirection */}
        </div>
    );
}
