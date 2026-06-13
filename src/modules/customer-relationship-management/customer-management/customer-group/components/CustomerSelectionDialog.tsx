"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users, Check, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { CustomerRegistration as Customer } from "../../customer-registration/types";
import { cn } from "@/lib/utils";

interface CustomerSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    groupName: string;
    selectedCustomerIds: number[];
    onSelectionChange: (ids: number[]) => void;
    groupId?: number;
}

export function CustomerSelectionDialog({
    open,
    onOpenChange,
    groupName,
    selectedCustomerIds,
    onSelectionChange,
    groupId
}: CustomerSelectionDialogProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
    const [localSelectedIds, setLocalSelectedIds] = useState<number[]>(selectedCustomerIds);
    const [isLoading, setIsLoading] = useState(false);

    const fetchAvailableCustomers = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch customers with no group
            const resNoGroup = await fetch("/api/crm/customer?noGroup=true&pageSize=1000");
            const dataNoGroup = await resNoGroup.json();
            const all = dataNoGroup.customers || [];

            // If editing, also fetch customers already in this group
            if (groupId) {
                const resInGroup = await fetch(`/api/crm/customer?groupId=${groupId}&pageSize=1000`);
                const dataInGroup = await resInGroup.json();
                const inGroup = dataInGroup.customers || [];
                
                // Merge and remove duplicates
                const existingIds = new Set(all.map((c: { id: number }) => c.id));
                inGroup.forEach((c: Customer) => {
                    if (!existingIds.has(c.id)) {
                        all.push(c);
                    }
                });
            }

            setAvailableCustomers(all);
        } catch (error) {
            console.error("Failed to fetch available customers", error);
        } finally {
            setIsLoading(false);
        }
    }, [groupId]);

    useEffect(() => {
        if (open) {
            setLocalSelectedIds(selectedCustomerIds);
            fetchAvailableCustomers();
        }
    }, [open, selectedCustomerIds, fetchAvailableCustomers]);

    const toggleSelection = (id: number) => {
        setLocalSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const calculateSimilarity = (name: string, target: string) => {
        if (!target) return 0;
        const n = name.toLowerCase();
        const t = target.toLowerCase();
        if (n.includes(t)) return 100;
        
        // Simple word match score
        const words = t.split(/\s+/);
        let matches = 0;
        words.forEach(word => {
            if (n.includes(word)) matches++;
        });
        return matches / words.length;
    };

    const filteredAndSortedCustomers = useMemo(() => {
        const result = availableCustomers.filter(c => 
            c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.customer_code?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Get names of currently selected members to compare against
        const selectedNames = availableCustomers
            .filter(c => localSelectedIds.includes(c.id))
            .map(c => c.customer_name);

        // Sort by priority:
        // 1. Already Selected items
        // 2. Similarity to already selected members
        // 3. Similarity to group name
        // 4. Name alphabetical
        return result.sort((a, b) => {
            const aSelected = localSelectedIds.includes(a.id);
            const bSelected = localSelectedIds.includes(b.id);
            
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;

            // Calculate max similarity to any already selected member
            let aMaxMemberSim = 0;
            let bMaxMemberSim = 0;

            selectedNames.forEach(sName => {
                aMaxMemberSim = Math.max(aMaxMemberSim, calculateSimilarity(a.customer_name, sName));
                bMaxMemberSim = Math.max(bMaxMemberSim, calculateSimilarity(b.customer_name, sName));
            });

            // If there's a significant difference in member similarity, use it
            if (Math.abs(aMaxMemberSim - bMaxMemberSim) > 0.01) {
                return bMaxMemberSim - aMaxMemberSim;
            }

            // Fallback to Group Name similarity
            const aSim = calculateSimilarity(a.customer_name, groupName);
            const bSim = calculateSimilarity(b.customer_name, groupName);

            if (Math.abs(aSim - bSim) > 0.01) return bSim - aSim;

            return a.customer_name.localeCompare(b.customer_name);
        });
    }, [availableCustomers, searchTerm, groupName, localSelectedIds]);

    const handleConfirm = () => {
        onSelectionChange(localSelectedIds);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-background">
                <div className="flex flex-col max-h-[85vh]">
                    {/* Header */}
                    <div className="p-8 pb-4">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-14 w-14 bg-primary/10 rounded-[1.25rem] flex items-center justify-center text-primary shadow-inner">
                                <Users className="h-7 w-7" />
                            </div>
                            <div className="flex-1">
                                <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic leading-none">
                                    Select Customers
                                </DialogTitle>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mt-2 flex items-center gap-2">
                                    <span className="h-1 w-1 rounded-full bg-primary/40" />
                                    Add members to {groupName || "this group"}
                                </p>
                            </div>
                        </div>

                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Search by name, code, or store..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-12 h-14 bg-muted/20 border-border/40 rounded-2xl focus-visible:ring-primary/20 text-sm font-bold shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-h-0 px-8">
                        <ScrollArea className="h-full pr-4">
                            <div className="space-y-3 py-4">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                        <div className="relative">
                                            <Loader2 className="h-10 w-10 animate-spin opacity-20" />
                                            <Users className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] mt-4 animate-pulse">Syncing Database...</span>
                                    </div>
                                ) : filteredAndSortedCustomers.length === 0 ? (
                                    <div className="text-center py-20 border-2 border-dashed border-border/40 rounded-[2rem] bg-muted/5">
                                        <div className="h-12 w-12 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Search className="h-6 w-6 text-muted-foreground/30" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No matches found</p>
                                    </div>
                                ) : (
                                    filteredAndSortedCustomers.map((customer) => (
                                        <div
                                            key={customer.id}
                                            onClick={() => toggleSelection(customer.id)}
                                            className={cn(
                                                "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden",
                                                localSelectedIds.includes(customer.id)
                                                    ? "bg-primary/[0.03] border-primary/30 shadow-sm"
                                                    : "bg-background border-border/40 hover:border-primary/40 hover:bg-muted/30"
                                            )}
                                        >
                                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                                <div className={cn(
                                                    "h-6 w-6 shrink-0 rounded-lg border-2 flex items-center justify-center transition-all",
                                                    localSelectedIds.includes(customer.id)
                                                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                                                        : "bg-background border-border/60 group-hover:border-primary/40"
                                                )}>
                                                    {localSelectedIds.includes(customer.id) && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className={cn(
                                                        "text-sm font-black tracking-tight truncate mb-0.5 transition-colors",
                                                        localSelectedIds.includes(customer.id) ? "text-primary" : "text-foreground"
                                                    )}>
                                                        {customer.customer_name}
                                                    </p>
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground shrink-0 bg-muted/50 px-1.5 py-0.5 rounded">
                                                            {customer.customer_code}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-muted-foreground/60 truncate italic uppercase tracking-tighter">
                                                            {customer.store_name}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {localSelectedIds.includes(customer.id) && (
                                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary shrink-0 ml-3">
                                                    <Sparkles className="h-3 w-3" />
                                                    <span className="text-[9px] font-black uppercase tracking-tighter">Selected</span>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Footer */}
                    <div className="p-8 bg-muted/20 border-t border-border/40 flex items-center justify-between backdrop-blur-md">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                                Selection Status
                            </span>
                            <span className="text-xl font-black italic tracking-tighter text-foreground">
                                {localSelectedIds.length} <span className="text-muted-foreground/50 text-sm">Customers</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button 
                                variant="ghost" 
                                onClick={() => onOpenChange(false)} 
                                className="h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-muted/50 transition-all"
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleConfirm} 
                                className="h-14 px-10 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all text-[11px] font-black uppercase tracking-[0.1em] group"
                            >
                                Apply Changes
                                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
