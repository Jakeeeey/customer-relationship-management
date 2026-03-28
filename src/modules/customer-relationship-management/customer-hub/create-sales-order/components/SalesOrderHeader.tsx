"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronsUpDown, Calendar as CalendarIcon, Hash } from "lucide-react";
import { cn } from "@/lib/utils";


import { Salesman, Customer, Supplier, Branch, PriceTypeModel } from "../types";

interface SalesOrderHeaderProps {
    salesmen: Salesman[];
    selectedSalesman: Salesman | undefined;
    onSalesmanChange: (id: string) => void;

    accounts: Salesman[];
    selectedAccount: Salesman | undefined;
    loadingAccounts: boolean;
    onAccountChange: (id: string) => void;

    customers: Customer[];
    selectedCustomer: Customer | undefined;
    loadingCustomers: boolean;
    onCustomerChange: (id: string) => void;

    suppliers: Supplier[];
    selectedSupplier: Supplier | undefined;
    loadingSuppliers: boolean;
    onSupplierChange: (id: string) => void;

    receiptTypes: { id: number | string; type: string }[];
    selectedReceiptTypeId: string;
    onReceiptTypeChange: (id: string) => void;

    salesTypes: { id: number | string; operation_name: string }[];
    selectedSalesTypeId: string;
    onSalesTypeChange: (id: string) => void;

    dueDate: string;
    onDueDateChange: (val: string) => void;

    deliveryDate: string;
    onDeliveryDateChange: (val: string) => void;

    poNo: string;
    onPoNoChange: (val: string) => void;

    branches: Branch[];
    selectedBranchId: string;
    onBranchChange: (id: string) => void;

    priceType: string;
    priceTypeId?: number | null;
    priceTypeModels?: PriceTypeModel[];
    previewOrderNo?: string;
}

