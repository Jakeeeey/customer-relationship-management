"use client";

import React from "react";
import { format } from "date-fns";
import { FileText, PlusCircle, ExternalLink, Clock, CheckCircle2, XCircle, Download, RefreshCw, Calendar } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    PaginationEllipsis,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SalesOrderAttachment, CallSheetAPIResponse } from "../types";

interface CallSheetTableProps {
    data: SalesOrderAttachment[];
    isLoading: boolean;
    metadata: CallSheetAPIResponse["metadata"];
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onCreateSalesOrder: (row: SalesOrderAttachment) => void;
}

export function CallSheetTable({
    data,
    isLoading,
    metadata,
    page,
    pageSize,
    onPageChange,
    onCreateSalesOrder,
}: CallSheetTableProps) {
    const [processingId, setProcessingId] = React.useState<string | null>(null);
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

    const StatusBadge = ({ status }: { status: string }) => {
        const s = status.toLowerCase();
        if (s === "pending") return (
            <Badge variant="outline" className="gap-1.5 font-bold uppercase text-[10px] py-0 border-amber-200 bg-amber-50 text-amber-700 shadow-sm">
                <Clock className="h-3 w-3" />
                Pending
            </Badge>
        );
        if (s === "approved") return (
            <Badge variant="outline" className="gap-1.5 font-bold uppercase text-[10px] py-0 border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm">
                <CheckCircle2 className="h-3 w-3" />
                Approved
            </Badge>
        );
        return (
            <Badge variant="outline" className="gap-1.5 font-bold uppercase text-[10px] py-0 border-rose-200 bg-rose-50 text-rose-700 shadow-sm">
                <XCircle className="h-3 w-3" />
                {status}
            </Badge>
        );
    };

    const handleViewDocument = (fileId: string, filename?: string) => {
        if (!fileId) return;
        const url = `/api/crm/customer-hub/callsheet/file?id=${fileId}${filename ? `&filename=${encodeURIComponent(filename)}` : ""}`;
        window.open(url, "_blank");
    };

    const handleDownload = (fileId: string, filename?: string) => {
        if (!fileId) return;
        const url = `/api/crm/customer-hub/callsheet/file?id=${fileId}&download=true${filename ? `&filename=${encodeURIComponent(filename)}` : ""}`;
        window.open(url, "_blank");
    };

    const handleRowAction = (row: SalesOrderAttachment) => {
        if (row.status?.toLowerCase() === "approved") {
            if (row.file_id) handleViewDocument(row.file_id, row.attachment_name || "");
        } else {
            onCreateSalesOrder(row);
        }
    };

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <div className="rounded-2xl border bg-card/30 backdrop-blur-md shadow-xl shadow-border/20 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/50">
                                <TableHead className="w-[60px] text-center font-bold text-foreground capitalize">#</TableHead>
                                <TableHead className="w-[180px] font-bold text-foreground capitalize">Sales Executive</TableHead>
                                <TableHead className="font-bold text-foreground capitalize">Customer Hub</TableHead>
                                <TableHead className="w-[200px] font-bold text-foreground capitalize">Filing Reference</TableHead>
                                <TableHead className="w-[150px] font-bold text-foreground capitalize">Created Date</TableHead>
                                <TableHead className="w-[120px] text-center font-bold text-foreground capitalize">Status</TableHead>
                                <TableHead className="w-[200px] text-right font-bold text-foreground capitalize pr-6">Workflow</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: pageSize }).map((_, idx) => (
                                    <TableRow key={idx} className="border-b border-border/30">
                                        <TableCell><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell>
                                            <div className="space-y-1.5">
                                                <Skeleton className="h-4 w-48" />
                                                <Skeleton className="h-3 w-24" />
                                            </div>
                                        </TableCell>
                                        <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20 mx-auto rounded-full" /></TableCell>
                                        <TableCell><Skeleton className="h-9 w-32 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3 opacity-60">
                                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                                                <FileText className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-bold text-lg">No Active Callsheets</p>
                                                <p className="text-sm text-muted-foreground">Try adjusting your filters to find existing records.</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((row, idx) => {
                                    const rowNumber = (page - 1) * pageSize + idx + 1;
                                    const isApproved = row.status?.toLowerCase() === "approved";

                                    return (
                                        <TableRow
                                            key={row.id}
                                            className="group hover:bg-primary/[0.02] transition-colors border-b border-border/30 relative cursor-pointer"
                                            onClick={() => handleRowAction(row)}
                                        >
                                            <TableCell className="text-center font-mono text-xs font-bold text-muted-foreground/60 transition-colors group-hover:text-primary">
                                                {rowNumber}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-7 w-7 rounded-full bg-primary/5 flex items-center justify-center text-[10px] font-bold text-primary group-hover:bg-primary/10 transition-colors">
                                                        {row.salesman_name.charAt(0)}
                                                    </div>
                                                    <span className="font-semibold text-sm group-hover:text-primary transition-colors">
                                                        {row.salesman_name}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-foreground/90 group-hover:text-foreground transition-colors leading-tight">
                                                        {row.customer_name}
                                                    </span>
                                                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] font-mono text-primary/70 font-bold uppercase tracking-tighter">
                                                            {row.customer_code}
                                                        </span>
                                                        {row.po_no && (
                                                            <Badge variant="outline" className="text-[8px] py-0 px-1.5 border-emerald-500/30 bg-emerald-500/5 text-emerald-600 uppercase tracking-widest leading-none">
                                                                PO: {row.po_no}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs font-bold text-foreground/80 group-hover:text-primary transition-colors">
                                                            {row.sales_order_no}
                                                        </span>
                                                    </div>
                                                    {(row.related_attachments && row.related_attachments.length > 0) ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-auto w-fit px-0 py-0 font-bold text-[11px] text-muted-foreground hover:text-primary hover:bg-transparent group/file"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleViewDocument(row.related_attachments![0].file_id || "", row.related_attachments![0].attachment_name || "");
                                                            }}
                                                        >
                                                            <FileText className="h-3 w-3 mr-1.5 transition-transform group-hover/file:scale-110" />
                                                            <span className="truncate max-w-[150px] group-hover/file:underline decoration-primary underline-offset-4">
                                                                {row.related_attachments.length} Attachment{row.related_attachments.length > 1 ? "s" : ""}
                                                            </span>
                                                        </Button>
                                                    ) : row.file_id ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-auto w-fit px-0 py-0 font-bold text-[11px] text-muted-foreground hover:text-primary hover:bg-transparent group/file"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleViewDocument(row.file_id || "", row.attachment_name || "");
                                                            }}
                                                        >
                                                            <FileText className="h-3 w-3 mr-1.5 transition-transform group-hover/file:scale-110" />
                                                            <span className="truncate max-w-[150px] group-hover/file:underline decoration-primary underline-offset-4">
                                                                {row.attachment_name}
                                                            </span>
                                                        </Button>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground/60 font-medium italic">
                                                            <FileText className="h-3 w-3" />
                                                            No attachment
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="h-3 w-3 text-muted-foreground/60" />
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                            {row.created_date ? format(new Date(row.created_date), "MMM d, yyyy") : "—"}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground font-mono">
                                                        {row.created_date ? format(new Date(row.created_date), "h:mm a") : ""}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <StatusBadge status={row.status} />
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    {row.file_id && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all rounded-xl"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDownload(row.file_id || "", row.attachment_name || "");
                                                                    }}
                                                                >
                                                                    <Download className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top">
                                                                Download Attachment
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}

                                                    {!isApproved ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={processingId === String(row.id)}
                                                            className={cn(
                                                                "gap-2 h-9 px-4 text-xs font-bold bg-background shadow-sm transition-all z-10",
                                                                processingId === String(row.id)
                                                                    ? "opacity-50 cursor-not-allowed"
                                                                    : "hover:shadow-md hover:bg-primary hover:text-primary-foreground border-primary/20 hover:-translate-y-0.5"
                                                            )}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setProcessingId(String(row.id));
                                                                onCreateSalesOrder(row);
                                                                // Clear loading state after a delay if navigation takes time
                                                                setTimeout(() => setProcessingId(null), 3000);
                                                            }}
                                                        >
                                                            {processingId === String(row.id) ? (
                                                                <RefreshCw className="h-3.5 w-3.5 mr-0.5 animate-spin" />
                                                            ) : (
                                                                <PlusCircle className="h-3.5 w-3.5 mr-0.5" />
                                                            )}
                                                            {processingId === String(row.id) ? "Processing..." : "Process Order"}
                                                            <ExternalLink className="h-3 w-3 ml-0.5 opacity-40" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="gap-2 h-9 px-4 text-xs font-bold text-primary hover:bg-primary/5 transition-all z-10"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleViewDocument(row.file_id || "", row.attachment_name || "");
                                                            }}
                                                        >
                                                            <FileText className="h-3.5 w-3.5 mr-0.5" />
                                                            View Document
                                                            <ExternalLink className="h-3 w-3 ml-0.5 opacity-40" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Professional Pagination Section */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 pt-4 pb-8 border-t border-border/20">
                        <div className="flex flex-col gap-0.5">
                            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest opacity-40">Records Statistics</p>
                            <p className="text-xs text-muted-foreground font-bold">
                                Displaying <span className="text-foreground">{data.length}</span> of <span className="text-foreground">{metadata.total_count}</span> callsheet records
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onPageChange(Math.max(1, page - 1))}
                                disabled={page <= 1}
                                className={cn(
                                    "h-9 px-4 gap-2 font-bold text-[11px] uppercase tracking-wider transition-all rounded-xl border-border bg-background shadow-sm hover:translate-y-[-2px] hover:shadow-md active:translate-y-[0px]",
                                    page <= 1 ? "opacity-30 grayscale pointer-events-none" : "hover:border-primary hover:text-primary"
                                )}
                            >
                                <span className="h-4 w-4 flex items-center justify-center">←</span>
                                Previous
                            </Button>

                            <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/20 rounded-2xl border border-border/30">
                                {getPageNumbers().map((p, i) =>
                                    p === "ellipsis" ? (
                                        <PaginationEllipsis key={`ellipsis-${i}`} className="h-4 w-4" />
                                    ) : (
                                        <Button
                                            key={p}
                                            variant={page === p ? "default" : "ghost"}
                                            size="icon"
                                            className={cn(
                                                "h-8 w-8 text-[11px] font-black transition-all rounded-lg",
                                                page === p
                                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110 z-10"
                                                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                            )}
                                            onClick={() => onPageChange(p)}
                                        >
                                            {p}
                                        </Button>
                                    )
                                )}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                                disabled={page >= totalPages}
                                className={cn(
                                    "h-9 px-4 gap-2 font-bold text-[11px] uppercase tracking-wider transition-all rounded-xl border-border bg-background shadow-sm hover:translate-y-[-2px] hover:shadow-md active:translate-y-[0px]",
                                    page >= totalPages ? "opacity-30 grayscale pointer-events-none" : "hover:border-primary hover:text-primary"
                                )}
                            >
                                Next
                                <span className="h-4 w-4 flex items-center justify-center">→</span>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}
