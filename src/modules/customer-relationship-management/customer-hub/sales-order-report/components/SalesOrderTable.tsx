"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { SalesOrder, Customer, Salesman, Branch, Supplier } from "../types";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

interface SalesOrderTableProps {
    orders: SalesOrder[];
    customers: Customer[];
    salesmen: Salesman[];
    branches: Branch[];
    suppliers: Supplier[];
    currentPage: number;
    totalOrders: number;
    pageSize: number;
    onPageChange: (page: number) => void;
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
    currentPage,
    totalOrders,
    pageSize,
    onPageChange,
    isLoading = false,
    hasActiveDate = false,
    selectedOrderId,
    onRowClick
}: SalesOrderTableProps) {
    const totalPages = Math.ceil(totalOrders / pageSize);

    return (
        <div className="space-y-4">
            <div className="rounded-md border bg-card overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead rowSpan={2} className="align-middle border-r">Order Date</TableHead>
                            <TableHead colSpan={2} className="text-center border-b border-r">Order No</TableHead>
                            <TableHead rowSpan={2} className="align-middle border-r">Supplier</TableHead>
                            <TableHead colSpan={2} className="text-center border-b border-r">Customer</TableHead>
                            <TableHead colSpan={2} className="text-center border-b border-r">Salesman</TableHead>
                            <TableHead rowSpan={2} className="align-middle border-r">Branch</TableHead>
                            <TableHead rowSpan={2} className="align-middle border-r">Created Date</TableHead>
                            <TableHead rowSpan={2} className="align-middle text-right border-r">Total Amount</TableHead>
                            <TableHead rowSpan={2} className="align-middle text-right border-r">Allocated Amount</TableHead>
                            <TableHead rowSpan={2} className="align-middle">Status</TableHead>
                        </TableRow>
                        <TableRow className="bg-muted/50">
                            <TableHead className="border-r">SO No</TableHead>
                            <TableHead className="border-r">PO No</TableHead>
                            <TableHead className="border-r">Store Name</TableHead>
                            <TableHead className="border-r">Code</TableHead>
                            <TableHead className="border-r">Name</TableHead>
                            <TableHead className="border-r">Code</TableHead>
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
                                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
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
                            orders.map((order) => (
                                <TableRow
                                    key={order.order_id}
                                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${selectedOrderId === order.order_id
                                            ? "bg-primary/5 hover:bg-primary/10 border-l-2 border-l-primary"
                                            : ""
                                        }`}
                                    onClick={() => onRowClick?.(order)}
                                >
                                    <TableCell className="border-r">{order.order_date || "-"}</TableCell>
                                    <TableCell className="border-r">{order.order_no || "-"}</TableCell>
                                    <TableCell className="border-r">{order.po_no || "-"}</TableCell>
                                    <TableCell className="border-r">
                                        {suppliers.find(s => s.id === order.supplier_id)?.supplier_shortcut || order.supplier_id || "-"}
                                    </TableCell>
                                    <TableCell className="border-r">
                                        {customers.find(c => c.customer_code === order.customer_code)?.store_name || "-"}
                                    </TableCell>
                                    <TableCell className="border-r">{order.customer_code || "-"}</TableCell>
                                    <TableCell className="border-r">
                                        {salesmen.find(s => s.id === order.salesman_id)?.salesman_name || "-"}
                                    </TableCell>
                                    <TableCell className="border-r">
                                        {salesmen.find(s => s.id === order.salesman_id)?.salesman_code || order.salesman_id || "-"}
                                    </TableCell>
                                    <TableCell className="border-r">
                                        {branches.find(b => b.id === order.branch_id)?.branch_name || "-"}
                                    </TableCell>
                                    <TableCell className="border-r">{order.created_date?.split("T")[0] || "-"}</TableCell>
                                    <TableCell className="text-right border-r">
                                        {new Intl.NumberFormat("en-PH", {
                                            style: "currency",
                                            currency: "PHP",
                                        }).format(order.total_amount || 0)}
                                    </TableCell>
                                    <TableCell className="text-right border-r">
                                        {new Intl.NumberFormat("en-PH", {
                                            style: "currency",
                                            currency: "PHP",
                                        }).format(order.allocated_amount || 0)}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${order.order_status === "For Approval"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-blue-100 text-blue-800"
                                            }`}>
                                            {order.order_status || "PENDING"}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-2 py-1">
                <div className="text-sm text-muted-foreground">
                    Showing {orders.length} of {totalOrders} orders
                </div>
                <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                        Page {currentPage} of {totalPages || 1}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => onPageChange(1)}
                            disabled={currentPage === 1}
                        >
                            <span className="sr-only">Go to first page</span>
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <span className="sr-only">Go to previous page</span>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            <span className="sr-only">Go to next page</span>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => onPageChange(totalPages)}
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            <span className="sr-only">Go to last page</span>
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
