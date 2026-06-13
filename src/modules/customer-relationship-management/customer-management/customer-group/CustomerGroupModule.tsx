"use client";

import React, { useState } from "react";
import { useCustomerGroups } from "./hooks/useCustomerGroups";
import { CustomerGroupTable } from "./components/CustomerGroupTable";
import { CustomerGroupFormSheet } from "./components/CustomerGroupFormSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Plus, 
    Search, 
    Users, 
    RefreshCcw, 
    Download,
    Building2
} from "lucide-react";
import { CustomerGroup, CustomerGroupFormData } from "./types";
import { cn } from "@/lib/utils";

export default function CustomerGroupModule() {
    const {
        groups,
        isLoading,
        searchQuery,
        setSearchQuery,
        refetch,
        createGroup,
        updateGroup,
    } = useCustomerGroups();

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<CustomerGroup | null>(null);

    const handleNewGroup = () => {
        setEditingGroup(null);
        setIsSheetOpen(true);
    };

    const handleEditGroup = (group: CustomerGroup) => {
        setEditingGroup(group);
        setIsSheetOpen(true);
    };


    const handleSubmit = async (data: CustomerGroupFormData) => {
        try {
            if (editingGroup) {
                await updateGroup(data);
            } else {
                await createGroup(data);
            }
        } catch {
            // Error handled in hook
        }
    };

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500">
            {/* Standard Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic text-foreground">
                        Customer Groups
                    </h2>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">
                        Organize and manage customer segments for logistics and reporting
                    </p>
                </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 flex items-center gap-6">
                    <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/30">
                        <Users className="h-7 w-7" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Total Groups</p>
                        <p className="text-3xl font-black italic tracking-tighter">{groups.length}</p>
                    </div>
                </div>
                
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-6 flex items-center gap-6">
                    <div className="h-14 w-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                        <Building2 className="h-7 w-7" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Active Groups</p>
                        <p className="text-3xl font-black italic tracking-tighter">{groups.filter(g => g.isActive === 1).length}</p>
                    </div>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-6 flex items-center gap-6">
                    <div className="h-14 w-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                        <RefreshCcw className="h-7 w-7" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Last Sync</p>
                        <p className="text-sm font-black uppercase tracking-tighter">Live Updates Enabled</p>
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Search groups by name or code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 h-12 bg-background border-border/40 rounded-2xl shadow-sm focus-visible:ring-primary/10 text-sm font-medium"
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button
                        variant="outline"
                        onClick={() => refetch()}
                        className="h-12 w-12 p-0 rounded-2xl border-border/40 bg-background shadow-sm hover:bg-muted/50"
                    >
                        <RefreshCcw className={cn("h-4 w-4 text-muted-foreground", isLoading && "animate-spin")} />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-12 px-6 rounded-2xl border-border/40 bg-background shadow-sm hover:bg-muted/50 text-[10px] font-black uppercase tracking-widest"
                    >
                        <Download className="h-4 w-4 mr-2" /> Export
                    </Button>
                    <Button
                        onClick={handleNewGroup}
                        className="h-12 px-8 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                        <Plus className="h-4 w-4 mr-2" /> New Customer Group
                    </Button>
                </div>
            </div>

            {/* Table Section */}
            <div className="min-h-0 flex-1">
                <CustomerGroupTable
                    groups={groups}
                    isLoading={isLoading}
                    onEdit={handleEditGroup}
                />
            </div>

            {/* Form Sheet */}
            <CustomerGroupFormSheet
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                group={editingGroup}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