export function SalesOrderHeader({
    salesmen, selectedSalesman, onSalesmanChange,
    accounts, selectedAccount, loadingAccounts, onAccountChange,
    customers, selectedCustomer, loadingCustomers, onCustomerChange,
    suppliers, selectedSupplier, loadingSuppliers, onSupplierChange,
    receiptTypes, selectedReceiptTypeId, onReceiptTypeChange,
    salesTypes, selectedSalesTypeId, onSalesTypeChange,
    dueDate, onDueDateChange,
    deliveryDate, onDeliveryDateChange,
    poNo, onPoNoChange,
    branches, selectedBranchId, onBranchChange,
    priceType, priceTypeId, priceTypeModels,
    previewOrderNo
}: SalesOrderHeaderProps) {
    const [openSalesman, setOpenSalesman] = useState(false);
    const [openAccount, setOpenAccount] = useState(false);
    const [openCustomer, setOpenCustomer] = useState(false);
    const [openSupplier, setOpenSupplier] = useState(false);
    const [openBranch, setOpenBranch] = useState(false);

    return (
        <Card className="shadow-sm border-muted-foreground/10 overflow-hidden">
            <CardHeader className="py-4 px-6 flex flex-row items-center justify-between border-b bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Price Type </span>
                    <Badge variant="secondary" className="font-black text-primary bg-primary/10 border-primary/20">
                        {priceTypeId && priceTypeModels?.find(p => p.price_type_id === priceTypeId)?.price_type_name
                            ? priceTypeModels.find(p => p.price_type_id === priceTypeId)!.price_type_name
                            : ` ${priceType}`}
                    </Badge>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic opacity-50">
                        Configuration Phase
                    </div>
                    {previewOrderNo && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-200/50 border border-slate-300/50">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Draft SO#</span>
                            <span className="text-[10px] font-bold text-slate-900 tracking-tight font-mono">{previewOrderNo}</span>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-6 grid gap-6 xl:grid-cols-4 lg:grid-cols-4 md:grid-cols-2">
                {/* 1. SALESMAN (USER) */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Salesman (User)</label>
                    <Popover open={openSalesman} onOpenChange={setOpenSalesman}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between font-normal h-9 text-xs">
                                <span className="truncate">{selectedSalesman ? `${selectedSalesman.user_fname} ${selectedSalesman.user_lname}` : "Select User..."}</span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Search user..." />
                                <CommandList>
                                    <CommandEmpty>No user found.</CommandEmpty>
                                    <CommandGroup>
                                        {salesmen.map(s => (
                                            <CommandItem key={s.user_id || s.id} value={`${s.user_fname} ${s.user_lname}`} onSelect={() => { onSalesmanChange((s.user_id || s.id).toString()); setOpenSalesman(false); }}>
                                                <Check className={cn("mr-2 h-4 w-4", (selectedSalesman?.user_id || selectedSalesman?.id) === (s.user_id || s.id) ? "opacity-100" : "opacity-0")} />
                                                {s.user_fname} {s.user_lname}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* 2. SALESMAN (ACCOUNT) */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Account {loadingAccounts && "..."}</label>
                    <Popover open={openAccount} onOpenChange={setOpenAccount}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between font-normal h-9 text-xs" disabled={!selectedSalesman || loadingAccounts}>
                                <span className="truncate">{selectedAccount ? `${selectedAccount.salesman_name} (${selectedAccount.salesman_code})` : "Select Account..."}</span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Search account..." />
                                <CommandList>
                                    <CommandEmpty>No account found.</CommandEmpty>
                                    <CommandGroup>
                                        {accounts.map(a => (
                                            <CommandItem key={a.id} value={`${a.salesman_name} ${a.salesman_code}`} onSelect={() => { onAccountChange(a.id.toString()); setOpenAccount(false); }}>
                                                <Check className={cn("mr-2 h-4 w-4", selectedAccount?.id === a.id ? "opacity-100" : "opacity-0")} />
                                                {a.salesman_name} ({a.salesman_code})
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* 3. CUSTOMER */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Customer {loadingCustomers && "..."}</label>
                    <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between font-normal h-9 text-xs" disabled={!selectedAccount || loadingCustomers}>
                                <span className="truncate">{selectedCustomer ? selectedCustomer.customer_name : "Select Customer..."}</span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Search customer..." />
                                <CommandList>
                                    <CommandEmpty>No customer found.</CommandEmpty>
                                    <CommandGroup>
                                        {customers.map(c => (
                                            <CommandItem key={c.id} value={c.customer_name} onSelect={() => { onCustomerChange(c.id.toString()); setOpenCustomer(false); }}>
                                                <Check className={cn("mr-2 h-4 w-4", selectedCustomer?.id === c.id ? "opacity-100" : "opacity-0")} />
                                                {c.customer_name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* 4. SUPPLIER */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Supplier {loadingSuppliers && "..."}</label>
                    <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between font-normal h-9 text-xs" disabled={!selectedCustomer || loadingSuppliers}>
                                <span className="truncate">{selectedSupplier ? selectedSupplier.supplier_name : "Select Supplier..."}</span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Search supplier..." />
                                <CommandList>
                                    <CommandEmpty>No supplier found.</CommandEmpty>
                                    <CommandGroup>
                                        {suppliers.map(s => (
                                            <CommandItem key={s.id} value={s.supplier_name} onSelect={() => { onSupplierChange(s.id.toString()); setOpenSupplier(false); }}>
                                                <Check className={cn("mr-2 h-4 w-4", selectedSupplier?.id === s.id ? "opacity-100" : "opacity-0")} />
                                                {s.supplier_name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* META FIELDS row 2 */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Receipt Type</label>
                    <Select value={selectedReceiptTypeId} onValueChange={onReceiptTypeChange}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                            {receiptTypes.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.type}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Sales Type</label>
                    <Select value={selectedSalesTypeId} onValueChange={onSalesTypeChange}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                            {salesTypes.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.operation_name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Due Date <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <CalendarIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input type="date" value={dueDate || ""} onChange={(e) => onDueDateChange(e.target.value)} className="pl-9 h-9 text-xs" required />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Delivery Date <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <CalendarIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input type="date" value={deliveryDate || ""} onChange={(e) => onDeliveryDateChange(e.target.value)} className="pl-9 h-9 text-xs" required />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Branch <span className="text-red-500">*</span></label>
                    <Popover open={openBranch} onOpenChange={setOpenBranch}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between font-normal h-9 text-xs">
                                <span className="truncate">
                                    {selectedBranchId && branches.find(b => b.id.toString() === selectedBranchId)
                                        ? `${branches.find(b => b.id.toString() === selectedBranchId)!.branch_name} (${branches.find(b => b.id.toString() === selectedBranchId)!.branch_code})`
                                        : "Select branch..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start" sideOffset={4}>
                            <Command onWheel={(e) => e.stopPropagation()}>
                                <CommandInput placeholder="Search branch..." />
                                <CommandList>
                                    <CommandEmpty>No branch found.</CommandEmpty>
                                    <CommandGroup>
                                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                            {branches.map(b => (
                                                <CommandItem
                                                    key={b.id}
                                                    value={`${b.branch_name} ${b.branch_code}`}
                                                    onSelect={() => {
                                                        onBranchChange(b.id.toString());
                                                        setOpenBranch(false);
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", selectedBranchId === b.id.toString() ? "opacity-100" : "opacity-0")} />
                                                    {b.branch_name} ({b.branch_code})
                                                </CommandItem>
                                            ))}
                                        </div>
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">PO Number <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <Hash className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input placeholder="Enter PO#" value={poNo || ""} onChange={(e) => onPoNoChange(e.target.value)} className="pl-9 h-9 text-xs" required />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
