"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronsUpDown, Calendar as CalendarIcon, Hash, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Customer,
    MasterUser,
    Salesman,
    Supplier,
    Branch,
    PriceType,
    PaymentTerm,
    InvoiceType,
    SalesType
} from "../types";

interface DealerSalesInvoiceHeaderProps {
    // Selection State
    customers: Customer[];
    selectedCustomer: Customer | null;
    onCustomerSelect: (customer: Customer) => void;

    masterUsers: MasterUser[];
    selectedSalesman: MasterUser | null;
    onSalesmanSelect: (user: MasterUser) => void;

    accounts: Salesman[];
    selectedAccount: Salesman | null;
    loadingAccounts: boolean;
    onAccountSelect: (account: Salesman) => void;

    suppliers: Supplier[];
    selectedSupplier: Supplier | null;
    onSupplierSelect: (supplier: Supplier) => void;

    // Meta Settings
    invoiceTypes: InvoiceType[];
    selectedInvoiceType: string;
    onInvoiceTypeChange: (val: string) => void;

    salesTypes: SalesType[];
    selectedSalesType: string;
    onSalesTypeChange: (val: string) => void;

    branches: Branch[];
    selectedBranch: string;
    onBranchChange: (val: string) => void;

    priceTypes: PriceType[];
    selectedPriceType: string;
    onPriceTypeChange: (val: string) => void;

    paymentTerms: PaymentTerm[];

    // Dates & Others
    dueDate: string;
    onDueDateChange: (val: string) => void;

    deliveryDate: string;
    onDeliveryDateChange: (val: string) => void;

    previewInvoiceNo?: string;
    isLoading?: boolean;
}

