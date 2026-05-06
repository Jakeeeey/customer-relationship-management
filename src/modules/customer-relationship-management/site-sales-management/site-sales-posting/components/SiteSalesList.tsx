"use client";
import { cn } from "@/lib/utils";

import React, { useState, useEffect, useCallback } from "react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/new-data-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Plus, Loader2, ArrowUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { format, isValid, parseISO } from "date-fns";
import { SalesInvoiceHeader, Salesman, Customer, SalesType, WorklistFilters } from "../types";
import Link from "next/link";

interface SiteSalesListProps {
    data: SalesInvoiceHeader[];
    isLoading: boolean;
    salesmen: Salesman[];
    customers: Customer[];
    salesTypes: SalesType[];
    onFilterChange: (filters: WorklistFilters) => void;
}

export const SiteSalesList: React.FC<SiteSalesListProps> = ({ 
    data, 
    isLoading,
    salesmen,
    customers,
    salesTypes,
    onFilterChange 
}) => {
    const formatDate = (dateString?: string | null) => {
        if (!dateString) return "--";
        const date = parseISO(dateString);
        return isValid(date) ? format(date, "MMM dd, yyyy hh:mm a") : dateString;
    };

    const [search, setSearch] = useState("");
    const [customer, setCustomer] = useState("all");
    const [salesman, setSalesman] = useState("all");
    const [salesType] = useState("3");
    const [isDispatched, setIsDispatched] = useState(false);
    const [isPaid, setIsPaid] = useState(false);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [sorting, setSorting] = useState<SortingState>([{ id: "invoice_date", desc: true }]);
    const [openCustomer, setOpenCustomer] = useState(false);
    const [openSalesman, setOpenSalesman] = useState(false);

    const applyFilters = useCallback(() => {
        onFilterChange({
            search,
            salesmanId: salesman === "all" ? undefined : salesman,
            customerId: customer === "all" ? undefined : customer,
            salesTypeId: salesType === "all" ? undefined : salesType,
            startDate: dateFrom,
            endDate: dateTo,
            isDispatched,
            isPaid
        });
    }, [onFilterChange, search, salesman, customer, salesType, dateFrom, dateTo, isDispatched, isPaid]);

    useEffect(() => {
        const timer = setTimeout(applyFilters, 500);
        return () => clearTimeout(timer);
    }, [applyFilters]);

    const columns: ColumnDef<SalesInvoiceHeader>[] = [
        {
            accessorKey: "invoice_no",
            header: "Receipt No.",
            cell: ({ row }) => (
                <Link 
                    href={`/crm/site-sales-management/site-sales-posting/${row.original.invoice_id}`}
                    className="block -m-3 p-3 font-black text-primary hover:bg-primary/5 transition-all"
                >
                    {row.original.invoice_no}
                </Link>
            )
        },
        {
            accessorKey: "salesman_name",
            header: "Salesman",
            cell: ({ row }) => (
                <Link 
                    href={`/crm/site-sales-management/site-sales-posting/${row.original.invoice_id}`}
                    className="block -m-3 p-3 hover:bg-primary/5 transition-colors font-medium text-slate-700 dark:text-slate-300"
                >
                    {row.original.salesman_name || "--"}
                </Link>
            )
        },
        {
            accessorKey: "customer_name",
            header: "Customer",
            cell: ({ row }) => (
                <Link 
                    href={`/crm/site-sales-management/site-sales-posting/${row.original.invoice_id}`}
                    className="block -m-3 p-3 hover:bg-primary/5 transition-colors"
                >
                    <span className="font-bold text-slate-900 dark:text-slate-100">{row.original.customer_name || "N/A"}</span>
                </Link>
            )
        },
        {
            accessorKey: "invoice_type",
            header: "Type",
            cell: () => <Badge variant="outline">DR</Badge>
        },
        {
            accessorKey: "invoice_date",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="p-0 hover:bg-transparent font-black uppercase tracking-widest text-[10px]"
                    >
                        Receipt Date
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                );
            },
            cell: ({ row }) => (
                <Link 
                    href={`/crm/site-sales-management/site-sales-posting/${row.original.invoice_id}`}
                    className="block -m-3 p-3 hover:bg-primary/5 transition-colors"
                >
                    <span className="text-slate-500 dark:text-slate-400">{formatDate(row.original.invoice_date)}</span>
                </Link>
            )
        },
        {
            accessorKey: "dispatch_date",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="p-0 hover:bg-transparent font-black uppercase tracking-widest text-[10px]"
                    >
                        Dispatch Date
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                );
            },
            cell: ({ row }) => (
                <Link 
                    href={`/crm/site-sales-management/site-sales-posting/${row.original.invoice_id}`}
                    className="block -m-3 p-3 hover:bg-primary/5 transition-colors"
                >
                    <span className="text-slate-500 dark:text-slate-400 font-medium italic">{formatDate(row.original.dispatch_date)}</span>
                </Link>
            )
        },
        {
            accessorKey: "total_amount",
            header: () => <div className="text-right">Total Amount</div>,
            cell: ({ row }) => (
                <Link 
                    href={`/crm/site-sales-management/site-sales-posting/${row.original.invoice_id}`}
                    className="block -m-3 p-3 hover:bg-primary/5 transition-colors"
                >
                    <div className="text-right font-bold text-slate-900 dark:text-slate-100">
                        ₱{Number(row.original.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                </Link>
            )
        },
        {
            accessorKey: "transaction_status",
            header: "Trans. Status",
            cell: ({ row }) => {
                const status = row.original.transaction_status?.toUpperCase() || 'PREPARED';
                const colors = 
                    status === 'VOID' ? 'bg-red-50 text-red-700 border-red-200' :
                    status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    'bg-sky-50 text-sky-700 border-sky-200';
                
                return (
                    <Badge variant="outline" className={cn("uppercase text-[9px] font-black px-2 py-0.5 rounded-md tracking-tighter", colors)}>
                        {status}
                    </Badge>
                );
            }
        },
        {
            accessorKey: "payment_status",
            header: "Payment",
            cell: ({ row }) => {
                const status = row.original.payment_status?.toUpperCase() || 'UNPAID';
                const isPaid = status === 'PAID';
                
                return (
                    <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", isPaid ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500 animate-pulse")} />
                        <span className={cn("text-[10px] font-black uppercase tracking-tight", isPaid ? "text-emerald-700" : "text-amber-700")}>
                            {status}
                        </span>
                    </div>
                );
            }
        },
        {
            accessorKey: "remarks",
            header: "Remarks",
            cell: ({ row }) => (
                <div className="max-w-[150px] truncate text-[11px] text-slate-500 italic" title={row.original.remarks || ""}>
                    {row.original.remarks || "--"}
                </div>
            )
        },
    ];

    const ActionComponent = (
        <div className="flex gap-2">
            <Button 
                size="sm" 
                className="rounded-lg gap-2 bg-slate-900 hover:bg-slate-800"
                asChild
            >
                <Link href="/crm/site-sales-management/site-sales-posting/create-sales-invoice">
                    <Plus className="w-4 h-4" /> Add Record
                </Link>
            </Button>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="bg-card p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:shadow-md transition-shadow duration-300">
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 items-end">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Receipt No</label>
                        <Input 
                            placeholder="Search invoice..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)} 
                            className="h-9 rounded-lg border-slate-200 focus:border-primary"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Customer</label>
                        <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCustomer}
                                    className={cn("w-full justify-between h-auto py-2 px-3", customer === "all" && "text-muted-foreground")}
                                >
                                    <div className="flex flex-col items-start truncate text-left">
                                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate w-full">
                                            {customer === "all" 
                                                ? "Select Customer" 
                                                : (customers.find(c => c.customer_code === customer)?.customer_name || 
                                                   customers.find(c => c.customer_code === customer)?.store_name || 
                                                   customer)}
                                        </span>
                                        {customer !== "all" && (
                                            <span className="text-[10px] text-muted-foreground truncate w-full">
                                                {[customers.find(c => c.customer_code === customer)?.city, customers.find(c => c.customer_code === customer)?.province].filter(Boolean).join(", ")}
                                            </span>
                                        )}
                                    </div>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search customer..." />
                                    <CommandList>
                                        <CommandEmpty>No results found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="all"
                                                onSelect={() => {
                                                    setCustomer("all");
                                                    setOpenCustomer(false);
                                                }}
                                                className="flex items-center gap-2 py-3 cursor-pointer"
                                            >
                                                <Check className={cn("h-4 w-4 shrink-0", customer === "all" ? "opacity-100" : "opacity-0")} />
                                                <span className="font-medium text-slate-900 dark:text-slate-100">All Customers</span>
                                            </CommandItem>
                                            {customers.map((c) => (
                                                <CommandItem
                                                    key={c.customer_code}
                                                    value={`${c.customer_name} ${c.store_name} ${c.customer_code} ${c.city} ${c.province}`}
                                                    onSelect={() => {
                                                        setCustomer(c.customer_code);
                                                        setOpenCustomer(false);
                                                    }}
                                                    className="flex items-center gap-2 py-3 cursor-pointer"
                                                >
                                                    <Check className={cn("h-4 w-4 shrink-0", customer === c.customer_code ? "opacity-100" : "opacity-0")} />
                                                    <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                                                        <span className="font-medium text-slate-900 dark:text-slate-100 leading-tight whitespace-normal break-words overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                            {c.customer_name || c.store_name}
                                                        </span>
                                                        {(c.city || c.province) && (
                                                            <span className="text-[10px] text-muted-foreground truncate block">
                                                                {[c.city, c.province].filter(Boolean).join(", ")}
                                                            </span>
                                                        )}
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sales Type</label>
                        <Input 
                            value={salesTypes.find(st => st.id.toString() === salesType)?.operation_name || "SITE SALES"} 
                            readOnly 
                            disabled
                            className="h-9 rounded-lg border-slate-200 bg-slate-50/50 text-[10px] font-black uppercase tracking-tight cursor-not-allowed italic text-slate-400 shadow-none" 
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Salesman</label>
                        <Popover open={openSalesman} onOpenChange={setOpenSalesman}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openSalesman}
                                    className={cn("w-full justify-between h-auto py-2 px-3", salesman === "all" && "text-muted-foreground")}
                                >
                                    <div className="flex flex-col items-start truncate text-left">
                                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate w-full">
                                            {salesman === "all" 
                                                ? "Select Salesman" 
                                                : (salesmen.find(s => s.id.toString() === salesman)?.salesman_name || salesman)}
                                        </span>
                                        {salesman !== "all" && (
                                            <span className="text-[10px] text-muted-foreground truncate w-full">
                                                {salesmen.find(s => s.id.toString() === salesman)?.salesman_code}
                                            </span>
                                        )}
                                    </div>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search salesman..." />
                                    <CommandList>
                                        <CommandEmpty>No results found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="all"
                                                onSelect={() => {
                                                    setSalesman("all");
                                                    setOpenSalesman(false);
                                                }}
                                                className="flex items-center gap-2 py-3 cursor-pointer"
                                            >
                                                <Check className={cn("h-4 w-4 shrink-0", salesman === "all" ? "opacity-100" : "opacity-0")} />
                                                <span className="font-medium text-slate-900 dark:text-slate-100">All Salesmen</span>
                                            </CommandItem>
                                            {salesmen.map((s) => (
                                                <CommandItem
                                                    key={s.id}
                                                    value={`${s.salesman_name} ${s.salesman_code}`}
                                                    onSelect={() => {
                                                        setSalesman(s.id.toString());
                                                        setOpenSalesman(false);
                                                    }}
                                                    className="flex items-center gap-2 py-3 cursor-pointer"
                                                >
                                                    <Check className={cn("h-4 w-4 shrink-0", salesman === s.id.toString() ? "opacity-100" : "opacity-0")} />
                                                    <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                                                        <span className="font-medium text-slate-900 dark:text-slate-100 leading-tight whitespace-normal break-words overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                            {s.salesman_name}
                                                        </span>
                                                        {s.salesman_code && (
                                                            <span className="text-[10px] text-muted-foreground truncate block">
                                                                {s.salesman_code}
                                                            </span>
                                                        )}
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date From</label>
                        <Input 
                            type="date" 
                            className="h-9 rounded-lg border-slate-200" 
                            value={dateFrom} 
                            onChange={(e) => setDateFrom(e.target.value)} 
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date To</label>
                        <Input 
                            type="date" 
                            className="h-9 rounded-lg border-slate-200" 
                            value={dateTo} 
                            onChange={(e) => setDateTo(e.target.value)} 
                        />
                    </div>

                    <div className="flex items-center gap-4 h-9 px-2 col-span-1 md:col-span-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="isDispatched" 
                                checked={isDispatched} 
                                onCheckedChange={(c) => setIsDispatched(c === true)} 
                            />
                            <label htmlFor="isDispatched" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer">isDispatched</label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="isPaid" 
                                checked={isPaid} 
                                onCheckedChange={(c) => setIsPaid(c === true)} 
                            />
                            <label htmlFor="isPaid" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer">isPaid</label>
                        </div>
                    </div>
                </div>
            </div>

            {/* DataTable Component with Loading Overlay */}
            <div className="relative">
                {isLoading && data.length > 0 && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 dark:bg-slate-950/40 backdrop-blur-[2px] rounded-xl transition-all duration-300">
                        <div className="flex flex-col items-center gap-3 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 scale-110">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 animate-pulse">Updating Data...</span>
                        </div>
                    </div>
                )}
                
                <DataTable 
                    columns={columns} 
                    data={data} 
                    isLoading={isLoading}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    actionComponent={ActionComponent}
                    emptyTitle="No Site Sales Found"
                    emptyDescription="Try adjusting your filters or wait for new transactions to be uploaded."
                />
            </div>

        </div>
    );
};
