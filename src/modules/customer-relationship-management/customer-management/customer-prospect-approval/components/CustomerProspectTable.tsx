"use client";

import React, { useState, useEffect } from "react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Check, X, ChevronLeft, ChevronRight, MoreHorizontal, User, Store, MapPin, Calendar, Phone, Building, Info, Briefcase, Landmark, ShieldCheck, FileText, Edit2, Loader2, Map as MapIcon } from "lucide-react";
import { CustomerProspect, CustomerProspectsAPIResponse, DiscountType, Salesman, StoreType, PaymentTerm, CustomerClassification } from "../types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./StatusBadge";
import { SearchableSelect } from "./SearchableSelect";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ProspectMapViewer } from "./ProspectMapViewer";
import { SimilarCustomerWarning } from "./SimilarCustomerWarning";
import { CustomerComparisonModal } from "./CustomerComparisonModal";
import { findPotentialMatches, SimilarityGroup, Customer } from "../utils/similarity";
import { parseApiError } from "../utils/error-parser";


interface CustomerProspectTableProps {
    data: CustomerProspect[];
    discountTypes: DiscountType[];
    salesmen: Salesman[];
    isLoading: boolean;
    metadata: CustomerProspectsAPIResponse['metadata'];
    page: number;
    pageSize: number;
    searchQuery: string;
    statusFilter: string;
    salesmanFilter: string;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    onSearchChange: (query: string) => void;
    onStatusChange: (status: string) => void;
    onSalesmanChange: (salesmanId: string) => void;
    onApprove: (id: number) => Promise<void>;
    onReject: (id: number) => Promise<void>;
    onUpdate: (id: number, data: Partial<CustomerProspect>) => Promise<void>;
    storeTypes: StoreType[];
    paymentTerms: PaymentTerm[];
    classifications: CustomerClassification[];
}

