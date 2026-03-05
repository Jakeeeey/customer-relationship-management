"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Printer, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Salesman, Account, Customer, Supplier } from "../hooks/useCallSheetForm";

interface CallSheetFilterCardProps {
    salesmen: Salesman[];
    selectedSalesman: Salesman | null;
    accounts: Account[];
    selectedAccount: Account | null;
    loadingAccounts: boolean;
    customers: Customer[];
    selectedCustomer: Customer | null;
    loadingCustomers: boolean;
    suppliers: Supplier[];
    selectedSupplier: Supplier | null;
    loadingSuppliers: boolean;
    onSalesmanChange: (val: string) => void;
    onAccountChange: (val: string) => void;
    onCustomerChange: (val: string) => void;
    onSupplierChange: (val: string) => void;
    onPrint: () => void;
    onPreview: () => void;
}

export function CallSheetFilterCard({
    salesmen,
    selectedSalesman,
    accounts,
    selectedAccount,
    loadingAccounts,
    customers,
    selectedCustomer,
    loadingCustomers,
    suppliers,
    selectedSupplier,
    loadingSuppliers,
    onSalesmanChange,
    onAccountChange,
    onCustomerChange,
    onSupplierChange,
    onPrint,
    onPreview
}: CallSheetFilterCardProps) {
    const [openSalesman, setOpenSalesman] = useState(false);
    const [openAccount, setOpenAccount] = useState(false);
    const [openCustomer, setOpenCustomer] = useState(false);
    const [openSupplier, setOpenSupplier] = useState(false);

    return (
        <Card className="print:hidden">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Callsheet Filters</CardTitle>
                    <CardDescription>Select a salesman, customer, and supplier to generate the callsheet.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={onPreview} disabled={!selectedSupplier} className="gap-2">
                        <Printer size={16} /> Preview PDF
                    </Button>
                    <Button onClick={onPrint} disabled={!selectedSupplier}>
                        Download PDF
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2 min-w-0">
                    <label className="text-sm font-medium truncate">User Salesman</label>
                    <Popover open={openSalesman} onOpenChange={setOpenSalesman}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openSalesman}
                                className="w-full justify-between font-normal"
                            >
                                <span className="truncate">
                                    {selectedSalesman
                                        ? `${selectedSalesman.user_fname} ${selectedSalesman.user_lname}`
                                        : "Select User..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Search user..." />
                                <CommandList>
                                    <CommandEmpty>No user found.</CommandEmpty>
                                    <CommandGroup>
                                        {salesmen.map(s => (
                                            <CommandItem
                                                key={s.user_id}
                                                value={`${s.user_fname} ${s.user_lname}`}
                                                onSelect={() => {
                                                    onSalesmanChange(s.user_id.toString())
                                                    setOpenSalesman(false)
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4 shrink-0",
                                                        selectedSalesman?.user_id === s.user_id ? "opacity-100" : "opacity-0"
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

                {accounts.length > 0 && (
                    <div className="flex flex-col gap-2 min-w-0">
                        <label className="text-sm font-medium truncate">Account {loadingAccounts && "..."}</label>
                        <Popover open={openAccount} onOpenChange={setOpenAccount}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openAccount}
                                    disabled={!selectedSalesman || loadingAccounts}
                                    className="w-full justify-between font-normal"
                                >
                                    <span className="truncate">
                                        {selectedAccount
                                            ? `${selectedAccount.salesman_name} (${selectedAccount.salesman_code})`
                                            : "Select Account..."}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[350px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search account..." />
                                    <CommandList>
                                        <CommandEmpty>No account found.</CommandEmpty>
                                        <CommandGroup>
                                            {accounts.map(a => (
                                                <CommandItem
                                                    key={a.id}
                                                    value={`${a.salesman_name} ${a.salesman_code}`}
                                                    onSelect={() => {
                                                        onAccountChange(a.id.toString())
                                                        setOpenAccount(false)
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4 shrink-0",
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
                        {selectedAccount && <p className="text-xs text-muted-foreground truncate" title={selectedAccount.price_type || 'N/A'}>Price Type: {selectedAccount.price_type || 'N/A'}</p>}
                    </div>
                )}

                <div className="flex flex-col gap-2 min-w-0">
                    <label className="text-sm font-medium truncate">Customer {loadingCustomers && "..."}</label>
                    <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openCustomer}
                                disabled={!selectedSalesman || (accounts.length > 0 && !selectedAccount) || loadingCustomers}
                                className="w-full justify-between font-normal"
                            >
                                <span className="truncate">
                                    {selectedCustomer ? selectedCustomer.customer_name : "Select Customer..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Search customer..." />
                                <CommandList>
                                    <CommandEmpty>No customer found.</CommandEmpty>
                                    <CommandGroup>
                                        {customers.map(c => (
                                            <CommandItem
                                                key={c.id}
                                                value={c.customer_name}
                                                onSelect={() => {
                                                    onCustomerChange(c.id.toString())
                                                    setOpenCustomer(false)
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4 shrink-0",
                                                        selectedCustomer?.id === c.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {c.customer_name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    {selectedCustomer && <p className="text-xs text-muted-foreground truncate" title={selectedCustomer.customer_code}>Code: {selectedCustomer.customer_code}</p>}
                </div>

                <div className="flex flex-col gap-2 min-w-0">
                    <label className="text-sm font-medium truncate">Supplier {loadingSuppliers && "..."}</label>
                    <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openSupplier}
                                disabled={!selectedCustomer || loadingSuppliers}
                                className="w-full justify-between font-normal"
                            >
                                <span className="truncate">
                                    {selectedSupplier ? selectedSupplier.supplier_name : "Select Supplier..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Search supplier..." />
                                <CommandList>
                                    <CommandEmpty>No supplier found.</CommandEmpty>
                                    <CommandGroup>
                                        {suppliers.map(s => (
                                            <CommandItem
                                                key={s.id}
                                                value={s.supplier_name}
                                                onSelect={() => {
                                                    onSupplierChange(s.id.toString())
                                                    setOpenSupplier(false)
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4 shrink-0",
                                                        selectedSupplier?.id === s.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {s.supplier_name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            </CardContent>
        </Card>
    );
}
