"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Box as BoxIcon, Download, Filter, ChevronLeft, ChevronRight, Search, Loader2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export interface InventoryItem {
    id: string;
    productId: number;
    branchId: number;
    branch: string;
    supplier: string;
    supplierCode: string;
    category: string;
    brand: string;
    productName: string;
    productDescription: string;
    unit: string;
    current: number;
    allocated: number;
    projected: number;
    inboxCurrent: number;
    inboxAllocated: number;
    inboxProjected: number;
}

export interface DropdownOptions {
    categories: any[];
    brands: any[];
    suppliers: any[];
    branches: any[];
}

export default function InventoryReportModule({ options }: { options: DropdownOptions }) {
    const [data, setData] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Filter States
    const [branch, setBranch] = useState("all");
    const [supplier, setSupplier] = useState("all");
    const [category, setCategory] = useState("all");
    const [brand, setBrand] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [hasSearched, setHasSearched] = useState(false);
    const [groupByFamily, setGroupByFamily] = useState(false);
    
    // Performance: Simple in-memory cache to store results for 10 minutes
    const cacheRef = useRef<Record<string, InventoryItem[]>>({});
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US', {
            maximumFractionDigits: 0
        }).format(num || 0);
    };

    const handleSearch = async (isDebounced = false) => {
        const cacheKey = `${branch}-${supplier}-${category}-${brand}`;
        
        // If we have cached data, use it instantly (unless it's a fresh manual search)
        if (cacheRef.current[cacheKey]) {
            setData(cacheRef.current[cacheKey]);
            setHasSearched(true);
            setCurrentPage(1);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (branch !== "all") params.append("branch", branch);
            if (supplier !== "all") params.append("supplier", supplier);
            if (category !== "all") params.append("category", category);
            if (brand !== "all") params.append("brand", brand);

            const res = await fetch(`/api/crm/customer-hub/inventory-report?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch data");
            const result = await res.json();
            
            let extractedData: any[] = [];
            if (Array.isArray(result)) extractedData = result;
            else if (result?.data?.content) extractedData = result.data.content;
            else if (result?.data) extractedData = Array.isArray(result.data) ? result.data : [];
            else if (result?.content) extractedData = result.content;

            // Store in cache
            if (extractedData.length > 0) {
                cacheRef.current[cacheKey] = extractedData;
            }

            setData(extractedData);
            setHasSearched(true);
            setCurrentPage(1);
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Trigger fetch on any filter change (with 300ms Debounce)
    useEffect(() => {
        const hasActiveFilter = branch !== "all" || supplier !== "all" || category !== "all" || brand !== "all";
        if (!isMounted) return;

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (hasActiveFilter) {
            debounceRef.current = setTimeout(() => {
                handleSearch(true);
            }, 300);
        }

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [branch, supplier, category, brand]);

    // Client-side search filtering
    const filteredData = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return data;
        return data.filter((item) => 
            (item.category?.toLowerCase().includes(q)) ||
            (item.branch?.toLowerCase().includes(q)) ||
            (item.brand?.toLowerCase().includes(q)) ||
            (item.supplier?.toLowerCase().includes(q)) ||
            (item.productDescription?.toLowerCase().includes(q))
        );
    }, [data, searchQuery]);

    // Pagination computations
    const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
    
    // Grouped Data Logic
    const groupedData = useMemo(() => {
        if (!groupByFamily) return { "All Items": filteredData };
        
        return filteredData.reduce((groups: Record<string, InventoryItem[]>, item) => {
            const groupKey = item.category || "Uncategorized"; // Using Category as 'Family'
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(item);
            return groups;
        }, {});
    }, [filteredData, groupByFamily]);

    const paginatedData = useMemo(() => {
        return filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    const handleExport = () => {
        if (filteredData.length === 0) return alert("No data to export.");
        
        const headers = ["Category", "Brand", "Product Name", "Supplier", "Branch", "Unit", "Current", "Allocated", "Projected"];
        const csvRows = filteredData.map(item => [
            `"${item.category || ""}"`,
            `"${item.brand || ""}"`,
            `"${(item.productName || item.productDescription)?.replace(/"/g, '""') || ""}"`,
            `"${item.supplier || ""}"`,
            `"${item.branch || ""}"`,
            `"${item.unit || ""}"`,
            item.current || 0,
            item.allocated || 0,
            item.projected || 0,
        ].join(","));
        
        const blob = new Blob([[headers.join(","), ...csvRows].join("\n")], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Inventory_Report_${new Date().toLocaleDateString()}.csv`;
        link.click();
    };

    if (!isMounted) return <div className="p-8"><TableSkeleton /></div>;

    return (
        <div className="flex flex-col gap-6 w-full p-4 sm:p-6 lg:p-8 mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border border-border bg-card p-6 rounded-xl shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary rounded-lg shadow-lg shadow-primary/20">
                        <BoxIcon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Inventory Report</h1>
                        <p className="text-sm text-muted-foreground">Real-time stock monitoring and distribution</p>
                    </div>
                </div>
                <Button onClick={handleExport} className="bg-primary hover:opacity-90 font-medium gap-2 self-start md:self-center">
                    <Download className="w-4 h-4" />
                    Export CSV
                </Button>
            </div>

            {/* Filters */}
            <Card className="shadow-sm border-border">
                <CardContent className="p-4 flex flex-wrap items-center gap-3 bg-muted/30">
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={branch} onValueChange={setBranch}>
                            <SelectTrigger className="w-[150px] bg-background border-border text-xs">
                                <SelectValue placeholder="Branch" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Branches</SelectItem>
                                {options.branches?.filter(b => b.branch_name || b.name || b.branch_description).map((b, i) => {
                                    const val = b.branch_name || b.name || b.branch_description || b.branch_code;
                                    const label = b.branch_name || b.branch_description || b.name || b.branch_code;
                                    return <SelectItem key={i} value={val}>{label}</SelectItem>
                                })}
                            </SelectContent>
                        </Select>

                        <Select value={supplier} onValueChange={setSupplier}>
                            <SelectTrigger className="w-[150px] bg-background border-border text-xs">
                                <SelectValue placeholder="Supplier" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Suppliers</SelectItem>
                                {options.suppliers?.filter(s => s.supplier_name || s.supplier_code).map((s, i) => {
                                    const val = s.supplier_name || s.supplier_code;
                                    const label = s.supplier_name || s.supplier_code;
                                    return <SelectItem key={i} value={val}>{label}</SelectItem>
                                })}
                            </SelectContent>
                        </Select>

                        <Select value={brand} onValueChange={setBrand}>
                            <SelectTrigger className="w-[150px] bg-background border-border text-xs">
                                <SelectValue placeholder="Brand" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Brands</SelectItem>
                                {options.brands?.filter(b => b.brand_name).map((b, i) => (
                                    <SelectItem key={i} value={b.brand_name}>{b.brand_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="w-[150px] bg-background border-border text-xs">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {options.categories?.filter(c => c.category_name).map((c, i) => (
                                    <SelectItem key={i} value={c.category_name}>{c.category_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2 px-3 h-10 bg-background border border-border rounded-md shadow-sm">
                            <Checkbox 
                                id="group-by-family" 
                                checked={groupByFamily} 
                                onCheckedChange={(v) => setGroupByFamily(!!v)}
                                className="border-primary"
                            />
                            <Label 
                                htmlFor="group-by-family" 
                                className="text-xs font-medium cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Group by Family
                            </Label>
                        </div>

                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                                setCategory("all");
                                setBranch("all");
                                setBrand("all");
                                setSupplier("all");
                                setSearchQuery("");
                                setData([]);
                                setHasSearched(false);
                            }}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4 mr-1" /> Clear
                        </Button>
                    </div>

                    {loading && (
                        <div className="flex items-center gap-2 text-sm text-primary font-medium ml-auto animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Syncing...</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-border overflow-hidden">
                <div className="min-h-[400px] relative">
                    {loading ? (
                        <TableSkeleton />
                    ) : !hasSearched ? (
                        <div className="h-60 flex flex-col items-center justify-center text-muted-foreground">
                            <Filter className="w-8 h-8 opacity-20 mb-2" />
                            <p className="text-lg font-medium text-foreground/60">Apply filters to view inventory results.</p>
                        </div>
                    ) : paginatedData.length === 0 ? (
                        <div className="h-60 flex items-center justify-center text-muted-foreground">
                            No inventory items found matching your filters.
                        </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="font-bold py-4">CATEGORY</TableHead>
                                            <TableHead className="font-bold">BRAND</TableHead>
                                            <TableHead className="font-bold min-w-[250px]">PRODUCT NAME</TableHead>
                                            <TableHead className="font-bold">UNIT</TableHead>
                                            <TableHead className="font-bold text-right">CURRENT</TableHead>
                                            <TableHead className="font-bold text-right">ALLOCATED</TableHead>
                                            <TableHead className="font-bold text-right">PROJECTED</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(groupedData).map(([groupName, items]) => (
                                            <React.Fragment key={groupName}>
                                                {groupByFamily && (
                                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                        <TableCell colSpan={7} className="py-2 px-4 font-bold text-xs tracking-widest text-primary uppercase">
                                                            {groupName}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                                {items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, i) => (
                                                    <TableRow key={item.id || i} className="hover:bg-muted/30 border-border">
                                                        <TableCell>
                                                            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                                                                {item.category || "N/A"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="font-medium">{item.brand || "-"}</TableCell>
                                                        <TableCell className="max-w-[300px] truncate text-muted-foreground">
                                                            {item.productName || item.productDescription}
                                                        </TableCell>
                                                        <TableCell className="text-xs uppercase font-semibold">{item.unit}</TableCell>
                                                        <TableCell className="text-right">
                                                            <StockBreakdownHover value={item.current} inboxValue={item.inboxCurrent} label="Current" />
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <StockBreakdownHover value={item.allocated} inboxValue={item.inboxAllocated} label="Allocated" />
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-primary">
                                                            <StockBreakdownHover value={item.projected} inboxValue={item.inboxProjected} label="Projected" />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>

                {/* Pagination */}
                <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/10">
                    <p className="text-sm text-muted-foreground">
                        Showing <span className="text-foreground font-medium">{paginatedData.length}</span> of {filteredData.length} results
                    </p>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Rows:</span>
                            <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
                                <SelectTrigger className="w-[70px] h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[10, 20, 50, 100].map(v => <SelectItem key={v} value={v.toString()}>{v}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="icon" variant="outline" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium">{currentPage} / {totalPages}</span>
                            <Button size="icon" variant="outline" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

// Performance Optimization: Skeleton Loader for perceived speed
function TableSkeleton() {
    return (
        <div className="space-y-4 w-full">
            <div className="flex items-center space-x-4 px-4 py-2 bg-muted/20">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[50px] ml-auto" />
            </div>
            {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 px-4 py-3 border-b border-border/50">
                    <Skeleton className="h-4 w-[120px]" />
                    <Skeleton className="h-4 w-[80px]" />
                    <Skeleton className="h-4 w-[300px]" />
                    <Skeleton className="h-4 w-[40px] ml-auto" />
                    <Skeleton className="h-4 w-[60px]" />
                </div>
            ))}
        </div>
    );
}

// Sub-component for Stock Details
function StockBreakdownHover({ value, inboxValue, label }: { value: number; inboxValue: number; label: string }) {
    const pieces = value || 0;
    const boxes = inboxValue || 0;
    const cases = Math.floor(pieces / 24); // Assuming 24 unit standard case if not provided

    return (
        <HoverCard openDelay={0}>
            <HoverCardTrigger asChild>
                <span className="cursor-help underline underline-offset-4 decoration-dotted decoration-muted-foreground/50 hover:text-primary transition-colors">
                    {new Intl.NumberFormat().format(pieces)}
                </span>
            </HoverCardTrigger>
            <HoverCardContent className="w-64 p-4 shadow-xl border-border bg-popover" align="end">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-2 mb-3">{label} Stock</h4>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Boxes</span>
                        <span className="font-mono font-bold text-primary">{boxes}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cases (Est.)</span>
                        <span className="font-mono">{cases}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="font-semibold">Total Pieces</span>
                        <span className="font-mono font-bold underline decoration-primary">{pieces}</span>
                    </div>
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}