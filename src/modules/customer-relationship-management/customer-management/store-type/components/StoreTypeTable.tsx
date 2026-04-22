"use client";

import { useMemo, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, MoreHorizontal, Shapes, User } from "lucide-react";
import type { StoreTypeItem } from "../types";

type StoreTypeTableProps = {
    data: StoreTypeItem[];
    isLoading: boolean;
    onView: (item: StoreTypeItem) => void;
    onEdit: (item: StoreTypeItem) => void;
};

export function StoreTypeTable({ data, isLoading, onView, onEdit }: StoreTypeTableProps) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
    const currentPage = Math.min(page, totalPages);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return data.slice(start, start + pageSize);
    }, [currentPage, data, pageSize]);

    const startEntry = data.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endEntry = Math.min(currentPage * pageSize, data.length);

    const getInitials = (name: string) => {
        const parts = name.split(" ").filter(Boolean);
        if (parts.length === 0) return "SY";
        return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "SY";
    };

    return (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="w-full overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="w-[90px] text-xs font-bold uppercase tracking-wider">No.</TableHead>
                            <TableHead className="min-w-[220px] text-xs font-bold uppercase tracking-wider">Type</TableHead>
                            <TableHead className="min-w-[200px] text-xs font-bold uppercase tracking-wider">Created By</TableHead>
                            <TableHead className="w-[110px] text-right text-xs font-bold uppercase tracking-wider">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, idx) => (
                                <TableRow key={idx}>
                                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="ml-auto h-8 w-8 rounded-md" /></TableCell>
                                </TableRow>
                            ))
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-28 text-center text-sm text-muted-foreground">
                                    No store type records found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedData.map((item, index) => (
                                <TableRow key={item.id} className="group transition-colors hover:bg-muted/20">
                                    <TableCell className="font-medium text-foreground/90">{(currentPage - 1) * pageSize + index + 1}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="rounded-md bg-primary/10 p-1.5 text-primary">
                                                <Shapes className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold leading-none">{item.store_type}</span>
                                               
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                                {getInitials(item.created_by_name || "System")}
                                            </div>
                                            <span className="text-sm flex items-center gap-1.5">
                                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                {item.created_by_name || "System"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg border border-transparent group-hover:border-border/50">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-36">
                                                <DropdownMenuItem onClick={() => onView(item)}>View</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onEdit(item)}>Edit</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex flex-col gap-3 border-t bg-background/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                    Showing {startEntry}-{endEntry} of {data.length}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Rows</span>
                        <Select
                            value={String(pageSize)}
                            onValueChange={(value) => {
                                setPageSize(Number(value));
                                setPage(1);
                            }}
                            disabled={isLoading}
                        >
                            <SelectTrigger className="h-8 w-[86px] rounded-lg">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between gap-2 sm:justify-start">
                        <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={() => setPage(Math.max(1, currentPage - 1))}
                                disabled={isLoading || currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                                disabled={isLoading || currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
