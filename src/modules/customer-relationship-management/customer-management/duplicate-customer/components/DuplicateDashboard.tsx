import React, { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
                    <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Layers className="h-8 w-8 text-primary" />
                        Duplicate Customer Detection
                    </h2>
                    <p className="text-muted-foreground mt-1">
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
                        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={() => refreshScan()}
                        disabled={isLoading}
                    >
                        Scan All Records
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-muted/40 border-border shadow-sm flex flex-col items-center justify-center p-6 text-center">
                    <div className="p-3 bg-primary/10 rounded-xl mb-3">
                        <Layers className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Potential Groups</p>
                        <div className="text-3xl font-black text-foreground tabular-nums">
                            {isLoading ? <Skeleton className="h-9 w-16" /> : duplicateGroups.length}
                        </div>
                    </div>
                </Card>
                <Card className="bg-muted/40 border-border shadow-sm flex flex-col items-center justify-center p-6 text-center">
                    <div className="p-3 bg-warning/10 rounded-xl mb-3">
                        <AlertCircle className="h-6 w-6 text-warning" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Affected Records</p>
                        <div className="text-3xl font-black text-foreground tabular-nums">
                            {isLoading ? <Skeleton className="h-9 w-16" /> : duplicateGroups.reduce((acc, g) => acc + g.customers.length, 0)}
                        </div>
                    </div>
                </Card>
                <Card className="bg-muted/40 border-border shadow-sm flex flex-col items-center justify-center p-6 text-center">
                    <div className="p-3 bg-success/10 rounded-xl mb-3">
                        <RefreshCw className="h-6 w-6 text-success" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Avg. Confidence</p>
                        <div className="text-3xl font-black text-foreground tabular-nums">
                            {isLoading ? <Skeleton className="h-9 w-16" /> : "92%"}
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="border-border shadow-md overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardHeader className="bg-muted/30 border-b border-border/50 py-5">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-warning/20 rounded-lg">
                                <AlertCircle className="h-5 w-5 text-warning" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold text-foreground">Pending Review</CardTitle>
                                <p className="text-xs text-muted-foreground font-medium">Resolution actions are required for these matches.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search by name or code..." 
                                    className="pl-9 bg-background border-border focus:ring-1 focus:ring-primary/30 transition-all h-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="icon" className="h-10 w-10 border-border">
                                <Filter className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="relative overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/50 border-b border-border/50">
                                <TableRow>
                                    <TableHead className="w-[200px] font-bold text-foreground h-12 uppercase text-[10px] tracking-widest">Group Size</TableHead>
                                    <TableHead className="font-bold text-foreground h-12 uppercase text-[10px] tracking-widest">Top Matches</TableHead>
                                    <TableHead className="font-bold text-foreground h-12 uppercase text-[10px] tracking-widest text-center">Match Reasons</TableHead>
                                    <TableHead className="font-bold text-foreground h-12 uppercase text-[10px] tracking-widest text-center">Confidence</TableHead>
                                    <TableHead className="text-right font-bold text-foreground h-12 uppercase text-[10px] tracking-widest pr-6">Actions</TableHead>
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
                                            <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                                                <Layers className="h-12 w-12 opacity-20" />
                                                <p className="text-lg font-medium tracking-tight">No potential duplicates found</p>
                                                <p className="text-xs uppercase font-bold tracking-widest opacity-60">Try scanning all records to refresh the list.</p>
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
