"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, Check, AlertCircle, Clock, Ban, Store, X } from "lucide-react";
import { cn } from "@/lib/utils";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { SalesOrder, OrderDetail } from "../hooks/useSalesOrderApproval";
import { getOrderDetails, getInvoiceDetails } from "../providers/fetchProvider";

interface ApprovalModalProps {
    order: SalesOrder | null;
    open: boolean;
    onClose: () => void;
    onApprove: (orderIds: (string | number)[]) => Promise<boolean>;
    onHold: (orderIds: (string | number)[]) => Promise<boolean>;
    onCancel: (orderIds: (string | number)[]) => Promise<boolean>;
    onSaveDetails: (orderId: number, header: Record<string, number | string | null | undefined>, items: { order_detail_id: number, allocated_quantity: number, net_amount: number }[]) => Promise<boolean>;
}

export function ApprovalModal({
    order,
    open,
    onClose,
    onApprove,
    onHold,
    onCancel,
    onSaveDetails
}: ApprovalModalProps) {
    const [details, setDetails] = useState<OrderDetail[]>([]);
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
            product_id: { product_name: string; product_code: string; description?: string; uom?: { uom_name: string; uom_shortcut: string } } | null;
            unit_price: number;
            quantity: number;
            total_amount: number;
            discount_amount: number;
        }[]
    } | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [loadingInvoice, setLoadingInvoice] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [discountTypes, setDiscountTypes] = useState<Record<number, string>>({});

    const isInvoiceStatus = ["For Loading", "For Shipping", "En Route", "Delivered"].includes(order?.order_status || "");

    useEffect(() => {
        if (open && order) {
            // Fetch Discount Types first
            const fetchDiscountTypes = async () => {
                try {
                    const res = await fetch(`${window.location.origin}/api/crm/customer-hub/sales-order-approval?type=discount-types`);
                    if (res.ok) {
                        const data = await res.json();
                        const map: Record<number, string> = {};
                        (data || []).forEach((dt: { id: number; discount_type: string }) => {
                            map[dt.id] = dt.discount_type;
                        });
                        setDiscountTypes(map);
                    }
                } catch (e) {
                    console.error("Failed to fetch discount types", e);
                }
            };
            fetchDiscountTypes();

            if (isInvoiceStatus) {
                const fetchInvoice = async () => {
                    setLoadingInvoice(true);
                    try {
                        const data = await getInvoiceDetails(order.order_id, order.order_no);
                        setInvoiceData(data);
                    } catch (error) {
                        console.error("Failed to load invoice details", error);
                    } finally {
                        setLoadingInvoice(false);
                    }
                };
                fetchInvoice();
            } else {
                const fetchDetails = async () => {
                    setLoadingDetails(true);
                    try {
                        const data = await getOrderDetails(order.order_id);
                        const enriched = (data || []).map((item: OrderDetail) => ({
                            ...item,
                            allocated_quantity: item.allocated_quantity || item.ordered_quantity
                        }));
                        setDetails(enriched);
                    } catch (error) {
                        console.error("Failed to load order details", error);
                    } finally {
                        setLoadingDetails(false);
                    }
                };
                fetchDetails();
            }
        } else {
            setDetails([]);
            setInvoiceData(null);
        }
    }, [open, order, isInvoiceStatus]);

    if (!order) return null;

    const isActionable = order.order_status === "For Approval" || order.order_status === "On Hold";
    const canHold = order.order_status === "For Approval";

    const updateAllocatedQty = (index: number, val: string) => {
        const num = parseFloat(val) || 0;
        const newDetails = [...details];
        newDetails[index] = { ...newDetails[index], allocated_quantity: num };
        setDetails(newDetails);
    };

    // Calculate totals based on local details state
    const calculatedGross = details.reduce((sum, item) => sum + (item.allocated_quantity * item.unit_price), 0);
    const calculatedDiscount = details.reduce((sum, item) => sum + (item.discount_amount || 0), 0);
    const calculatedNetAllocation = calculatedGross - calculatedDiscount;

    const calculatedAllocatedTotal = calculatedNetAllocation; // For backward compatibility if needed elsewhere

    const handleSaveAndAction = async (action: "approve" | "hold" | "cancel") => {
        setIsSubmitting(true);
        try {
            // 1. Save line items first (if actionable)
            if (isActionable || action === "cancel") {
                const headerUpdates = {
                    allocated_amount: calculatedAllocatedTotal,
                };
                const itemsToUpdate = details.map(d => ({
                    order_detail_id: d.order_detail_id,
                    allocated_quantity: d.allocated_quantity,
                    net_amount: (d.allocated_quantity * d.unit_price) - (d.discount_amount || 0)
                }));
                await onSaveDetails(order.order_id, headerUpdates, itemsToUpdate);
            }

            // 2. Perform status update
            let success = false;
            if (action === "approve") success = await onApprove([order.order_id]);
            else if (action === "hold") success = await onHold([order.order_id]);
            else if (action === "cancel") success = await onCancel([order.order_id]);

            if (success) onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
        }).format(amount);
    };


    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent
                showCloseButton={false}
                className="
                flex flex-col p-0 gap-0 overflow-hidden
                bg-background
                border-0 sm:border sm:border-border
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
                <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 shrink-0 bg-muted/30 border-b border-border">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                            <div className="hidden sm:flex shrink-0 mt-0.5 w-10 h-10 rounded-xl bg-[#E0F2FE] items-center justify-center">
                                <Clock className="h-5 w-5 text-[#0EA5E9]" />
                            </div>

                            <div className="min-w-0">
                                <DialogTitle className="text-base sm:text-xl font-black flex flex-wrap items-center gap-1.5 text-foreground leading-tight">
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
                                        <span className="text-[11px] font-bold text-muted-foreground truncate max-w-[170px] sm:max-w-xs">
                                            {order.customer_name || "Unknown Customer"}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-bold bg-muted px-1.5 py-0.5 rounded">
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
                                    ${order.order_status === "For Approval" ? "bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]" : ""}
                                    ${order.order_status === "For Consolidation" ? "bg-purple-100 text-purple-800 border-purple-200" : ""}
                                    ${order.order_status === "Delivered" ? "bg-emerald-100 text-emerald-900 border-emerald-200" : ""}
                                    ${order.order_status === "Cancelled" ? "bg-rose-100 text-rose-900 border-rose-200" : ""}
                                    ${order.order_status === "On Hold" ? "bg-slate-100 text-slate-900 border-slate-200" : ""}
                                `}
                            >
                                {order.order_status?.toUpperCase()}
                            </Badge>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex sm:hidden mt-2">
                        <Badge
                            variant="outline"
                            className={`px-2.5 py-0.5 text-[9px] font-black tracking-widest rounded-lg 
                                ${order.order_status === "For Approval" ? "bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]" : ""}
                                ${order.order_status === "For Consolidation" ? "bg-purple-100 text-purple-800 border-purple-200" : ""}
                                ${order.order_status === "Delivered" ? "bg-emerald-100 text-emerald-900 border-emerald-200" : ""}
                                ${order.order_status === "Cancelled" ? "bg-rose-100 text-rose-900 border-rose-200" : ""}
                                ${order.order_status === "On Hold" ? "bg-slate-100 text-slate-900 border-slate-200" : ""}
                            `}
                        >
                            {order.order_status?.toUpperCase()}
                        </Badge>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4">
                        <div className="bg-background border border-border rounded-xl p-3 sm:p-4 flex flex-col gap-1 shadow-sm">
                            <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none">Order Date</p>
                            <p className="font-bold text-[12px] sm:text-sm text-foreground mt-0.5">
                                {order.order_date ? format(new Date(order.order_date), "MMM d, yyyy") : "N/A"}
                            </p>
                        </div>
                        <div className="bg-background border border-border rounded-xl p-3 sm:p-4 flex flex-col gap-1 shadow-sm">
                            <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none">PO Number</p>
                            <p className="font-bold text-[12px] sm:text-sm text-foreground truncate mt-0.5">
                                {order.po_no || "N/A"}
                            </p>
                        </div>
                        <div className="bg-background border border-border rounded-xl p-3 sm:p-4 flex flex-col gap-1 shadow-sm">
                            <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none">Ordered Total</p>
                            <p className="font-bold text-[12px] sm:text-sm text-foreground truncate mt-0.5">
                                {formatCurrency(order.net_amount)}
                            </p>
                        </div>
                        <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 rounded-xl p-3 sm:p-4 flex flex-col gap-1 shadow-sm">
                            <p className="text-[8px] sm:text-[10px] text-sky-600 dark:text-sky-400 uppercase font-black tracking-widest leading-none">
                                {isInvoiceStatus ? "Invoice Total" : "Net Allocation"}
                            </p>
                            <p className="font-black text-[13px] sm:text-lg text-sky-600 dark:text-sky-400 tabular-nums mt-0.5">
                                {formatCurrency(isInvoiceStatus ? (invoiceData?.invoice?.net_amount || 0) : calculatedNetAllocation)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── TABLE AREA ────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
                    {isInvoiceStatus ? (
                        loadingInvoice ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] animate-pulse">Reconstructing Invoice...</p>
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
                                <div className="min-w-[480px]">
                                    <Table>
                                        <TableHeader className="bg-muted sticky top-0 z-10 border-b">
                                            <TableRow className="hover:bg-transparent border-none">
                                                <TableHead className="pl-4 sm:pl-8 h-11 uppercase text-[9px] font-black text-muted-foreground tracking-widest">Product / SKU</TableHead>
                                                <TableHead className="text-right h-11 uppercase text-[9px] font-black text-muted-foreground tracking-widest">Unit Price</TableHead>
                                                <TableHead className="text-center h-11 uppercase text-[9px] font-black text-muted-foreground tracking-widest w-[80px]">Qty</TableHead>
                                                <TableHead className="text-center h-11 uppercase text-[9px] font-black text-muted-foreground tracking-widest">UOM</TableHead>
                                                <TableHead className="text-right pr-4 sm:pr-8 h-11 uppercase text-[9px] font-black text-muted-foreground tracking-widest w-[130px]">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {invoiceData.details.map((item, idx) => (
                                                <TableRow key={idx} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                    <TableCell className="pl-4 sm:pl-8 py-4 sm:py-5">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-foreground text-[12px] sm:text-sm">{item.product_id?.product_name || "N/A Item"}</span>
                                                            <span className="text-[9px] text-muted-foreground font-bold tracking-tighter font-mono">{item.product_id?.product_code}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-muted-foreground font-mono tracking-tight tabular-nums text-[12px] sm:text-sm">{formatCurrency(item.unit_price)}</TableCell>
                                                    <TableCell className="text-center font-bold text-muted-foreground text-[12px] sm:text-sm tabular-nums">{item.quantity}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 border-border bg-muted/50 text-muted-foreground">
                                                            {item.product_id?.uom?.uom_shortcut || "PCS"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-black text-foreground pr-4 sm:pr-8 font-mono text-[13px] sm:text-base tabular-nums tracking-tighter">{formatCurrency(item.total_amount)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="animate-in fade-in duration-700">
                            <div className="min-w-[520px]">
                                <Table>
                                    <TableHeader className="bg-muted sticky top-0 z-10 border-b">
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableHead className="pl-4 sm:pl-8 h-11 uppercase text-[9px] font-black text-muted-foreground tracking-widest">Product Name</TableHead>
                                            <TableHead className="h-11 uppercase text-[9px] font-black text-muted-foreground tracking-widest">SKU</TableHead>
                                            <TableHead className="text-center h-11 uppercase text-[9px] font-black text-muted-foreground tracking-widest">Unit</TableHead>
                                            <TableHead className="text-right h-11 uppercase text-[9px] font-black text-muted-foreground tracking-widest whitespace-nowrap">Unit Price</TableHead>
                                            <TableHead className="text-center h-11 uppercase text-[9px] font-black text-muted-foreground tracking-widest whitespace-nowrap">Ordered Qty</TableHead>
                                            <TableHead className="text-center h-11 uppercase text-[9px] font-black text-muted-foreground tracking-widest w-[120px] whitespace-nowrap">Allocated Qty</TableHead>
                                            <TableHead className="text-right h-11 uppercase text-[9px] font-black text-muted-foreground tracking-widest">Discount</TableHead>
                                            <TableHead className="text-center h-11 uppercase text-[9px] font-black text-muted-foreground tracking-widest whitespace-nowrap">Discount Type</TableHead>
                                            <TableHead className="text-right pr-4 sm:pr-8 h-11 uppercase text-[9px] font-black text-muted-foreground tracking-widest whitespace-nowrap">Allocated Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingDetails ? (
                                            Array.from({ length: 6 }).map((_, i) => (
                                                <TableRow key={i} className="border-slate-50">
                                                    <TableCell className="pl-4 sm:pl-8 py-4"><div className="h-3.5 w-36 sm:w-56 bg-slate-100 animate-pulse rounded" /></TableCell>
                                                    <TableCell><div className="h-3.5 w-14 bg-slate-100 animate-pulse rounded ml-auto" /></TableCell>
                                                    <TableCell><div className="h-3.5 w-8 bg-slate-100 animate-pulse rounded mx-auto" /></TableCell>
                                                    <TableCell><div className="h-3.5 w-16 bg-slate-100 animate-pulse rounded mx-auto" /></TableCell>
                                                    <TableCell className="pr-4 sm:pr-8"><div className="h-3.5 w-16 bg-slate-100 animate-pulse rounded ml-auto" /></TableCell>
                                                </TableRow>
                                            ))
                                        ) : details.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-64 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                                    No line items materialized.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            details.map((li, idx) => {
                                                const productName = li.product_id?.product_name || li.product_id?.description || "Unknown";
                                                const productCode = li.product_id?.product_code || "N/A";
                                                const lineTotal = (li.allocated_quantity * li.unit_price) - (li.discount_amount || 0);
                                                const isExceeding = li.allocated_quantity > li.ordered_quantity;

                                                return (
                                                    <TableRow key={li.order_detail_id || idx} className={cn("hover:bg-slate-50/50 transition-colors border-slate-50 group", isExceeding && "bg-destructive/5 hover:bg-destructive/10")}>
                                                        <TableCell className="pl-4 sm:pl-8 py-4 sm:py-5 min-w-[200px]">
                                                            <span className="font-bold text-slate-900 text-[12px] sm:text-sm group-hover:text-primary transition-colors">{productName}</span>
                                                        </TableCell>
                                                        <TableCell className="py-4">
                                                            <span className="text-[10px] font-bold text-slate-500 tracking-tighter font-mono">{productCode}</span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 border-border bg-muted/50 text-muted-foreground whitespace-nowrap">
                                                                {li.product_id?.uom?.uom_shortcut || "PCS"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-slate-500 font-mono tracking-tight tabular-nums text-[12px] sm:text-sm">{formatCurrency(li.unit_price)}</TableCell>
                                                        <TableCell className="text-center font-bold text-muted-foreground text-[12px] sm:text-sm tabular-nums">{li.ordered_quantity}</TableCell>
                                                        <TableCell className="text-center">
                                                            {isActionable ? (
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <Input
                                                                        type="number"
                                                                        value={li.allocated_quantity}
                                                                        onChange={(e) => updateAllocatedQty(idx, e.target.value)}
                                                                        className={cn(
                                                                            "w-20 text-center h-7 text-[11px] font-black border focus-visible:ring-emerald-500 mx-auto transition-all",
                                                                            isExceeding 
                                                                                ? "bg-destructive/10 text-destructive border-destructive focus-visible:ring-destructive" 
                                                                                : "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50"
                                                                        )}
                                                                        disabled={isSubmitting}
                                                                    />
                                                                    {isExceeding && (
                                                                        <span className="text-[8px] font-black text-destructive uppercase tracking-tighter leading-none animate-bounce">Exceeds Order!</span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-black text-[10px] border border-emerald-100 dark:border-emerald-900/50 tabular-nums">{li.allocated_quantity}</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right text-muted-foreground font-mono tabular-nums text-[12px] whitespace-nowrap px-4 tracking-tighter">
                                                            {li.discount_amount > 0 ? (
                                                                <span className="text-rose-500 font-bold">-{formatCurrency(li.discount_amount)}</span>
                                                            ) : "-"}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400 whitespace-nowrap">
                                                                {discountTypes[Number(li.discount_type)] || "No Discount"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-black text-foreground pr-4 sm:pr-8 font-mono text-[13px] sm:text-base tabular-nums tracking-tighter">
                                                            {formatCurrency(lineTotal > 0 ? lineTotal : 0)}
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
                <div className="px-4 sm:px-8 py-4 sm:py-6 border-t bg-muted/30 backdrop-blur-md flex flex-row items-center justify-between gap-4 shrink-0 mt-auto">
                    <div className="flex items-center gap-6 sm:gap-14 min-w-0">
                        <div className="flex flex-col gap-0.5 shrink-0">
                            <p className="text-[8px] sm:text-[9px] text-muted-foreground uppercase font-black tracking-widest leading-none">Gross</p>
                            <p className="font-black text-sm sm:text-lg text-foreground leading-none mt-1 tabular-nums">{formatCurrency(isInvoiceStatus ? (invoiceData?.invoice?.gross_amount || 0) : calculatedGross)}</p>
                        </div>
                        <div className="flex flex-col gap-0.5 shrink-0">
                            <p className="text-[8px] sm:text-[9px] text-rose-500 uppercase font-black tracking-widest leading-none">Discount</p>
                            <p className="font-black text-sm sm:text-lg text-rose-500 leading-none mt-1 tabular-nums">-{formatCurrency(isInvoiceStatus ? (invoiceData?.invoice?.discount_amount || 0) : calculatedDiscount)}</p>
                        </div>
                        <div className="w-px h-8 bg-border shrink-0" />
                        <div className="flex flex-col gap-0.5 min-w-0">
                            <p className="text-[8px] sm:text-[9px] text-muted-foreground uppercase font-black tracking-widest leading-none truncate">{isInvoiceStatus ? "Invoice Net" : "Net Allocation"}</p>
                            <div className="flex items-baseline gap-1 leading-none mt-1">
                                <span className="text-[9px] sm:text-[11px] font-black text-muted-foreground/30 uppercase italic shrink-0">PHP</span>
                                <p className="text-[20px] sm:text-[32px] lg:text-[40px] font-black text-foreground tabular-nums tracking-tighter leading-none">
                                    {formatCurrency(isInvoiceStatus ? (invoiceData?.invoice?.net_amount || 0) : calculatedNetAllocation).replace("PHP", "").replace("₱", "").trim()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="h-9 sm:h-12 px-4 sm:px-8 font-bold uppercase tracking-widest text-[10px] sm:text-xs rounded-xl border-border bg-background hover:bg-muted text-foreground transition-all shadow-sm"
                        >
                            <span className="hidden sm:inline">Close Record</span>
                            <span className="sm:hidden">Close</span>
                        </Button>

                        {!isInvoiceStatus && isActionable && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="destructive"
                                    className="h-9 sm:h-12 px-4 sm:px-6 font-bold uppercase tracking-widest text-[10px] sm:text-xs rounded-xl shadow-md transition-all hover:scale-[1.02]"
                                    disabled={isSubmitting}
                                    onClick={() => handleSaveAndAction("cancel")}
                                >
                                    Cancel
                                </Button>
                                {canHold && (
                                    <Button
                                        variant="secondary"
                                        className="h-9 sm:h-12 px-4 font-bold uppercase tracking-widest text-[10px] sm:text-xs rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border shadow-sm transition-all"
                                        disabled={isSubmitting}
                                        onClick={() => handleSaveAndAction("hold")}
                                    >
                                        On Hold
                                    </Button>
                                )}
                                <Button
                                    className="h-9 sm:h-12 px-6 sm:px-10 font-bold uppercase tracking-widest text-[10px] sm:text-xs rounded-xl bg-success hover:bg-success/90 text-success-foreground shadow-lg border-none transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    disabled={isSubmitting || details.some(d => d.allocated_quantity > d.ordered_quantity)}
                                    onClick={() => handleSaveAndAction("approve")}
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Approve
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