export function DealerSalesInvoiceHeader({
    customers, selectedCustomer, onCustomerSelect,
    masterUsers, selectedSalesman, onSalesmanSelect,
    accounts, selectedAccount, loadingAccounts, onAccountSelect,
    suppliers, selectedSupplier, onSupplierSelect,
    invoiceTypes, selectedInvoiceType, onInvoiceTypeChange,
    branches, selectedBranch, onBranchChange,
    priceTypes, selectedPriceType, onPriceTypeChange,
    paymentTerms,
    salesTypes, selectedSalesType,
    dueDate, onDueDateChange,
    deliveryDate, onDeliveryDateChange,
    previewInvoiceNo
}: DealerSalesInvoiceHeaderProps) {
    const [openCustomer, setOpenCustomer] = useState(false);
    const [openSalesman, setOpenSalesman] = useState(false);
    const [openAccount, setOpenAccount] = useState(false);
    const [openSupplier, setOpenSupplier] = useState(false);
    const [openBranch, setOpenBranch] = useState(false);

    const activeCustomerPaymentTerm = selectedCustomer?.payment_term
        ? paymentTerms.find(t => t.id.toString() === selectedCustomer.payment_term?.toString())
        : null;

    return (
        <Card className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-0 shadow-sm hover:shadow-md transition-shadow duration-500 overflow-hidden">
            <CardHeader className="py-4 px-10 flex flex-row items-center justify-between border-b bg-slate-50/50">
                {selectedSalesman && (
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest leading-none">Price Type</span>
                        <Select value={selectedPriceType} onValueChange={onPriceTypeChange} disabled={true}>
                            <SelectTrigger className="h-7 min-w-[110px] bg-sky-50 border-sky-200 text-sky-700 text-[10px] font-black uppercase hover:bg-sky-100 transition-colors rounded-lg disabled:opacity-80">
                                <SelectValue placeholder="Price Type" />
                            </SelectTrigger>
                            <SelectContent>
                                {priceTypes.map(m => (
                                    <SelectItem key={m.price_type_id} value={m.price_type_id.toString()} className="text-[10px] font-bold uppercase">
                                        {m.price_type_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                {/* Removed Configuration Phase div */}
            </CardHeader>
            <CardContent className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-10">
                {/* 1. CUSTOMER */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                        Customer <span className="text-rose-500">*</span>
                    </label>
                    <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between h-12 rounded-xl bg-slate-50/30 border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-tight shadow-sm hover:bg-white transition-all text-left">
                                <span className="truncate">
                                    {selectedCustomer
                                        ? `${selectedCustomer.customer_name}${selectedCustomer.city || selectedCustomer.province ? ` (${[selectedCustomer.city, selectedCustomer.province].filter(Boolean).join(", ")})` : ""}`
                                        : "Select Customer..."}
                                </span>
                                <ChevronsUpDown className="h-4 w-4 opacity-30 shrink-0" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Search customer code or name..." />
                                <CommandList className="max-h-[300px]">
                                    <CommandEmpty>No customer found.</CommandEmpty>
                                    <CommandGroup>
                                        {customers.filter(c => c.isActive !== 0).map(c => (
                                            <CommandItem
                                                key={c.id}
                                                value={`${c.customer_name} ${c.customer_code} ${c.city || ""} ${c.province || ""}`}
                                                onSelect={() => { onCustomerSelect(c); setOpenCustomer(false); }}
                                                className="py-3 cursor-pointer"
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", selectedCustomer?.id === c.id ? "opacity-100" : "opacity-0")} />
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-black text-[11px] uppercase text-slate-900">{c.customer_name}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                                                        {c.customer_code} • {[c.city, c.province].filter(Boolean).join(", ")}
                                                    </span>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* 2. SALESMAN (USER) */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Salesman (User)</label>
                    <Popover open={openSalesman} onOpenChange={setOpenSalesman}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between h-12 rounded-xl bg-slate-50/30 border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-tight shadow-sm hover:bg-white transition-all text-left">
                                <span className="truncate">
                                    {selectedSalesman ? `${selectedSalesman.user_fname} ${selectedSalesman.user_lname}` : "Select User..."}
                                </span>
                                <ChevronsUpDown className="h-4 w-4 opacity-30 shrink-0" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Search salesman..." />
                                <CommandList>
                                    <CommandEmpty>No results found.</CommandEmpty>
                                    <CommandGroup>
                                        {masterUsers.map(s => (
                                            <CommandItem key={s.user_id} onSelect={() => { onSalesmanSelect(s); setOpenSalesman(false); }} className="py-3 cursor-pointer">
                                                <Check className={cn("mr-2 h-4 w-4", selectedSalesman?.user_id === s.user_id ? "opacity-100" : "opacity-0")} />
                                                <span className="font-black text-[11px] uppercase">{s.user_fname} {s.user_lname}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* 3. ACCOUNT (LINK) */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Account (Link) <span className="text-rose-500">*</span></label>
                    <Popover open={openAccount} onOpenChange={setOpenAccount}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full justify-between h-12 rounded-xl bg-slate-50/30 border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-tight shadow-sm hover:bg-white transition-all text-left disabled:opacity-30"
                                disabled={!selectedSalesman || loadingAccounts}
                            >
                                <span className="truncate">
                                    {loadingAccounts ? (
                                        <div className="flex items-center gap-2">
                                            <RotateCw className="h-3 w-3 animate-spin" />
                                            <span>Resolving...</span>
                                        </div>
                                    ) : selectedAccount ? (
                                        `${selectedAccount.salesman_name} (${selectedAccount.salesman_code})`
                                    ) : (
                                        "Select Account..."
                                    )}
                                </span>
                                <ChevronsUpDown className="h-4 w-4 opacity-30 shrink-0" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Search account..." />
                                <CommandList>
                                    <CommandEmpty>No accounts found.</CommandEmpty>
                                    <CommandGroup>
                                        {accounts.map(a => (
                                            <CommandItem
                                                key={a.id}
                                                onSelect={() => { onAccountSelect(a); setOpenAccount(false); }}
                                                className="py-3 cursor-pointer"
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", selectedAccount?.id === a.id ? "opacity-100" : "opacity-0")} />
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-black text-[11px] uppercase text-slate-900">{a.salesman_name}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{a.salesman_code}</span>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* 4. SUPPLIER */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Supplier <span className="text-rose-500">*</span></label>
                    <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full justify-between h-12 rounded-xl bg-slate-50/30 border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-tight shadow-sm hover:bg-white transition-all text-left"
                                disabled={!selectedCustomer}
                            >
                                <span className="truncate">
                                    {selectedSupplier
                                        ? `${selectedSupplier.supplier_name}${selectedSupplier.supplier_shortcut ? ` (${selectedSupplier.supplier_shortcut})` : ""}`
                                        : "Select Supplier..."}
                                </span>
                                <ChevronsUpDown className="h-4 w-4 opacity-30 shrink-0" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Search supplier..." />
                                <CommandList className="max-h-[300px]">
                                    <CommandEmpty>No supplier found.</CommandEmpty>
                                    <CommandGroup>
                                        {suppliers.map(s => (
                                            <CommandItem
                                                key={s.id}
                                                value={`${s.supplier_name} ${s.supplier_shortcut || ""}`}
                                                onSelect={() => { onSupplierSelect(s); setOpenSupplier(false); }}
                                                className="py-3 cursor-pointer"
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", selectedSupplier?.id === s.id ? "opacity-100" : "opacity-0")} />
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-black text-[11px] uppercase text-slate-900">{s.supplier_name}</span>
                                                    {s.supplier_shortcut && <span className="text-[9px] font-bold text-slate-400 uppercase">{s.supplier_shortcut}</span>}
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* 5. RECEIPT TYPE */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Receipt Type</label>
                    <Select value={selectedInvoiceType} onValueChange={onInvoiceTypeChange}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50/30 border-slate-200 dark:border-slate-800 font-black text-[11px] uppercase tracking-tight shadow-sm disabled:opacity-80">
                            <SelectValue placeholder="Receipt Type" />
                        </SelectTrigger>
                        <SelectContent>
                            {invoiceTypes.map(t => (
                                <SelectItem key={t.id} value={t.id.toString()} className="font-black text-[10px] uppercase">
                                    {t.type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* 6. SALES TYPE (LOCKED TO DEFAULT) */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Sales Type</label>
                    <div className="relative group opacity-80">
                        <Input
                            value={salesTypes.find(s => s.id.toString() === selectedSalesType)?.operation_name}
                            readOnly
                            disabled
                            className="h-12 rounded-xl bg-slate-50/50 border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-tight shadow-sm cursor-not-allowed italic text-slate-400"
                        />
                    </div>
                </div>
                {/* 8. DUE DATE */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Due Date</label>
                    <div className="relative group opacity-80">
                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                        <Input type="date" value={dueDate} onChange={(e) => onDueDateChange(e.target.value)} className="h-12 pl-12 rounded-xl bg-slate-50/30 border-slate-200 dark:border-slate-800 font-black text-xs shadow-sm bg-slate-50/50" readOnly />
                    </div>
                </div>

                {/* 9. DELIVERY DATE */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Delivery Date <span className="text-rose-500">*</span></label>
                    <div className="relative group">
                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                        <Input type="date" value={deliveryDate} onChange={(e) => onDeliveryDateChange(e.target.value)} className="h-12 pl-12 rounded-xl bg-slate-50/30 border-slate-200 dark:border-slate-800 font-black text-xs shadow-sm" />
                    </div>
                </div>

                {/* 10. BRANCH */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Branch <span className="text-rose-500">*</span></label>
                    <Popover open={openBranch} onOpenChange={setOpenBranch}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full justify-between h-12 rounded-xl bg-slate-50/30 border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-tight shadow-sm hover:bg-white transition-all text-left disabled:opacity-80 disabled:cursor-not-allowed"
                                disabled={true}
                            >
                                <span className="truncate">
                                    {selectedBranch && branches.find(b => b.id.toString() === selectedBranch)
                                        ? `${branches.find(b => b.id.toString() === selectedBranch)!.branch_name}`
                                        : "Select Branch..."}
                                </span>
                                <ChevronsUpDown className="h-4 w-4 opacity-30 shrink-0" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Search branch..." />
                                <CommandList>
                                    <CommandEmpty>No branch found.</CommandEmpty>
                                    <CommandGroup>
                                        {branches.map(b => (
                                            <CommandItem
                                                key={b.id}
                                                onSelect={() => { onBranchChange(b.id.toString()); setOpenBranch(false); }}
                                                className="py-3 cursor-pointer"
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", selectedBranch === b.id.toString() ? "opacity-100" : "opacity-0")} />
                                                <span className="font-black text-[11px] uppercase">{b.branch_name}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>


                {/* 11. ORDER ID (AUTO-GENERATED) */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Order ID</label>
                    <div className="relative group opacity-80">
                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                        <Input
                            value={previewInvoiceNo || "Auto-generating..."}
                            readOnly
                            disabled
                            className="h-12 pl-12 rounded-xl bg-slate-50/50 border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-tight shadow-sm cursor-not-allowed italic text-slate-400"
                        />
                    </div>
                </div>

                {/* 12. PAYMENT TERMS */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Payment Terms</label>
                    <div className="relative">
                        <Input
                            type="text"
                            placeholder="Terms"
                            value={activeCustomerPaymentTerm?.payment_name || "N/A"}
                            className="h-11 text-[11px] border-sky-100 bg-sky-50/20 focus-visible:ring-sky-500 opacity-80 cursor-not-allowed font-black text-sky-700 uppercase tracking-tight rounded-xl"
                            readOnly
                            disabled
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
