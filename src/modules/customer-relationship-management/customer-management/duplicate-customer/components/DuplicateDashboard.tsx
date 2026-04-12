import React, { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDuplicateCustomers } from "../hooks/useDuplicateCustomers";
import { DuplicateGroupRow } from "./DuplicateGroupRow";
import { ComparisonModal } from "./ComparisonModal";
import { Search, Filter, AlertCircle, RefreshCw, Layers } from "lucide-react";
import { DuplicateGroup } from "../types";
import { Skeleton } from "@/components/ui/skeleton";

export const DuplicateDashboard: React.FC = () => {
    const { 
        duplicateGroups, 
        isLoading, 
        handleResolve,
        refreshScan 
    } = useDuplicateCustomers();
    
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);

    const filteredGroups = duplicateGroups.filter(group => 
        group.customers.some(c => 
            c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.customer_code.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Layers className="h-8 w-8 text-blue-600" />
                        Duplicate Customer Detection
                    </h2>
                    <p className="text-slate-500 mt-1">
                        Review and resolve potential duplicate records based on &quot;fishy&quot; logic matching.
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2" 
                        onClick={() => refreshScan()}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh Scan
                    </Button>
                    <Button 
                        size="sm" 
                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                        onClick={() => refreshScan()}
                        disabled={isLoading}
                    >
                        Scan All Records
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-50/50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Potential Groups</CardTitle>
                        <CardDescription className="text-2xl font-bold text-slate-900">{isLoading ? <Skeleton className="h-8 w-16" /> : duplicateGroups.length}</CardDescription>
                    </CardHeader>
                </Card>
                <Card className="bg-slate-50/50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Affected Records</CardTitle>
                        <CardDescription className="text-2xl font-bold text-slate-900">
                            {isLoading ? <Skeleton className="h-8 w-16" /> : duplicateGroups.reduce((acc, g) => acc + g.customers.length, 0)}
                        </CardDescription>
                    </CardHeader>
                </Card>
                <Card className="bg-slate-50/50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Avg. Confidence</CardTitle>
                        <CardDescription className="text-2xl font-bold text-slate-900">
                            {isLoading ? <Skeleton className="h-8 w-16" /> : "92%"}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            Pending Review
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                    placeholder="Search by name or code..." 
                                    className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="icon">
                                <Filter className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="relative overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/80">
                                <TableRow>
                                    <TableHead className="w-[200px] font-semibold">Group Size</TableHead>
                                    <TableHead className="font-semibold">Top Matches</TableHead>
                                    <TableHead className="font-semibold">Match Reasons</TableHead>
                                    <TableHead className="font-semibold">Confidence</TableHead>
                                    <TableHead className="text-right font-semibold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={5} className="py-8">
                                                <div className="flex flex-col gap-2">
                                                    <Skeleton className="h-4 w-[250px]" />
                                                    <Skeleton className="h-4 w-[200px]" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredGroups.length > 0 ? (
                                    filteredGroups.map(group => (
                                        <DuplicateGroupRow 
                                            key={group.id} 
                                            group={group} 
                                            onViewDetails={setSelectedGroup} 
                                        />
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                                                <Layers className="h-12 w-12 opacity-20" />
                                                <p className="text-lg font-medium">No potential duplicates found</p>
                                                <p className="text-sm">Try scanning all records to refresh the list.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <ComparisonModal 
                group={selectedGroup}
                open={!!selectedGroup}
                onClose={() => setSelectedGroup(null)}
                onResolve={(action) => handleResolve(selectedGroup?.id || "", action)}
            />
        </div>
    );
};
