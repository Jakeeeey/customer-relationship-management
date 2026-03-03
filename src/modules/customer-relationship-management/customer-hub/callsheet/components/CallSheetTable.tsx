"use client";

import React from "react";
import { FileText, PlusCircle } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SalesOrderAttachment, CallSheetAPIResponse } from "../types";

interface CallSheetTableProps {
    data: SalesOrderAttachment[];
    isLoading: boolean;
    metadata: CallSheetAPIResponse["metadata"];
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onFileClick: (row: SalesOrderAttachment) => void;
    onCreateSalesOrder: (row: SalesOrderAttachment) => void;
}

export function CallSheetTable({
    data,
    isLoading,
    metadata,
    page,
    pageSize,
    onPageChange,
    onFileClick,
    onCreateSalesOrder,
}: CallSheetTableProps) {
    const totalPages = Math.ceil((metadata.total_count || 0) / pageSize);

    const getPageNumbers = () => {
        const pages: (number | "ellipsis")[] = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push("ellipsis");
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
                pages.push(i);
            }
            if (page < totalPages - 2) pages.push("ellipsis");
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[60px]">No.</TableHead>
                            <TableHead className="w-[120px]">Salesman</TableHead>
                            <TableHead>Customer Name</TableHead>
                            <TableHead>Sales Order No.</TableHead>
                            <TableHead>File</TableHead>
                            <TableHead className="w-[160px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: pageSize }).map((_, idx) => (
                                <TableRow key={idx}>
                                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-32 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    No pending sales orders found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row, idx) => {
                                const rowNumber = (page - 1) * pageSize + idx + 1;
                                return (
                                    <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-medium text-primary">
                                            {rowNumber}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {row.salesman_name}
                                        </TableCell>
                                        <TableCell>{row.customer_name}</TableCell>
                                        <TableCell className="font-mono text-sm text-primary">
                                            {row.sales_order_no}
                                        </TableCell>
                                        <TableCell>
                                            {row.file_id ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-auto px-0 py-0 font-normal text-primary hover:text-primary hover:underline gap-1.5"
                                                    onClick={() => onFileClick(row)}
                                                >
                                                    <FileText className="h-4 w-4 shrink-0" />
                                                    <span className="truncate max-w-[200px]">
                                                        {row.attachment_name}
                                                    </span>
                                                </Button>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <FileText className="h-3.5 w-3.5" />
                                                    No file attached
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5 h-8 text-xs"
                                                onClick={() => onCreateSalesOrder(row)}
                                            >
                                                <PlusCircle className="h-3.5 w-3.5" />
                                                Create Sales Order
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => onPageChange(Math.max(1, page - 1))}
                                className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>

                        {getPageNumbers().map((p, i) =>
                            p === "ellipsis" ? (
                                <PaginationItem key={`ellipsis-${i}`}>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            ) : (
                                <PaginationItem key={p}>
                                    <Button
                                        variant={page === p ? "default" : "outline"}
                                        size="icon"
                                        className="h-9 w-9"
                                        onClick={() => onPageChange(p)}
                                    >
                                        {p}
                                    </Button>
                                </PaginationItem>
                            )
                        )}

                        <PaginationItem>
                            <PaginationNext
                                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                                className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    );
}
