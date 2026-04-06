"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    Truck,
    Users,
    Building2,
    Briefcase,
    Calendar,
    Package,
    Banknote,
    ShieldCheck,
    XCircle
} from "lucide-react";
import { Salesman, Branch, Division, Operation } from "../types";

interface SalesmanTableProps {
    salesmen: Salesman[];
    loading: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    lastElementRef: (node: HTMLDivElement | null) => void;
    onToggleActive: (salesman: Salesman, checked: boolean) => void;
    // 🚀 FIX: Added the missing prop to the interface
    onEditClick: (salesman: Salesman) => void;
}

const getDayName = (dayNumber?: number) => {
    if (!dayNumber) return "N/A";
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days[dayNumber - 1] || "Unknown";
};

export function SalesmanTable({
                                  salesmen,
                                  loading,
                                  loadingMore,
                                  hasMore,
                                  lastElementRef,
                                  onToggleActive,
                                  onEditClick, // 🚀 FIX: Destructured the prop here
                              }: SalesmanTableProps) {
    return (
        <Card className="shadow-sm border-muted-foreground/10 overflow-hidden">
            <CardHeader className="py-4 px-6 flex flex-row items-center justify-between border-b bg-primary/5">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary"/>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider">
                        Salesman Roster
                    </CardTitle>
                </div>
                <Badge variant="default" className="text-[10px]">
                    {salesmen.length} Loaded
                </Badge>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                            <TableRow>
                                <TableHead className="text-[10px] font-black uppercase bg-muted/50 h-10 px-6">
                                    Identifier
                                </TableHead>
                                <TableHead className="text-[10px] font-black uppercase bg-muted/50 h-10">
                                    Assignment
                                </TableHead>
                                <TableHead className="text-[10px] font-black uppercase bg-muted/50 h-10">
                                    Capabilities
                                </TableHead>
                                <TableHead className="text-[10px] font-black uppercase bg-muted/50 h-10">
                                    Logistics & Config
                                </TableHead>
                                <TableHead
                                    className="text-center text-[10px] font-black uppercase bg-muted/50 h-10 w-[80px] px-6">
                                    Status
                                </TableHead>
                                {/* 🚀 FIX: Empty header space for the Edit button column */}
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    {/* 🚀 FIX: Updated colSpan to 6 to account for the new Edit column */}
                                    <TableCell colSpan={6} className="h-64 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-6 h-6 animate-spin text-primary opacity-50"/>
                                            <span
                                                className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                                                Loading salesmen...
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                salesmen.map((s: Salesman) => (
                                    <TableRow
                                        key={s.id}
                                        className={`hover:bg-muted/10 ${!s.isActive && "opacity-60 bg-muted/5"}`}
                                    >
                                        <TableCell className="py-4 px-6 align-top">
                                            <div className="flex flex-col">
                                                <span
                                                    className="text-sm font-black text-slate-800 uppercase leading-none">
                                                    {s.salesman_name}
                                                </span>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge variant="outline"
                                                           className="text-[9px] font-bold px-1.5 h-4 border-slate-200 text-slate-500 bg-white">
                                                        {s.salesman_code}
                                                    </Badge>
                                                    <span
                                                        className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                                        EMP ID: {s.employee_id}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell className="py-4 align-top">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-1.5 text-slate-600">
                                                    <Building2 className="w-3 h-3 opacity-60"/>
                                                    <span
                                                        className="text-[10px] font-bold uppercase tracking-wider truncate max-w-[150px]">
                                                        {s.branch_code && typeof s.branch_code === "object" ? (s.branch_code as Branch).branch_name : "Central Office"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                    <Briefcase className="w-3 h-3 opacity-50"/>
                                                    <span
                                                        className="text-[10px] font-bold uppercase tracking-tighter truncate max-w-[150px]">
                                                        {s.division_id && typeof s.division_id === "object" ? (s.division_id as Division).division_name : "No Division"}
                                                    </span>
                                                </div>
                                                {s.operation && (
                                                    <div className="flex items-center gap-1.5 text-slate-400">
                                                        <ShieldCheck className="w-3 h-3 opacity-40"/>
                                                        <span
                                                            className="text-[9px] font-bold uppercase tracking-tighter truncate max-w-[150px]">
                                                            {typeof s.operation === "object" ? (s.operation as Operation).operation_name : `Op Code: ${s.operation}`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell className="py-4 align-top">
                                            <div className="flex flex-col gap-2">
                                                {s.isInventory ? (
                                                    <Badge
                                                        className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 text-[9px] font-black w-fit px-1.5 py-0">
                                                        <Package className="w-3 h-3 mr-1"/> Inventory Access
                                                    </Badge>
                                                ) : (
                                                    <div
                                                        className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                        <XCircle className="w-3 h-3"/> No Inventory
                                                    </div>
                                                )}

                                                {s.canCollect ? (
                                                    <Badge
                                                        className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 text-[9px] font-black w-fit px-1.5 py-0">
                                                        <Banknote className="w-3 h-3 mr-1"/> Collection Rights
                                                    </Badge>
                                                ) : (
                                                    <div
                                                        className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                        <XCircle className="w-3 h-3"/> No Collection
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell className="py-4 align-top">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <Truck className="w-3.5 h-3.5 text-primary opacity-60"/>
                                                    <span
                                                        className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                                        {s.truck_plate || "No Truck Assigned"}
                                                    </span>
                                                    <Badge
                                                        className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 text-[9px] font-black px-1.5 py-0 h-4 ml-1">
                                                        P{s.price_type || "A"}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <div className="flex items-center gap-1.5 text-slate-500">
                                                        <Calendar className="w-3 h-3 opacity-50"/>
                                                        <span
                                                            className="text-[10px] font-bold uppercase tracking-tighter">
                                                            Inv: {getDayName(s.inventory_day)}
                                                        </span>
                                                    </div>
                                                    {(s.company_code || s.supplier_code) && (
                                                        <div
                                                            className="flex items-center gap-2 text-[9px] font-bold text-slate-400 tracking-tighter uppercase">
                                                            {s.company_code && <span>Co: {s.company_code}</span>}
                                                            {s.company_code && s.supplier_code && <span>|</span>}
                                                            {s.supplier_code && <span>Sup: {s.supplier_code}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-center align-middle px-6">
                                            <div className="flex flex-col items-center gap-1">
                                                <Checkbox
                                                    checked={!!s.isActive}
                                                    onCheckedChange={(checked) => onToggleActive(s, !!checked)}
                                                    className="w-5 h-5"
                                                />
                                                <span
                                                    className="text-[8px] font-black uppercase text-slate-400 tracking-widest mt-1">
                                                    {s.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* 🚀 FIX: Moved the Edit button inside the row loop where it belongs! */}
                                        <TableCell className="text-right align-middle pr-6">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10"
                                                onClick={() => onEditClick(s)}
                                            >
                                                Edit
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                            {hasMore && (
                                <TableRow>
                                    {/* 🚀 FIX: Updated colSpan to 6 */}
                                    <TableCell colSpan={6} className="p-0">
                                        <div
                                            ref={lastElementRef}
                                            className="h-10 flex items-center justify-center"
                                        >
                                            {loadingMore && (
                                                <Loader2 className="w-4 h-4 animate-spin text-primary/40"/>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {!loading && salesmen.length === 0 && (
                                <TableRow>
                                    {/* 🚀 FIX: Updated colSpan to 6 */}
                                    <TableCell colSpan={6} className="h-64 text-center">
                                        <div
                                            className="flex flex-col items-center gap-2 text-muted-foreground opacity-30">
                                            <Users className="w-12 h-12"/>
                                            <span className="font-bold uppercase text-xs">
                                                No salesmen found
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}