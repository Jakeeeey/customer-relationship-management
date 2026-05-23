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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
    MoreHorizontal, 
    Eye, 
    MapPin, 
    Users, 
    Building2,
    CheckCircle2,
    Calendar
} from "lucide-react";
import { CustomerGroup } from "../types";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface CustomerGroupTableProps {
    groups: CustomerGroup[];
    isLoading: boolean;
    onEdit: (group: CustomerGroup) => void;
}

export function CustomerGroupTable({
    groups,
    isLoading,
    onEdit,
}: CustomerGroupTableProps) {
    if (isLoading) {
        return (
            <div className="w-full h-[400px] flex flex-col items-center justify-center bg-background border border-border/40 rounded-2xl shadow-sm">
                <div className="relative flex h-10 w-10 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/20 opacity-75"></span>
                    <Building2 className="h-5 w-5 text-primary" />
                </div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Loading Groups...</p>
            </div>
        );
    }

    if (groups.length === 0) {
        return (
            <div className="w-full h-[400px] flex flex-col items-center justify-center bg-background border border-dashed border-border/50 rounded-2xl shadow-inner">
                <div className="p-4 bg-muted/20 rounded-full mb-4">
                    <Users className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-tight italic">No Customer Groups</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Start by creating your first group</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-background border border-border/40 rounded-2xl shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="w-[120px] text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4 px-6">Group Code</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4 px-6">Group Details</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4 px-6">Location</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4 px-6 text-center">Status</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4 px-6 text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {groups.map((group) => (
                        <TableRow key={group.id} className="group hover:bg-muted/20 border-border/40 transition-colors">
                            <TableCell className="py-4 px-6">
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[10px] tracking-tight">
                                    {group.group_code}
                                </Badge>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                                <div className="space-y-1">
                                    <p className="text-sm font-black uppercase tracking-tight truncate max-w-[250px]">
                                        {group.group_name}
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            <Calendar className="h-3 w-3" />
                                            {group.date_entered ? format(new Date(group.date_entered), "MMM dd, yyyy") : "N/A"}
                                        </div>
                                        {group.primary_customer_id && (
                                            <div className="flex items-center gap-1.5 text-[10px] font-black text-primary uppercase tracking-widest">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Primary Set
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 text-xs font-bold">
                                        <MapPin className="h-3.5 w-3.5 text-rose-500" />
                                        {group.city}, {group.province}
                                    </div>
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground pl-5">
                                        BRGY. {group.brgy}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                                <div className="flex justify-center">
                                    {group.isActive === 1 ? (
                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-none rounded-full px-3 py-0.5 text-[9px] font-black uppercase flex items-center gap-1.5 shadow-none">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            Active
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-rose-500/10 text-rose-600 border-none rounded-full px-3 py-0.5 text-[9px] font-black uppercase flex items-center gap-1.5 shadow-none">
                                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                            Inactive
                                        </Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="py-4 px-6 text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-9 w-9 p-0 hover:bg-muted rounded-xl border border-border/20 shadow-sm transition-all flex items-center justify-center">
                                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40 p-1.5 rounded-xl border-border/50 shadow-xl">
                                        <DropdownMenuItem onClick={() => onEdit(group)} className="rounded-lg text-xs font-bold py-2.5 cursor-pointer">
                                            <Eye className="mr-2 h-4 w-4 text-primary" /> View Details
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
