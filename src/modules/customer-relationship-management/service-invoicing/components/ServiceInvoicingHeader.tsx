"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Check,
    ChevronsUpDown,
    Calendar as CalendarIcon,
    Hash,
    Clock,
    CreditCard,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Salesman, Customer, Branch, PriceTypeModel, PaymentTerm, ReceiptType, SalesType } from "../types";

interface ServiceInvoicingHeaderProps {
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

    receiptTypes: ReceiptType[];
    selectedReceiptTypeId: string;
    onReceiptTypeChange: (id: string) => void;

    salesTypes: SalesType[];
    selectedSalesTypeId: string;
    onSalesTypeChange: (id: string) => void;

    invoiceDate: string;
    onInvoiceDateChange: (val: string) => void;

    dueDate: string;
    onDueDateChange: (val: string) => void;

    dispatchDate: string;
    onDispatchDateChange: (val: string) => void;

    orderId: string;
    onOrderIdChange: (val: string) => void;

    invoiceNo: string;
    onInvoiceNoChange: (val: string) => void;
    invoiceNoExists: boolean;
    checkingInvoiceNo: boolean;
    onGenerateInvoiceNo: () => void;

    branches: Branch[];
    selectedBranchId: string;
    onBranchChange: (id: string) => void;

    priceTypeId?: number | null;
    priceTypeModels?: PriceTypeModel[];
    onPriceTypeChange: (id: string) => void;

    paymentTerms: number | null;
    onPaymentTermsChange: (id: number | null) => void;
    paymentTermsList: PaymentTerm[];

    customerReceivable?: number | null;
    loadingReceivable?: boolean;
    editingInvoiceId?: number | null;
}

