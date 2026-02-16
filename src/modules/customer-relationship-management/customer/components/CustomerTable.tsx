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
    Loader2
} from "lucide-react";
import { CustomerWithRelations, BankAccount } from "../types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CustomerDialog } from "./CustomerDialog";
import { CustomerRow } from "./CustomerRow";

interface CustomerTableProps {
    data: CustomerWithRelations[];
    bankAccounts: BankAccount[];
    isLoading: boolean;
    onCreate: (data: Partial<CustomerWithRelations>) => Promise<void>;
    onUpdate: (id: number, data: Partial<CustomerWithRelations>) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
}

export function CustomerTable({
    data,
    bankAccounts,
    isLoading,
    onCreate,
    onUpdate,
    onDelete,
}: CustomerTableProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithRelations | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [defaultDialogTab, setDefaultDialogTab] = useState<string>("basic");
    const [isAdding, setIsAdding] = useState(false);

    const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);

        return () => clearTimeout(handler);
    }, [searchQuery]);

    const filteredData = useMemo(() => {
        const query = debouncedQuery.toLowerCase().trim();
        if (!query && statusFilter === "all") return data;

        return data.filter((item) => {
            // Status Filter first (usually faster/more restrictive)
            if (statusFilter !== "all") {
                const isActive = item.isActive === 1;
                if (statusFilter === "active" && !isActive) return false;
                if (statusFilter === "inactive" && isActive) return false;
            }

            // Search Filter
            if (!query) return true;

            return (
                item.customer_name.toLowerCase().includes(query) ||
                item.customer_code.toLowerCase().includes(query) ||
                item.store_name?.toLowerCase().includes(query) ||
                item.customer_email?.toLowerCase().includes(query)
            );
        });
    }, [data, debouncedQuery, statusFilter]);

    const isFiltered = statusFilter !== "all" || searchQuery !== "";

    const resetFilters = () => {
        setSearchQuery("");
        statusFilter !== "all" && setStatusFilter("all");
    };

    const handleEdit = (customer: CustomerWithRelations) => {
        setSelectedCustomer(customer);
        setDefaultDialogTab("basic");
        setIsDialogOpen(true);
    };

    const handleAddNew = () => {
        setIsAdding(true);
        // Small delay to show the loading state as requested
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

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-[400px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search customers by name, code, store or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
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
                            <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
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
                            <TableHead className="w-[180px] px-2">Contact Info</TableHead>
                            <TableHead className="w-[150px] px-2">Location</TableHead>
                            <TableHead className="w-[100px] px-2">Status</TableHead>
                            <TableHead className="w-[60px] px-2 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
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
                        ) : filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                    No customers found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((customer) => (
                                <CustomerRow
                                    key={customer.id}
                                    customer={customer}
                                    onEdit={handleEdit}
                                    onManageBanks={handleManageBanks}
                                    onDelete={onDelete}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
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
