"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";

import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    flexRender,
    ColumnDef,
    SortingState,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Download,
    FileSpreadsheet,
    FileText,
    Check,
    ChevronsUpDown,
    Loader2,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    X,
    Printer,
    Layout,
    Eye,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { format, isValid, parseISO } from "date-fns";
import { SalesInvoiceHeader, Salesman, Customer, SalesType, WorklistFilters, SiteSalesSummaryStats } from "../types";
import { SiteSalesSummaryDetailsModal } from "./SiteSalesSummaryDetailsModal";
import { EmptyPlaceholder } from "@/components/shared/EmptyPlaceholder";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { PdfTemplate } from "@/components/pdf-layout-design/services/pdf-template";

interface SiteSalesSummaryListProps {
    data: SalesInvoiceHeader[];
    isLoading: boolean;
    salesmen: Salesman[];
    customers: Customer[];
    salesTypes: SalesType[];
    totalCount: number;
    stats: SiteSalesSummaryStats;
    companyData: Record<string, unknown> | null;
    templates: PdfTemplate[];
    onFilterChange: (filters: WorklistFilters) => void;
    fetchAllForExport: (params: WorklistFilters) => Promise<SalesInvoiceHeader[]>;
}

export const SiteSalesSummaryList: React.FC<SiteSalesSummaryListProps> = ({
    data,
    isLoading,
    salesmen,
    customers,
    salesTypes,
    totalCount,
    stats,
    companyData,
    templates,
    onFilterChange,
    fetchAllForExport
}) => {
    const formatDate = useCallback((dateString?: string | null) => {
        if (!dateString) return "--";
        const date = parseISO(dateString);
        return isValid(date) ? format(date, "MMM dd, yyyy hh:mm a") : dateString;
    }, []);

    const [search, setSearch] = useState("");
    const [customer, setCustomer] = useState("all");
    const [salesman, setSalesman] = useState("all");
    const [salesType] = useState("3");
    const [isDispatched, setIsDispatched] = useState(true); // Default to dispatched for summary
    const [isPaid, setIsPaid] = useState(false);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [sorting, setSorting] = useState<SortingState>([{ id: "invoice_date", desc: true }]);
    const [openCustomer, setOpenCustomer] = useState(false);
    const [openSalesman, setOpenSalesman] = useState(false);
    const [isExporting, setIsExporting] = useState<"excel" | "pdf" | null>(null);

    // Pagination state
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    // Selection state
    const [rowSelection, setRowSelection] = useState({});

    // PDF Preview state
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [selectedTemplateName, setSelectedTemplateName] = useState<string>("");
    const [pdfOrientation, setPdfOrientation] = useState<"landscape" | "portrait">("landscape");
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Modal state
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (templates.length > 0 && !selectedTemplateName) {
            setSelectedTemplateName(templates[0].name);
        }
    }, [templates, selectedTemplateName]);

    const handleOpenDetails = useCallback((id: string) => {
        setSelectedInvoiceId(id);
        setIsModalOpen(true);
    }, []);

    const getCurrentFilters = useCallback((): WorklistFilters => ({
        search,
        salesmanId: salesman === "all" ? undefined : salesman,
        customerId: customer === "all" ? undefined : customer,
        salesTypeId: salesType === "all" ? undefined : salesType,
        startDate: dateFrom,
        endDate: dateTo,
        isDispatched,
        isPaid,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize
    }), [search, salesman, customer, salesType, dateFrom, dateTo, isDispatched, isPaid, pagination]);

    const columns = useMemo<ColumnDef<SalesInvoiceHeader>[]>(() => [
        {
            id: "select",
            header: ({ table }) => (
                <div className="flex items-center justify-center">
                    <Checkbox
                        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                        className="h-4 w-4 rounded-md border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                </div>
            ),
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
                        className="h-4 w-4 rounded-md border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                </div>
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "invoice_no",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="p-0 hover:bg-transparent font-black uppercase tracking-widest text-[10px]"
                >
                    Receipt No.
                    <ArrowUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            ),
            cell: ({ row }) => (
                <button
                    onClick={() => handleOpenDetails(row.original.invoice_id.toString())}
                    className="block -m-3 p-3 font-black text-primary hover:bg-primary/5 transition-all w-full text-left bg-transparent border-none"
                >
                    {row.original.invoice_no}
                </button>
            )
        },
        {
            accessorKey: "salesman_name",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="p-0 hover:bg-transparent font-black uppercase tracking-widest text-[10px]"
                >
                    Salesman
                    <ArrowUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            ),
            cell: ({ row }) => (
                <button
                    onClick={() => handleOpenDetails(row.original.invoice_id.toString())}
                    className="block -m-3 p-3 hover:bg-primary/5 transition-colors font-medium text-slate-700 dark:text-slate-300 w-full text-left bg-transparent border-none"
                >
                    {row.original.salesman_name || "--"}
                </button>
            )
        },
        {
            accessorKey: "customer_name",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="p-0 hover:bg-transparent font-black uppercase tracking-widest text-[10px]"
                >
                    Customer
                    <ArrowUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            ),
            cell: ({ row }) => (
                <button
                    onClick={() => handleOpenDetails(row.original.invoice_id.toString())}
                    className="block -m-3 p-3 hover:bg-primary/5 transition-colors w-full text-left bg-transparent border-none"
                >
                    <span className="font-bold text-slate-900 dark:text-slate-100">{row.original.customer_name || "N/A"}</span>
                </button>
            )
        },
        {
            accessorKey: "invoice_type",
            header: "Type",
            cell: ({ row }) => {
                const typeName = (row.original.invoice_type as { type?: string })?.type || "";
                const typeId = (row.original.invoice_type as { id?: number })?.id || row.original.invoice_type;

                const acronym = (Number(typeId) === 3 || typeName === "Delivery Receipt") ? "DR" : "SI";
                const badgeColor = acronym === "SI" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-50 text-slate-600 border-slate-100";

                return (
                    <Badge variant="outline" className={cn("font-black text-[10px] px-2 py-0", badgeColor)}>
                        {acronym}
                    </Badge>
                );
            }
        },
        {
            accessorKey: "invoice_date",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="p-0 hover:bg-transparent font-black uppercase tracking-widest text-[10px]"
                >
                    Receipt Date
                    <ArrowUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            ),
            cell: ({ row }) => (
                <button
                    onClick={() => handleOpenDetails(row.original.invoice_id.toString())}
                    className="block -m-3 p-3 hover:bg-primary/5 transition-colors w-full text-left bg-transparent border-none"
                >
                    <span className="text-slate-500 dark:text-slate-400">{formatDate(row.original.invoice_date)}</span>
                </button>
            )
        },
        {
            accessorKey: "dispatch_date",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="p-0 hover:bg-transparent font-black uppercase tracking-widest text-[10px]"
                >
                    Dispatch Date
                    <ArrowUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            ),
            cell: ({ row }) => (
                <button
                    onClick={() => handleOpenDetails(row.original.invoice_id.toString())}
                    className="block -m-3 p-3 hover:bg-primary/5 transition-colors w-full text-left bg-transparent border-none"
                >
                    <span className="text-slate-500 dark:text-slate-400 font-medium italic">{formatDate(row.original.dispatch_date)}</span>
                </button>
            )
        },
        {
            accessorKey: "total_amount",
            header: ({ column }) => (
                <div className="flex justify-end w-full">
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="p-0 hover:bg-transparent font-black uppercase tracking-widest text-[10px]"
                    >
                        Total Amount
                        <ArrowUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                </div>
            ),
            cell: ({ row }) => (
                <button
                    onClick={() => handleOpenDetails(row.original.invoice_id.toString())}
                    className="block -m-3 p-3 hover:bg-primary/5 transition-colors w-full bg-transparent border-none text-right"
                >
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                        P{Number(row.original.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                </button>
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
                        <div className={cn("h-2 w-2 rounded-full", isPaid ? "bg-emerald-500 shadow-[0_0_8_rgba(16,185,129,0.5)]" : "bg-amber-500 animate-pulse")} />
                        <span className={cn("text-[10px] font-black uppercase tracking-tight", isPaid ? "text-emerald-700" : "text-amber-700")}>
                            {status}
                        </span>
                    </div>
                );
            }
        },
        {
            accessorKey: "credits",
            header: () => <div className="text-right">Credits</div>,
            cell: ({ row }) => (
                <div className="text-right font-medium text-amber-600">
                    P{Number(row.original.credits || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
            )
        },
        {
            accessorKey: "debits",
            header: () => <div className="text-right">Debits</div>,
            cell: ({ row }) => (
                <div className="text-right font-medium text-blue-600">
                    P{Number(row.original.debits || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
            )
        },
        {
            accessorKey: "returns",
            header: () => <div className="text-right">Returns</div>,
            cell: ({ row }) => (
                <div className="text-right font-medium text-rose-600">
                    P{Number(row.original.returns || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
            )
        },
        {
            accessorKey: "balance",
            header: ({ column }) => (
                <div className="flex justify-end w-full">
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="p-0 hover:bg-transparent font-black uppercase tracking-widest text-[10px]"
                    >
                        Balance
                        <ArrowUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                </div>
            ),
            cell: ({ row }) => (
                <div className="text-right font-black text-slate-900 dark:text-slate-100">
                    P{Number(row.original.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
            )
        },
        {
            accessorKey: "isPosted",
            header: ({ column }) => (
                <div className="flex justify-center w-full">
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="p-0 hover:bg-transparent font-black uppercase tracking-widest text-[10px]"
                    >
                        Posted
                        <ArrowUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                </div>
            ),
            cell: ({ row }) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const val = (row.original.isPosted ?? (row.original as any).is_posted) as any;
                // Robust check for BIT(1) / Boolean / Number / String
                const isPosted = val === true || val === 1 || val === "1" || 
                                (val && typeof val === 'object' && 'data' in val && Array.isArray(val.data) && val.data[0] === 1);
                
                return (
                    <div className="flex justify-center">
                        {isPosted ? (
                            <div className="h-5 w-5 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 shadow-md border-none transition-all duration-300">
                                <Check className="h-3 w-3 stroke-[3px]" />
                            </div>
                        ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-slate-200 dark:border-slate-700 bg-transparent transition-all duration-300" />
                        )}
                    </div>
                );
            }
        },
    ], [formatDate, handleOpenDetails]);

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            rowSelection,
            pagination,
        },
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        onPaginationChange: setPagination,
        manualPagination: true,
        pageCount: Math.ceil(totalCount / pagination.pageSize),
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getRowId: (row) => row.invoice_id.toString(),
    });

    const handleExport = useCallback(async (type: "excel" | "pdf", overrideOrientation?: "landscape" | "portrait", overrideTemplate?: string) => {
        const targetType = type;
        const targetOrientation = overrideOrientation || pdfOrientation;
        const targetTemplate = overrideTemplate || selectedTemplateName || "Standard Layout";

        if (targetType === "pdf") setIsGeneratingPdf(true);
        setIsExporting(targetType);
        
        try {
            let exportData: SalesInvoiceHeader[] = [];
            const selectedRows = table.getFilteredSelectedRowModel().rows;
            
            if (selectedRows.length > 0) {
                // Use only selected rows
                exportData = selectedRows.map(row => row.original);
            } else {
                // Use all filtered data (fetch from API to be sure we have all pages)
                exportData = await fetchAllForExport(getCurrentFilters());
            }

            const fileName = `Site_Sales_Summary_${format(new Date(), "yyyyMMdd_HHmm")}`;
            const filters = getCurrentFilters();

            if (targetType === "excel") {
                const exportStats = selectedRows.length > 0 ? {
                    totalGross: exportData.reduce((sum, item) => sum + Number(item.net_amount || 0), 0),
                    totalCredits: exportData.reduce((sum, item) => sum + Number(item.credits || 0), 0),
                    totalReturns: exportData.reduce((sum, item) => sum + Number(item.returns || 0), 0),
                    totalDebits: exportData.reduce((sum, item) => sum + Number(item.debits || 0), 0),
                    totalBalance: exportData.reduce((sum, item) => sum + Number(item.balance || 0), 0),
                    invoiceCount: exportData.length
                } : stats;
                await exportToExcel(exportData, fileName, filters, exportStats);
            } else {
                // Recalculate stats for the selected data if needed
                const exportStats = selectedRows.length > 0 ? {
                    totalGross: exportData.reduce((sum, item) => sum + Number(item.net_amount || 0), 0),
                    totalCredits: exportData.reduce((sum, item) => sum + Number(item.credits || 0), 0),
                    totalReturns: exportData.reduce((sum, item) => sum + Number(item.returns || 0), 0),
                    totalDebits: exportData.reduce((sum, item) => sum + Number(item.debits || 0), 0),
                    totalBalance: exportData.reduce((sum, item) => sum + Number(item.balance || 0), 0),
                    invoiceCount: exportData.length
                } : stats;

                const doc = await exportToPDF(
                    exportData, 
                    fileName, 
                    filters, 
                    exportStats, 
                    companyData, 
                    targetTemplate,
                    targetOrientation
                );
                const blob = doc.output('blob');
                if (pdfUrl) URL.revokeObjectURL(pdfUrl); // Clean up old URL
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
                setIsPreviewOpen(true);
            }
        } catch (error) {
            console.error("Export failed:", error);
        } finally {
            setIsExporting(null);
            setIsGeneratingPdf(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchAllForExport, getCurrentFilters, pdfOrientation, selectedTemplateName, stats, companyData, table]);

    // Handle orientation/template changes in preview
    useEffect(() => {
        if (isPreviewOpen) {
            handleExport("pdf", pdfOrientation, selectedTemplateName);
        }
    }, [pdfOrientation, selectedTemplateName, isPreviewOpen, handleExport]); // Re-generate when these change

    const handlePrintFromPreview = () => {
        if (pdfUrl) {
            const printWindow = window.open(pdfUrl);
            printWindow?.print();
        }
    };

    const applyFilters = useCallback(() => {
        onFilterChange(getCurrentFilters());
    }, [onFilterChange, getCurrentFilters]);

    // Reset pagination when search or filters change
    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [search, customer, salesman, salesType, dateFrom, dateTo, isDispatched, isPaid]);

    useEffect(() => {
        const timer = setTimeout(applyFilters, 500);
        return () => clearTimeout(timer);
    }, [applyFilters]);



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

            <div className="flex items-center justify-end py-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="outline" 
                            className="h-10 px-6 bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground border-none shadow-lg shadow-primary/20 transition-all duration-300 font-black text-[10px] uppercase tracking-[0.2em] gap-3 rounded-xl group"
                            disabled={!!isExporting || isLoading}
                        >
                            {isExporting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4 group-hover:scale-110 transition-transform" />
                            )}
                            {isExporting ? "Exporting..." : "Export Report"}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px] p-2 rounded-2xl border-slate-200/60 dark:border-slate-800/60 shadow-2xl backdrop-blur-xl bg-white/90 dark:bg-slate-950/90">
                        <DropdownMenuItem 
                            onClick={() => handleExport("excel")}
                            className="flex items-center gap-3 py-3 px-3 cursor-pointer rounded-xl focus:bg-emerald-50 dark:focus:bg-emerald-500/10 focus:text-emerald-700 dark:focus:text-emerald-400 transition-all duration-200 group"
                        >
                            <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:rotate-12 transition-transform">
                                <FileSpreadsheet className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-[11px] tracking-tight">Excel Spreadsheet</span>
                                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">Download .xlsx format</span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={() => handleExport("pdf")}
                            className="flex items-center gap-3 py-3 px-3 cursor-pointer rounded-xl focus:bg-rose-50 dark:focus:bg-rose-500/10 focus:text-rose-700 dark:focus:text-rose-400 transition-all duration-200 group"
                        >
                            <div className="h-9 w-9 rounded-xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:-rotate-12 transition-transform">
                                <Eye className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-[11px] tracking-tight">PDF Preview</span>
                                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">Choose Template & Preview</span>
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Preview Modal */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-none sm:max-w-none w-[98vw] h-[96vh] p-0 gap-0 overflow-hidden rounded-[1.5rem] border-none shadow-2xl bg-white dark:bg-slate-950 flex flex-col">
                    {/* Compact Professional Header */}
                    <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 z-50">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <Layout className="h-6 w-6" />
                            </div>
                            <div className="flex flex-col">
                                <DialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                                    Print Preview
                                </DialogTitle>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Site Sales Summary Report</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="flex flex-col gap-0.5">
                                    <label className="text-[8px] uppercase font-black text-slate-400 tracking-widest ml-1">Template</label>
                                    <Select 
                                        value={selectedTemplateName} 
                                        onValueChange={setSelectedTemplateName}
                                    >
                                        <SelectTrigger className="h-7 w-[150px] bg-transparent border-none p-0 text-[11px] font-bold focus:ring-0 shadow-none">
                                            <SelectValue placeholder="Select Template" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700 shadow-xl p-1">
                                            {templates.map((t) => (
                                                <SelectItem key={t.id} value={t.name} className="rounded-lg text-xs font-medium py-1.5 cursor-pointer">
                                                    {t.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

                                <div className="flex flex-col gap-0.5">
                                    <label className="text-[8px] uppercase font-black text-slate-400 tracking-widest ml-1">Orientation</label>
                                    <Select 
                                        value={pdfOrientation} 
                                        onValueChange={(val: "landscape" | "portrait") => setPdfOrientation(val)}
                                    >
                                        <SelectTrigger className="h-7 w-[100px] bg-transparent border-none p-0 text-[11px] font-bold focus:ring-0 shadow-none">
                                            <SelectValue placeholder="Orientation" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700 shadow-xl p-1">
                                            <SelectItem value="landscape" className="rounded-lg text-xs font-medium py-1.5 cursor-pointer">Landscape</SelectItem>
                                            <SelectItem value="portrait" className="rounded-lg text-xs font-medium py-1.5 cursor-pointer">Portrait</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button 
                                    onClick={handlePrintFromPreview}
                                    variant="outline"
                                    className="h-11 px-6 rounded-2xl border-slate-200 dark:border-slate-700 font-black text-[11px] uppercase tracking-wider gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
                                >
                                    <Printer className="h-4 w-4" />
                                    Print
                                </Button>
                                <Button 
                                    onClick={() => {
                                        if (pdfUrl) {
                                            const link = document.createElement('a');
                                            link.href = pdfUrl;
                                            link.download = `Site_Sales_Summary_${format(new Date(), "yyyyMMdd")}.pdf`;
                                            link.click();
                                        }
                                    }}
                                    className="h-11 px-6 rounded-2xl bg-primary text-white font-black text-[11px] uppercase tracking-wider gap-2 shadow-xl shadow-primary/20 hover:translate-y-[-2px] transition-all"
                                >
                                    <Download className="h-4 w-4" />
                                    Export
                                </Button>
                                <Button 
                                    onClick={() => setIsPreviewOpen(false)}
                                    variant="ghost"
                                    size="icon"
                                    className="h-11 w-11 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 transition-all ml-2"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Preview Area */}
                    <div className="flex-1 bg-slate-100 dark:bg-slate-900/50 p-6 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
                        
                        <div className="w-full h-full relative z-10 animate-in fade-in zoom-in-95 duration-500">
                            {pdfUrl ? (
                                <>
                                    <iframe 
                                        src={`${pdfUrl}#toolbar=0&navpanes=0`}
                                        className={cn(
                                            "w-full h-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] bg-white relative overflow-hidden transition-opacity duration-300",
                                            isGeneratingPdf ? "opacity-40" : "opacity-100"
                                        )}
                                        title="PDF Preview"
                                    />
                                    {isGeneratingPdf && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-[2px] rounded-2xl z-20">
                                            <div className="relative">
                                                <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <FileText className="h-6 w-6 text-primary animate-pulse" />
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-600 dark:text-slate-300">Regenerating</span>
                                                <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Applying Layout Changes...</span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                                    <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                    <span className="text-xs font-black uppercase tracking-[0.4em] text-slate-400 animate-pulse">Building Preview</span>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* DataTable Component with Loading Overlay */}
            <div className="relative">
                {isLoading && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 dark:bg-slate-950/40 backdrop-blur-[2px] rounded-xl transition-all duration-300">
                        <div className="flex flex-col items-center gap-3 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 scale-110">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 animate-pulse">
                                {data.length > 0 ? "Updating Data..." : "Loading Summary..."}
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

                {/* Pagination Controls */}
                <div className="flex items-center justify-end px-2 mt-4">
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

            {/* Site Sales Summary Details Modal */}
            <SiteSalesSummaryDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                invoiceId={selectedInvoiceId}
            />

        </div>
    );
};