export function ServiceInvoicingHeader({
    salesmen,
    selectedSalesman,
    onSalesmanChange,
    accounts,
    selectedAccount,
    loadingAccounts,
    onAccountChange,
    customers,
    selectedCustomer,
    loadingCustomers,
    onCustomerChange,
    customerSearch,
    onCustomerSearchChange,
    loadingMoreCustomers,
    onLoadMoreCustomers,
    hasMoreCustomers,
    receiptTypes,
    selectedReceiptTypeId,
    onReceiptTypeChange,
    salesTypes,
    selectedSalesTypeId,
    onSalesTypeChange,
    invoiceDate,
    onInvoiceDateChange,
    dueDate,
    onDueDateChange,
    dispatchDate,
    onDispatchDateChange,
    orderId,
    onOrderIdChange,
    invoiceNo,
    onInvoiceNoChange,
    invoiceNoExists,
    checkingInvoiceNo,
    onGenerateInvoiceNo,
    branches,
    selectedBranchId,
    onBranchChange,
    priceTypeId,
    priceTypeModels,
    onPriceTypeChange,
    paymentTerms,
    onPaymentTermsChange,
    paymentTermsList,
    customerReceivable,
    loadingReceivable = false,
    editingInvoiceId,
}: ServiceInvoicingHeaderProps) {
    const [openSalesman, setOpenSalesman] = useState(false);
    const [openAccount, setOpenAccount] = useState(false);
    const [openCustomer, setOpenCustomer] = useState(false);
    const [openBranch, setOpenBranch] = useState(false);

    const creditLimit = Number(selectedCustomer?.credit_limit || 0);
    const receivableAmount = Number(customerReceivable || 0);
    const isExceeded = creditLimit > 0 && receivableAmount > creditLimit;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(val);
    };

    return (
        <Card className="shadow-sm border-muted-foreground/10 overflow-hidden">
            <CardHeader className="py-4 px-6 flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest leading-none">
                        Price Type
                    </span>
                    <Select value={priceTypeId?.toString() || ""} onValueChange={onPriceTypeChange}>
                        <SelectTrigger className="h-7 min-w-[110px] bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400 text-[10px] font-black uppercase hover:bg-sky-500/20 transition-colors">
                            <SelectValue placeholder="Price Type" />
                        </SelectTrigger>
                        <SelectContent>
                            {priceTypeModels?.map((m) => (
                                <SelectItem
                                    key={m.price_type_id}
                                    value={m.price_type_id.toString()}
                                    className="text-[10px] font-bold uppercase"
                                >
                                    {m.price_type_name}
                                </SelectItem>
                            ))}
                            {!priceTypeModels?.length && (
                                <SelectItem value="0" disabled>
                                    Standard Price
                                </SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col items-end gap-1">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic opacity-75">
                        {editingInvoiceId ? `Editing Invoice ID #${editingInvoiceId}` : "Service Invoice Header"}
                    </div>
                    {invoiceNo && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted border border-border">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">
                                INV#
                            </span>
                            <span className="text-[10px] font-bold text-foreground tracking-tight font-mono">
                                {invoiceNo}
                            </span>
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-6 grid gap-6 xl:grid-cols-4 lg:grid-cols-4 md:grid-cols-2">
                {/* 1. CUSTOMER */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">
                        Customer <span className="text-red-500">*</span> {loadingCustomers && "..."}
                    </label>
                    <Popover
                        open={openCustomer}
                        onOpenChange={(open) => {
                            setOpenCustomer(open);
                            if (!open) onCustomerSearchChange("");
                        }}
                    >
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full justify-between font-normal h-9 text-xs"
                                disabled={loadingCustomers}
                            >
                                <span className="truncate">
                                    {selectedCustomer
                                        ? `${selectedCustomer.customer_name || selectedCustomer.store_name}${
                                              selectedCustomer.city || selectedCustomer.province
                                                  ? ` (${[selectedCustomer.city, selectedCustomer.province]
                                                        .filter(Boolean)
                                                        .join(", ")})`
                                                  : ""
                                          }`
                                        : "Select Customer..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                            <Command shouldFilter={false}>
                                <CommandInput
                                    placeholder="Search customer name or code..."
                                    value={customerSearch}
                                    onValueChange={onCustomerSearchChange}
                                />
                                <CommandList>
                                    {loadingCustomers ? (
                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                            Searching...
                                        </div>
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
                                                    {customers.map((c) => (
                                                        <CommandItem
                                                            key={c.id}
                                                            value={`${c.customer_name || c.store_name} ${c.customer_code} ${c.city} ${c.province}`}
                                                            onSelect={() => {
                                                                onCustomerChange(c.id.toString());
                                                                setOpenCustomer(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    selectedCustomer?.id === c.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">
                                                                    {c.customer_name || c.store_name}
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {c.customer_code}
                                                                    {c.city || c.province
                                                                        ? ` • ${[c.city, c.province].filter(Boolean).join(", ")}`
                                                                        : ""}
                                                                </span>
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
                                <span className="truncate">
                                    {selectedSalesman
                                        ? `${selectedSalesman.user_fname || ""} ${selectedSalesman.user_lname || ""}`.trim() ||
                                          selectedSalesman.salesman_name
                                        : "Select User..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Search user..." />
                                <CommandList>
                                    <CommandEmpty>No user found.</CommandEmpty>
                                    <CommandGroup>
                                        {salesmen.map((s) => (
                                            <CommandItem
                                                key={s.user_id || s.id}
                                                value={`${s.user_fname} ${s.user_lname}`}
                                                onSelect={() => {
                                                    onSalesmanChange((s.user_id || s.id).toString());
                                                    setOpenSalesman(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        (selectedSalesman?.user_id || selectedSalesman?.id) ===
                                                            (s.user_id || s.id)
                                                            ? "opacity-100"
                                                            : "opacity-0"
                                                    )}
                                                />
                                                {s.user_fname} {s.user_lname}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* 3. ACCOUNT (salesman_id) */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">
                        Account (Salesman ID) {loadingAccounts && "..."}
                    </label>
                    <Popover open={openAccount} onOpenChange={setOpenAccount}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full justify-between font-normal h-9 text-xs"
                                disabled={!selectedSalesman || loadingAccounts}
                            >
                                <span className="truncate">
                                    {selectedAccount
                                        ? `${selectedAccount.salesman_name} (${selectedAccount.salesman_code})`
                                        : "Select Account..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Search account..." />
                                <CommandList>
                                    <CommandEmpty>No account found.</CommandEmpty>
                                    <CommandGroup>
                                        {accounts.map((a) => (
                                            <CommandItem
                                                key={a.id}
                                                value={`${a.salesman_name} ${a.salesman_code}`}
                                                onSelect={() => {
                                                    onAccountChange(a.id.toString());
                                                    setOpenAccount(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedAccount?.id === a.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {a.salesman_name} ({a.salesman_code})
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* 4. BRANCH */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">
                        Branch <span className="text-red-500">*</span>
                    </label>
                    <Popover open={openBranch} onOpenChange={setOpenBranch}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between font-normal h-9 text-xs">
                                <span className="truncate">
                                    {selectedBranchId && branches.find((b) => b.id.toString() === selectedBranchId)
                                        ? `${branches.find((b) => b.id.toString() === selectedBranchId)!.branch_name} (${
                                              branches.find((b) => b.id.toString() === selectedBranchId)!.branch_code
                                          })`
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
                                            {branches.map((b) => (
                                                <CommandItem
                                                    key={b.id}
                                                    value={`${b.branch_name} ${b.branch_code}`}
                                                    onSelect={() => {
                                                        onBranchChange(b.id.toString());
                                                        setOpenBranch(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedBranchId === b.id.toString()
                                                                ? "opacity-100"
                                                                : "opacity-0"
                                                        )}
                                                    />
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

                {/* ROW 2: INVOICE TYPE, SALES TYPE, DATES */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase text-muted-foreground truncate">
                            Invoice / Receipt Type
                        </label>
                        <Select value={selectedReceiptTypeId} onValueChange={onReceiptTypeChange}>
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                {receiptTypes.map((t) => (
                                    <SelectItem key={t.id} value={t.id.toString()}>
                                        {t.type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase text-muted-foreground truncate">
                            Sales Type
                        </label>
                        <Select value={selectedSalesTypeId} onValueChange={onSalesTypeChange}>
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Operation" />
                            </SelectTrigger>
                            <SelectContent>
                                {salesTypes.map((t) => (
                                    <SelectItem key={t.id} value={t.id.toString()}>
                                        {t.operation_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* INVOICE DATE & DISPATCH DATE */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase text-muted-foreground truncate">
                            Invoice Date <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <CalendarIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                type="date"
                                value={invoiceDate || ""}
                                onChange={(e) => onInvoiceDateChange(e.target.value)}
                                className="pl-8 h-9 text-xs"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase text-muted-foreground truncate">
                            Dispatch Date
                        </label>
                        <div className="relative">
                            <CalendarIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                type="date"
                                value={dispatchDate || ""}
                                onChange={(e) => onDispatchDateChange(e.target.value)}
                                className="pl-8 h-9 text-xs"
                            />
                        </div>
                    </div>
                </div>

                {/* DUE DATE & PAYMENT TERMS */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase text-muted-foreground truncate">
                            Payment Terms
                        </label>
                        <Select
                            value={paymentTerms?.toString() || ""}
                            onValueChange={(val) => onPaymentTermsChange(val ? Number(val) : null)}
                        >
                            <SelectTrigger className="h-9 text-xs border-sky-500/20 bg-sky-500/10 font-semibold text-sky-700 dark:text-sky-300">
                                <SelectValue placeholder="Select Terms" />
                            </SelectTrigger>
                            <SelectContent>
                                {paymentTermsList.map((pt) => (
                                    <SelectItem key={pt.id} value={pt.id.toString()}>
                                        {pt.payment_name || pt.payment_terms} ({pt.payment_days}d)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase text-muted-foreground truncate">
                            Due Date <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <CalendarIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                type="date"
                                value={dueDate || ""}
                                onChange={(e) => onDueDateChange(e.target.value)}
                                className="pl-8 h-9 text-xs"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* INVOICE NO */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase text-muted-foreground">
                            Invoice No. <span className="text-red-500">*</span>
                        </label>
                        {checkingInvoiceNo ? (
                            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" /> Checking
                            </span>
                        ) : invoiceNoExists ? (
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Already Exists
                            </span>
                        ) : null}
                    </div>
                    <div className="flex gap-1.5">
                        <div className="relative flex-1">
                            <Hash className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="e.g. SRV-20261109-001"
                                value={invoiceNo}
                                onChange={(e) => onInvoiceNoChange(e.target.value)}
                                className={cn(
                                    "pl-8 h-9 text-xs font-mono",
                                    invoiceNoExists && "border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                )}
                                required
                            />
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            title="Generate Invoice Number"
                            onClick={onGenerateInvoiceNo}
                        >
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </Button>
                    </div>
                </div>

                {/* ROW 3: CREDIT LIMIT, RECEIVABLES, ORDER / REF ID */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase text-muted-foreground">Credit Limit</label>
                        {creditLimit > 0 ? (
                            isExceeded ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
                                    <AlertCircle className="w-3 h-3 text-rose-500" />
                                    Exceeded
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                    Within Limit
                                </span>
                            )
                        ) : selectedCustomer ? (
                            <span className="text-[10px] text-muted-foreground italic">No Limit</span>
                        ) : null}
                    </div>
                    <div className="relative">
                        <CreditCard
                            className={cn(
                                "absolute left-2.5 top-2.5 h-3.5 w-3.5",
                                isExceeded ? "text-rose-500" : "text-muted-foreground"
                            )}
                        />
                        <Input
                            type="text"
                            value={selectedCustomer ? formatCurrency(creditLimit) : "—"}
                            className={cn(
                                "pl-9 h-9 text-xs font-semibold cursor-not-allowed opacity-90",
                                isExceeded
                                    ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                    : "bg-muted/30 text-foreground"
                            )}
                            readOnly
                            disabled
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase text-muted-foreground">Receivables</label>
                        {loadingReceivable && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Checking...
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        {loadingReceivable ? (
                            <Loader2 className="absolute left-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-sky-500" />
                        ) : (
                            <Clock
                                className={cn(
                                    "absolute left-2.5 top-2.5 h-3.5 w-3.5",
                                    isExceeded ? "text-rose-500" : "text-amber-500"
                                )}
                            />
                        )}
                        <Input
                            type="text"
                            value={
                                loadingReceivable
                                    ? "Loading balance..."
                                    : selectedCustomer
                                    ? formatCurrency(receivableAmount)
                                    : "—"
                            }
                            className={cn(
                                "pl-9 h-9 text-xs font-bold cursor-not-allowed opacity-90",
                                isExceeded
                                    ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold"
                                    : receivableAmount > 0
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    : "bg-muted/30 text-foreground"
                            )}
                            readOnly
                            disabled
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">
                        Order / Reference / PO Number (<code className="text-[10px]">order_id</code>)
                    </label>
                    <div className="relative">
                        <Hash className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Enter Reference / Order ID (defaults to Invoice No if blank)"
                            value={orderId || ""}
                            onChange={(e) => onOrderIdChange(e.target.value)}
                            className="pl-9 h-9 text-xs font-mono"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

