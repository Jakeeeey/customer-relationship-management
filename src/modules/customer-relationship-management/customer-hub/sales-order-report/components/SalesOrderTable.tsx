"use client";

import { useEffect, useRef, useMemo } from "react";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { SalesOrder, Customer, Salesman, Branch, Supplier } from "../types";

import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

import { Skeleton } from "@/components/ui/skeleton";

interface SalesOrderTableProps {
    orders: SalesOrder[];
    customers: Customer[];
    salesmen: Salesman[];
    branches: Branch[];
    suppliers: Supplier[];
    totalOrders: number;
    pageSize: number;
    onLoadMore: () => void;
    isLoading?: boolean;
    hasActiveDate?: boolean;
    selectedOrderId?: string | number;
    onRowClick?: (order: SalesOrder) => void;
}

export function SalesOrderTable({
    orders,
    customers,
    salesmen,
    branches,
    suppliers,
    totalOrders,
    pageSize,
    onLoadMore,
    isLoading = false,
    hasActiveDate = false,
    selectedOrderId,
    onRowClick
}: SalesOrderTableProps) {
    const observerTarget = useRef<HTMLDivElement>(null);

    // Highly optimize Lookups to avoid O(N*M) lagging on scroll!
    const customerMap = useMemo(() => new Map(customers.map(c => [c.customer_code, c.store_name])), [customers]);
    const salesmanMap = useMemo(() => new Map(salesmen.map(s => [s.id, s.salesman_name])), [salesmen]);
    const branchMap = useMemo(() => new Map(branches.map(b => [b.id, b.branch_name])), [branches]);
    const supplierMap = useMemo(() => new Map(suppliers.map(s => [s.id, s.supplier_name ? `${s.supplier_name} (${s.supplier_shortcut})` : (s.supplier_shortcut || `Supplier ${s.id}`)])), [suppliers]);

    // Use refs so the observer callback always sees fresh values without re-creating
    const isLoadingRef = useRef(isLoading);
    const hasMoreRef = useRef(orders.length < totalOrders);
    const onLoadMoreRef = useRef(onLoadMore);

    // Keep refs in sync (must be inside useEffect to avoid "Cannot access refs during render")
    useEffect(() => {
        isLoadingRef.current = isLoading;
        hasMoreRef.current = orders.length < totalOrders;
        onLoadMoreRef.current = onLoadMore;
    });

    useEffect(() => {
        const target = observerTarget.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isLoadingRef.current && hasMoreRef.current) {
                    onLoadMoreRef.current();
                }
            },
            { threshold: 0.1, rootMargin: "0px 0px 400px 0px" }
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, []); // Empty deps — observer is created ONCE, refs handle the rest

    return (
        <div className="space-y-4">
            <div className="rounded-md border bg-card overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 h-8">
                            <TableHead rowSpan={2} className="align-middle border-r text-[10px] font-bold uppercase py-1 px-2">Order Date</TableHead>
                            <TableHead colSpan={2} className="text-center border-b border-r text-[10px] font-bold uppercase py-1 px-2">Order No</TableHead>
                            <TableHead rowSpan={2} className="align-middle border-r text-[10px] font-bold uppercase py-1 px-2">Supplier</TableHead>
                            <TableHead className="align-middle border-r text-[10px] font-bold uppercase py-1 px-2" rowSpan={2}>Customer</TableHead>
                            <TableHead className="align-middle border-r text-[10px] font-bold uppercase py-1 px-2" rowSpan={2}>Salesman</TableHead>
                            <TableHead rowSpan={2} className="align-middle border-r text-[10px] font-bold uppercase py-1 px-2">Branch</TableHead>
                            <TableHead rowSpan={2} className="align-middle border-r text-[10px] font-bold uppercase py-1 px-2">Created</TableHead>
                            <TableHead rowSpan={2} className="align-middle text-right border-r text-[10px] font-bold uppercase py-1 px-2">Total Amt</TableHead>
                            <TableHead rowSpan={2} className="align-middle text-right border-r text-[10px] font-bold uppercase py-1 px-2">Discount</TableHead>
                            <TableHead rowSpan={2} className="align-middle text-right border-r text-[10px] font-bold uppercase py-1 px-2">Net Amt</TableHead>
                            <TableHead rowSpan={2} className="align-middle text-right border-r text-[10px] font-bold uppercase py-1 px-2">Alloc Amt</TableHead>
                            <TableHead rowSpan={2} className="align-middle border-r text-[10px] font-bold uppercase py-1 px-2">Status</TableHead>
                        </TableRow>
                        <TableRow className="bg-muted/50 h-8">
                            <TableHead className="border-r text-[9px] font-bold py-1 px-2">SO NO</TableHead>
                            <TableHead className="border-r text-[9px] font-bold py-1 px-2">PO NO</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: pageSize }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell className="border-r"><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell className="border-r"><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell className="border-r"><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell className="border-r"><Skeleton className="h-4 w-12" /></TableCell>
                                    <TableCell className="border-r"><Skeleton className="h-4 w-40" /></TableCell>
                                    <TableCell className="border-r"><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell className="border-r"><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell className="border-r"><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell className="border-r"><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell className="border-r"><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell className="text-right border-r"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                    <TableCell className="text-right border-r"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                    <TableCell className="border-r"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : orders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={13} className="h-24 text-center text-muted-foreground">
                                    {!hasActiveDate
                                        ? "Please select a date filter to view sales orders."
                                        : "No orders found for the selected filters."
                                    }
                                </TableCell>
                            </TableRow>
                        ) : (
                            orders.map((order, index) => (
                                <TableRow
                                    key={`${order.order_id}-${index}`}
                                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${selectedOrderId === order.order_id
                                        ? "bg-primary/5 hover:bg-primary/10 border-l-2 border-l-primary"
                                        : ""
                                        }`}
                                    onClick={() => onRowClick?.(order)}
                                >
                                    <TableCell className="border-r py-1.5 px-2 text-xs">{order.order_date || "-"}</TableCell>
                                    <TableCell className="border-r py-1.5 px-2 text-xs font-medium">{order.order_no || "-"}</TableCell>
                                    <TableCell className="border-r py-1.5 px-2 text-[10px]">{order.po_no || "-"}</TableCell>
                                    <TableCell className="border-r py-1.5 px-2 text-[10px]">
                                        {(order.supplier_id ? supplierMap.get(order.supplier_id) : null) || order.supplier_id || "-"}
                                    </TableCell>
                                    <TableCell className="border-r py-1.5 px-2 text-[10px] leading-tight max-w-[150px] truncate">
                                        {(order.customer_code ? customerMap.get(order.customer_code) : null) || "-"}
                                    </TableCell>
                                    <TableCell className="border-r py-1.5 px-2 text-[10px] leading-tight">
                                        {(order.salesman_id ? salesmanMap.get(order.salesman_id) : null) || "-"}
                                    </TableCell>
                                    <TableCell className="border-r py-1.5 px-2 text-[10px]">
                                        {(order.branch_id ? branchMap.get(order.branch_id) : null) || "-"}
                                    </TableCell>
                                    <TableCell className="border-r py-1.5 px-2 text-[10px]">{order.created_date?.split("T")[0] || "-"}</TableCell>
                                    <TableCell className="text-right border-r py-1.5 px-2 text-[11px] font-mono">
                                        {formatCurrency((Number(order.total_amount) || 0) + (Number(order.discount_amount) || 0))}
                                    </TableCell>
                                    <TableCell className="text-right border-r py-1.5 px-2 text-[11px] font-mono text-muted-foreground">
                                        {formatCurrency(order.discount_amount || 0)}
                                    </TableCell>
                                    <TableCell className="text-right border-r py-1.5 px-2 text-[11px] font-mono font-medium">
                                        {formatCurrency(Number(order.total_amount) || 0)}
                                    </TableCell>
                                    <TableCell className="text-right border-r py-1.5 px-2 text-[11px] font-mono font-bold text-primary">
                                        {formatCurrency(order.allocated_amount)}
                                    </TableCell>
                                    <TableCell className="border py-1 px-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${order.order_status === "For Approval"
                                            ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                            : order.order_status === "Posted"
                                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                                : order.order_status === "Cancelled"
                                                    ? "bg-red-100 text-red-800 border border-red-200"
                                                    : "bg-blue-100 text-blue-800 border border-blue-200"
                                            }`}>
                                            {order.order_status || "PENDING"}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                        {/* Loading skeleton rows at bottom while fetching more */}
                        {isLoading && orders.length > 0 &&
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={`loading-${i}`} className="animate-pulse">
                                    <TableCell className="border-r py-1.5 px-2"><Skeleton className="h-3.5 w-16" /></TableCell>
                                    <TableCell className="border-r py-1.5 px-2"><Skeleton className="h-3.5 w-24" /></TableCell>
                                    <TableCell className="border-r py-1.5 px-2"><Skeleton className="h-3.5 w-16" /></TableCell>
                                    <TableCell className="border-r py-1.5 px-2"><Skeleton className="h-3.5 w-12" /></TableCell>
                                    <TableCell className="border-r py-1.5 px-2"><Skeleton className="h-3.5 w-28" /></TableCell>
                                    <TableCell className="border-r py-1.5 px-2"><Skeleton className="h-3.5 w-20" /></TableCell>
                                    <TableCell className="border-r py-1.5 px-2"><Skeleton className="h-3.5 w-16" /></TableCell>
                                    <TableCell className="border-r py-1.5 px-2"><Skeleton className="h-3.5 w-16" /></TableCell>
                                    <TableCell className="border-r py-1.5 px-2"><Skeleton className="h-3.5 w-16" /></TableCell>
                                    <TableCell className="border-r py-1.5 px-2"><Skeleton className="h-3.5 w-12" /></TableCell>
                                    <TableCell className="border-r py-1.5 px-2"><Skeleton className="h-3.5 w-16" /></TableCell>
                                    <TableCell className="border-r py-1.5 px-2"><Skeleton className="h-3.5 w-16" /></TableCell>
                                    <TableCell className="border-r py-1.5 px-2"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                </TableRow>
                            ))
                        }
                    </TableBody>
                </Table>
            </div>

            {/* Bottom status area */}
            <div className="flex flex-col items-center justify-center px-2 py-3 gap-2">
                <div className="text-xs text-muted-foreground w-full text-center">
                    Showing {orders.length} {orders.length !== totalOrders ? `of ${totalOrders}` : ""} records
                    {orders.length < totalOrders && (
                        <span className="ml-1 opacity-60">• Scroll for more</span>
                    )}
                </div>
                {orders.length < totalOrders && (
                    <div className="w-full max-w-xs mx-auto">
                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary/40 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${Math.min((orders.length / totalOrders) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                )}
                {isLoading && orders.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading more orders...
                    </div>
                )}
                {/* Invisible sentinel for intersection observer */}
                <div ref={observerTarget} className="h-1 w-full" />
            </div>
        </div>
    );
}
