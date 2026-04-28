"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { formatCurrency, cn } from "@/lib/utils";
import {
    Package,
    Store,
    Clock,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { salesOrderProvider } from "../providers/fetchProvider";
import { SalesOrder, Customer, Salesman, Branch, Supplier, Invoice, SalesOrderDetail, InvoiceDetail, PdfData } from "../types";

interface SalesOrderDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: SalesOrder | null;
    customers: Customer[];
    salesmen: Salesman[];
    branches: Branch[];
    suppliers: Supplier[];
}

export function SalesOrderDetailsModal({
    isOpen,
    onClose,
    order,
    customers,
    salesmen,
    branches,
    suppliers,
}: SalesOrderDetailsModalProps) {
    const [details, setDetails] = useState<SalesOrderDetail[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [orderPdf, setOrderPdf] = useState<PdfData | null>(null);
    const [isPdfOpen, setIsPdfOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [loadingInvoice, setLoadingInvoice] = useState(false);
    const [loadingPdf, setLoadingPdf] = useState(false);

    // Robust status check (ignores casing/spaces)
    const normalizedStatus = (order?.order_status || "").toLowerCase().trim();
    const isInvoiceStatus = ["for loading", "for shipping", "en route", "delivered"].includes(normalizedStatus);
    const showPdfBtnRange = ["for loading", "for shipping", "en route", "delivered"].includes(normalizedStatus);

    useEffect(() => {
        if (!isOpen || !order) {
            setDetails([]);
            setInvoices([]);
            setOrderPdf(null);
            setActiveTab("");
            return;
        }

        console.log(`[PDF-DEBUG] Modal Opened. ID: ${order.order_id}, No: ${order.order_no}, Status: ${order.order_status}`);

        const loadContent = async () => {
            setLoading(true);
            setLoadingPdf(true);
            try {
                // 1. Basic Details
                const detailsData = await salesOrderProvider.getSalesOrderDetails(order.order_id);
                setDetails(detailsData || []);
                // 2. Attachments & PDF (Always try these)
                const pdfData = await salesOrderProvider.getOrderPdf(order.order_id, order.order_no);
                console.log("[PDF-DEBUG] PDF fetch result:", pdfData);
                setOrderPdf(pdfData);

                // 3. Invoices (Only if relevant status)
                if (isInvoiceStatus) {
                    setLoadingInvoice(true);
                    const invData = await salesOrderProvider.getInvoiceDetails(order.order_id, order.order_no);
                    setInvoices(invData || []);
                    if (invData && invData.length > 0) setActiveTab(invData[0].invoice.invoice_no);
                }
            } catch (err) {
                console.error("[PDF-DEBUG] Load Error:", err);
            } finally {
                setLoading(false);
                setLoadingInvoice(false);
                setLoadingPdf(false);
            }
        };

        loadContent();
    }, [isOpen, order, isInvoiceStatus]);

    if (!order) return null;

    const customer = customers.find((c) => c.customer_code === order.customer_code);
    const salesman = salesmen.find((s) => s.id === order.salesman_id);
    const branch = branches.find((b) => b.id === order.branch_id);
    const supplier = suppliers.find((s) => s.id === order.supplier_id);

    const getStatusStyle = (status: string) => {
        const s = status.toLowerCase().trim();
        switch (s) {
            case "for approval": return "bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]";
            case "delivered": return "bg-emerald-100 text-emerald-900 border-emerald-200";
            case "cancelled": return "bg-rose-100 text-rose-900 border-rose-200";
            case "on hold": return "bg-slate-100 text-slate-900 border-slate-200";
            case "for loading":
            case "en route":
            case "for shipping": return "bg-sky-100 text-sky-900 border-sky-200";
            default: return "bg-blue-100 text-blue-900 border-blue-200";
        }
    };

    const isInvoiceMode = isInvoiceStatus && invoices.length > 0;
    const activeInvoiceData = isInvoiceMode ? invoices.find(inv => inv.invoice.invoice_no === activeTab) : null;
    const totalInvoicesAmount = isInvoiceMode ? invoices.reduce((sum, inv) => sum + ((Number(inv.invoice.gross_amount) || 0) - (Number(inv.invoice.discount_amount) || 0)), 0) : 0;
    const totalInvoicesItems = isInvoiceMode ? invoices.reduce((sum, inv) => sum + (inv.details?.length || 0), 0) : 0;

    const displayAmount = isInvoiceMode
        ? totalInvoicesAmount
        : (order.allocated_amount || 0);

    const lineCount = isInvoiceMode ? totalInvoicesItems : (details.length || 0);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
                {/*
             ┌─ RESPONSIVE SIZING STRATEGY ──────────────────────────────┐
             │ mobile  → full-screen (inset-0), no rounded corners        │
             │ sm+     → centered modal, rounded-2xl, 95dvh max           │
             │ lg+     → wider panel up to max-w-6xl                      │
             └───────────────────────────────────────────────────────────┘
            */}
                <DialogContent
                    showCloseButton={false}
                    className="
                flex flex-col p-0 gap-0 overflow-hidden
                bg-white
                border-0 sm:border sm:border-slate-200/80
                shadow-none sm:shadow-[0_32px_80px_-12px_rgba(0,0,0,0.18)]
                rounded-none sm:rounded-2xl
                fixed inset-0
                sm:inset-auto sm:top-1/2 sm:left-1/2
                sm:-translate-x-1/2 sm:-translate-y-1/2
                w-full
                h-[100dvh] sm:h-[85dvh]
                sm:w-[calc(100vw-2rem)] sm:max-w-2xl lg:max-w-6xl
                translate-x-0 translate-y-0
            ">

                    {/* ── HEADER ─────────────────────────────────────────── */}
                    <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 shrink-0 bg-slate-50/50 border-b border-slate-100">

                        {/* Row 1: icon + title + badge + close */}
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 min-w-0">
                                {/* Icon — hidden on mobile to save space */}
                                <div className="hidden sm:flex shrink-0 mt-0.5 w-10 h-10 rounded-xl bg-[#E0F2FE] items-center justify-center">
                                    <Clock className="h-5 w-5 text-[#0EA5E9]" />
                                </div>

                                <div className="min-w-0">
                                    <DialogTitle className="text-base sm:text-xl font-black flex flex-wrap items-center gap-1.5 text-slate-900 leading-tight">
                                        <span className="shrink-0">SO: {order.order_no}</span>

                                    </DialogTitle>

                                    <DialogDescription asChild>
                                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1">
                                            <Store className="h-3 w-3 text-slate-400 shrink-0" />
                                            <span className="text-[11px] font-bold text-slate-500 truncate max-w-[170px] sm:max-w-xs">
                                                {customer?.store_name || "Unknown Customer"}
                                            </span>
                                            {customer?.city && (
                                                <span className="text-[11px] text-slate-400 hidden sm:inline">
                                                    — {customer.city}{customer.province && `, ${customer.province}`}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                                {order.customer_code}
                                            </span>
                                        </div>
                                    </DialogDescription>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                <Badge
                                    variant="outline"
                                    className={`
                                    hidden sm:flex
                                    px-2.5 py-0.5 text-[9px] sm:text-[10px]
                                    font-black tracking-widest shadow-sm rounded-lg
                                    ${getStatusStyle(order.order_status || "")}
                                `}
                                >
                                    {order.order_status?.toUpperCase()}
                                </Badge>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                                    aria-label="Close"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Mobile-only badge row */}
                        <div className="flex sm:hidden mt-2 items-center justify-between w-full">
                            <Badge
                                variant="outline"
                                className={`px-2.5 py-0.5 text-[9px] font-black tracking-widest rounded-lg ${getStatusStyle(order.order_status || "")}`}
                            >
                                {order.order_status?.toUpperCase()}
                            </Badge>

                        </div>

                        {/* ── SUMMARY CARDS ─────────────────────────────────
                        mobile  → 2×2 grid
                        sm+     → single 4-column row
                    */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4">
                            {/* Date */}
                            <div className="bg-white border border-slate-100 rounded-xl p-3 sm:p-4 flex flex-col gap-1 shadow-sm">
                                <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none">
                                    {isInvoiceStatus ? "Invoice Date" : "Order Date"}
                                </p>
                                <p className="font-bold text-[12px] sm:text-sm text-slate-900 mt-0.5">
                                    {isInvoiceMode && activeInvoiceData?.invoice?.invoice_date
                                        ? new Date(activeInvoiceData.invoice.invoice_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                        : order.order_date
                                            ? new Date(order.order_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                            : "N/A"}
                                </p>
                            </div>

                            {/* Hub */}
                            <div className="bg-white border border-slate-100 rounded-xl p-3 sm:p-4 flex flex-col gap-1 shadow-sm">
                                <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none">Hub</p>
                                <p className="font-bold text-[12px] sm:text-sm text-slate-900 truncate mt-0.5">
                                    {branch?.branch_name || "WH – DRY22"}
                                </p>
                            </div>

                            {/* Handler */}
                            <div className="bg-white border border-slate-100 rounded-xl p-3 sm:p-4 flex flex-col gap-1 shadow-sm">
                                <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none">Handler</p>
                                <p className="font-bold text-[12px] sm:text-sm text-slate-900 truncate mt-0.5">
                                    {salesman?.salesman_name || "N/A"}
                                </p>
                            </div>

                            {/* PO# */}
                            <div className="bg-white border border-slate-100 rounded-xl p-3 sm:p-4 flex flex-col gap-1 shadow-sm">
                                <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none">PO Number</p>
                                <p className="font-bold text-[12px] sm:text-sm text-slate-900 truncate mt-0.5">
                                    {order.po_no || "N/A"}
                                </p>
                            </div>

                            {/* Supplier (New) */}
                            <div className="bg-white border border-rose-50 rounded-xl p-3 sm:p-4 flex flex-col gap-1 shadow-sm sm:col-span-1">
                                <p className="text-[8px] sm:text-[10px] text-rose-400 uppercase font-black tracking-widest leading-none">Supplier</p>
                                <p className="font-bold text-[11px] sm:text-xs text-rose-600 truncate mt-0.5" title={supplier?.supplier_name}>
                                    {supplier ? `${supplier.supplier_name} (${supplier.supplier_shortcut})` : (order.supplier_id || "N/A")}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── TABLE AREA ──────────────────────────────────────────
                    overflow-x-auto handles horizontal scroll on narrow screens
                    overflow-y-auto handles vertical scroll for long lists
                */}
                    <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">

                        {/* ══ INVOICE MODE ══ */}
                        {isInvoiceMode ? (
                            loadingInvoice ? (
                                <div className="flex flex-col items-center justify-center h-64 gap-4">
                                    <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] animate-pulse">
                                        Reconstructing Invoices...
                                    </p>
                                </div>
                            ) : (
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full animate-in fade-in duration-700">
                                    <div className="px-4 sm:px-8 py-2 bg-slate-50/80 border-b flex items-center justify-between">
                                        <TabsList variant="line" className="h-8">
                                            {invoices.map((inv) => (
                                                <TabsTrigger key={inv.invoice.invoice_no} value={inv.invoice.invoice_no} className="text-[10px] uppercase font-black px-4">
                                                    INV: {inv.invoice.invoice_no}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                            Total Invoices: {invoices.length}
                                        </div>
                                    </div>

                                    {invoices.map((inv) => (
                                        <TabsContent key={inv.invoice.invoice_no} value={inv.invoice.invoice_no} className="m-0 flex-1 overflow-auto">
                                            <div className="min-w-[650px]">
                                                <Table>
                                                    <TableHeader className="bg-slate-50/50 sticky top-0 z-10 border-b">
                                                        <TableRow className="hover:bg-transparent border-none">
                                                            <TableHead className="pl-4 sm:pl-8 h-10 uppercase text-[9px] font-black text-slate-400 tracking-widest">Product / SKU</TableHead>
                                                            <TableHead className="text-center h-10 uppercase text-[9px] font-black text-slate-400 tracking-widest w-[80px]">UOM</TableHead>
                                                            <TableHead className="text-right h-10 uppercase text-[9px] font-black text-slate-400 tracking-widest">Unit Price</TableHead>
                                                            <TableHead className="text-center h-10 uppercase text-[9px] font-black text-slate-400 tracking-widest w-[80px]">Qty</TableHead>
                                                            <TableHead className="text-center h-10 uppercase text-[9px] font-black text-rose-500 tracking-widest">Discount</TableHead>
                                                            <TableHead className="text-center h-10 uppercase text-[9px] font-black text-slate-400 tracking-widest whitespace-nowrap px-4">Type</TableHead>
                                                            <TableHead className="text-right pr-4 sm:pr-8 h-10 uppercase text-[9px] font-black text-slate-400 tracking-widest w-[130px]">Amount</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {inv.details.map((item: InvoiceDetail, idx: number) => (
                                                            <TableRow key={idx} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                                <TableCell className="pl-4 sm:pl-8 py-3">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span className="font-bold text-slate-900 text-[11px] sm:text-[13px]">
                                                                            {item.product_id?.description || item.product_id?.product_name || "N/A Item"}
                                                                        </span>
                                                                        <span className="text-[9px] text-slate-400 font-bold tracking-tighter font-mono">
                                                                            {item.product_id?.product_code}
                                                                        </span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                                                                        {item.product_id?.uom || "PCS"}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="text-right font-bold text-slate-500 font-mono tracking-tight tabular-nums text-[11px] sm:text-[13px]">
                                                                    {formatCurrency(item.unit_price)}
                                                                </TableCell>
                                                                <TableCell className="text-center font-bold text-slate-500 text-[11px] sm:text-[13px] tabular-nums">
                                                                    {item.quantity}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <span className="text-[10px] font-bold text-rose-500 tabular-nums">
                                                                        {item.discount_amount > 0 ? `-${formatCurrency(item.discount_amount)}` : "—"}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="text-center px-4">
                                                                    {item.discount_type ? (
                                                                        <Badge variant="outline" className="text-[9px] font-black px-2 py-0.5 border-rose-100 bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400 uppercase tracking-tighter whitespace-nowrap">
                                                                            {item.discount_type}
                                                                        </Badge>
                                                                    ) : item.discount_amount > 0 ? (
                                                                        <Badge variant="outline" className="text-[9px] font-black px-2 py-0.5 border-slate-100 bg-slate-50 text-slate-400 uppercase tracking-tighter whitespace-nowrap">
                                                                            Discounted
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">—</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right font-black text-[#0EA5E9] pr-4 sm:pr-8 font-mono text-[12px] sm:text-[14px] tabular-nums tracking-tighter">
                                                                    {formatCurrency(Number(item.total_amount) + Number(item.discount_amount || 0) - Number(item.discount_amount || 0))}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>

                                            {/* Totals block from database */}
                                            <div className="p-4 sm:p-8 bg-slate-50/20 border-t flex justify-end">
                                                <div className="w-full max-w-[260px] space-y-2.5 sm:space-y-3">
                                                    <div className="flex justify-between items-center text-slate-500">
                                                        <span className="font-medium text-[11px] sm:text-xs uppercase tracking-wider">Total Amount</span>
                                                        <span className="font-bold text-[11px] sm:text-xs tabular-nums font-mono">
                                                            {formatCurrency(Number(inv.invoice.gross_amount) || 0)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-medium text-[11px] sm:text-xs uppercase tracking-wider text-slate-500">Total Discount</span>
                                                        <span className="font-bold text-rose-500 text-[11px] sm:text-xs tabular-nums font-mono">
                                                            -{formatCurrency(Number(inv.invoice.discount_amount) || 0)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-medium text-[11px] sm:text-xs uppercase tracking-wider text-[#0EA5E9]">Net Amount</span>
                                                        <span className="font-bold text-[11px] sm:text-xs tabular-nums font-mono text-[#0EA5E9]">
                                                            {formatCurrency((Number(inv.invoice.gross_amount) || 0) - (Number(inv.invoice.discount_amount) || 0))}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-slate-400">
                                                        <span className="font-medium text-[9px] sm:text-[10px] uppercase tracking-wider">VAT (12%)</span>
                                                        <span className="font-bold text-[9px] sm:text-[10px] tabular-nums font-mono">
                                                            {formatCurrency(Number(inv.invoice.vat_amount) || 0)}
                                                        </span>
                                                    </div>
                                                    <Separator className="bg-slate-200" />
                                                    <div className="flex justify-between items-center pt-0.5">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#0EA5E9]">TOTAL INVOICE</span>
                                                        <span className="text-lg sm:text-2xl font-black text-slate-950 tabular-nums font-mono">
                                                            {formatCurrency((Number(inv.invoice.gross_amount) || 0) - (Number(inv.invoice.discount_amount) || 0))}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            )
                        ) : (
                            /* ══ ORDER MODE ══ */
                            <div className="animate-in fade-in duration-700">
                                <div className="min-w-[650px]">
                                    <Table>
                                        <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                                            <TableRow className="hover:bg-transparent border-none h-11">
                                                <TableHead className="pl-4 sm:pl-8 uppercase text-[9px] font-black text-[#94A3B8] tracking-widest">Product / SKU</TableHead>
                                                <TableHead className="text-center uppercase text-[9px] font-black text-[#94A3B8] tracking-widest w-[50px]">UOM</TableHead>
                                                <TableHead className="text-center uppercase text-[9px] font-black text-[#94A3B8] tracking-widest w-[50px]">Order</TableHead>
                                                <TableHead className="text-center uppercase text-[9px] font-black text-emerald-500 tracking-widest w-[50px]">Alloc</TableHead>
                                                <TableHead className="text-right uppercase text-[9px] font-black text-[#94A3B8] tracking-widest">Unit Price</TableHead>
                                                <TableHead className="text-right uppercase text-[9px] font-black text-[#94A3B8] tracking-widest">Gross Total</TableHead>
                                                <TableHead className="text-center uppercase text-[9px] font-black text-rose-500 tracking-widest w-[80px]">Discount</TableHead>
                                                <TableHead className="text-center uppercase text-[9px] font-black text-[#94A3B8] tracking-widest">Type</TableHead>
                                                <TableHead className="text-right uppercase text-[9px] font-black text-[#0EA5E9] tracking-widest text-[#0EA5E9]">Net Total</TableHead>
                                                <TableHead className="text-right pr-4 sm:pr-8 uppercase text-[9px] font-black text-emerald-500 tracking-widest">Alloc Amt</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loading ? (
                                                Array.from({ length: 6 }).map((_, i) => (
                                                    <TableRow key={i} className="border-slate-50">
                                                        <TableCell className="pl-4 sm:pl-8 py-4"><div className="h-3.5 w-36 sm:w-56 bg-slate-100 animate-pulse rounded" /></TableCell>
                                                        <TableCell><div className="h-3.5 w-10 bg-slate-100 animate-pulse rounded mx-auto" /></TableCell>
                                                        <TableCell><div className="h-3.5 w-8 bg-slate-100 animate-pulse rounded mx-auto" /></TableCell>
                                                        <TableCell><div className="h-3.5 w-16 bg-slate-100 animate-pulse rounded ml-auto" /></TableCell>
                                                        <TableCell><div className="h-3.5 w-16 bg-slate-100 animate-pulse rounded ml-auto" /></TableCell>
                                                        <TableCell><div className="h-3.5 w-14 bg-slate-100 animate-pulse rounded mx-auto" /></TableCell>
                                                        <TableCell className="pr-4 sm:pr-8"><div className="h-3.5 w-20 bg-slate-100 animate-pulse rounded ml-auto" /></TableCell>
                                                    </TableRow>
                                                ))
                                            ) : details.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="h-64 text-center text-slate-400">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Package className="h-8 w-8 opacity-20" />
                                                            <p className="text-[10px] font-black uppercase tracking-widest">No line items for this record.</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                details.map((li, idx) => {
                                                    // Direct DB Fetches for accuracy (Ordered vs Allocated)
                                                    const itemGross = Number(li.gross_amount) || (Number(li.unit_price) * Number(li.ordered_quantity) || 0);
                                                    const itemNet = Number(li.net_amount) || (itemGross - Number(li.discount_amount || 0));
                                                    const itemAllocAmount = Number(li.allocated_amount) || 0;

                                                    return (
                                                        <TableRow key={li.detail_id || idx} className="hover:bg-slate-50/50 transition-colors border-slate-50 group">
                                                            <TableCell className="pl-4 sm:pl-8 py-4 sm:py-5">
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="font-bold text-slate-900 text-[12px] sm:text-sm group-hover:text-primary transition-colors">
                                                                        {typeof li.product_id === "object" ? (li.product_id?.description || li.product_id?.product_name) : (li.product_id || "N/A")}
                                                                    </span>
                                                                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-tight">
                                                                        {typeof li.product_id === "object" ? li.product_id?.product_code : ""}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center font-bold text-slate-500 text-[11px]">
                                                                {(typeof li.product_id === "object" ? li.product_id?.uom : null) || "PCS"}
                                                            </TableCell>
                                                            <TableCell className="text-center font-bold text-slate-400 text-[11px] tabular-nums underline decoration-slate-200">
                                                                {li.ordered_quantity}
                                                            </TableCell>
                                                            <TableCell className="text-center font-bold text-emerald-600 text-[11px] sm:text-sm tabular-nums bg-emerald-50/30">
                                                                {li.allocated_quantity}
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium text-slate-400 font-mono text-[11px] sm:text-xs tabular-nums">
                                                                {formatCurrency(li.unit_price)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold text-slate-950 font-mono text-[12px] sm:text-sm tabular-nums">
                                                                {formatCurrency(itemGross)}
                                                            </TableCell>
                                                            <TableCell className="text-center font-bold text-rose-500 font-mono text-[11px] tabular-nums">
                                                                {li.discount_amount && Number(li.discount_amount) > 0 ? `-${formatCurrency(li.discount_amount)}` : "—"}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {li.discount_type ? (
                                                                    <Badge variant="outline" className="text-[8px] sm:text-[9px] uppercase font-black bg-rose-50/50 text-rose-600 border-rose-100 px-1 py-0 leading-none h-4">
                                                                        {li.discount_type}
                                                                    </Badge>
                                                                ) : li.discount_amount && Number(li.discount_amount) > 0 ? (
                                                                    <Badge variant="outline" className="text-[8px] sm:text-[9px] uppercase font-black bg-slate-50 text-slate-400 border-slate-100 px-1 py-0 leading-none h-4">
                                                                        Discounted
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-[8px] sm:text-[9px] font-bold text-slate-300 uppercase tracking-widest">—</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right font-black text-[#0EA5E9] font-mono text-[13px] sm:text-base tabular-nums">
                                                                {formatCurrency(itemNet)}
                                                            </TableCell>
                                                            <TableCell className="text-right pr-4 sm:pr-8 font-black text-emerald-600 font-mono text-[11px] sm:text-xs tabular-nums">
                                                                {formatCurrency(itemAllocAmount)}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── FOOTER ──────────────────────────────────────────── */}
                    <div className="px-4 sm:px-8 py-3 sm:py-5 border-t bg-white flex flex-row items-center justify-between gap-4 shrink-0">

                        {/* Stats — always a horizontal row, sizes scale with breakpoint */}
                        <div className="flex items-center gap-4 sm:gap-10 min-w-0">
                            <div className="flex flex-col gap-0.5 shrink-0">
                                <p className="text-[8px] sm:text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none">
                                    Items
                                </p>
                                <p className="font-black text-base sm:text-xl text-slate-900 leading-none mt-1 tabular-nums">
                                    {lineCount}
                                </p>
                            </div>

                            <div className="w-px h-10 bg-slate-100 shrink-0" />

                            {!isInvoiceMode ? (
                                <div className="flex items-center gap-6">
                                    {(() => {
                                        const totalGross = details.reduce((sum, li) => sum + (Number(li.gross_amount) || (Number(li.unit_price) * Number(li.allocated_quantity) || 0)), 0);
                                        const totalDiscount = details.reduce((sum, li) => sum + (Number(li.discount_amount) || 0), 0);
                                        const totalNet = totalGross - totalDiscount;

                                        return (
                                            <>
                                                <div className="flex flex-col gap-0.5">
                                                    <p className="text-[8px] sm:text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none">Total Amount</p>
                                                    <p className="text-[12px] sm:text-[14px] font-bold text-slate-500 tabular-nums">{formatCurrency(totalGross)}</p>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <p className="text-[8px] sm:text-[9px] text-rose-400 uppercase font-black tracking-widest leading-none">Total Discount</p>
                                                    <p className="text-[12px] sm:text-[14px] font-bold text-rose-500 tabular-nums">-{formatCurrency(totalDiscount)}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col gap-0.5 min-w-0 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100">
                                                        <p className="text-[8px] sm:text-[9px] text-sky-500 uppercase font-black tracking-widest leading-none">Net Amount</p>
                                                        <div className="flex items-baseline gap-1 leading-none">
                                                            <span className="text-[10px] sm:text-[14px] font-black text-sky-600 tabular-nums tracking-tighter">
                                                                {formatCurrency(totalNet)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-0.5 min-w-0 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                                        <p className="text-[8px] sm:text-[9px] text-emerald-500 uppercase font-black tracking-widest leading-none">Allocated Total</p>
                                                        <div className="flex items-baseline gap-1 leading-none">
                                                            <span className="text-[10px] sm:text-[14px] font-black text-emerald-600 tabular-nums tracking-tighter">
                                                                {formatCurrency(details.reduce((sum, li) => sum + (Number(li.allocated_amount) || 0), 0))}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* New: Allocated Total */}
                                                <div className="flex flex-col gap-0.5 min-w-0 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                                                    <p className="text-[8px] sm:text-[9px] text-emerald-500 uppercase font-black tracking-widest leading-none">Allocated Total</p>
                                                    <div className="flex items-baseline gap-1 leading-none">
                                                        <span className="text-[10px] sm:text-[14px] font-black text-emerald-600 tabular-nums tracking-tighter">
                                                            {formatCurrency(details.reduce((sum, li) => sum + (Number(li.allocated_amount) || 0), 0))}
                                                        </span>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <p className="text-[8px] sm:text-[9px] text-[#0EA5E9] uppercase font-black tracking-widest leading-none truncate">
                                        Net Amount
                                    </p>
                                    <div className="flex items-baseline gap-1 leading-none mt-1">
                                        <span className="text-[9px] sm:text-[11px] font-black text-slate-300 uppercase italic shrink-0">PHP</span>
                                        <p className="text-[20px] sm:text-[36px] lg:text-[48px] font-black text-slate-950 tabular-nums tracking-tighter leading-none">
                                            {formatCurrency(displayAmount).replace("PHP", "").replace("₱", "").trim()}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {showPdfBtnRange && (
                                loadingPdf ? (
                                    <Button disabled className="h-9 sm:h-12 lg:h-14 px-8 rounded-xl bg-slate-100 text-slate-400 font-black animate-pulse">
                                        FETCHING PDF...
                                    </Button>
                                ) : orderPdf ? (
                                    <Button
                                        onClick={() => setIsPdfOpen(true)}
                                        className="
                                        shrink-0
                                        font-black uppercase tracking-widest
                                        text-[10px] sm:text-[12px]
                                        px-6 sm:px-10 lg:px-12
                                        h-9 sm:h-12 lg:h-14
                                        rounded-lg sm:rounded-xl
                                        bg-gradient-to-r from-indigo-600 to-blue-600
                                        hover:from-indigo-700 hover:to-blue-700
                                        text-white border-0 shadow-[0_10px_20px_-5px_rgba(79,70,229,0.4)]
                                        active:scale-95 transition-all
                                    "
                                    >
                                        <Package className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                                        <span className="hidden sm:inline">View Invoice Receipt</span>
                                        <span className="sm:hidden">PDF RECEIPT</span>
                                    </Button>
                                ) : (
                                    <Button
                                        disabled
                                        className="
                                        shrink-0
                                        font-black uppercase tracking-widest
                                        text-[10px] sm:text-[12px]
                                        px-6 sm:px-10 lg:px-12
                                        h-9 sm:h-12 lg:h-14
                                        rounded-lg sm:rounded-xl
                                        bg-slate-100 text-slate-400 border border-slate-200
                                        cursor-not-allowed
                                    "
                                    >
                                        <X className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                                        <span>No PDF Found</span>
                                    </Button>
                                )
                            )}

                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="
                                shrink-0
                                font-black uppercase tracking-widest
                                text-[10px] sm:text-[12px]
                                px-4 sm:px-8 lg:px-10
                                h-9 sm:h-12 lg:h-14
                                rounded-lg sm:rounded-xl
                                border-2 sm:border-[3px] border-slate-200
                                text-slate-500 hover:bg-slate-50
                                active:scale-95 transition-all shadow-sm
                            "
                            >
                                <span className="hidden sm:inline">Close Record</span>
                                <span className="sm:hidden">Close</span>
                            </Button>
                        </div>
                    </div>

                </DialogContent>
            </Dialog>

            {/* ── PDF PREVIEW DIALOG ──────────────────────────────────── */}
            <Dialog open={isPdfOpen} onOpenChange={setIsPdfOpen}>
                <DialogContent 
                    showCloseButton={false}
                    className={cn(
                    "p-0 gap-0 overflow-hidden bg-slate-900 border-none shadow-2xl transition-all duration-300",
                    orderPdf?.width_mm && orderPdf.width_mm < 100 ? "sm:max-w-[400px]" : "sm:max-w-[90dvh] lg:max-w-4xl"
                )}>
                    <div className="flex flex-col h-[90dvh]">
                        {/* Header with Title & Close (Custom for PDF) */}
                        <div className="px-4 py-3 bg-slate-800 flex items-center justify-between shrink-0">
                            <div className="flex flex-col gap-0.5">
                                <DialogTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Digital Document Preview
                                </DialogTitle>
                                <DialogDescription className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
                                    {orderPdf?.receipts || "PDF Rendering..."}
                                </DialogDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                {orderPdf?.url && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(orderPdf.url, '_blank')}
                                        className="h-8 text-[10px] font-black bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white rounded-lg"
                                    >
                                        OPEN IN EXTERNAL TAB
                                    </Button>
                                )}
                                <Button size="icon" variant="ghost" onClick={() => setIsPdfOpen(false)} className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* PDF Container with dynamic Sizing based on MM */}
                        <div className="flex-1 bg-slate-100 flex justify-center p-2 sm:p-4 overflow-auto scrollbar-thin scrollbar-thumb-slate-300">
                            <div
                                className="bg-white shadow-lg mx-auto"
                                style={{
                                    width: orderPdf?.width_mm ? `${(orderPdf.width_mm * 96) / 25.4}px` : '100%',
                                    minWidth: orderPdf?.width_mm ? 'auto' : '100%',
                                    maxWidth: '100%',
                                    height: orderPdf?.height_mm ? `${(orderPdf.height_mm * 96) / 25.4}px` : '100%',
                                    minHeight: '100%'
                                }}
                            >
                                <iframe
                                    src={`${orderPdf?.url}#toolbar=1&navpanes=0&scrollbar=1`}
                                    width="100%"
                                    height="100%"
                                    className="border-none"
                                    title="Invoice View"
                                />
                            </div>
                        </div>

                        {/* Footer Info */}
                        {(orderPdf?.width_mm || orderPdf?.height_mm) && (
                            <div className="px-4 py-2 bg-slate-800 text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-4">
                                <span>Sizing Parameters:</span>
                                {orderPdf.width_mm && <span>W: {orderPdf.width_mm}mm</span>}
                                {orderPdf.height_mm && <span>H: {orderPdf.height_mm}mm</span>}
                                <span className="ml-auto text-sky-500 animate-pulse">OPTIMIZED FIT ACTIVE</span>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}