export function CustomerProspectTable({
    data, discountTypes, salesmen, storeTypes, paymentTerms, classifications, isLoading, metadata, page, pageSize,
    searchQuery: parentSearchQuery, statusFilter, salesmanFilter,
    onPageChange, onSearchChange, onStatusChange, onSalesmanChange, 
    onApprove, onReject, onUpdate,
}: CustomerProspectTableProps) {
    const [localSearchQuery, setLocalSearchQuery] = useState(parentSearchQuery);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [selectedProspect, setSelectedProspect] = useState<CustomerProspect | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isZoomOpen, setIsZoomOpen] = useState(false);

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<CustomerProspect>>({});
    const [isUpdating, setIsUpdating] = useState(false);

    // Duplicate Detection State
    const [similarGroups, setSimilarGroups] = useState<SimilarityGroup[]>([]);
    const [isComparisonOpen, setIsComparisonOpen] = useState(false);
    const [activeComparisonGroup, setActiveComparisonGroup] = useState<SimilarityGroup | null>(null);

    // PSGC Location States
    const [provincesList, setProvincesList] = useState<{code: string, name: string}[]>([]);
    const [citiesList, setCitiesList] = useState<{code: string, name: string}[]>([]);
    const [barangaysList, setBarangaysList] = useState<{code: string, name: string}[]>([]);
    
    // Loading States
    const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [isLoadingBarangays, setIsLoadingBarangays] = useState(false);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (localSearchQuery !== parentSearchQuery) {
                onSearchChange(localSearchQuery);
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [localSearchQuery, onSearchChange, parentSearchQuery]);

    const handleAction = async (id: number, action: 'Approve' | 'Reject') => {
        setProcessingId(id);
        try {
            if (action === 'Approve') {
                await onApprove(id);
                toast.success("Prospect Approved", { description: "The prospect has been promoted to a Customer." });
            } else {
                await onReject(id);
                toast.error("Prospect Rejected", { description: "The prospect request has been denied." });
            }
        } catch (err) {
            const errorMessage = parseApiError(err);
            toast.error("Operation Failed", { description: errorMessage });
        } finally {
            setProcessingId(null);
            setIsModalOpen(false);
        }
    };

    const handleView = async (prospect: CustomerProspect) => {
        setSelectedProspect(prospect);
        setIsEditing(false);
        setEditForm({});
        setIsModalOpen(true);
        
        // Trigger duplicate scan when viewing
        checkForDuplicates(prospect);
    };

    const checkForDuplicates = async (prospect: CustomerProspect) => {
        setSimilarGroups([]);
        try {
            // Fetch all customers to scan against
            const res = await fetch("/api/crm/customer/scan?limit=1000");
            if (!res.ok) throw new Error("Failed to fetch customer scan data");
            
            const { customers } = await res.json();
            
            // source needs to be cast to Partial<Customer> for findPotentialMatches
            const matches = findPotentialMatches(prospect, customers);
            setSimilarGroups(matches);
        } catch (err) {
            console.error("Duplicate check failed:", err);
            // We don't block the UI if duplicate check fails
        } finally {
            // Duplicate check complete
        }
    };

    const handleStartEdit = () => {
        if (!selectedProspect) return;
        setIsEditing(true);
        setEditForm({
            customer_name: selectedProspect.customer_name,
            store_name: selectedProspect.store_name,
            store_type: selectedProspect.store_type,
            brgy: selectedProspect.brgy,
            city: selectedProspect.city,
            province: selectedProspect.province,
            customer_tin: selectedProspect.customer_tin,
            classification: selectedProspect.classification,
        });
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditForm({});
    };

    // --- PSGC FETCHING LOGIC ---
    useEffect(() => {
        if (!isEditing || !isModalOpen) return;
        const fetchProvinces = async () => {
            if (provincesList.length > 0) return;
            setIsLoadingProvinces(true);
            try {
                const res = await fetch("https://psgc.gitlab.io/api/provinces/");
                if (!res.ok) throw new Error("Failed to fetch provinces");
                const data = await res.json();
                setProvincesList(data.map((p: { code: string; name: string }) => ({ code: p.code, name: p.name })));
            } catch (err) {
                console.error("PSGC Error:", err);
            } finally {
                setIsLoadingProvinces(false);
            }
        };
        fetchProvinces();
    }, [isEditing, isModalOpen, provincesList.length]);

    // Utility for fuzzy matching geographic names
    const fuzzyMatch = (stored: string, apiName: string) => {
        if (!stored || !apiName) return false;
        
        const normalize = (s: string) => s.toLowerCase().trim()
            .replace(/\s+/g, ' ')      // Normalize spaces
            .replace(/-/g, ' ')        // Treat hyphens as spaces
            .replace(/^city of\s+/i, '') // Remove "City of " prefix for comparison
            .trim();

        const sNormalized = normalize(stored);
        const aNormalized = normalize(apiName);
        
        return sNormalized === aNormalized || sNormalized.includes(aNormalized) || aNormalized.includes(sNormalized);
    };

    useEffect(() => {
        if (!isEditing || !editForm.province || provincesList.length === 0) {
            setCitiesList([]);
            return;
        }

        // Fuzzy match for the province
        const provObj = provincesList.find(p => fuzzyMatch(editForm.province || "", p.name));
        if (!provObj) return;

        // Standardize the casing in editForm so SearchableSelect highlights the correct option
        if (provObj.name !== editForm.province) {
            setEditForm(prev => ({ ...prev, province: provObj.name }));
        }

        const fetchCities = async () => {
            setIsLoadingCities(true);
            try {
                const res = await fetch(`https://psgc.gitlab.io/api/provinces/${provObj.code}/cities-municipalities/`);
                if (!res.ok) throw new Error("Failed to fetch cities");
                const data = await res.json();
                setCitiesList(data.map((c: { code: string; name: string }) => ({ code: c.code, name: c.name })));
            } catch (err) {
                console.error("PSGC Error:", err);
            } finally {
                setIsLoadingCities(false);
            }
        };
        fetchCities();
    }, [isEditing, editForm.province, provincesList]);

    useEffect(() => {
        if (!isEditing || !editForm.city || citiesList.length === 0) {
            setBarangaysList([]);
            return;
        }

        // Fuzzy match for the city
        const cityObj = citiesList.find(c => fuzzyMatch(editForm.city || "", c.name));
        if (!cityObj) return;

        // Standardize the casing in editForm
        if (cityObj.name !== editForm.city) {
            setEditForm(prev => ({ ...prev, city: cityObj.name }));
        }

        const fetchBarangays = async () => {
            setIsLoadingBarangays(true);
            try {
                const res = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${cityObj.code}/barangays/`);
                if (!res.ok) throw new Error("Failed to fetch barangays");
                const data = await res.json();
                setBarangaysList(data.map((b: { code: string; name: string }) => ({ code: b.code, name: b.name })));
            } catch (err) {
                console.error("PSGC Error:", err);
            } finally {
                setIsLoadingBarangays(false);
            }
        };
        fetchBarangays();
    }, [isEditing, editForm.city, citiesList]);

    useEffect(() => {
        if (!isEditing || !editForm.brgy || barangaysList.length === 0) return;

        // Fuzzy match for the barangay object to standardize casing
        const brgyObj = barangaysList.find(b => fuzzyMatch(editForm.brgy || "", b.name));
        if (brgyObj && brgyObj.name !== editForm.brgy) {
            setEditForm(prev => ({ ...prev, brgy: brgyObj.name }));
        }
    }, [isEditing, editForm.brgy, barangaysList]);
    // ----------------------------

    const handleSaveChanges = async () => {
        if (!selectedProspect) return;
        setIsUpdating(true);
        try {
            await onUpdate(selectedProspect.id, editForm);
            
            // Update selected prospect locally to reflect changes in modal
            setSelectedProspect({
                ...selectedProspect,
                ...editForm,
                // Ensure number types are correctly handled if they came from strings in select
                store_type: editForm.store_type ? Number(editForm.store_type) : selectedProspect.store_type,
                classification: editForm.classification ? Number(editForm.classification) : selectedProspect.classification,
            });

            toast.success("Prospect updated", { description: "Information has been successfully updated." });
            setIsEditing(false);
        } catch (err) {
            toast.error("Update failed", { description: parseApiError(err) });
        } finally {
            setIsUpdating(false);
        }
    };

    // (Map is now managed entirely by <ProspectMapViewer>)

    const totalPages = Math.ceil(metadata.total_count / pageSize) || 1;

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search prospects..."
                        value={localSearchQuery}
                        onChange={(e) => setLocalSearchQuery(e.target.value)}
                        className="pl-9 h-10 rounded-xl bg-background shadow-sm border-border/60"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <div className="w-full sm:w-[160px]">
                        <SearchableSelect
                            options={[
                                { value: "all", label: "All Status" },
                                { value: "Pending", label: "Pending" },
                                { value: "Approved", label: "Approved" },
                                { value: "Rejected", label: "Rejected" },
                            ]}
                            value={statusFilter}
                            onValueChange={onStatusChange}
                            placeholder="Status"
                            icon={<Filter className="h-4 w-4 text-muted-foreground" />}
                            className="h-10 rounded-xl shadow-sm border-border/60 bg-background"
                        />
                    </div>

                    <div className="w-full sm:w-[220px]">
                        <SearchableSelect
                            options={[
                                { value: "all", label: "All Salesmen" },
                                ...salesmen.map((s) => ({ 
                                    value: s.id.toString(), 
                                    label: `${s.salesman_name} ${s.salesman_code ? `(${s.salesman_code})` : ""}` 
                                }))
                            ]}
                            value={salesmanFilter}
                            onValueChange={onSalesmanChange}
                            placeholder="All Salesmen"
                            icon={<User className="h-4 w-4 text-muted-foreground" />}
                            className="h-10 rounded-xl shadow-sm border-border/60 bg-background"
                        />
                    </div>
                </div>
            </div>

            <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/30 border-b">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[250px] text-xs font-bold uppercase tracking-wider">Prospect Details</TableHead>
                            <TableHead className="w-[200px] text-xs font-bold uppercase tracking-wider">Store Info</TableHead>
                            <TableHead className="w-[180px] text-xs font-bold uppercase tracking-wider">Location</TableHead>
                            <TableHead className="w-[150px] text-xs font-bold uppercase tracking-wider">Salesman</TableHead>
                            <TableHead className="w-[120px] text-xs font-bold uppercase tracking-wider text-center">Status</TableHead>
                            <TableHead className="w-[140px] text-right text-xs font-bold uppercase tracking-wider">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: pageSize }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-12 w-full rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-12 w-full rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-12 w-full rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-12 w-full rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-20 rounded-full mx-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-24 rounded-md ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    No prospects found for this filter.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((prospect) => (
                                <TableRow key={prospect.id} className="group transition-colors">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-foreground flex items-center gap-1.5">
                                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                {prospect.customer_name}
                                            </span>
                                            <span className="text-xs text-muted-foreground ml-5">
                                                {prospect.customer_code || "No Code Assigned"}
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-1 ml-5 text-[10px] text-muted-foreground uppercase tracking-tight">
                                                <Calendar className="h-3 w-3" />
                                                {prospect.prospect_date ? new Date(prospect.prospect_date).toLocaleDateString() : "No Date"}
                                                <Badge variant="secondary" className="px-1 py-0 h-3 text-[9px] font-bold">
                                                    {prospect.type}
                                                </Badge>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium flex items-center gap-1.5">
                                                <Store className="h-3.5 w-3.5 text-muted-foreground" />
                                                {prospect.store_name}
                                            </span>
                                            <span className="text-xs text-muted-foreground ml-5 italic leading-none">
                                                {prospect.store_signage}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col max-w-[170px]">
                                            <span className="text-xs text-foreground flex items-start gap-1.5 line-clamp-1">
                                                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                                {prospect.brgy}, {prospect.city}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground ml-5">
                                                {prospect.province}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                                {prospect.salesman_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-foreground line-clamp-1">
                                                    {prospect.salesman_name}
                                                </span>
                                                {prospect.salesman_code && (
                                                    <span className="text-[10px] text-muted-foreground font-mono leading-none">
                                                        {prospect.salesman_code}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <StatusBadge status={prospect.prospect_status} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {prospect.prospect_status === 'Pending' ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleView(prospect)}
                                                    className="h-8 rounded-lg font-bold text-[10px] uppercase shadow-sm border border-border/50"
                                                >
                                                    View / Process
                                                </Button>
                                            </div>
                                        ) : (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem className="text-xs" onClick={() => handleView(prospect)}>View Details</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between px-2 py-4">
                <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} ({metadata.total_count} records)
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1 || isLoading}
                        className="rounded-lg h-9"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(page + 1)}
                        disabled={page === totalPages || isLoading}
                        className="rounded-lg h-9"
                    >
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Review Prospect</DialogTitle>
                        <DialogDescription>
                            Review the customer information before making a decision.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedProspect && (
                        <ScrollArea className="max-h-[70vh] pr-4 py-4">
                            <div className="space-y-6">
                                {/* Duplicate Warning */}
                                <SimilarCustomerWarning 
                                    similarGroups={similarGroups} 
                                    onCompare={(group) => {
                                        setActiveComparisonGroup(group);
                                        setIsComparisonOpen(true);
                                    }}
                                />

                                {/* Character Profile / Image */}
                                 {selectedProspect.customer_image && (
                                    <div className="flex justify-center mb-8 pt-2">
                                        <div 
                                            className="relative group cursor-zoom-in"
                                            onClick={() => setIsZoomOpen(true)}
                                            title="Click to zoom"
                                        >
                                            <div className="absolute -inset-2 bg-gradient-to-tr from-primary/30 to-emerald-500/20 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
                                            <div className="relative h-44 w-44 rounded-3xl border-4 border-background overflow-hidden shadow-2xl bg-muted flex items-center justify-center">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${selectedProspect.customer_image}`}
                                                    alt={selectedProspect.customer_name || "Prospect"}
                                                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(selectedProspect.customer_name || "Prospect") + '&background=random&size=200';
                                                    }}
                                                />
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent p-2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-widest">Click to Zoom</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* General Information */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
                                        <Info className="h-3.5 w-3.5 text-primary" />
                                        <h4 className="text-[10px] font-bold uppercase text-primary tracking-wider">
                                            General Information
                                        </h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex flex-col col-span-2">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Customer Name</Label>
                                            {isEditing ? (
                                                <Input 
                                                    value={editForm.customer_name || ""} 
                                                    onChange={(e) => setEditForm({...editForm, customer_name: e.target.value})}
                                                    className="h-8 text-sm"
                                                />
                                            ) : (
                                                <span className="font-semibold">{selectedProspect.customer_name || "None"}</span>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Customer Code</span>
                                            <span className="font-medium text-primary">{selectedProspect.customer_code || "AUTO-ASSIGN"}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Prospect Type</span>
                                            <Badge variant="outline" className="w-fit h-5 text-[10px] font-bold">
                                                {selectedProspect.type || "None"}
                                            </Badge>
                                        </div>
                                        {!isEditing && (
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Prospect Date</span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                                    {selectedProspect.prospect_date ? new Date(selectedProspect.prospect_date).toLocaleDateString() : "None"}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex flex-col col-span-2 pt-2 border-t mt-1 border-dashed">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Current Status</span>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <StatusBadge status={selectedProspect.prospect_status} />
                                                {selectedProspect.prospect_status !== 'Pending' && selectedProspect.updated_by_name && (
                                                    <span className="text-xs text-muted-foreground">
                                                        (Processed by: <span className="font-medium text-foreground">{selectedProspect.updated_by_name}</span>)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Geo Tag Location Map */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-success-bg rounded-lg border border-success/20">
                                        <MapIcon className="h-3.5 w-3.5 text-success" />
                                        <h4 className="text-[10px] font-bold uppercase text-success tracking-wider">
                                            Geo Tag Location
                                        </h4>
                                    </div>
                                    <div className="rounded-xl overflow-hidden border border-success/20 shadow-sm">
                                        <ProspectMapViewer
                                            location={selectedProspect.location}
                                            storeName={selectedProspect.store_name}
                                            customerName={selectedProspect.customer_name}
                                            address={[selectedProspect.brgy, selectedProspect.city, selectedProspect.province].filter(Boolean).join(', ')}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic flex items-center gap-1 px-1">
                                        <Info className="h-2.5 w-2.5" />
                                        {selectedProspect.location
                                            ? "Precise location captured at time of registration."
                                            : "Location was not captured during registration."}
                                    </p>
                                </section>

                                <Separator className="opacity-50" />

                                {/* Contact Information */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-info-bg rounded-lg border border-info/20">
                                        <Phone className="h-3.5 w-3.5 text-info" />
                                        <h4 className="text-[10px] font-bold uppercase text-info tracking-wider">
                                            Contact Details
                                        </h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Contact Number</span>
                                            <span className="text-info font-medium">{selectedProspect.contact_number || "None"}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Email Address</span>
                                            <span className="text-info font-medium truncate">{selectedProspect.customer_email || "None"}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Telephone</span>
                                            <span>{selectedProspect.tel_number || "None"}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Salesman</span>
                                            <span className="flex items-center gap-1 font-medium">
                                                <Briefcase className="h-3 w-3 text-muted-foreground" />
                                                {selectedProspect.salesman_name || "None"}
                                            </span>
                                        </div>
                                    </div>
                                </section>

                                <Separator className="opacity-50" />

                                {/* Store & Location */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-warning-bg rounded-lg border border-warning/20">
                                        <Building className="h-3.5 w-3.5 text-warning" />
                                        <h4 className="text-[10px] font-bold uppercase text-warning tracking-wider">
                                            Store & Location
                                        </h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex flex-col col-span-2 p-2 bg-muted/40 rounded-lg">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Store Name</Label>
                                            {isEditing ? (
                                                <Input 
                                                    value={editForm.store_name || ""} 
                                                    onChange={(e) => setEditForm({...editForm, store_name: e.target.value})}
                                                    className="h-8 text-sm"
                                                />
                                            ) : (
                                                <>
                                                    <span className="font-semibold text-base">{selectedProspect.store_name || "None"}</span>
                                                    <span className="text-xs text-muted-foreground italic">{selectedProspect.store_signage || "No signage"}</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex flex-col col-span-2">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Full Address (Province, City, Brgy)</Label>
                                            {isEditing ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[8px] font-bold uppercase text-muted-foreground">Province</span>
                                                        <SearchableSelect 
                                                            options={[
                                                                // Always include the stored DB value so it shows up even if not in PSGC
                                                                ...(editForm.province && !provincesList.some(p => p.name === editForm.province)
                                                                    ? [{ value: editForm.province, label: editForm.province }]
                                                                    : []),
                                                                ...provincesList.map(p => ({ value: p.name, label: p.name }))
                                                            ]}
                                                            value={editForm.province || ""}
                                                            onValueChange={(val) => {
                                                                setEditForm({ ...editForm, province: val, city: "", brgy: "" });
                                                            }}
                                                            placeholder={isLoadingProvinces ? "Loading..." : "Select Province"}
                                                            className="h-9"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[8px] font-bold uppercase text-muted-foreground">City/Municipality</span>
                                                        <SearchableSelect 
                                                            options={[
                                                                // Always include the stored DB value so it shows up even if not in PSGC
                                                                ...(editForm.city && !citiesList.some(c => c.name === editForm.city)
                                                                    ? [{ value: editForm.city, label: editForm.city }]
                                                                    : []),
                                                                ...citiesList.map(c => ({ value: c.name, label: c.name }))
                                                            ]}
                                                            value={editForm.city || ""}
                                                            onValueChange={(val) => {
                                                                setEditForm({ ...editForm, city: val, brgy: "" });
                                                            }}
                                                            placeholder={isLoadingCities ? "Loading..." : (!editForm.province ? "Select Province first" : "Select City")}
                                                            className="h-9"
                                                            disabled={!editForm.province || isLoadingCities}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[8px] font-bold uppercase text-muted-foreground">Barangay</span>
                                                        <SearchableSelect 
                                                            options={[
                                                                // Always include the stored DB value so it shows up even if not in PSGC
                                                                ...(editForm.brgy && !barangaysList.some(b => b.name === editForm.brgy)
                                                                    ? [{ value: editForm.brgy, label: editForm.brgy }]
                                                                    : []),
                                                                ...barangaysList.map(b => ({ value: b.name, label: b.name }))
                                                            ]}
                                                            value={editForm.brgy || ""}
                                                            onValueChange={(val) => {
                                                                setEditForm({ ...editForm, brgy: val });
                                                            }}
                                                            placeholder={isLoadingBarangays ? "Loading..." : (!editForm.city ? "Select City first" : "Select Brgy")}
                                                            className="h-9"
                                                            disabled={!editForm.city || isLoadingBarangays}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs leading-tight">
                                                    {selectedProspect.province || "N/A"}, {selectedProspect.city || "N/A"}, {selectedProspect.brgy || "N/A"}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Store Type</Label>
                                            {isEditing ? (
                                                <SearchableSelect 
                                                    options={storeTypes.map(st => ({ value: st.id.toString(), label: st.store_type }))}
                                                    value={editForm.store_type?.toString()}
                                                    onValueChange={(v) => setEditForm({...editForm, store_type: Number(v)})}
                                                    placeholder="Select type"
                                                    className="h-8"
                                                />
                                            ) : (
                                                <span className="font-medium">
                                                    {storeTypes.find(st => st.id === Number(selectedProspect.store_type))?.store_type || "None"}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Classification</Label>
                                            {isEditing ? (
                                                <SearchableSelect 
                                                    options={classifications.map(cl => ({ value: cl.id.toString(), label: cl.classification_name }))}
                                                    value={editForm.classification?.toString()}
                                                    onValueChange={(v) => setEditForm({...editForm, classification: Number(v)})}
                                                    placeholder="Select classification"
                                                    className="h-8"
                                                />
                                            ) : (
                                                <span className="font-medium">
                                                    {classifications.find(c => c.id === Number(selectedProspect.classification))?.classification_name || "None"}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                <Separator className="opacity-50" />

                                {/* Financial & Tax Info */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
                                        <Landmark className="h-3.5 w-3.5 text-primary" />
                                        <h4 className="text-[10px] font-bold uppercase text-primary tracking-wider">
                                            Financials & Taxation
                                        </h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex flex-col">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase mb-1">TIN</Label>
                                            {isEditing ? (
                                                <Input 
                                                    value={editForm.customer_tin || ""} 
                                                    onChange={(e) => setEditForm({...editForm, customer_tin: e.target.value})}
                                                    className="h-8 text-sm font-mono"
                                                />
                                            ) : (
                                                <span className="font-mono font-medium">{selectedProspect.customer_tin || "None"}</span>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Tax Status</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                {selectedProspect.isVAT === 1 && <Badge className="bg-success-bg text-success hover:bg-success-bg border-success/20 text-[9px] h-4 font-bold uppercase">VAT</Badge>}
                                                {selectedProspect.isEWT === 1 && <Badge className="bg-warning-bg text-warning hover:bg-warning-bg border-warning/20 text-[9px] h-4 font-bold uppercase">EWT</Badge>}
                                                {!selectedProspect.isVAT && !selectedProspect.isEWT && <span className="text-xs text-muted-foreground italic">Non-Vatable</span>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Payment Term</span>
                                            <span className="font-medium">
                                                {paymentTerms.find(pt => pt.id === Number(selectedProspect.payment_term))?.payment_name 
                                                    || (selectedProspect.payment_term ? `Term ID: ${selectedProspect.payment_term}` : "None")}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Bank Details</span>
                                            <span className="text-xs text-muted-foreground line-clamp-1 truncate" title={selectedProspect.bank_details || ""}>
                                                {selectedProspect.bank_details || "None"}
                                            </span>
                                        </div>
                                    </div>
                                </section>

                                <Separator className="opacity-50" />

                                {/* Settings */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg border border-border/50">
                                        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                                        <h4 className="text-[10px] font-bold uppercase text-foreground tracking-wider">
                                            Operational Settings
                                        </h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Price Type</span>
                                            <span>{selectedProspect.price_type || "None"}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Discount Type</span>
                                            <span className="font-medium text-success">
                                                {discountTypes.find(dt => dt.id === Number(selectedProspect.discount_type))?.discount_type 
                                                    || (selectedProspect.discount_type ? `ID: ${selectedProspect.discount_type}` : "None")}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px) font-bold text-muted-foreground uppercase">Credit Type</span>
                                            <span>{selectedProspect.credit_type || "None"}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Store Type</span>
                                            <span className="font-medium text-success">
                                                {storeTypes.find(st => st.id === Number(selectedProspect.store_type))?.store_type 
                                                    || (selectedProspect.store_type ? `ID: ${selectedProspect.store_type}` : "None")}
                                            </span>
                                        </div>
                                    </div>
                                </section>

                                {selectedProspect.otherDetails && (
                                    <section className="space-y-2 p-3 bg-warning-bg rounded-lg border border-warning/20">
                                        <h4 className="text-[10px] font-bold uppercase text-warning flex items-center gap-1.5">
                                            <FileText className="h-3 w-3" />
                                            Notes / Other Details
                                        </h4>
                                        <p className="text-xs text-foreground/80 leading-relaxed italic">
                                            &quot;{selectedProspect.otherDetails}&quot;
                                        </p>
                                    </section>
                                )}
                            </div>
                        </ScrollArea>
                    )}
                    <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-slate-100">
                        {isEditing ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                    disabled={isUpdating}
                                    className="w-full sm:flex-1 h-10 font-bold uppercase text-[10px] tracking-widest border-slate-200 hover:bg-slate-50"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSaveChanges}
                                    disabled={isUpdating}
                                    className="w-full sm:flex-1 h-10 bg-primary text-primary-foreground font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20"
                                >
                                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                    Save Changes
                                </Button>
                            </>
                        ) : selectedProspect?.prospect_status === 'Pending' ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleStartEdit}
                                    className="w-full sm:w-auto h-10 border-info/20 bg-info-bg text-info hover:bg-info/20 font-bold uppercase text-[10px] tracking-widest"
                                >
                                    <Edit2 className="h-3.5 w-3.5 mr-2" />
                                    Edit
                                </Button>
                                {selectedProspect.prospect_status === 'Pending' && (
                                    <>
                                        <Button
                                            variant="outline"
                                            onClick={() => selectedProspect && handleAction(selectedProspect.id, 'Reject')}
                                            disabled={processingId !== null}
                                            className="w-full sm:w-auto h-10 border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold uppercase text-[10px] tracking-widest"
                                        >
                                            {processingId === selectedProspect?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
                                            Reject
                                        </Button>
                                        <Button
                                            onClick={() => selectedProspect && handleAction(selectedProspect.id, 'Approve')}
                                            disabled={processingId !== null}
                                            className="w-full sm:flex-1 h-10 bg-success hover:bg-success/90 text-success-foreground font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-success/20"
                                        >
                                            {processingId === selectedProspect?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                            Approve
                                        </Button>
                                    </>
                                )}
                            </>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                                className="w-full sm:w-auto h-10 font-bold uppercase text-[10px] tracking-widest"
                            >
                                Close Review
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Comparison Modal */}
            {selectedProspect && activeComparisonGroup && (
                <CustomerComparisonModal
                    isOpen={isComparisonOpen}
                    onClose={() => setIsComparisonOpen(false)}
                    prospect={selectedProspect}
                    existingCustomer={activeComparisonGroup.customers[1] as Customer}
                    reasons={activeComparisonGroup.reasons}
                />
            )}

            {/* Zoom Dialog */}
            <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
                <DialogContent showCloseButton={false} className="max-w-3xl p-0 overflow-hidden border-none bg-transparent shadow-none">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Customer Image Zoom</DialogTitle>
                        <DialogDescription>Full scale view of the customer profile image.</DialogDescription>
                    </DialogHeader>
                    <div className="relative w-full h-[80vh] flex items-center justify-center p-4">
                        {selectedProspect?.customer_image && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${selectedProspect.customer_image}`}
                                alt={selectedProspect.customer_name || "Zoomed Image"}
                                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-300"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(selectedProspect.customer_name || "Prospect") + '&background=random&size=600';
                                }}
                            />
                        )}
                        <Button 
                            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white border-none"
                            onClick={() => setIsZoomOpen(false)}
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
