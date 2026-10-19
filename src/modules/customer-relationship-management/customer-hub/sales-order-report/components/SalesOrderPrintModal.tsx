"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PdfEngine } from "@/components/pdf-layout-design/PdfEngine";
import { pdfTemplateService, PdfTemplate } from "@/components/pdf-layout-design/services/pdf-template";
import { CompanyData } from "@/components/pdf-layout-design/types";
import { RefreshCcw, Download, FileText, Loader2 } from "lucide-react";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SalesOrder, Customer, Salesman, Branch, Supplier } from "../types";
import { fetchAllSalesOrdersForPrint } from "../providers/fetchProvider";

// ── Filters passed in from the main module ─────────────────────────────────
export interface PrintFilters {
    search: string;
    startDate: string;
    endDate: string;
    salesmanId: string;
    branchId: string;
    supplierId: string;
    status: string;
    dateCreated: string;
    orderDate: string;
    deliveryDate: string;
    dueDate: string;
}

interface SalesOrderPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    filters: PrintFilters;
    customers: Customer[];
    salesmen: Salesman[];
    branches: Branch[];
    suppliers: Supplier[];
    userName?: string;
}

export function SalesOrderPrintModal({
    isOpen,
    onClose,
    filters,
    customers,
    salesmen,
    branches,
    suppliers,
}: SalesOrderPrintModalProps) {
    // ── State ──────────────────────────────────────────────────────────────────
    const [templates, setTemplates] = useState<PdfTemplate[]>([]);
    const [selectedTemplateName, setSelectedTemplateName] = useState<string>("");
    const [companyData, setCompanyData] = useState<CompanyData | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [allOrders, setAllOrders] = useState<SalesOrder[]>([]);
    const [customFilename, setCustomFilename] = useState<string>("");

    // ── Lookup maps ────────────────────────────────────────────────────────────
    const customerMap = React.useMemo(
        () => new Map(customers.map(c => [c.customer_code, c.customer_name || c.store_name])),
        [customers]
    );
    const salesmanMap = React.useMemo(
        () => new Map(salesmen.map(s => [s.id, s.salesman_name])),
        [salesmen]
    );
    const branchMap = React.useMemo(
        () => new Map(branches.map(b => [b.id, b.branch_name])),
        [branches]
    );
    const supplierMap = React.useMemo(
        () => new Map(suppliers.map(s => [s.id, s.supplier_shortcut || `Supplier ${s.id}`])),
        [suppliers]
    );

    // ── Filter summary label ───────────────────────────────────────────────────
    const filterSummary = React.useMemo(() => {
        const parts: string[] = [];
        if (filters.startDate && filters.endDate)
            parts.push(`Order Date: ${filters.startDate} to ${filters.endDate}`);
        if (filters.salesmanId && filters.salesmanId !== "none") {
            const sm = salesmen.find(s => String(s.id) === filters.salesmanId);
            if (sm) parts.push(`Salesman: ${sm.salesman_name}`);
        }
        if (filters.branchId && filters.branchId !== "none") {
            const br = branches.find(b => String(b.id) === filters.branchId);
            if (br) parts.push(`Branch: ${br.branch_name}`);
        }
        if (filters.supplierId && filters.supplierId !== "none") {
            const sp = suppliers.find(s => String(s.id) === filters.supplierId);
            if (sp) parts.push(`Supplier: ${sp.supplier_shortcut}`);
        }
        if (filters.status && filters.status !== "none")
            parts.push(`Status: ${filters.status}`);
        if (filters.search)
            parts.push(`Search: "${filters.search}"`);
        return parts.length > 0 ? parts.join("  |  ") : "No additional filters";
    }, [filters, salesmen, branches, suppliers]);

    // ── Fetch all orders on open ──────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) {
            setPdfUrl(null);
            setAllOrders([]);
            setFetchError(null);
            return;
        }

        const dateLabel =
            filters.startDate && filters.endDate
                ? `${filters.startDate}_to_${filters.endDate}`
                : new Date().toISOString().slice(0, 10);
        setCustomFilename(`SalesOrderReport_${dateLabel}`);

        const init = async () => {
            setIsFetching(true);
            setFetchError(null);
            try {
                const activeFilters = Object.fromEntries(
                    Object.entries(filters).filter(([, v]) => v !== "" && v !== "none")
                ) as Record<string, string>;

                const [compRes, tpls, ordersData] = await Promise.all([
                    fetch("/api/pdf/company"),
                    pdfTemplateService.fetchTemplates(),
                    fetchAllSalesOrdersForPrint(activeFilters),
                ]);

                if (compRes.ok) {
                    const result = await compRes.json();
                    const company = result.data?.[0] || (Array.isArray(result.data) ? null : result.data);
                    setCompanyData(company);
                }

                setTemplates(tpls);
                if (tpls.length > 0 && !selectedTemplateName) {
                    setSelectedTemplateName(tpls[0].name);
                }

                const orders = ordersData.salesOrders || [];
                setAllOrders(orders);
            } catch (err: unknown) {
                const e = err as Error;
                setFetchError(e.message || "Failed to load data for print.");
                toast.error("Failed to load data for print.");
            } finally {
                setIsFetching(false);
            }
        };

        init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // ── PDF Generation ─────────────────────────────────────────────────────────
    const handleGeneratePreview = useCallback(async () => {
        if (!companyData || !selectedTemplateName || allOrders.length === 0) return;
        setIsGenerating(true);
        try {
            const doc = await PdfEngine.generateWithFrame(selectedTemplateName, companyData, (doc, startY, config) => {
                const margins = config.margins || { top: 10, bottom: 20, left: 10, right: 10 };
                const pageWidth = doc.internal.pageSize.getWidth();

                doc.setProperties({
                    title: customFilename || "SalesOrderReport",
                    subject: "Sales Order Report",
                    author: "VOS CRM System",
                });

                // Report Title & Meta
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(30, 41, 59);
                doc.text("SALES ORDER REPORT", margins.left, startY + 4);

                doc.setFontSize(7.5);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(71, 85, 105);
                const metaY = startY + 9;
                doc.text(`Date / Filters: ${filterSummary}`, margins.left, metaY);
                doc.text(`Total Records: ${allOrders.length}`, margins.left, metaY + 4);

                const generatedAt = new Date().toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                });
                doc.text(`Generated At: ${generatedAt}`, pageWidth - margins.right, metaY, { align: "right" });

                const tableY = metaY + 8;
                let grandGross = 0;
                let grandDiscount = 0;
                let grandNet = 0;
                let grandAllocated = 0;

                // Helper to format numeric values cleanly without currency symbol (₱)
                const formatNumber = (val: number | string | null | undefined): string => {
                    const num = Number(val) || 0;
                    return num.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    });
                };

                // Build Table Rows matching Image 2
                const body = allOrders.map(order => {
                    const customerName =
                        customerMap.get(order.customer_code ?? "") ?? (order.customer_code || "—");
                    const salesmanName = salesmanMap.get(order.salesman_id ?? 0) ?? "—";
                    const branchName = branchMap.get(order.branch_id ?? 0) ?? "—";
                    const supplierShort = supplierMap.get(order.supplier_id ?? 0) ?? "—";

                    const discount = Number(order.discount_amount) || 0;
                    const net = Number(order.total_amount) || 0;
                    const gross = net + discount;
                    const alloc = Number(order.allocated_amount) || 0;

                    grandGross += gross;
                    grandDiscount += discount;
                    grandNet += net;
                    grandAllocated += alloc;

                    return [
                        order.order_date || "—",
                        order.order_no || "—",
                        order.po_no || "—",
                        supplierShort,
                        customerName,
                        salesmanName,
                        branchName,
                        order.created_date ? order.created_date.split("T")[0] : "—",
                        formatNumber(gross),
                        formatNumber(discount),
                        formatNumber(net),
                        formatNumber(alloc),
                        (order.order_status || "—").toUpperCase(),
                    ];
                });

                const head = [[
                    "ORDER DATE",
                    "SO NO",
                    "PO NO",
                    "SUPPLIER",
                    "CUSTOMER",
                    "SALESMAN",
                    "BRANCH",
                    "CREATED",
                    "TOTAL AMT",
                    "DISCOUNT",
                    "NET AMT",
                    "ALLOC AMT",
                    "STATUS",
                ]];

                const foot = [[
                    { content: `TOTAL (${allOrders.length} ORDERS)`, colSpan: 8, styles: { halign: "right" as const, fontStyle: "bold" as const } },
                    { content: formatNumber(grandGross), styles: { halign: "right" as const, fontStyle: "bold" as const } },
                    { content: formatNumber(grandDiscount), styles: { halign: "right" as const, fontStyle: "bold" as const } },
                    { content: formatNumber(grandNet), styles: { halign: "right" as const, fontStyle: "bold" as const } },
                    { content: formatNumber(grandAllocated), styles: { halign: "right" as const, fontStyle: "bold" as const } },
                    "",
                ]];

                // Calculate exact printable width between margins
                const printableWidth = pageWidth - margins.left - margins.right;

                autoTable(doc, {
                    startY: tableY,
                    margin: margins,
                    tableWidth: printableWidth,
                    head,
                    body,
                    foot,
                    theme: "striped",
                    headStyles: {
                        fillColor: [30, 41, 59],
                        textColor: 255,
                        fontSize: 6.5,
                        fontStyle: "bold",
                        halign: "left",
                        cellPadding: 2,
                    },
                    footStyles: {
                        fillColor: [241, 245, 249],
                        textColor: [15, 23, 42],
                        fontStyle: "bold",
                        fontSize: 6.5,
                        cellPadding: 2,
                    },
                    styles: {
                        fontSize: 6,
                        cellPadding: 1.5,
                        valign: "middle",
                        overflow: "linebreak",
                    },
                    columnStyles: {
                        0: { cellWidth: printableWidth * 0.06 },       // ORDER DATE (~6%)
                        1: { cellWidth: printableWidth * 0.09, fontStyle: "bold" }, // SO NO (~9%)
                        2: { cellWidth: printableWidth * 0.05 },       // PO NO (~5%)
                        3: { cellWidth: printableWidth * 0.07 },       // SUPPLIER (~7%)
                        4: { cellWidth: printableWidth * 0.16 },       // CUSTOMER (~16%)
                        5: { cellWidth: printableWidth * 0.08 },       // SALESMAN (~8%)
                        6: { cellWidth: printableWidth * 0.09 },       // BRANCH (~9%)
                        7: { cellWidth: printableWidth * 0.06 },       // CREATED (~6%)
                        8: { cellWidth: printableWidth * 0.07, halign: "right" },  // TOTAL AMT (~7%)
                        9: { cellWidth: printableWidth * 0.06, halign: "right" },  // DISCOUNT (~6%)
                        10: { cellWidth: printableWidth * 0.07, halign: "right" }, // NET AMT (~7%)
                        11: { cellWidth: printableWidth * 0.07, halign: "right" }, // ALLOC AMT (~7%)
                        12: { cellWidth: printableWidth * 0.07, halign: "center" },// STATUS (~7%)
                    },
                });

                if (config) {
                    config.pageNumber = {
                        show: true,
                        format: "Page {pageNumber} of {totalPages}",
                        position: "bottom-right",
                        fontSize: 8,
                        fontFamily: "helvetica",
                        color: "#64748b",
                        marginY: 6,
                        marginX: 10,
                        ...(config.pageNumber || {}),
                    };
                }
            });

            const blob = doc.output("blob");
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
        } catch (err) {
            console.error("[PrintModal] PDF generation error:", err);
            toast.error("Failed to generate PDF preview.");
        } finally {
            setIsGenerating(false);
        }
    }, [
        selectedTemplateName, companyData, customFilename,
        allOrders, filterSummary,
        customerMap, salesmanMap, branchMap, supplierMap,
    ]);

    // Auto-generate when data is ready
    useEffect(() => {
        if (isOpen && selectedTemplateName && companyData && allOrders.length > 0 && !isFetching) {
            handleGeneratePreview();
        }
    }, [isOpen, selectedTemplateName, companyData, allOrders, isFetching, handleGeneratePreview]);

    // ── Download ───────────────────────────────────────────────────────────────
    const handleDownload = () => {
        if (!pdfUrl) return;
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = `${customFilename || "SalesOrderReport"}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("PDF Downloaded successfully");
    };

    const isLoading = isFetching || isGenerating;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                style={{ maxWidth: "96vw", width: "96vw" }}
                className="h-[94vh] flex flex-col p-0 rounded-lg overflow-hidden border shadow-xl transition-all duration-300 [&>button]:hidden"
            >
                {/* Header - Ultra Compact */}
                <DialogHeader className="px-4 py-2.5 bg-white border-b shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
                                <Download className="text-primary h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground/90">
                                    Sales Order Report — PDF Preview
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Printable report with item details per sales order
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 bg-muted/40 py-1.5 px-3 rounded-lg border">
                            <div className="flex flex-col gap-0.5">
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Paper Size
                                </label>
                                <select
                                    className="h-7 bg-transparent border-none text-xs font-medium focus:ring-0 outline-none min-w-[160px] cursor-pointer text-foreground"
                                    value={selectedTemplateName}
                                    onChange={e => setSelectedTemplateName(e.target.value)}
                                >
                                    {templates.length === 0 && <option>Loading formats...</option>}
                                    {templates.map(t => (
                                        <option key={t.id} value={t.name}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="h-7 w-px bg-border/60" />
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleGeneratePreview}
                                    disabled={isLoading || allOrders.length === 0}
                                    className="rounded-lg px-3 h-8 text-xs font-semibold"
                                >
                                    <RefreshCcw size={13} className={cn("mr-1.5", isGenerating && "animate-spin")} />
                                    Refresh
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleDownload}
                                    disabled={isLoading || !pdfUrl}
                                    className="rounded-lg px-4 h-8 text-xs font-semibold shadow-sm"
                                >
                                    <Download size={14} className="mr-1.5" />
                                    Download PDF
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                {/* Preview Area - Maximized Space */}
                <div className="flex-1 bg-slate-100/70 p-2 flex items-center justify-center relative overflow-hidden">
                    {fetchError ? (
                        <div className="flex flex-col items-center gap-3 text-center p-6">
                            <FileText className="h-12 w-12 text-destructive/50" />
                            <p className="font-bold text-base text-destructive">
                                Failed to load orders
                            </p>
                            <p className="text-xs text-muted-foreground max-w-sm">{fetchError}</p>
                        </div>
                    ) : isLoading ? (
                        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <div className="flex flex-col items-center gap-1">
                                <span className="font-semibold text-sm text-foreground">
                                    {isFetching ? "Loading sales orders..." : "Creating PDF..."}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {isFetching
                                        ? "Fetching all records, please wait..."
                                        : "Preparing your document..."}
                                </span>
                            </div>
                        </div>
                    ) : pdfUrl ? (
                        <div className="w-full h-full animate-in fade-in-0 duration-300">
                            <iframe
                                src={pdfUrl}
                                className="w-full h-full rounded-lg border shadow-sm bg-white"
                                title="Sales Order Report PDF Preview"
                            />
                        </div>
                    ) : (
                        <div className="text-center space-y-3 opacity-30">
                            <FileText size={64} className="mx-auto text-muted-foreground" />
                            <p className="font-semibold text-sm">No document to display</p>
                        </div>
                    )}
                </div>

                {/* Footer - Ultra Compact */}
                <DialogFooter className="px-4 py-2 bg-white border-t shrink-0">
                    <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="font-medium">Total Orders:</span>
                                <span className="font-bold text-foreground">
                                    {allOrders.length} {allOrders.length === 1 ? "record" : "records"}
                                </span>
                            </div>
                            <div className="h-4 w-px bg-border" />
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground max-w-[500px]">
                                <span className="font-medium shrink-0">Filters:</span>
                                <span className="font-medium text-foreground truncate">
                                    {filterSummary}
                                </span>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="rounded-lg px-4 h-8 text-xs font-semibold text-muted-foreground hover:text-foreground"
                        >
                            Close
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
