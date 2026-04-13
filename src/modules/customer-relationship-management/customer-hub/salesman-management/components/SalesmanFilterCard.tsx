"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface SalesmanFilterCardProps {
    search: string;
    setSearch: (val: string) => void;
    statusFilter: "active" | "inactive" | "all";
    setStatusFilter: (val: "active" | "inactive" | "all") => void;
}

export function SalesmanFilterCard({
                                       search,
                                       setSearch,
                                       statusFilter,
                                       setStatusFilter,
                                   }: SalesmanFilterCardProps) {
    return (
        <Card className="shadow-sm border-muted-foreground/10 overflow-hidden">
            <CardHeader className="py-4 px-6 flex flex-row items-center justify-between border-b bg-slate-50/50">
                <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
            Search & Filter
          </span>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="relative flex-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1">
                            Salesman Identity
                        </Label>
                        <Search className="absolute left-3 top-[34px] h-4 w-4 text-muted-foreground opacity-50" />
                        <Input
                            placeholder="Search by name or code..."
                            className="pl-9 h-10 text-xs font-semibold border-muted-foreground/20 rounded-xl"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <Label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1">
                            Engagement Status
                        </Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-10 text-xs font-black uppercase tracking-widest border-muted-foreground/20 rounded-xl shadow-sm bg-white">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                                <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest py-3">All</SelectItem>
                                <SelectItem value="active" className="text-[10px] font-black uppercase tracking-widest py-3">Active Only</SelectItem>
                                <SelectItem value="inactive" className="text-[10px] font-black uppercase tracking-widest py-3">Inactive Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}