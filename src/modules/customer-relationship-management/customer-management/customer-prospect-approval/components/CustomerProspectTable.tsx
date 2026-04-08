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
import {
    Search, Filter, Check, X, Loader2, ChevronLeft, ChevronRight, MoreHorizontal, User, Store, MapPin, Calendar,
    Phone, Building, Info, Briefcase, Landmark, ShieldCheck, FileText
} from "lucide-react";
import { CustomerProspect, CustomerProspectsAPIResponse, DiscountType, Salesman, StoreType, PaymentTerm } from "../types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

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
    storeTypes: StoreType[];
    paymentTerms: PaymentTerm[];
}

export function CustomerProspectTable({
    data, discountTypes, salesmen, storeTypes, paymentTerms, isLoading, metadata, page, pageSize,
    searchQuery: parentSearchQuery, statusFilter, salesmanFilter,
    onPageChange, onPageSizeChange: _onPageSizeChange, onSearchChange, onStatusChange, onSalesmanChange, // eslint-disable-line @typescript-eslint/no-unused-vars
    onApprove, onReject,
}: CustomerProspectTableProps) {
    const [localSearchQuery, setLocalSearchQuery] = useState(parentSearchQuery);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [selectedProspect, setSelectedProspect] = useState<CustomerProspect | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isZoomOpen, setIsZoomOpen] = useState(false);

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
            const errorMessage = err instanceof Error ? err.message : "Something went wrong. Please try again.";
            toast.error("Operation Failed", { description: errorMessage });
        } finally {
            setProcessingId(null);
            setIsModalOpen(false);
        }
    };

    const handleView = (prospect: CustomerProspect) => {
        setSelectedProspect(prospect);
        setIsModalOpen(true);
    };

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
                    <Select value={statusFilter} onValueChange={onStatusChange}>
                        <SelectTrigger className="h-10 rounded-xl shadow-sm border-border/60 w-[150px] bg-background">
                            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-primary/10">
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={salesmanFilter} onValueChange={onSalesmanChange}>
                        <SelectTrigger className="h-10 rounded-xl shadow-sm border-border/60 w-[180px] bg-background">
                            <User className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="All Salesmen" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-primary/10">
                            <SelectItem value="all">All Salesmen</SelectItem>
                            {salesmen.map((s) => (
                                <SelectItem key={s.id} value={s.id.toString()}>
                                    {s.salesman_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                                {prospect.salesman_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <span className="text-sm">{prospect.salesman_name}</span>
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
                                                    <DropdownMenuItem className="text-xs">View Details</DropdownMenuItem>
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
                                {/* Character Profile / Image */}
                                {selectedProspect.customer_image && (
                                    <div className="flex justify-center mb-6">
                                        <div 
                                            className="relative group cursor-zoom-in"
                                            onClick={() => setIsZoomOpen(true)}
                                            title="Click to zoom"
                                        >
                                            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-emerald-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                                            <div className="relative h-40 w-40 rounded-2xl border-4 border-background overflow-hidden shadow-2xl bg-muted flex items-center justify-center">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${selectedProspect.customer_image}`}
                                                    alt={selectedProspect.customer_name || "Prospect"}
                                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(selectedProspect.customer_name || "Prospect") + '&background=random&size=160';
                                                    }}
                                                />
                                            </div>
                                            <div className="absolute bottom-2 right-2 bg-black/60 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Search className="h-3 w-3" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* General Information */}
                                <section className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-primary flex items-center gap-1.5 underline underline-offset-4">
                                        <Info className="h-3.5 w-3.5" />
                                        General Information
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Customer Name</span>
                                            <span className="font-semibold">{selectedProspect.customer_name || "None"}</span>
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
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Prospect Date</span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                                {selectedProspect.prospect_date ? new Date(selectedProspect.prospect_date).toLocaleDateString() : "None"}
                                            </span>
                                        </div>
                                    </div>
                                </section>

                                <Separator className="opacity-50" />

                                {/* Contact Information */}
                                <section className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-primary flex items-center gap-1.5 underline underline-offset-4">
                                        <Phone className="h-3.5 w-3.5" />
                                        Contact Details
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Contact Number</span>
                                            <span className="text-blue-600 font-medium">{selectedProspect.contact_number || "None"}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Email Address</span>
                                            <span className="text-blue-600 font-medium truncate">{selectedProspect.customer_email || "None"}</span>
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
                                <section className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-primary flex items-center gap-1.5 underline underline-offset-4">
                                        <Building className="h-3.5 w-3.5" />
                                        Store & Location
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex flex-col col-span-2 p-2 bg-muted/40 rounded-lg">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Store Info</span>
                                            <span className="font-semibold text-base">{selectedProspect.store_name || "None"}</span>
                                            <span className="text-xs text-muted-foreground italic">{selectedProspect.store_signage || "No signage"}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Full Address</span>
                                            <span className="text-xs leading-tight">
                                                {selectedProspect.brgy || "N/A"}, {selectedProspect.city || "N/A"}, {selectedProspect.province || "N/A"}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Classification</span>
                                            <span className="font-medium">{selectedProspect.classification || "None"}</span>
                                        </div>
                                    </div>
                                </section>

                                <Separator className="opacity-50" />

                                {/* Financial & Tax Info */}
                                <section className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-primary flex items-center gap-1.5 underline underline-offset-4">
                                        <Landmark className="h-3.5 w-3.5" />
                                        Financials & Taxation
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">TIN</span>
                                            <span className="font-mono font-medium">{selectedProspect.customer_tin || "None"}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Tax Status</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                {selectedProspect.isVAT === 1 && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 text-[9px] h-4">VAT</Badge>}
                                                {selectedProspect.isEWT === 1 && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 text-[9px] h-4">EWT</Badge>}
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
                                <section className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-primary flex items-center gap-1.5 underline underline-offset-4">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        Operational Settings
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Price Type</span>
                                            <span>{selectedProspect.price_type || "None"}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Discount Type</span>
                                            <span className="font-medium text-emerald-600">
                                                {discountTypes.find(dt => dt.id === Number(selectedProspect.discount_type))?.discount_type 
                                                    || (selectedProspect.discount_type ? `ID: ${selectedProspect.discount_type}` : "None")}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Credit Type</span>
                                            <span>{selectedProspect.credit_type || "None"}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Store Type</span>
                                            <span className="font-medium text-emerald-600">
                                                {storeTypes.find(st => st.id === Number(selectedProspect.store_type))?.store_type 
                                                    || (selectedProspect.store_type ? `ID: ${selectedProspect.store_type}` : "None")}
                                            </span>
                                        </div>
                                    </div>
                                </section>

                                {selectedProspect.otherDetails && (
                                    <section className="space-y-2 p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                                        <h4 className="text-[10px] font-bold uppercase text-amber-700 flex items-center gap-1.5">
                                            <FileText className="h-3 w-3" />
                                            Notes / Other Details
                                        </h4>
                                        <p className="text-xs text-amber-900 leading-relaxed italic">
                                            &quot;{selectedProspect.otherDetails}&quot;
                                        </p>
                                    </section>
                                )}
                            </div>
                        </ScrollArea>
                    )}
                    <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => selectedProspect && handleAction(selectedProspect.id, 'Reject')}
                            disabled={processingId !== null}
                            className="w-full sm:w-auto border-rose-200 text-rose-600 hover:bg-rose-50"
                        >
                            {processingId === selectedProspect?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
                            Reject Prospect
                        </Button>
                        <Button
                            onClick={() => selectedProspect && handleAction(selectedProspect.id, 'Approve')}
                            disabled={processingId !== null}
                            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {processingId === selectedProspect?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                            Approve & Create Customer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
