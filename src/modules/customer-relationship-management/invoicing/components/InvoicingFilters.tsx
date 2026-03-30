"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AsyncCombobox } from "./AsyncCombobox";
import { InvoicingFilters, ComboboxOption } from "../types";
import { InvoicingService } from "../services/InvoicingService";

import { RotateCcw, Hash, FileSignature, User, Users, Building2, MapPin, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface InvoicingFiltersProps {
    onFilterChange: (filters: InvoicingFilters) => void;
}

export const InvoicingFiltersComponent: React.FC<InvoicingFiltersProps> = ({ onFilterChange }) => {
    const [filters, setFilters] = useState<InvoicingFilters>({
        orderNo: "",
        poNo: "",
        customer: "",
        salesman: "",
        supplier: "",
        branch: "",
        status: "All",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleComboboxChange = (name: keyof InvoicingFilters, value: string) => {
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleSelectChange = (name: keyof InvoicingFilters, value: string) => {
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleResetFilters = () => {
        const newFilters: InvoicingFilters = {
            orderNo: "",
            poNo: "",
            customer: "",
            salesman: "",
            supplier: "",
            branch: "",
            status: "All",
        };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    // Fetcher functions mapping API data to ComboboxOption array format
    const fetchCustomers = async (search?: string): Promise<ComboboxOption[]> => {
        const data = await InvoicingService.getCustomers(search);
        const options = data.map(c => ({
            value: c.customer_code,
            label: c.customer_name || `Unknown Customer (${c.customer_code})`,
        }));
        return [{ value: "", label: "All Customers" }, ...options];
    };

    const fetchSalesmen = async (search?: string): Promise<ComboboxOption[]> => {
        const data = await InvoicingService.getSalesmen(search);
        const options = data.map(s => ({
            value: String(s.id),
            label: s.salesman_name || `Unknown Salesman (${s.salesman_code})`,
        }));
        return [{ value: "", label: "All Salesmen" }, ...options];
    };

    const fetchSuppliers = async (search?: string): Promise<ComboboxOption[]> => {
        const data = await InvoicingService.getSuppliers(search);
        const options = data.map(s => ({
            value: String(s.id),
            label: s.supplier_name || s.supplier_shortcut || "Unnamed Supplier",
        }));
        return [{ value: "", label: "All Suppliers" }, ...options];
    };

    const fetchBranches = async (search?: string): Promise<ComboboxOption[]> => {
        const data = await InvoicingService.getBranches(search);
        const options = data.map(b => ({
            value: String(b.id),
            label: b.branch_name || `Unknown Branch (${b.id})`,
        }));
        return [{ value: "", label: "All Branches" }, ...options];
    };

    return (
        <div className="p-2 md:p-6 bg-transparent">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-6">
                <div className="space-y-2 flex-1 min-w-[200px] sm:min-w-[calc(50%-1rem)] lg:min-w-[calc(25%-1rem)] xl:flex-1 xl:min-w-0">
                    <Label htmlFor="orderNo" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                        <Hash size={12} className="text-primary/60" /> Order No.
                    </Label>
                    <div className="relative group">
                        <Input
                            id="orderNo"
                            name="orderNo"
                            placeholder="Search Order No."
                            value={filters.orderNo}
                            onChange={handleChange}
                            className="h-10 text-xs bg-muted/20 border-border/50 focus:bg-background transition-all duration-300 rounded-xl"
                        />
                    </div>
                </div>
                <div className="space-y-2 flex-1 min-w-[200px] sm:min-w-[calc(50%-1rem)] lg:min-w-[calc(25%-1rem)] xl:flex-1 xl:min-w-0">
                    <Label htmlFor="poNo" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                        <FileSignature size={12} className="text-primary/60" /> PO No.
                    </Label>
                    <Input
                        id="poNo"
                        name="poNo"
                        placeholder="Search PO No."
                        value={filters.poNo}
                        onChange={handleChange}
                        className="h-10 text-xs bg-muted/20 border-border/50 focus:bg-background transition-all duration-300 rounded-xl"
                    />
                </div>
                
                <div className="space-y-2 flex-1 min-w-[200px] sm:min-w-[calc(50%-1rem)] lg:min-w-[calc(25%-1rem)] xl:flex-1 xl:min-w-0">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                        <User size={12} className="text-primary/60" /> Customer
                    </Label>
                    <AsyncCombobox
                        fetchOptions={fetchCustomers}
                        value={filters.customer}
                        onValueChange={(val) => handleComboboxChange("customer", val)}
                        placeholder="All Customers"
                        emptyMessage="No customer found."
                        className="h-10 text-xs bg-muted/20 border-border/50 focus:bg-background transition-all duration-300 rounded-xl"
                    />
                </div>

                <div className="space-y-2 flex-1 min-w-[200px] sm:min-w-[calc(50%-1rem)] lg:min-w-[calc(25%-1rem)] xl:flex-1 xl:min-w-0">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                        <Users size={12} className="text-primary/60" /> Salesman
                    </Label>
                    <AsyncCombobox
                        fetchOptions={fetchSalesmen}
                        value={filters.salesman}
                        onValueChange={(val) => handleComboboxChange("salesman", val)}
                        placeholder="All Salesmen"
                        emptyMessage="No salesman found."
                        className="h-10 text-xs bg-muted/20 border-border/50 focus:bg-background transition-all duration-300 rounded-xl"
                    />
                </div>

                <div className="space-y-2 flex-1 min-w-[200px] sm:min-w-[calc(50%-1rem)] lg:min-w-[calc(25%-1rem)] xl:flex-1 xl:min-w-0">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                        <Building2 size={12} className="text-primary/60" /> Supplier
                    </Label>
                    <AsyncCombobox
                        fetchOptions={fetchSuppliers}
                        value={filters.supplier}
                        onValueChange={(val) => handleComboboxChange("supplier", val)}
                        placeholder="All Suppliers"
                        emptyMessage="No supplier found."
                        className="h-10 text-xs bg-muted/20 border-border/50 focus:bg-background transition-all duration-300 rounded-xl"
                    />
                </div>

                <div className="space-y-2 flex-1 min-w-[200px] sm:min-w-[calc(50%-1rem)] lg:min-w-[calc(25%-1rem)] xl:flex-1 xl:min-w-0">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                        <MapPin size={12} className="text-primary/60" /> Branch
                    </Label>
                    <AsyncCombobox
                        fetchOptions={fetchBranches}
                        value={filters.branch}
                        onValueChange={(val) => handleComboboxChange("branch", val)}
                        placeholder="All Branches"
                        emptyMessage="No branch found."
                        className="h-10 text-xs bg-muted/20 border-border/50 focus:bg-background transition-all duration-300 rounded-xl"
                    />
                </div>

                <div className="space-y-2 flex-1 min-w-[200px] sm:min-w-[calc(50%-1rem)] lg:min-w-[calc(25%-1rem)] xl:flex-1 xl:min-w-0">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                        <Filter size={12} className="text-primary/60" /> Status
                    </Label>
                    <Select value={filters.status} onValueChange={(val) => handleSelectChange("status", val)}>
                        <SelectTrigger className="h-10 w-full text-xs bg-muted/20 border-border/50 focus:bg-background transition-all duration-300 rounded-xl">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/50">
                            <SelectItem value="All" className="text-xs uppercase font-bold tracking-widest">All</SelectItem>
                            <SelectItem value="Normal" className="text-xs uppercase font-bold tracking-widest">Normal</SelectItem>
                            <SelectItem value="Recycled" className="text-xs uppercase font-bold tracking-widest">Recycled</SelectItem>
                            <SelectItem value="Void" className="text-xs uppercase font-bold tracking-widest">Void</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col justify-end">
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={handleResetFilters}
                                    className="h-10 w-10 text-red-600 hover:text-red-700 bg-red-500/5 hover:bg-red-500/10 border border-dashed border-red-500/30 hover:border-red-500 rounded-xl transition-all duration-300 shadow-sm"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-red-600 text-white border-none text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg">
                                Reset All Filters
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        </div>
    );
};
