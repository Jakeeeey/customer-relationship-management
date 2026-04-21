"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronsUpDown, Calendar as CalendarIcon, Hash, Clock } from "lucide-react";
import { cn } from "@/lib/utils";


import { Salesman, Customer, Supplier, Branch, PriceTypeModel, PaymentTerm } from "../types";

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
    customerSearch: string;
    onCustomerSearchChange: (val: string) => void;
    loadingMoreCustomers: boolean;
    onLoadMoreCustomers: () => void;
    hasMoreCustomers: boolean;

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

    priceTypeId?: number | null;
    priceTypeModels?: PriceTypeModel[];
    previewOrderNo?: string;
    paymentTerms: number | null;
    paymentTermsList: PaymentTerm[];
    onPriceTypeChange: (id: string) => void;
}

export function SalesOrderHeader({
    salesmen, selectedSalesman, onSalesmanChange,
    accounts, selectedAccount, loadingAccounts, onAccountChange,
    customers, selectedCustomer, loadingCustomers, onCustomerChange, customerSearch, onCustomerSearchChange,
    loadingMoreCustomers, onLoadMoreCustomers, hasMoreCustomers,
    suppliers, selectedSupplier, loadingSuppliers, onSupplierChange,
    receiptTypes, selectedReceiptTypeId, onReceiptTypeChange,
    salesTypes, selectedSalesTypeId, onSalesTypeChange,
    dueDate, onDueDateChange,
    deliveryDate, onDeliveryDateChange,
    poNo, onPoNoChange,
    branches, selectedBranchId, onBranchChange,
    priceTypeId, priceTypeModels,
    onPriceTypeChange,
    previewOrderNo,
    paymentTerms, paymentTermsList
}: SalesOrderHeaderProps) {
    const [openSalesman, setOpenSalesman] = useState(false);
    const [openAccount, setOpenAccount] = useState(false);
    const [openCustomer, setOpenCustomer] = useState(false);
    const [openSupplier, setOpenSupplier] = useState(false);
    const [openBranch, setOpenBranch] = useState(false);

    return (
        <Card className="shadow-sm border-muted-foreground/10 overflow-hidden">
            <CardHeader className="py-4 px-6 flex flex-row items-center justify-between border-b bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest leading-none">Price Type</span>
                    <Select value={priceTypeId?.toString() || ""} onValueChange={onPriceTypeChange}>
                        <SelectTrigger className="h-7 min-w-[110px] bg-sky-50 border-sky-200 text-sky-700 text-[10px] font-black uppercase hover:bg-sky-100 transition-colors">
                            <SelectValue placeholder="Price Type" />
                        </SelectTrigger>
                        <SelectContent>
                            {priceTypeModels?.map(m => (
                                <SelectItem key={m.price_type_id} value={m.price_type_id.toString()} className="text-[10px] font-bold uppercase">
                                    {m.price_type_name}
                                </SelectItem>
                            ))}
                            {!priceTypeModels?.length && <SelectItem value="0" disabled>Standard Price</SelectItem>}
                        </SelectContent>
                    </Select>
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
                {/* 1. CUSTOMER */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Customer {loadingCustomers && "..."}</label>
                    <Popover open={openCustomer} onOpenChange={(open) => { setOpenCustomer(open); if (!open) onCustomerSearchChange(""); }}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between font-normal h-9 text-xs" disabled={loadingCustomers}>
                                <span className="truncate">
                                    {selectedCustomer
                                        ? `${selectedCustomer.customer_name}${selectedCustomer.city || selectedCustomer.province ? ` (${[selectedCustomer.city, selectedCustomer.province].filter(Boolean).join(", ")})` : ""}`
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
                                    onValueChange={onCustomerSearchChange}
                                />
                                <CommandList>
                                    {loadingCustomers ? (
                                        <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>
                                    ) : (
                                        <>
                                            <CommandEmpty>No customer found.</CommandEmpty>
                                            <CommandGroup>
                                                <div
                                                    className="max-h-[300px] overflow-y-auto custom-scrollbar p-1"
                                                    onScroll={(e) => {
                                                        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                                                        if (scrollHeight - scrollTop <= clientHeight + 50) {
                                                            onLoadMoreCustomers();
                                                        }
                                                    }}
                                                >
                                                    {customers.map(c => (
                                                        <CommandItem key={c.id} value={`${c.customer_name} ${c.city} ${c.province}`} onSelect={() => { onCustomerChange(c.id.toString()); setOpenCustomer(false); }}>
                                                            <Check className={cn("mr-2 h-4 w-4", selectedCustomer?.id === c.id ? "opacity-100" : "opacity-0")} />
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{c.customer_name}</span>
                                                                {(c.city || c.province) && (
                                                                    <span className="text-[10px] text-muted-foreground">
                                                                        {[c.city, c.province].filter(Boolean).join(", ")}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </CommandItem>
                                                    ))}

                                                    {loadingMoreCustomers && (
                                                        <div className="py-2 text-center text-[10px] text-muted-foreground animate-pulse font-bold uppercase tracking-widest">
                                                            Loading more...
                                                        </div>
                                                    )}

                                                    {!hasMoreCustomers && customers.length > 0 && (
                                                        <div className="py-2 text-center text-[9px] text-muted-foreground/50 italic">
                                                            End of results
                                                        </div>
                                                    )}
                                                </div>
                                            </CommandGroup>
                                        </>
                                    )}
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* 2. SALESMAN (USER) */}
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

                {/* 3. SALESMAN (ACCOUNT) */}
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

                {/* 4. SUPPLIER */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Supplier {loadingSuppliers && "..."}</label>
                    <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between font-normal h-9 text-xs" disabled={!selectedCustomer || loadingSuppliers}>
                                <span className="truncate">
                                    {selectedSupplier
                                        ? `${selectedSupplier.supplier_name}${selectedSupplier.supplier_shortcut ? ` (${selectedSupplier.supplier_shortcut})` : ""}`
                                        : "Select Supplier..."}
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
                                        {suppliers.map(s => (
                                            <CommandItem
                                                key={s.id}
                                                value={`${s.supplier_name} ${s.supplier_shortcut}`}
                                                onSelect={() => { onSupplierChange(s.id.toString()); setOpenSupplier(false); }}
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", selectedSupplier?.id === s.id ? "opacity-100" : "opacity-0")} />
                                                {s.supplier_name} {s.supplier_shortcut && `(${s.supplier_shortcut})`}
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
                        <Input
                            type="date"
                            value={dueDate || ""}
                            onChange={(e) => onDueDateChange(e.target.value)}
                            className="pl-9 h-9 text-xs bg-slate-50/50 opacity-80 cursor-not-allowed"
                            disabled
                            required
                        />
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

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Payment Terms</label>
                    <div className="relative">
                        <Clock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-sky-500" />
                        <Input
                            type="text"
                            placeholder="Terms"
                            value={paymentTermsList.find(pt => Number(pt.id) === Number(paymentTerms))?.payment_name || "N/A"}
                            className="pl-9 h-9 text-xs border-sky-100 bg-sky-50/20 focus-visible:ring-sky-500 opacity-80 cursor-not-allowed font-bold text-sky-700"
                            readOnly
                            disabled
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
