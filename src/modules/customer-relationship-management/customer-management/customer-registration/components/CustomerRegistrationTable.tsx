"use client";

import React from "react";
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
    MoreHorizontal,
    Users, 
    Building2,
    Phone,
    Mail
} from "lucide-react";
import { CustomerRegistration } from "../types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CustomerRegistrationTableProps {
    data: CustomerRegistration[];
    isLoading: boolean;
    onView: (customer: CustomerRegistration) => void;
    page: number;
    setPage: (page: number) => void;
    totalCount: number;
    pageSize: number;
}

export function CustomerRegistrationTable({
    data,
    isLoading,
    onView,
    page,
    setPage,
    totalCount,
    pageSize,
}: CustomerRegistrationTableProps) {
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    if (isLoading) {
        return (
            <div className="w-full h-[400px] flex flex-col items-center justify-center bg-background border border-border/40 rounded-2xl shadow-sm">
                <div className="relative flex h-10 w-10 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/20 opacity-75"></span>
                    <Building2 className="h-5 w-5 text-primary" />
                </div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Loading Customers...</p>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="w-full h-[400px] flex flex-col items-center justify-center bg-background border border-dashed border-border/50 rounded-2xl shadow-inner">
                <div className="p-4 bg-muted/20 rounded-full mb-4">
                    <Users className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-tight italic">No Customers Found</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Start by registering your first customer</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            <div className="bg-background border border-border/60 rounded-xl overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/5 border-b border-border/60">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="w-[120px] text-[10px] font-black uppercase tracking-widest text-foreground/70 py-4 px-6">Code</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-foreground/70 py-4 px-6">Customer</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-foreground/70 py-4 px-6">Store Details</TableHead>
                            <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-widest text-foreground/70 py-4 px-6 text-center">Type</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-foreground/70 py-4 px-6">Salesman</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-foreground/70 py-4 px-6">Contact Info</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-foreground/70 py-4 px-6">Location</TableHead>
                            <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-widest text-foreground/70 py-4 px-6 text-center">Status</TableHead>
                            <TableHead className="w-[80px] text-[10px] font-black uppercase tracking-widest text-foreground/70 py-4 px-6 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((customer) => (
                            <TableRow key={customer.id} className="group hover:bg-muted/30 border-b border-border/50 last:border-none transition-all">
                                <TableCell className="py-4 px-6">
                                    <span className="text-sm font-bold text-blue-600 hover:underline cursor-pointer">
                                        {customer.customer_code || `PENDING-${customer.id}`}
                                    </span>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                    <div className="flex flex-col max-w-[250px]">
                                        <p className="text-sm font-black uppercase tracking-tight text-foreground leading-tight">
                                            {customer.customer_name}
                                        </p>
                                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase mt-1">
                                            TIN: {customer.customer_tin || "N/A"}
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                    <div className="flex items-start gap-2 max-w-[200px]">
                                        <Building2 className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                                        <div className="flex flex-col">
                                            <p className="text-[11px] font-black uppercase tracking-tight text-foreground/80 leading-tight">
                                                {customer.store_name}
                                            </p>
                                            <p className="text-[10px] font-medium italic text-muted-foreground mt-1">
                                                {customer.store_signage || "No signage recorded"}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 px-6 text-center">
                                    <Badge variant="outline" className={cn(
                                        "rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest border-none shadow-sm",
                                        customer.type === "Employee" ? "bg-amber-100 text-amber-700" : "bg-blue-100/50 text-blue-700"
                                    )}>
                                        {customer.type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                    <div className="flex flex-col">
                                        <p className="text-xs font-black uppercase tracking-tight text-foreground/80">
                                            {customer.salesman_name || "N/A"}
                                        </p>
                                        <p className="text-[9px] font-bold text-muted-foreground/60 uppercase">
                                            Code: {customer.salesman_code || "N/A"}
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                            <Mail className="h-3.5 w-3.5 text-muted-foreground/30" />
                                            {customer.customer_email || "no-email@registry.com"}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                            <Phone className="h-3.5 w-3.5 text-muted-foreground/30" />
                                            {customer.contact_number}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                    <p className="text-xs font-medium text-muted-foreground leading-relaxed max-w-[150px]">
                                        {customer.brgy}, {customer.city}, {customer.province}
                                    </p>
                                </TableCell>
                                <TableCell className="py-4 px-6 text-center">
                                    {customer.isActive === 1 ? (
                                        <Badge className="bg-blue-600 text-white border-none rounded-full px-5 py-1 text-[10px] font-black uppercase tracking-widest shadow-md shadow-blue-500/20">
                                            Active
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-muted-foreground/60 border-muted rounded-full px-5 py-1 text-[10px] font-black uppercase tracking-widest bg-muted/10">
                                            Inactive
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="py-4 px-6 text-right">
                                    <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => onView(customer)}
                                        className="h-8 w-8 p-0 rounded-lg hover:bg-muted"
                                    >
                                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <div className="px-10 py-6 flex items-center justify-between bg-muted/5 border-t border-border/40">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                    Showing <span className="text-foreground">{data.length}</span> of <span className="text-foreground">{totalCount}</span> Registry Entries
                </p>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={!hasPreviousPage || isLoading}
                        onClick={() => setPage(page - 1)}
                        className="h-12 rounded-2xl px-8 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border-border/40 hover:bg-background"
                    >
                        Previous
                    </Button>
                    <div className="flex items-center gap-1.5 px-4">
                        <span className="text-[10px] font-black text-primary uppercase">{page}</span>
                        <span className="text-[10px] font-bold text-muted-foreground/30 uppercase">/</span>
                        <span className="text-[10px] font-black text-muted-foreground uppercase">{totalPages || 1}</span>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={!hasNextPage || isLoading}
                        onClick={() => setPage(page + 1)}
                        className="h-12 rounded-2xl px-8 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border-border/40 hover:bg-background"
                    >
                        Next Page
                    </Button>
                </div>
            </div>
        </div>
    );
}
