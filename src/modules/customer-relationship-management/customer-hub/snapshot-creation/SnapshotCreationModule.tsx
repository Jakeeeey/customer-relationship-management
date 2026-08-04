"use client";

import React, { useRef, useState } from "react";
import { useSnapshotCreation } from "./hooks/useSnapshotCreation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Camera, UploadCloud, File, X, CheckCircle2, ArrowLeft, ChevronsUpDown, Check, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { SnapshotList } from "./SnapshotList";

export default function SnapshotCreationModule() {
    const {
        isInitializing,
        isSalesman,

        customers,
        selectedCustomerId,
        setSelectedCustomerId,
        customerSearch,
        setCustomerSearch,

        salesmen,
        selectedSalesmanId,
        setSelectedSalesmanId,

        suppliers,
        selectedSupplierId,
        setSelectedSupplierId,
        loadingSuppliers,

        poNo,
        handlePoNoChange,

        uploads,
        handleFilesChange,
        removeFile,

        submitting,
        handleSubmit,

        snapshots,
        loadingSnapshots,
    } = useSnapshotCreation();

    const [view, setView] = useState<"list" | "create">("list");
    const [openCustomer, setOpenCustomer] = useState(false);
    const [openSalesman, setOpenSalesman] = useState(false);
    const [openSupplier, setOpenSupplier] = useState(false);
    const [previewFile, setPreviewFile] = useState<{ id: string, name: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFilesChange(e.dataTransfer.files);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFilesChange(e.target.files);
        }
    };


    if (isInitializing) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isSalesman) {
        return (
            <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4 text-center">
                <div className="rounded-full bg-red-100 p-6 text-red-600">
                    <X className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Access Denied</h2>
                <p className="max-w-[400px] text-sm text-muted-foreground">
                    You do not have an active Salesman account associated with your user profile. 
                    This module is restricted to registered salesmen only.
                </p>
                <Button variant="outline" onClick={() => window.history.back()} className="mt-4">
                    Go Back
                </Button>
            </div>
        );
    }

    if (view === "list") {
        return (
            <SnapshotList 
                snapshots={snapshots} 
                loadingSnapshots={loadingSnapshots} 
                onAddSnapshot={() => setView("create")} 
            />
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-8 animate-in slide-in-from-bottom duration-700 pb-12">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setView("list")} className="rounded-full mr-2">
                    <ArrowLeft className="w-5 h-5 text-slate-500" />
                </Button>
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <Camera className="h-7 w-7" />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">
                        Snapshot Creation
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium">
                        Quickly create a sales order by uploading a snapshot or document.
                    </p>
                </div>
            </div>

            <Card className="shadow-xl shadow-slate-200/50 border-slate-200/60 bg-white/60 backdrop-blur-xl">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-6">
                    <CardTitle className="text-lg font-bold text-slate-800">Order Details</CardTitle>
                    <CardDescription>Select the salesman and customer before attaching the document.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 md:p-8 space-y-8">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Customer Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer</label>
                            <Popover open={openCustomer} onOpenChange={(open) => { setOpenCustomer(open); if (!open) setCustomerSearch(""); }}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between font-normal h-12 text-sm bg-slate-50/50 border-slate-200">
                                        <span className="truncate">
                                            {selectedCustomerId && customers.find(c => c.customer_code === selectedCustomerId)
                                                ? customers.find(c => c.customer_code === selectedCustomerId)?.customer_name
                                                : "Select Customer..."}
                                        </span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[350px] p-0" align="start">
                                    <Command shouldFilter={false}>
                                        <CommandInput
                                            placeholder="Search customer..."
                                            value={customerSearch}
                                            onValueChange={setCustomerSearch}
                                        />
                                        <CommandList>
                                            <CommandEmpty>No customer found.</CommandEmpty>
                                            <CommandGroup>
                                                <div
                                                    className="max-h-[300px] overflow-y-auto custom-scrollbar p-1"
                                                >
                                                            {customers.map(c => (
                                                                <CommandItem key={c.id || c.customer_code} value={`${c.customer_name} ${c.city || ""} ${c.province || ""}`} onSelect={() => { setSelectedCustomerId(c.customer_code?.toString() || ""); setOpenCustomer(false); }}>
                                                                    <Check className={cn("mr-2 h-4 w-4", selectedCustomerId === c.customer_code?.toString() ? "opacity-100" : "opacity-0")} />
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium">{c.customer_name}</span>
                                                                        <span className="text-[10px] text-muted-foreground">
                                                                            {[c.city, c.province].filter(Boolean).join(", ") || c.customer_code}
                                                                        </span>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                            

                                                </div>
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Salesman Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Salesman</label>
                            <Popover open={openSalesman} onOpenChange={setOpenSalesman}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between font-normal h-12 text-sm bg-slate-50/50 border-slate-200">
                                        <span className="truncate">
                                            {selectedSalesmanId && salesmen.find(s => (s.id).toString() === selectedSalesmanId)
                                                ? (() => {
                                                    const s = salesmen.find(s => (s.id).toString() === selectedSalesmanId);
                                                    return s ? s.salesman_name || "Unknown" : "Select Salesman...";
                                                })()
                                                : "Select Salesman..."}
                                        </span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[350px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search salesman..." />
                                        <CommandList>
                                            <CommandEmpty>No salesman found.</CommandEmpty>
                                            <CommandGroup>
                                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                                                    {salesmen.map(s => {
                                                        const id = s.id?.toString() || s.user_id?.toString() || "";
                                                        return (
                                                            <CommandItem key={id} value={`${s.salesman_name || ""} ${s.salesman_code || ""}`} onSelect={() => { setSelectedSalesmanId(id); setOpenSalesman(false); }}>
                                                                <Check className={cn("mr-2 h-4 w-4", selectedSalesmanId === id ? "opacity-100" : "opacity-0")} />
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{s.salesman_name || "Unknown"}</span>
                                                                    <span className="text-[10px] text-muted-foreground">{s.salesman_code || id}</span>
                                                                </div>
                                                            </CommandItem>
                                                        );
                                                    })}
                                                </div>
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Supplier Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Supplier {loadingSuppliers && "..."}</label>
                            <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between font-normal h-12 text-sm bg-slate-50/50 border-slate-200" disabled={loadingSuppliers}>
                                        <span className="truncate">
                                            {selectedSupplierId && suppliers.find(s => (s.id).toString() === selectedSupplierId)
                                                ? (() => {
                                                    const s = suppliers.find(s => (s.id).toString() === selectedSupplierId);
                                                    return s ? s.supplier_name || "Unknown" : "Select Supplier...";
                                                })()
                                                : "Select Supplier (Optional)"}
                                        </span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[350px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search supplier..." />
                                        <CommandList>
                                            <CommandEmpty>No supplier found.</CommandEmpty>
                                            <CommandGroup>
                                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                                                    {suppliers.map(s => {
                                                        const id = s.id?.toString() || "";
                                                        return (
                                                            <CommandItem key={id} value={`${s.supplier_name || ""}`} onSelect={() => { setSelectedSupplierId(id); setOpenSupplier(false); }}>
                                                                <Check className={cn("mr-2 h-4 w-4", selectedSupplierId === id ? "opacity-100" : "opacity-0")} />
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{s.supplier_name || "Unknown"}</span>
                                                                </div>
                                                            </CommandItem>
                                                        );
                                                    })}
                                                </div>
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* PO Number */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">PO Number</label>
                            <Input 
                                value={poNo}
                                onChange={(e) => handlePoNoChange(e.target.value)}
                                disabled={submitting}
                                placeholder="Enter PO Number"
                                className="h-12 bg-slate-50/50 border-slate-200 shadow-sm focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    {/* File Upload Area */}
                    <div className="space-y-2 pt-4">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Document Snapshots</label>
                        
                        <div 
                            className={cn(
                                "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200",
                                isDragging ? "border-primary bg-primary/5 scale-[0.99]" : "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300",
                                (submitting) && "opacity-50 cursor-not-allowed pointer-events-none"
                            )}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={triggerFileInput}
                        >
                            <div className="h-16 w-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 text-slate-400">
                                <UploadCloud className="h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">Click or drag files to upload</h3>
                            <p className="text-sm text-slate-500 mt-1 max-w-xs">Supports Images (JPG, PNG) and PDF documents. You can select multiple files.</p>
                            
                            <input 
                                type="file" 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={onFileSelect}
                                accept="image/*,application/pdf"
                                multiple
                            />
                        </div>

                        {uploads.length > 0 && (
                            <div className="mt-4 flex flex-col gap-3">
                                {uploads.map((upload) => (
                                    <div key={upload.id} className="relative border rounded-2xl p-4 bg-slate-50 flex flex-col gap-2 overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        
                                        <div className="flex items-center gap-4">
                                            <div className={cn("h-10 w-10 rounded-xl shadow-sm border flex items-center justify-center shrink-0 transition-colors", upload.status === 'completed' ? "bg-emerald-50 border-emerald-100 text-emerald-500" : upload.status === 'error' ? "bg-red-50 border-red-100 text-red-500" : "bg-white border-slate-100 text-primary")}>
                                                <File className="h-5 w-5" />
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-700 text-sm truncate">{upload.file.name}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className="text-xs text-slate-500">{(upload.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                    {upload.status === 'error' && <span className="text-[10px] text-red-500 font-medium">Failed: {upload.error}</span>}
                                                    {upload.status === 'completed' && <span className="text-[10px] text-emerald-500 font-medium">Uploaded</span>}
                                                    {upload.status === 'uploading' && <span className="text-[10px] text-primary font-medium">{upload.progress}%</span>}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 z-10 relative">
                                                {upload.status === 'completed' && upload.file_id && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="text-slate-400 hover:text-primary hover:bg-primary/10 rounded-full shrink-0 h-8 w-8"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewFile({ id: upload.file_id!, name: upload.file.name });
                                                        }}
                                                        title="View File"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                )}

                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full shrink-0 h-8 w-8"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeFile(upload.id);
                                                    }}
                                                    disabled={submitting}
                                                    title="Remove File"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        {(upload.status === 'uploading' || upload.status === 'pending') && (
                                            <Progress value={upload.progress} className="h-1.5 mt-1" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-6 flex justify-end">
                        <Button 
                            size="lg" 
                            className="w-full sm:w-auto px-8 gap-2 h-12 text-base font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            disabled={!selectedSalesmanId || !selectedCustomerId || !poNo.trim() || uploads.filter(u => u.status === 'completed').length === 0 || submitting}
                            onClick={async () => {
                                const success = await handleSubmit();
                                if (success) {
                                    setView("list");
                                }
                            }}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creating Snapshot...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Create Order Snapshot
                                </>
                            )}
                        </Button>
                    </div>

                </CardContent>
            </Card>

            {/* Preview Modal */}
            <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
                <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-slate-800">{previewFile?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 min-h-0 bg-slate-100/50 rounded-xl overflow-hidden border border-slate-200">
                        {previewFile && (
                            <iframe 
                                src={`/api/crm/customer-hub/assets/${previewFile.id}`} 
                                className="w-full h-full border-0 bg-transparent"
                                title="File Preview"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
