"use client";

import React, { useEffect, useState } from "react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search, Filter, UserPlus, X, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from "lucide-react";
import { CustomerWithRelations, BankAccount, CustomersAPIResponse, ReferenceItem, CustomerFormData } from "../types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CustomerFormSheet } from "./CustomerFormSheet";
import { CustomerRow } from "./CustomerRow";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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
    storeTypeFilter?: string;
    classificationFilter?: string;
    userMapping: Record<number, string>;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    onSearchChange: (query: string) => void;
    onStatusChange: (status: string) => void;
    onStoreTypeChange?: (status: string) => void;
    onClassificationChange?: (status: string) => void;
    onCreate: (data: Partial<CustomerWithRelations>) => Promise<void>;
    onUpdate: (id: number, data: Partial<CustomerWithRelations>) => Promise<void>;
}

export function CustomerTable({
                                  data, userMapping, isLoading, metadata, page, pageSize,
                                  searchQuery: parentSearchQuery, statusFilter, storeTypeFilter = "all", classificationFilter = "all",
                                  onPageChange, onPageSizeChange, onSearchChange, onStatusChange, onStoreTypeChange, onClassificationChange,
                                  onCreate, onUpdate,
                              }: CustomerTableProps) {
    const [localSearchQuery, setLocalSearchQuery] = useState(parentSearchQuery);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithRelations | null>(null);
    const [defaultDialogTab, setDefaultDialogTab] = useState<string>("basic");
    const [isAdding, setIsAdding] = useState(false);

    // 🚀 NEW: State to hold the dynamic filter options
    const [storeTypeOptions, setStoreTypeOptions] = useState<{id: string, name: string}[]>([]);
    const [classificationOptions, setClassificationOptions] = useState<{id: string, name: string}[]>([]);
    const [isLoadingFilters, setIsLoadingFilters] = useState(true);

    // 🚀 NEW: Fetch the filter dropdown data once on mount
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const [storeRes, classRes] = await Promise.all([
                    fetch("/api/crm/customer/references?type=store_type"),
                    fetch("/api/crm/customer/references?type=classification")
                ]);

                if (storeRes.ok) {
                    const json = await storeRes.json();
                    setStoreTypeOptions(json.data?.map((i: ReferenceItem) => ({ id: String(i.id), name: i.store_type })) || []);
                }

                if (classRes.ok) {
                    const json = await classRes.json();
                    setClassificationOptions(json.data?.map((i: ReferenceItem) => ({ id: String(i.id), name: i.classification_name })) || []);
                }
            } catch (err) {
                console.error("Failed to fetch filter options", err);
            } finally {
                setIsLoadingFilters(false);
            }
        };
        fetchFilters();
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (localSearchQuery !== parentSearchQuery) {
                onSearchChange(localSearchQuery);
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [localSearchQuery, onSearchChange, parentSearchQuery]);

    useEffect(() => { setLocalSearchQuery(parentSearchQuery); }, [parentSearchQuery]);

    const isFiltered = statusFilter !== "all" || storeTypeFilter !== "all" || classificationFilter !== "all" || parentSearchQuery !== "";

    const resetFilters = () => {
        setLocalSearchQuery("");
        onSearchChange("");
        onStatusChange("all");
        if (onStoreTypeChange) onStoreTypeChange("all");
        if (onClassificationChange) onClassificationChange("all");
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

    const totalPages = Math.ceil(metadata.total_count / pageSize) || 1;

    return (
        <div className="space-y-4">
            {/* 🚀 UPGRADED TOOLBAR */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                <div className="relative w-full xl:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search customers..."
                        value={localSearchQuery}
                        onChange={(e) => setLocalSearchQuery(e.target.value)}
                        className="pl-9 h-11 rounded-xl bg-background shadow-sm border-border/60"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                    {/* 🚀 REAL DATA: STORE TYPE FILTER */}
                    <Select value={storeTypeFilter} onValueChange={(val) => onStoreTypeChange && onStoreTypeChange(val)} disabled={isLoadingFilters}>
                        <SelectTrigger className="h-11 rounded-xl shadow-sm border-border/60 w-[160px] font-bold text-xs uppercase tracking-widest bg-background">
                            <SelectValue placeholder={isLoadingFilters ? "Loading..." : "Store Type"} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Store Types</SelectItem>
                            {storeTypeOptions.map(st => (
                                <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* 🚀 REAL DATA: CLASSIFICATION FILTER */}
                    <Select value={classificationFilter} onValueChange={(val) => onClassificationChange && onClassificationChange(val)} disabled={isLoadingFilters}>
                        <SelectTrigger className="h-11 rounded-xl shadow-sm border-border/60 w-[170px] font-bold text-xs uppercase tracking-widest bg-background">
                            <SelectValue placeholder={isLoadingFilters ? "Loading..." : "Classification"} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Classifications</SelectItem>
                            {classificationOptions.map(cl => (
                                <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* EXISTING STATUS FILTER */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-11 rounded-xl shadow-sm font-bold text-xs uppercase tracking-widest border-border/60 bg-background">
                                <Filter className="mr-2 h-4 w-4" /> Status
                                {statusFilter !== "all" && <Badge variant="secondary" className="ml-2 px-1 h-4">1</Badge>}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                            <DropdownMenuRadioGroup value={statusFilter} onValueChange={onStatusChange}>
                                <DropdownMenuRadioItem value="all">All Status</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="active">Active Only</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="inactive">Inactive Only</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                            {isFiltered && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={resetFilters} className="text-destructive font-bold">
                                        <X className="mr-2 h-4 w-4" /> Clear All
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* ADD CUSTOMER BUTTON */}
                    <Button onClick={handleAddNew} disabled={isAdding} className="h-11 rounded-xl shadow-lg bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest px-6 ml-auto xl:ml-2">
                        {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                        Add Customer
                    </Button>
                </div>
            </div>

            {/* 🚀 PREMIUM DATA TABLE */}
            <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50 border-b">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[90px] h-10 px-4 text-xs font-semibold">Code</TableHead>
                            <TableHead className="w-[200px] h-10 px-4 text-xs font-semibold">Customer</TableHead>
                            <TableHead className="w-[180px] h-10 px-4 text-xs font-semibold">Store Details</TableHead>
                            <TableHead className="w-[90px] h-10 px-4 text-xs font-semibold">Type</TableHead>
                            <TableHead className="w-[140px] h-10 px-4 text-xs font-semibold">Assigned User</TableHead>
                            <TableHead className="w-[180px] h-10 px-4 text-xs font-semibold">Contact Info</TableHead>
                            <TableHead className="w-[140px] h-10 px-4 text-xs font-semibold">Location</TableHead>
                            <TableHead className="w-[90px] h-10 px-4 text-xs font-semibold">Status</TableHead>
                            <TableHead className="w-[70px] h-10 px-4 text-right text-xs font-semibold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: pageSize }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell className="px-4 py-3"><Skeleton className="h-4 w-14" /></TableCell>
                                    <TableCell className="px-4 py-3"><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-3 w-20" /></TableCell>
                                    <TableCell className="px-4 py-3"><Skeleton className="h-4 w-28 mb-1" /><Skeleton className="h-3 w-24" /></TableCell>
                                    <TableCell className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                    <TableCell className="px-4 py-3"><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell className="px-4 py-3"><Skeleton className="h-3 w-28 mb-1" /><Skeleton className="h-3 w-20" /></TableCell>
                                    <TableCell className="px-4 py-3"><Skeleton className="h-4 w-28" /></TableCell>
                                    <TableCell className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                    <TableCell className="px-4 py-3 text-right"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-40 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center space-y-1">
                                        <span className="text-sm font-medium">No customers found.</span>
                                        <span className="text-xs">Adjust your search or filters.</span>
                                    </div>
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

            {/* 🚀 SHADCN STANDARD PAGINATION FOOTER */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-2 gap-4">
                <div className="text-sm text-muted-foreground">
                    {metadata.filter_count !== metadata.total_count ? (
                        <span>Showing {data.length} of {metadata.filter_count} filtered results (Total: {metadata.total_count})</span>
                    ) : (
                        <span>Total {metadata.total_count} records</span>
                    )}
                </div>
                <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">Rows per page</p>
                        <Select value={`${pageSize}`} onValueChange={(value) => onPageSizeChange(Number(value))}>
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue placeholder={pageSize} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20, 30, 40, 50].map((size) => (
                                    <SelectItem key={size} value={`${size}`}>{size}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                        Page {page} of {totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => onPageChange(1)} disabled={page === 1 || isLoading}>
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="h-8 w-8 p-0" onClick={() => onPageChange(page - 1)} disabled={page === 1 || isLoading}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="h-8 w-8 p-0" onClick={() => onPageChange(page + 1)} disabled={page === totalPages || isLoading}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => onPageChange(totalPages)} disabled={page === totalPages || isLoading}>
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <CustomerFormSheet
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                customer={selectedCustomer}
                onSubmit={async (data: CustomerFormData) => {
                    if (selectedCustomer) {
                        // Transform CustomerFormData to Partial<CustomerWithRelations>
                        const updateData: Partial<CustomerWithRelations> = {
                            ...data,
                            bank_accounts: data.bank_accounts?.map(ba => ({
                                ...ba,
                                id: 0, // Will be set by database/API
                                customer_id: selectedCustomer.id,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            }))
                        };
                        await onUpdate(selectedCustomer.id, updateData);
                    } else {
                        // Transform CustomerFormData to Partial<CustomerWithRelations>
                        const createData: Partial<CustomerWithRelations> = {
                            ...data,
                            bank_accounts: data.bank_accounts?.map(ba => ({
                                ...ba,
                                id: 0, // Will be set by database/API
                                customer_id: 0, // Will be set after customer creation
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            }))
                        };
                        await onCreate(createData);
                    }
                }}
                defaultTab={defaultDialogTab}
            />
        </div>
    );
}