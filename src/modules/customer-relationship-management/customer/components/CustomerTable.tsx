"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    MoreHorizontal,
    Pencil,
    Trash2,
    Search,
    Filter,
    UserPlus,
    Building2,
    Mail,
    Phone,
    X,
    CreditCard,
    Loader2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight
} from "lucide-react";
import { CustomerWithRelations, BankAccount, CustomersAPIResponse } from "../types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CustomerDialog } from "./CustomerDialog";
import { CustomerRow } from "./CustomerRow";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface CustomerTableProps {
    data: CustomerWithRelations[];
    bankAccounts: BankAccount[];
    isLoading: boolean;
    metadata: CustomersAPIResponse['metadata'];
    page: number;
    pageSize: number;
    searchQuery: string;
    statusFilter: string;
    userMapping: Record<number, string>;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    onSearchChange: (query: string) => void;
    onStatusChange: (status: string) => void;
    onCreate: (data: Partial<CustomerWithRelations>) => Promise<void>;
    onUpdate: (id: number, data: Partial<CustomerWithRelations>) => Promise<void>;
}

export function CustomerTable({
    data,
    bankAccounts,
    userMapping,
    isLoading,
    metadata,
    page,
    pageSize,
    searchQuery: parentSearchQuery,
    statusFilter,
    onPageChange,
    onPageSizeChange,
    onSearchChange,
    onStatusChange,
    onCreate,
    onUpdate,
}: CustomerTableProps) {
    const [localSearchQuery, setLocalSearchQuery] = useState(parentSearchQuery);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithRelations | null>(null);
    const [defaultDialogTab, setDefaultDialogTab] = useState<string>("basic");
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (localSearchQuery !== parentSearchQuery) {
                onSearchChange(localSearchQuery);
            }
        }, 500);

        return () => clearTimeout(handler);
    }, [localSearchQuery, onSearchChange, parentSearchQuery]);

    // Sync local search with parent if parent changes (e.g. from refetch or manual reset)
    useEffect(() => {
        setLocalSearchQuery(parentSearchQuery);
    }, [parentSearchQuery]);

    const isFiltered = statusFilter !== "all" || parentSearchQuery !== "";

    const resetFilters = () => {
        setLocalSearchQuery("");
        onSearchChange("");
        onStatusChange("all");
    };

    const handleEdit = (customer: CustomerWithRelations) => {
        setSelectedCustomer(customer);
        setDefaultDialogTab("basic");
        setIsDialogOpen(true);
    };

    const handleAddNew = () => {
        setIsAdding(true);
        setTimeout(() => {
            setSelectedCustomer(null);
            setDefaultDialogTab("basic");
            setIsDialogOpen(true);
            setIsAdding(false);
        }, 600);
    };

    const handleManageBanks = (customer: CustomerWithRelations) => {
        setSelectedCustomer(customer);
        setDefaultDialogTab("bank");
        setIsDialogOpen(true);
    };

    const totalPages = Math.ceil(metadata.total_count / pageSize);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-[400px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search customers by name, code, store or email..."
                        value={localSearchQuery}
                        onChange={(e) => setLocalSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant={statusFilter !== "all" ? "default" : "outline"} size="sm">
                                <Filter className="mr-2 h-4 w-4" />
                                Filters
                                {statusFilter !== "all" && (
                                    <Badge variant="secondary" className="ml-2 px-1 h-4 min-w-4 flex items-center justify-center text-[10px]">
                                        1
                                    </Badge>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Status Filter</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={statusFilter} onValueChange={onStatusChange}>
                                <DropdownMenuRadioItem value="all">All Status</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="active">Active Only</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="inactive">Inactive Only</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>

                            {isFiltered && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={resetFilters} className="text-destructive focus:text-destructive">
                                        <X className="mr-2 h-4 w-4" />
                                        Clear Filters
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button size="sm" onClick={handleAddNew} disabled={isAdding}>
                        {isAdding ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <UserPlus className="mr-2 h-4 w-4" />
                        )}
                        Add Customer
                    </Button>
                </div>
            </div>

            <div className="border rounded-md bg-white overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[80px] px-2">Code</TableHead>
                            <TableHead className="w-[200px] px-2">Customer Name</TableHead>
                            <TableHead className="w-[180px] px-2">Store Details</TableHead>
                            <TableHead className="w-[80px] px-2">Type</TableHead>
                            <TableHead className="w-[150px] px-2">User</TableHead>
                            <TableHead className="w-[180px] px-2">Contact Info</TableHead>
                            <TableHead className="w-[120px] px-2">Location</TableHead>
                            <TableHead className="w-[90px] px-2">Status</TableHead>
                            <TableHead className="w-[60px] px-2 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: pageSize }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell className="px-2 py-4"><Skeleton className="h-4 w-12" /></TableCell>
                                    <TableCell className="px-2 py-4"><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell className="px-2 py-4"><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell className="px-2 py-4"><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell className="px-2 py-4"><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell className="px-2 py-4"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                    <TableCell className="px-2 py-4 text-right"><Skeleton className="h-8 w-8 rounded-md inline-block" /></TableCell>
                                </TableRow>
                            ))
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                                    No customers found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((customer) => (
                                <CustomerRow
                                    key={customer.id}
                                    customer={customer}
                                    onEdit={handleEdit}
                                    onManageBanks={handleManageBanks}
                                    userMapping={userMapping}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-2">
                <div className="flex-1 text-sm text-muted-foreground text-left">
                    {metadata.filter_count !== metadata.total_count ? (
                        <span>Showing {data.length} of {metadata.filter_count} filtered results (Total: {metadata.total_count})</span>
                    ) : (
                        <span>Total {metadata.total_count} customers</span>
                    )}
                </div>
                <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">Rows per page</p>
                        <Select
                            value={`${pageSize}`}
                            onValueChange={(value) => {
                                onPageSizeChange(Number(value));
                            }}
                        >
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue placeholder={pageSize} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20, 30, 40, 50].map((size) => (
                                    <SelectItem key={size} value={`${size}`}>
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                        Page {page} of {totalPages || 1}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => onPageChange(1)}
                            disabled={page === 1 || isLoading}
                        >
                            <span className="sr-only">Go to first page</span>
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => onPageChange(page - 1)}
                            disabled={page === 1 || isLoading}
                        >
                            <span className="sr-only">Go to previous page</span>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => onPageChange(page + 1)}
                            disabled={page === totalPages || totalPages === 0 || isLoading}
                        >
                            <span className="sr-only">Go to next page</span>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => onPageChange(totalPages)}
                            disabled={page === totalPages || totalPages === 0 || isLoading}
                        >
                            <span className="sr-only">Go to last page</span>
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <CustomerDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                customer={selectedCustomer}
                onSubmit={selectedCustomer ? (data) => onUpdate(selectedCustomer.id, data) : onCreate}
                defaultTab={defaultDialogTab}
            />
        </div>
    );
}
