// src/modules/financial-management/printables-management/product-printables/components/PrintablesFiltersBar.tsx
"use client";

import * as React from "react";
import type { FilterState, Category, Unit, Supplier, PriceType } from "../types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Search, X, Filter, Check, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    resetFilters: () => void;
    categories: Category[];
    units: Unit[];
    suppliers: Supplier[];
    priceTypes: PriceType[];
};

const FilterSelector = ({ 
    label, 
    selectedIds, 
    options, 
    onToggle, 
    onClear 
}: { 
    label: string; 
    selectedIds: string[]; 
    options: { label: string; value: string }[]; 
    onToggle: (id: string) => void;
    onClear: () => void;
}) => (
    <Popover>
        <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between rounded-xl border-border/50 bg-background/50 text-left font-normal h-9 px-3">
                <span className="truncate">
                    {selectedIds.length > 0 ? `${label} (${selectedIds.length})` : label}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
            <Command>
                <div className="flex items-center gap-2 px-2 pt-2">
                    <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
                    {selectedIds.length > 0 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClear}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                        {options.map((opt) => (
                            <CommandItem
                                key={opt.value}
                                onSelect={() => onToggle(opt.value)}
                            >
                                <Check className={cn("mr-2 h-4 w-4", selectedIds.includes(opt.value) ? "opacity-100" : "opacity-0")} />
                                {opt.label}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </PopoverContent>
    </Popover>
);

export default function PrintablesFiltersBar({
    filters,
    setFilters,
    resetFilters,
    categories,
    units,
    suppliers,
    priceTypes
}: Props) {
    const [localQ, setLocalQ] = React.useState(filters.q || "");

    const handleSearch = () => {
        setFilters((prev) => ({ ...prev, q: localQ, page: 1 }));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSearch();
    };

    const toggleFilter = (key: keyof FilterState, id: string) => {
        setFilters(prev => {
            const current = (prev[key] as string[]) || [];
            const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
            return { ...prev, [key]: next, page: 1 };
        });
    };

    const removeFilter = (key: keyof FilterState, id: string) => {
        setFilters(prev => {
            const current = (prev[key] as string[]) || [];
            return { ...prev, [key]: current.filter(x => x !== id), page: 1 };
        });
    };

    const activeFiltersCount = 
        (filters.category_ids?.length || 0) + 
        (filters.unit_ids?.length || 0) + 
        (filters.supplier_ids?.length || 0) + 
        (filters.price_type_ids?.length || 0) +
        (filters.q ? 1 : 0);

    return (
        <div className="flex flex-col gap-4 bg-background/60 backdrop-blur-md p-6 rounded-2xl border border-border/50 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="relative group lg:col-span-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                        placeholder="Search products..."
                        value={localQ}
                        onChange={(e) => setLocalQ(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="pl-9 pr-12 rounded-xl border-border/50 bg-background/50 h-9"
                    />
                    <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={handleSearch}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all p-0"
                    >
                        <Search className="w-3.5 h-3.5" />
                    </Button>
                </div>

                <FilterSelector
                    label="Suppliers"
                    selectedIds={filters.supplier_ids || []}
                    options={suppliers.map(s => ({ label: s.supplier_name, value: String(s.id) }))}
                    onToggle={(id) => toggleFilter("supplier_ids", id)}
                    onClear={() => setFilters(prev => ({ ...prev, supplier_ids: [], page: 1 }))}
                />

                <FilterSelector
                    label="Categories"
                    selectedIds={filters.category_ids || []}
                    options={categories.map(c => ({ label: c.category_name, value: String(c.category_id) }))}
                    onToggle={(id) => toggleFilter("category_ids", id)}
                    onClear={() => setFilters(prev => ({ ...prev, category_ids: [], page: 1 }))}
                />

                <FilterSelector
                    label="Units"
                    selectedIds={filters.unit_ids || []}
                    options={units.map(u => ({ label: u.unit_shortcut, value: String(u.unit_id) }))}
                    onToggle={(id) => toggleFilter("unit_ids", id)}
                    onClear={() => setFilters(prev => ({ ...prev, unit_ids: [], page: 1 }))}
                />

                <FilterSelector
                    label="Prices"
                    selectedIds={filters.price_type_ids || []}
                    options={priceTypes.map(pt => ({ label: pt.price_type_name, value: String(pt.price_type_id) }))}
                    onToggle={(id) => toggleFilter("price_type_ids", id)}
                    onClear={() => setFilters(prev => ({ ...prev, price_type_ids: [] }))}
                />
            </div>

            {/* Active Filters Catalog */}
            {activeFiltersCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dashed border-border/50">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-2">
                        <Filter className="w-3 h-3" />
                        Active Filters:
                    </div>
                    {filters.q && (
                        <Badge variant="secondary" className="gap-1 rounded-lg px-2 py-0.5 bg-primary/5 text-primary border-primary/20">
                            Search: {filters.q}
                            <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => {
                                setFilters(prev => ({ ...prev, q: "", page: 1 }));
                                setLocalQ("");
                            }} />
                        </Badge>
                    )}
                    {(filters.category_ids || []).map(id => {
                        const name = categories.find(c => String(c.category_id) === id)?.category_name;
                        return (
                            <Badge key={id} variant="secondary" className="gap-1 rounded-lg px-2 py-0.5">
                                Cat: {name || id}
                                <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => removeFilter("category_ids", id)} />
                            </Badge>
                        );
                    })}
                    {(filters.unit_ids || []).map(id => {
                        const name = units.find(u => String(u.unit_id) === id)?.unit_shortcut;
                        return (
                            <Badge key={id} variant="secondary" className="gap-1 rounded-lg px-2 py-0.5">
                                Unit: {name || id}
                                <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => removeFilter("unit_ids", id)} />
                            </Badge>
                        );
                    })}
                    {(filters.supplier_ids || []).map(id => {
                        const name = suppliers.find(s => String(s.id) === id)?.supplier_name;
                        return (
                            <Badge key={id} variant="secondary" className="gap-1 rounded-lg px-2 py-0.5 bg-orange-50 text-orange-700 border-orange-200">
                                Supplier: {name || id}
                                <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => removeFilter("supplier_ids", id)} />
                            </Badge>
                        );
                    })}
                    {(filters.price_type_ids || []).map(id => {
                        const name = priceTypes.find(pt => String(pt.price_type_id) === id)?.price_type_name;
                        return (
                            <Badge key={id} variant="secondary" className="gap-1 rounded-lg px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                                Price: {name || id}
                                <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => removeFilter("price_type_ids", id)} />
                            </Badge>
                        );
                    })}
                    <Button variant="link" size="sm" onClick={resetFilters} className="text-[10px] h-auto p-0 text-muted-foreground hover:text-primary">
                        Clear all
                    </Button>
                </div>
            )}
        </div>
    );
}
