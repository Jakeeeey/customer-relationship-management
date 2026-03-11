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
import { formatCurrency } from "@/lib/utils";
import {
    Package,
    Store,
    AlertCircle,
    Clock,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { salesOrderProvider } from "../providers/fetchProvider";
import { SalesOrder, Customer, Salesman, Branch, SalesOrderDetail } from "../types";

interface SalesOrderDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: SalesOrder | null;
    customers: Customer[];
    salesmen: Salesman[];
    branches: Branch[];
}

export function SalesOrderDetailsModal({
    isOpen,
    onClose,
    order,
    customers,
    salesmen,
    branches,
}: SalesOrderDetailsModalProps) {
    const [details, setDetails] = useState<SalesOrderDetail[]>([]);
    const [invoiceData, setInvoiceData] = useState<{
        invoice: {
            invoice_no: string;
            invoice_date: string;
            salesman_id: string;
            gross_amount: number;
            vat_amount: number;
            discount_amount: number;
            net_amount: number;
        },
        details: {
            product_id: { product_name: string; product_code: string; description?: string } | null;
            unit_price: number;
            quantity: number;
            total_amount: number;
        }[]
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingInvoice, setLoadingInvoice] = useState(false);

    const isInvoiceStatus = ["For Loading", "For Shipping", "En Route", "Delivered"].includes(order?.order_status || "");

    useEffect(() => {
        if (isOpen && order) {
            if (isInvoiceStatus) {
                const loadInvoice = async () => {
                    setLoadingInvoice(true);
                    try {
                        const data = await salesOrderProvider.getInvoiceDetails(order.order_id, order.order_no);
                        setInvoiceData(data);
                    } catch (error) {
                        console.error("Failed to fetch invoice details", error);
                    } finally {
                        setLoadingInvoice(false);
                    }
                };
                loadInvoice();
            } else {
                const loadDetails = async () => {
                    setLoading(true);
                    try {
                        const data = await salesOrderProvider.getSalesOrderDetails(order.order_id);
                        setDetails(data);
                    } catch (error) {
                        console.error("Failed to fetch order details", error);
                    } finally {
                        setLoading(false);
                    }
                };
                loadDetails();
            }
        } else {
            setDetails([]);
            setInvoiceData(null);
        }
    }, [isOpen, order, isInvoiceStatus]);

    if (!order) return null;

    const customer = customers.find((c) => c.customer_code === order.customer_code);
    const salesman = salesmen.find((s) => s.id === order.salesman_id);
    const branch = branches.find((b) => b.id === order.branch_id);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "For Approval": return "bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]";
            case "Delivered": return "bg-emerald-100 text-emerald-900 border-emerald-200";
            case "Cancelled": return "bg-rose-100 text-rose-900 border-rose-200";
            case "On Hold": return "bg-slate-100 text-slate-900 border-slate-200";
            default: return "bg-blue-100 text-blue-900 border-blue-200";
        }
    };

    const displayAmount = isInvoiceStatus
        ? (invoiceData?.invoice?.net_amount || 0)
        : (order.allocated_amount || 0);

    const lineCount = details.length || invoiceData?.details.length || 0;

    return (
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
                                    {isInvoiceStatus && invoiceData?.invoice?.invoice_no && (
                                        <>
                                            <span className="text-slate-300 font-light shrink-0">/</span>
                                            <span className="text-primary/70 font-black shrink-0">
                                                INV: {invoiceData.invoice.invoice_no}
                                            </span>
                                        </>
                                    )}
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

                        {/* Badge (sm+) + X button */}
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
                    <div className="flex sm:hidden mt-2">
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
                                {isInvoiceStatus && invoiceData?.invoice?.invoice_date
                                    ? new Date(invoiceData.invoice.invoice_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
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

                        {/* Amount — accent card */}
                        <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-xl p-3 sm:p-4 flex flex-col gap-1 shadow-sm">
                            <p className="text-[8px] sm:text-[10px] text-[#0284C7] uppercase font-black tracking-widest leading-none">
                                {isInvoiceStatus ? "Invoice Total" : "Order Value"}
                            </p>
                            <p className="font-black text-[13px] sm:text-lg text-[#0284C7] tabular-nums mt-0.5">
                                {formatCurrency(displayAmount)}
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
                    {isInvoiceStatus ? (
                        loadingInvoice ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] animate-pulse">
                                    Reconstructing Invoice...
                                </p>
                            </div>
                        ) : !invoiceData?.invoice ? (
                            <div className="flex flex-col items-center justify-center min-h-[280px] text-center px-8 gap-5">
                                <div className="p-5 bg-slate-50 rounded-full border-2 border-dashed border-slate-200">
                                    <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-slate-300" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-base sm:text-xl font-black text-slate-900 uppercase">Billing Record Pending</h3>
                                    <p className="text-[11px] sm:text-sm text-slate-500 max-w-xs sm:max-w-sm font-medium leading-relaxed">
                                        This order has been promoted to a billing state, but the physical invoice has not yet been committed to the data vault.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-in fade-in duration-700">
                                {/* min-w enforces readable columns; wrapper scrolls horizontally */}
                                <div className="min-w-[480px]">
                                    <Table>
                                        <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                                            <TableRow className="hover:bg-transparent border-none">
                                                <TableHead className="pl-4 sm:pl-8 h-11 uppercase text-[9px] font-black text-[#94A3B8] tracking-widest">Product / SKU</TableHead>
                                                <TableHead className="text-right h-11 uppercase text-[9px] font-black text-[#94A3B8] tracking-widest">Unit Price</TableHead>
                                                <TableHead className="text-center h-11 uppercase text-[9px] font-black text-[#94A3B8] tracking-widest w-[80px]">Qty</TableHead>
                                                <TableHead className="text-right pr-4 sm:pr-8 h-11 uppercase text-[9px] font-black text-[#94A3B8] tracking-widest w-[130px]">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {invoiceData.details.map((item, idx) => (
                                                <TableRow key={idx} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                    <TableCell className="pl-4 sm:pl-8 py-4 sm:py-5">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-slate-900 text-[12px] sm:text-sm">
                                                                {item.product_id?.product_name || "N/A Item"}
                                                            </span>
                                                            <span className="text-[9px] text-slate-400 font-bold tracking-tighter font-mono">
                                                                {item.product_id?.product_code}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-slate-500 font-mono tracking-tight tabular-nums text-[12px] sm:text-sm">
                                                        {formatCurrency(item.unit_price)}
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-slate-500 text-[12px] sm:text-sm tabular-nums">
                                                        {item.quantity}
                                                    </TableCell>
                                                    <TableCell className="text-right font-black text-slate-950 pr-4 sm:pr-8 font-mono text-[13px] sm:text-base tabular-nums tracking-tighter">
                                                        {formatCurrency(item.total_amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Totals block */}
                                <div className="p-4 sm:p-8 bg-slate-50/30 border-t flex justify-end">
                                    <div className="w-full max-w-[260px] space-y-2.5 sm:space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground font-medium text-[11px] sm:text-sm">Gross Total</span>
                                            <span className="font-bold text-slate-600 text-[11px] sm:text-sm tabular-nums font-mono">
                                                {formatCurrency(invoiceData.invoice.gross_amount)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground font-medium text-[11px] sm:text-sm">Discount</span>
                                            <span className="font-bold text-rose-500 text-[11px] sm:text-sm tabular-nums font-mono">
                                                -{formatCurrency(invoiceData.invoice.discount_amount)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground font-medium text-[11px] sm:text-sm">VAT (12%)</span>
                                            <span className="font-bold text-slate-600 text-[11px] sm:text-sm tabular-nums font-mono">
                                                {formatCurrency(invoiceData.invoice.vat_amount || 0)}
                                            </span>
                                        </div>
                                        <Separator className="bg-slate-200" />
                                        <div className="flex justify-between items-center pt-0.5">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Total Amount</span>
                                            <span className="text-xl sm:text-2xl font-black text-slate-950 tabular-nums font-mono">
                                                {formatCurrency(invoiceData.invoice.net_amount)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    ) : (
                        /* ══ ORDER MODE ══ */
                        <div className="animate-in fade-in duration-700">
                            <div className="min-w-[520px]">
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableHead className="pl-4 sm:pl-8 h-11 uppercase text-[9px] font-black text-[#94A3B8] tracking-widest">Product / SKU</TableHead>
                                            <TableHead className="text-right h-11 uppercase text-[9px] font-black text-[#94A3B8] tracking-widest">Unit Price</TableHead>
                                            <TableHead className="text-center h-11 uppercase text-[9px] font-black text-[#94A3B8] tracking-widest">Ordered</TableHead>
                                            <TableHead className="text-center h-11 uppercase text-[9px] font-black text-[#94A3B8] tracking-widest">Allocated</TableHead>
                                            <TableHead className="text-right pr-4 sm:pr-8 h-11 uppercase text-[9px] font-black text-[#94A3B8] tracking-widest">Alloc. Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            Array.from({ length: 6 }).map((_, i) => (
                                                <TableRow key={i} className="border-slate-50">
                                                    <TableCell className="pl-4 sm:pl-8 py-4">
                                                        <div className="h-3.5 w-36 sm:w-56 bg-slate-100 animate-pulse rounded" />
                                                    </TableCell>
                                                    <TableCell><div className="h-3.5 w-14 bg-slate-100 animate-pulse rounded ml-auto" /></TableCell>
                                                    <TableCell><div className="h-3.5 w-8 bg-slate-100 animate-pulse rounded mx-auto" /></TableCell>
                                                    <TableCell><div className="h-3.5 w-8 bg-slate-100 animate-pulse rounded mx-auto" /></TableCell>
                                                    <TableCell className="pr-4 sm:pr-8"><div className="h-3.5 w-16 bg-slate-100 animate-pulse rounded ml-auto" /></TableCell>
                                                </TableRow>
                                            ))
                                        ) : details.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-64 text-center text-slate-400">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Package className="h-8 w-8 opacity-20" />
                                                        <p className="text-[10px] font-black uppercase tracking-widest">
                                                            No line items materialized for this record.
                                                        </p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            details.map((li, idx) => {
                                                const product = li.product_id;
                                                const productName = typeof product === "object" ? product?.product_name : (product || "N/A");
                                                const productCode = typeof product === "object" ? product?.product_code : "";

                                                return (
                                                    <TableRow key={li.detail_id || idx} className="hover:bg-slate-50/50 transition-colors border-slate-50 group">
                                                        <TableCell className="pl-4 sm:pl-8 py-4 sm:py-5">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="font-bold text-slate-900 text-[12px] sm:text-sm group-hover:text-primary transition-colors">
                                                                    {productName}
                                                                </span>
                                                                <span className="text-[9px] font-bold text-slate-400 tracking-tighter font-mono">
                                                                    {productCode}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-slate-500 font-mono tracking-tight tabular-nums text-[12px] sm:text-sm">
                                                            {formatCurrency(li.unit_price)}
                                                        </TableCell>
                                                        <TableCell className="text-center font-bold text-blue-400/80 text-[12px] sm:text-sm tabular-nums">
                                                            {li.ordered_quantity}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-lg bg-[#F0FDF4] text-[#16A34A] font-black text-[10px] border border-[#DCFCE7] tabular-nums">
                                                                {li.allocated_quantity}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right font-black text-slate-950 pr-4 sm:pr-8 font-mono text-[13px] sm:text-base tabular-nums tracking-tighter">
                                                            {formatCurrency(li.net_amount || 0)}
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

                        <div className="w-px h-8 bg-slate-100 shrink-0" />

                        <div className="flex flex-col gap-0.5 min-w-0">
                            <p className="text-[8px] sm:text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none truncate">
                                {isInvoiceStatus ? "Invoice Total" : "Net Amount"}
                            </p>
                            <div className="flex items-baseline gap-1 leading-none mt-1">
                                <span className="text-[9px] sm:text-[11px] font-black text-slate-300 uppercase italic shrink-0">PHP</span>
                                <p className="text-[20px] sm:text-[36px] lg:text-[48px] font-black text-slate-950 tabular-nums tracking-tighter leading-none">
                                    {formatCurrency(displayAmount).replace("PHP", "").replace("₱", "").trim()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Close button */}
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
                            border-2 sm:border-[3px] border-[#38BDF8]
                            text-[#0284C7] hover:bg-[#F0F9FF]
                            active:scale-95 transition-all shadow-sm
                        "
                    >
                        <span className="hidden sm:inline">Close Record</span>
                        <span className="sm:hidden">Close</span>
                    </Button>
                </div>

            </DialogContent>
        </Dialog>
    );
}