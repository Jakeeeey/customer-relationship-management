"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Download, Filter, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchableSelect } from "@/components/ui/searchable-select";

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
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Filter States
    const [branch, setBranch] = useState("all");
    const [supplier, setSupplier] = useState("all");
    const [category, setCategory] = useState("all");
    const [brand, setBrand] = useState("all");
    const [hasSearched, setHasSearched] = useState(false);
    const [groupByFamily, setGroupByFamily] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    
    // Performance: Simple in-memory cache to store results for the current session
    // Uses a key based on filters + pagination params
    const cacheRef = useRef<Record<string, { data: InventoryItem[], total: number }>>({});
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US').format(num || 0);
    };

    const handleSearch = useCallback(async () => {
        const cacheKey = `${branch}-${supplier}-${category}-${brand}`;
        
        // INSTANT RECALL: Use cached data if available for these filters
        if (cacheRef.current[cacheKey]) {
            const cachedValue = cacheRef.current[cacheKey];
            setData(cachedValue.data);
            setTotalItems(cachedValue.total);
            setHasSearched(true);
            setLoading(false);
            setCurrentPage(1); // Reset to page 1 for new cached filter
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (branch !== "all") params.append("branch", branch);
            if (supplier !== "all") params.append("supplier", supplier);
            if (category !== "all") params.append("category", category);
            if (brand !== "all") params.append("brand", brand);
            
            // Fetch everything for these filters to enable instant local pagination

            const res = await fetch(`/api/crm/customer-hub/inventory-report?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch data");
            const result = await res.json();
            
            let extractedData: any[] = [];
            let total = 0;

            if (Array.isArray(result)) {
                extractedData = result;
                total = result.length;
            } else if (result?.data?.content) {
                extractedData = result.data.content;
                total = result.data.totalElements || result.data.total_count || 0;
            } else if (result?.content) {
                extractedData = result.content;
                total = result.totalElements || 0;
            } else if (result?.data) {
                extractedData = Array.isArray(result.data) ? result.data : [];
                total = result.meta?.total_count || result.total_count || extractedData.length;
            }

            // Update Data and Search Status
            setData(extractedData);
            setTotalItems(total);
            setHasSearched(true);
            setCurrentPage(1); // Reset to first page on new fetch

            // STORE IN CACHE: Save for session instant recall
            cacheRef.current[cacheKey] = { data: extractedData, total };

        } catch (error) {
            console.error("Fetch error:", error);
            setData([]); // Clear data on error to prevent showing stale results
        } finally {
            setLoading(false);
        }
    }, [branch, supplier, category, brand]);

    // Trigger fetch on any filter change (with 300ms Debounce)
    useEffect(() => {
        const hasActiveFilter = branch !== "all" || supplier !== "all" || category !== "all" || brand !== "all";
        if (!isMounted) return;

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (hasActiveFilter) {
            debounceRef.current = setTimeout(() => {
                handleSearch();
            }, 300);
        }

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [branch, supplier, category, brand, isMounted, handleSearch]);

    // Pagination computations
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    const groupedData = useMemo(() => {
        if (!groupByFamily) return { "All Items": data };
        
        return data.reduce((groups: Record<string, InventoryItem[]>, item) => {
            const groupKey = item.category || "Uncategorized";
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(item);
            return groups;
        }, {} as Record<string, InventoryItem[]>);
    }, [data, groupByFamily]);

    // Essential Local Pagination: Slice the full data set for instant page turning
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return data.slice(start, start + itemsPerPage);
    }, [data, currentPage, itemsPerPage]);

    const filteredData = data;

    const [previewPage, setPreviewPage] = useState(1);
    const [previewRowsPerPage, setPreviewRowsPerPage] = useState(20);

    const paginatedPreviewData = useMemo(() => {
        const start = (previewPage - 1) * previewRowsPerPage;
        return filteredData.slice(start, start + previewRowsPerPage);
    }, [filteredData, previewPage, previewRowsPerPage]);

    const previewTotalPages = Math.ceil(filteredData.length / previewRowsPerPage);

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

    if (!isMounted) return <div className="p-8"><Skeleton className="h-60 w-full" /></div>;

    return (
        <div className="flex flex-col h-full gap-4 p-4 sm:p-6 lg:p-8">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Inventory Report</h1>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        Real-time warehouse stock overview 
                        {loading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 border-primary/20 text-primary hover:bg-primary/5"
                        onClick={() => {
                            setPreviewPage(1); // Reset to page 1 when opening
                            setIsPreviewOpen(true);
                        }}
                        disabled={loading || data.length === 0}
                    >
                        <Download className="w-4 h-4" />
                        Preview Export
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="shadow-sm border-border">
                <CardContent className="p-4 flex flex-wrap items-center gap-4 bg-muted/30">
                    <div className="flex flex-wrap items-center gap-2">
                        <SearchableSelect 
                            options={[
                                { value: "all", label: "All Branches" },
                                ...(options.branches?.filter(b => b.branch_name || b.name || b.branch_description).map(b => ({
                                    value: b.branch_name || b.name || b.branch_description || b.branch_code || "",
                                    label: b.branch_name || b.branch_description || b.name || b.branch_code || ""
                                })) || [])
                            ]}
                            value={branch}
                            onValueChange={setBranch}
                            placeholder="Branch"
                            className="w-[180px] text-xs h-10"
                        />

                        <SearchableSelect 
                            options={[
                                { value: "all", label: "All Suppliers" },
                                ...(options.suppliers?.filter(s => s.supplier_name || s.supplier_code).map(s => ({
                                    value: s.supplier_name || s.supplier_code || "",
                                    label: s.supplier_name || s.supplier_code || ""
                                })) || [])
                            ]}
                            value={supplier}
                            onValueChange={setSupplier}
                            placeholder="Supplier"
                            className="w-[180px] text-xs h-10"
                        />

                        <SearchableSelect 
                            options={[
                                { value: "all", label: "All Brands" },
                                ...(options.brands?.filter(b => b.brand_name).map(b => ({
                                    value: b.brand_name || "",
                                    label: b.brand_name || ""
                                })) || [])
                            ]}
                            value={brand}
                            onValueChange={setBrand}
                            placeholder="Brand"
                            className="w-[180px] text-xs h-10"
                        />

                        <SearchableSelect 
                            options={[
                                { value: "all", label: "All Categories" },
                                ...(options.categories?.filter(c => c.category_name).map(c => ({
                                    value: c.category_name || "",
                                    label: c.category_name || ""
                                })) || [])
                            ]}
                            value={category}
                            onValueChange={setCategory}
                            placeholder="Category"
                            className="w-[180px] text-xs h-10"
                        />

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
                                    <TableHeader className="bg-muted/50 border-b">
                                        <TableRow className="hover:bg-transparent">
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
                                        {Object.entries(groupedData).map(([groupName, groupItems]) => {
                                            // Handle pagination within groups if the server sent too much
                                            const items = paginatedData.filter(p => groupItems.some(g => g.id === p.id));
                                            if (items.length === 0) return null;

                                            return (
                                                <React.Fragment key={groupName}>
                                                    {groupByFamily && (
                                                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                            <TableCell colSpan={7} className="py-2 px-4 font-bold text-xs tracking-widest text-primary uppercase">
                                                                {groupName}
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                    {items.map((item, i) => (
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
                                                                <div className={cn(
                                                                    "inline-block rounded px-2 py-0.5",
                                                                    item.current <= 0 ? "bg-destructive/10 text-destructive font-bold" :
                                                                    item.current <= 100 ? "bg-amber-500/10 text-amber-600 font-semibold" :
                                                                    "bg-green-500/10 text-green-600"
                                                                )}>
                                                                    <StockBreakdownHover value={item.current} inboxValue={item.inboxCurrent} label="Current" />
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <StockBreakdownHover value={item.allocated} inboxValue={item.inboxAllocated} label="Allocated" />
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold text-primary">
                                                                <div className={cn(
                                                                    "inline-block rounded px-2 py-0.5",
                                                                    (item.projected || 0) <= 0 ? "bg-destructive/20 text-destructive font-black underline" :
                                                                    (item.projected || 0) <= 100 ? "bg-amber-500/20 text-amber-700" :
                                                                    "bg-primary/10 text-primary"
                                                                )}>
                                                                    <StockBreakdownHover value={item.projected} inboxValue={item.inboxProjected} label="Projected" />
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>

                <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/10">
                    <p className="text-sm text-muted-foreground">
                        Showing <span className="text-foreground font-medium">{paginatedData.length}</span> of {totalItems} results
                    </p>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Rows:</span>
                            <Select 
                                value={itemsPerPage.toString()} 
                                onValueChange={(v) => {
                                    setItemsPerPage(Number(v));
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="w-[70px] h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[10, 20, 50, 100].map(v => <SelectItem key={v} value={v.toString()}>{v}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                size="icon" 
                                variant="outline" 
                                className="h-8 w-8" 
                                disabled={currentPage === 1 || loading} 
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium">{currentPage} / {totalPages}</span>
                            <Button 
                                size="icon" 
                                variant="outline" 
                                className="h-8 w-8" 
                                disabled={currentPage === totalPages || loading} 
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Export Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-[98vw] sm:max-w-[95vw] w-full h-[85vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-6 border-b bg-muted/20">
                        <DialogTitle className="flex items-center justify-between w-full pr-8">
                            <div className="flex items-center gap-2 text-xl font-bold">
                                <Download className="w-5 h-5 text-primary" />
                                Export Preview
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="font-mono px-3 py-1 bg-primary/10 text-primary border-primary/20">
                                    {filteredData.length} TOTAL ROWS
                                </Badge>
                            </div>
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 p-6 overflow-hidden flex flex-col gap-4">
                        <div className="rounded-md border border-border overflow-auto flex-1 relative bg-background">
                            <Table className="relative border-collapse">
                                <TableHeader className="bg-muted/50 border-b">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="font-bold whitespace-nowrap text-foreground">BRANCH</TableHead>
                                        <TableHead className="font-bold whitespace-nowrap text-foreground">SUPPLIER</TableHead>
                                        <TableHead className="font-bold whitespace-nowrap text-foreground">CATEGORY</TableHead>
                                        <TableHead className="font-bold whitespace-nowrap text-foreground">BRAND</TableHead>
                                        <TableHead className="font-bold min-w-[300px] text-foreground">PRODUCT DESCRIPTION</TableHead>
                                        <TableHead className="font-bold text-right whitespace-nowrap text-foreground">CURRENT</TableHead>
                                        <TableHead className="font-bold text-right whitespace-nowrap text-foreground">ALLOCATED</TableHead>
                                        <TableHead className="font-bold text-right whitespace-nowrap text-foreground">PROJECTED</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedPreviewData.map((item, i) => (
                                        <TableRow key={i} className="text-xs border-border hover:bg-muted/30">
                                            <TableCell className="font-medium whitespace-nowrap">{item.branch}</TableCell>
                                            <TableCell className="whitespace-nowrap">{item.supplier}</TableCell>
                                            <TableCell className="whitespace-nowrap">{item.category}</TableCell>
                                            <TableCell className="whitespace-nowrap">{item.brand}</TableCell>
                                            <TableCell className="max-w-[300px] truncate">{item.productName || item.productDescription}</TableCell>
                                            <TableCell className="text-right font-mono font-semibold">{item.current || 0}</TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground">{item.allocated || 0}</TableCell>
                                            <TableCell className="text-right font-mono font-bold text-primary">{item.projected || 0}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Preview Pagination Controls */}
                        <div className="flex items-center justify-between py-2 px-4 bg-muted/20 border border-border rounded-lg">
                            <div className="text-sm text-muted-foreground">
                                Showing <span className="font-bold text-foreground">
                                    {Math.min(filteredData.length, (previewPage - 1) * previewRowsPerPage + 1)} - {Math.min(filteredData.length, previewPage * previewRowsPerPage)}
                                </span> of {filteredData.length} rows in preview
                            </div>
                            
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview Rows:</span>
                                    <Select 
                                        value={previewRowsPerPage.toString()} 
                                        onValueChange={(v) => {
                                            setPreviewRowsPerPage(Number(v));
                                            setPreviewPage(1);
                                        }}
                                    >
                                        <SelectTrigger className="w-[80px] h-9 bg-background border-primary/20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[20, 50, 100].map(v => <SelectItem key={v} value={v.toString()}>{v}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-9 w-9 border-primary/20"
                                        disabled={previewPage === 1}
                                        onClick={() => setPreviewPage(prev => Math.max(1, prev - 1))}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="w-[80px] text-center font-mono text-sm">
                                        {previewPage} <span className="text-muted-foreground mx-1">/</span> {previewTotalPages}
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-9 w-9 border-primary/20"
                                        disabled={previewPage >= previewTotalPages}
                                        onClick={() => setPreviewPage(prev => Math.min(previewTotalPages, prev + 1))}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-4 border-t bg-muted/20 gap-2">
                        <Button variant="ghost" onClick={() => setIsPreviewOpen(false)} className="hover:bg-destructive/10 hover:text-destructive">Close</Button>
                        <Button 
                            onClick={() => {
                                handleExport();
                                setIsPreviewOpen(false);
                            }}
                            className="bg-primary hover:opacity-90 min-w-[160px] shadow-lg shadow-primary/20"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Download Full CSV
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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