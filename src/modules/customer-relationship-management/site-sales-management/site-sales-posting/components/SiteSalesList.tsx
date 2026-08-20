"use client";
import { cn } from "@/lib/utils";

import React, { useState, useEffect, useCallback } from "react";
import { useSiteSalesStore } from "../store";
import { 
    ColumnDef, 
    SortingState,
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    flexRender,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
    Check, 
    ChevronsUpDown, 
    Plus, 
    Loader2, 
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { format, isValid, parseISO } from "date-fns";
import { SalesInvoiceHeader, Salesman, Customer, SalesType, WorklistFilters } from "../types";
import Link from "next/link";
import { EmptyPlaceholder } from "@/components/shared/EmptyPlaceholder";

interface SiteSalesListProps {
    data: SalesInvoiceHeader[];
    isLoading: boolean;
    salesmen: Salesman[];
    customers: Customer[];
    salesTypes: SalesType[];
    totalCount: number;
    onSearchCustomers?: (search: string) => Promise<void>;
    onFilterChange: (filters: WorklistFilters) => void;
}

export const SiteSalesList: React.FC<SiteSalesListProps> = ({ 
    data, 
    isLoading,
    salesmen,
    customers,
    onSearchCustomers,
    salesTypes,
    totalCount,
    onFilterChange 
}) => {
    const formatDate = (dateString?: string | null) => {
        if (!dateString) return "--";
        const cleanString = dateString.replace('T', ' ').replace(/Z$/, '').split('.')[0];
        const date = parseISO(cleanString);
        return isValid(date) ? format(date, "MMM dd, yyyy hh:mm a") : dateString;
    };

    const {
        search, setSearch,
        customer, setCustomer,
        salesman, setSalesman,
        dateFrom, setDateFrom,
        dateTo, setDateTo,
        isDispatched, setIsDispatched,
        isPaid, setIsPaid
    } = useSiteSalesStore();

    const [salesType] = useState("3");
    const [sorting, setSorting] = useState<SortingState>([{ id: "invoice_date", desc: true }]);
    const [rowSelection, setRowSelection] = useState({});
    const [openCustomer, setOpenCustomer] = useState(false);
    const [searchCustomerQuery, setSearchCustomerQuery] = useState("");
    const [openSalesman, setOpenSalesman] = useState(false);

    // Debounced customer search
    useEffect(() => {
        if (!onSearchCustomers) return;
        const timer = setTimeout(() => {
            onSearchCustomers(searchCustomerQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchCustomerQuery, onSearchCustomers]);

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
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="p-0 hover:bg-transparent font-black uppercase tracking-widest text-[10px]"
                    >
                        Receipt No.
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                );
            },
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
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="p-0 hover:bg-transparent font-black uppercase tracking-widest text-[10px]"
                    >
                        Salesman
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                );
            },
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
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="p-0 hover:bg-transparent font-black uppercase tracking-widest text-[10px]"
                    >
                        Customer
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                );
            },
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
            cell: ({ row }) => {
                const invType = row.original.invoice_type;
                const shortcut = (invType && typeof invType === "object" && "shortcut" in invType)
                    ? (invType.shortcut as string)
                    : "--";
                return <Badge variant="outline">{shortcut}</Badge>;
            }
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
            accessorKey: "isPosted",
            header: "Posted",
            cell: ({ row }) => {
                const val = row.original.isPosted as boolean | number | string | null | undefined | { data: number[] };
                // Handle BIT(1) which might come as boolean, number, or Buffer object
                const isPosted = val === true || val === 1 || val === "1" || 
                                (val && typeof val === 'object' && 'data' in val && Array.isArray(val.data) && val.data[0] === 1);
                return (
                    <div className="flex justify-center">
                        <div 
                            className={cn(
                                "h-4 w-4 rounded-full border-2 transition-all duration-500 ease-out flex items-center justify-center",
                                isPosted 
                                    ? "bg-slate-900 border-slate-900 shadow-[0_0_12px_rgba(15,23,42,0.3)] dark:bg-white dark:border-white dark:shadow-[0_0_12px_rgba(255,255,255,0.2)]" 
                                    : "bg-transparent border-slate-200 dark:border-slate-800"
                            )}
                            title={isPosted ? "Posted to Ledger" : "Draft / Unposted"}
                        >
                            {isPosted && <Check className="h-2.5 w-2.5 text-white dark:text-slate-950 stroke-[4px]" />}
                        </div>
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

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            rowSelection,
        },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

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
                                <Command shouldFilter={!onSearchCustomers}>
                                    <CommandInput 
                                        placeholder="Search customer..." 
                                        value={searchCustomerQuery}
                                        onValueChange={setSearchCustomerQuery}
                                    />
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

                    <div className="flex flex-col justify-end gap-2 pb-1.5 h-full">
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="isDispatched" 
                                checked={isDispatched} 
                                onCheckedChange={(c) => setIsDispatched(c === true)} 
                            />
                            <label htmlFor="isDispatched" className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest cursor-pointer">isDispatched</label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="isPaid" 
                                checked={isPaid} 
                                onCheckedChange={(c) => setIsPaid(c === true)} 
                            />
                            <label htmlFor="isPaid" className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest cursor-pointer">isPaid</label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between px-2">
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                    {ActionComponent}
                </div>
            </div>

            <div className="relative">
                {isLoading && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 dark:bg-slate-950/40 backdrop-blur-[2px] rounded-xl transition-all duration-300">
                        <div className="flex flex-col items-center gap-3 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 scale-110">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 animate-pulse">
                                {data.length > 0 ? "Updating Data..." : "Loading Transactions..."}
                            </span>
                        </div>
                    </div>
                )}
                
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-card shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="bg-slate-50/50 dark:bg-slate-900/50 border-b dark:border-slate-800">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className="font-bold py-4 px-6 text-[10px] uppercase tracking-widest text-slate-500">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {isLoading && !data?.length ? (
                                Array.from({ length: 10 }).map((_, rowIndex) => (
                                    <TableRow key={rowIndex} className="hover:bg-transparent border-b dark:border-slate-800 last:border-0">
                                        {columns.map((_, colIndex) => (
                                            <TableCell key={colIndex} className="py-4 px-6">
                                                <div className="h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded w-full" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors border-b dark:border-slate-800 last:border-0"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="py-4 px-6">
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-32 text-center border-none hover:bg-transparent"
                                    >
                                        <EmptyPlaceholder
                                            title="No Site Sales Found"
                                            description="Try adjusting your filters or wait for new transactions to be uploaded."
                                        />
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex items-center justify-between px-2 mt-4">
                    <div className="flex-1 text-sm text-slate-500 font-medium italic">
                        Total of <span className="font-black text-primary">{totalCount.toLocaleString()}</span> row(s) found.
                    </div>
                    <div className="flex items-center space-x-6 lg:space-x-8">
                        <div className="flex items-center space-x-2">
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Rows per page</p>
                            <Select
                                value={`${table.getState().pagination.pageSize}`}
                                onValueChange={(value) => {
                                    table.setPageSize(Number(value));
                                }}
                            >
                                <SelectTrigger className="h-8 w-[70px] rounded-lg border-slate-200">
                                    <SelectValue placeholder={table.getState().pagination.pageSize} />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[10, 20, 30, 40, 50].map((pageSize) => (
                                        <SelectItem key={pageSize} value={`${pageSize}`}>
                                            {pageSize}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex w-[100px] items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-400">
                            Page {table.getState().pagination.pageIndex + 1} of{" "}
                            {table.getPageCount()}
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                className="hidden h-8 w-8 p-0 lg:flex rounded-lg border-slate-200"
                                onClick={() => table.setPageIndex(0)}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0 rounded-lg border-slate-200"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0 rounded-lg border-slate-200"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                className="hidden h-8 w-8 p-0 lg:flex rounded-lg border-slate-200"
                                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                disabled={!table.getCanNextPage()}
                            >
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
