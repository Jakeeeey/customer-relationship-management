"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, AlertCircle, Store, X, FileText, Package } from "lucide-react";
import { cn } from "@/lib/utils";

import {
    Dialog,
    DialogContent,
    DialogDescription,
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

import type { SalesOrder, OrderDetail } from "../hooks/useSalesOrderApproval";
import { getOrderDetails, getInvoiceDetails, getOrderAttachments, getOrderHeader } from "../providers/fetchProvider";

interface ApprovalModalProps {
    order: SalesOrder | null;
    open: boolean;
    onClose: () => void;
    onApprove: (orderIds: (string | number)[]) => Promise<boolean>;
    onHold: (orderIds: (string | number)[]) => Promise<boolean>;
    onCancel: (orderIds: (string | number)[]) => Promise<boolean>;
    onSubmitForApproval?: (orderIds: (string | number)[]) => Promise<boolean>;
    onSaveDetails: (orderId: number, header: Record<string, number | string | null | undefined>, items: { detail_id: number, order_detail_id: number, allocated_quantity: number, net_amount: number, discount_amount: number, gross_amount: number }[]) => Promise<boolean>;
}

export function ApprovalModal({
    order,
    open,
    onClose,
    onApprove,
    onHold,
    onCancel,
    onSubmitForApproval,
}: ApprovalModalProps) {
    const [details, setDetails] = useState<OrderDetail[]>([]);
    const [freshOrder, setFreshOrder] = useState<SalesOrder | null>(null);
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
        }[],
        pdf?: {
            url: string;
            receipt_numbers: string;
            width_mm?: number;
            height_mm?: number;
        } | null
    } | null>(null);
    const [isPdfOpen, setIsPdfOpen] = useState(false);
    const [attachments, setAttachments] = useState<{ file_id?: number; attachment_name?: string; filename?: string; file_url?: string }[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [loadingInvoice, setLoadingInvoice] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [discountTypes, setDiscountTypes] = useState<Record<number, string>>({});

    const activeOrder = freshOrder ? { ...order, ...freshOrder } : order;
    const isInvoiceStatus = ["For Loading", "For Shipping", "En Route", "Delivered"].includes(activeOrder?.order_status || "");

    useEffect(() => {
        if (open && order) {
            // 1. Fetch Header first to be sure
            const refreshHeader = async () => {
                try {
                    const fresh = await getOrderHeader(order.order_id);
                    setFreshOrder(fresh);
                } catch (e) {
                    console.error("Failed to fetch fresh header", e);
                    setFreshOrder(order); // Fallback
                }
            };
            refreshHeader();

            // 2. Fetch Discount Types
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
                const fetchAttachments = async () => {
                    try {
                        const atts = await getOrderAttachments(order.order_id, order.order_no);
                        setAttachments(atts);
                    } catch (e) {
                        console.error("Failed to load attachments", e);
                    }
                };
                fetchAttachments();

                const fetchDetails = async () => {
                    setLoadingDetails(true);
                    try {
                        const data = await getOrderDetails(order.order_id, order.branch_id);
                        // FETCH FRESH DATA: No more aggressive visual guards; show what is exactly on the DB record
                        setDetails(data || []);
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
            setFreshOrder(null);
            setInvoiceData(null);
            setAttachments([]);
        }
    }, [open, order, isInvoiceStatus]);

    if (!activeOrder) return null;

    const isActionable = ["For Approval", "On Hold", "Draft"].includes(activeOrder?.order_status || "");
    const canHold = activeOrder.order_status === "For Approval";


    // Recalculate totals based on local details state
    const getLineDiscount = (item: OrderDetail) => {
        // Preference: If manually changed in this session, use recalculated value
        if (item._recalculated_discount !== undefined) return item._recalculated_discount;

        // Rely purely on database value for initial or fresh load
        return Number(item.discount_amount || 0);
    };

    const getLineNet = (item: OrderDetail) => {
        // 1. Target: database value if present (Requested Net)
        if (item.net_amount !== undefined && item.net_amount !== null && Number(item.net_amount) > 0) {
            return Number(item.net_amount);
        }

        // 2. Fallback: Recalculated value
        if (item.ordered_quantity !== undefined) {
            const disc = getLineDiscount(item);
            const gross = (Number(item.ordered_quantity || 0) * Number(item.unit_price || 0));
            return gross - disc;
        }

        return 0;
    };

    const getLineGross = (item: OrderDetail) => {
        // 1. Target: database value if present
        if (item.gross_amount !== undefined && item.gross_amount !== null && Number(item.gross_amount) > 0) {
            return Number(item.gross_amount);
        }

        // 2. Fallback: Recalculated value
        return (Number(item.ordered_quantity || 0) * Number(item.unit_price || 0));
    };

    const getLineAllocated = (item: OrderDetail) => {
        // 1. Target: database value if present
        if (item.allocated_amount !== undefined && item.allocated_amount !== null && Number(item.allocated_amount) > 0) {
            return Number(item.allocated_amount);
        }

        // 2. Check if it has allocated quantity but zero amount (maybe not yet calculated)
        if (item.allocated_quantity !== undefined && Number(item.allocated_quantity) > 0) {
            const discount = getLineDiscount(item);
            const gross = (Number(item.allocated_quantity || 0) * Number(item.unit_price || 0));
            return Math.max(0, gross - discount);
        }

        return 0;
    };

    const calculatedGross = details.reduce((sum, item) => sum + getLineGross(item), 0);
    const calculatedDiscount = details.reduce((sum, item) => sum + getLineDiscount(item), 0);
    const calculatedOrderedTotal = details.reduce((sum, item) => sum + getLineNet(item), 0);
    const calculatedAllocatedTotal = details.reduce((sum, item) => sum + getLineAllocated(item), 0);
    const isFullyUnallocated = details.length > 0 && details.every(li => (li.allocated_quantity || 0) <= 0);

    const handleSaveAndAction = async (action: "approve" | "hold" | "cancel") => {
        setIsSubmitting(true);
        try {
            // Perform status update only - metrics are left "As Is" in the database
            let success = false;
            if (action === "approve") {
                if (activeOrder.order_status === "Draft" && onSubmitForApproval) {
                    success = await onSubmitForApproval([activeOrder.order_id]);
                } else {
                    success = await onApprove([activeOrder.order_id]);
                }
            }
            else if (action === "hold") success = await onHold([activeOrder.order_id]);
            else if (action === "cancel") success = await onCancel([activeOrder.order_id]);

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
        <>
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
                h-[100dvh] sm:h-[92dvh]
                sm:w-[calc(100vw-2rem)] sm:max-w-2xl lg:max-w-6xl
                translate-x-0 translate-y-0
            ">
                    {/* ── HEADER ─────────────────────────────────────────── */}
                    <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-3 shrink-0 bg-muted/30 border-b border-border">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 min-w-0">
                                <div className="min-w-0">
                                    <DialogTitle className="text-base sm:text-xl font-black flex flex-wrap items-center gap-1.5 text-foreground leading-tight">
                                        <span className="shrink-0">SO: {activeOrder.order_no}</span>
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
                                                {activeOrder.customer_name || "Unknown Customer"}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-bold bg-muted px-1.5 py-0.5 rounded">
                                                {activeOrder.customer_code}
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
                                    ${activeOrder.order_status === "For Approval" ? "bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]" : ""}
                                    ${activeOrder.order_status === "For Consolidation" ? "bg-purple-100 text-purple-800 border-purple-200" : ""}
                                    ${activeOrder.order_status === "Delivered" ? "bg-emerald-100 text-emerald-900 border-emerald-200" : ""}
                                    ${activeOrder.order_status === "Cancelled" ? "bg-rose-100 text-rose-900 border-rose-200" : ""}
                                    ${activeOrder.order_status === "On Hold" ? "bg-slate-100 text-slate-900 border-slate-200" : ""}
                                `}
                                >
                                    {activeOrder.order_status?.toUpperCase()}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex sm:hidden mt-2">
                            <Badge
                                variant="outline"
                                className={`px-2.5 py-0.5 text-[9px] font-black tracking-widest rounded-lg 
                                ${activeOrder.order_status === "For Approval" ? "bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]" : ""}
                                ${activeOrder.order_status === "For Consolidation" ? "bg-purple-100 text-purple-800 border-purple-200" : ""}
                                ${activeOrder.order_status === "Delivered" ? "bg-emerald-100 text-emerald-900 border-emerald-200" : ""}
                                ${activeOrder.order_status === "Cancelled" ? "bg-rose-100 text-rose-900 border-rose-200" : ""}
                                ${activeOrder.order_status === "On Hold" ? "bg-slate-100 text-slate-900 border-slate-200" : ""}
                            `}
                            >
                                {activeOrder.order_status?.toUpperCase()}
                            </Badge>
                        </div>

                        {/* Summary Row - Compact Micro Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-5 mb-1">
                            <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 shadow-sm flex flex-col gap-1 transition-all hover:border-slate-200">
                                <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-none">Order Date</p>
                                <p className="font-bold text-[13px] text-slate-900 dark:text-slate-100 leading-none mt-0.5">
                                    {activeOrder.order_date ? format(new Date(activeOrder.order_date), "MMM d, yyyy") : "N/A"}
                                </p>
                            </div>
                            <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 shadow-sm flex flex-col gap-1 transition-all hover:border-slate-200">
                                <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-none">PO Number</p>
                                <p className="font-bold text-[13px] text-slate-900 dark:text-slate-100 leading-none mt-0.5 truncate">
                                    {activeOrder.po_no || "N/A"}
                                </p>
                            </div>
                            <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 shadow-sm flex flex-col gap-1 transition-all hover:border-slate-200">
                                <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-none">Terms</p>
                                <p className="font-bold text-[13px] text-sky-600 leading-none mt-0.5">
                                    {activeOrder.payment_terms ? `${activeOrder.payment_terms} Days` : "COD"}
                                </p>
                            </div>
                            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3 shadow-sm flex flex-col gap-1 transition-all hover:border-indigo-200">
                                <p className="text-[9px] text-indigo-600 dark:text-indigo-400 uppercase font-black tracking-widest leading-none">Price Type</p>
                                <p className="font-bold text-[13px] text-indigo-700 dark:text-indigo-300 leading-none mt-0.5">
                                    {activeOrder.price_type_name || "Standard"}
                                </p>
                            </div>
                            <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 shadow-sm flex flex-col gap-1 transition-all hover:border-slate-200">
                                <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-none">Ordered Total</p>
                                <p className="font-bold text-[13px] text-slate-900 dark:text-slate-100 leading-none mt-0.5">
                                    {formatCurrency(activeOrder.net_amount || calculatedOrderedTotal)}
                                </p>
                            </div>
                            <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 rounded-xl p-3 shadow-[0_2px_12px_rgba(14,165,233,0.06)] flex flex-col gap-1 transition-all hover:border-sky-200">
                                <p className="text-[10px] text-sky-600 dark:text-sky-400 uppercase font-black tracking-widest leading-none">
                                    {isInvoiceStatus ? "Invoice Total" : "Total Allocated"}
                                </p>
                                <p className="font-black text-lg text-sky-600 dark:text-sky-400 tabular-nums leading-none mt-1">
                                    {formatCurrency(isInvoiceStatus ? (invoiceData?.invoice?.net_amount || 0) : (activeOrder.allocated_amount || calculatedAllocatedTotal))}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Attachments Row */}
                    {attachments.length > 0 && (
                        <div className="px-4 sm:px-6 py-2 bg-muted/10 border-b border-border flex items-center gap-3 overflow-x-auto">
                            <span className="text-[10px] font-black uppercase text-muted-foreground shrink-0 self-center">Attachments:</span>
                            <div className="flex items-center gap-2">
                                {attachments.map((att, i) => (
                                    <a
                                        key={i}
                                        href={`/api/crm/customer-hub/callsheet/file?id=${att.file_id}&filename=${encodeURIComponent(att.attachment_name || "attachment.jpg")}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background border border-border hover:border-primary hover:text-primary transition-all text-[11px] font-bold shadow-sm group"
                                    >
                                        <FileText className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                                        <span className="truncate max-w-[120px]">{att.attachment_name || "Attachment"}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── TABLE AREA ────────────────────────────────────────── */}
                    <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-200">
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
                                                    <TableHead className="pl-4 sm:pl-8 h-10 uppercase text-[9px] font-black text-muted-foreground tracking-widest">Product / SKU</TableHead>
                                                    <TableHead className="text-right h-10 uppercase text-[9px] font-black text-muted-foreground tracking-widest">Unit Price</TableHead>
                                                    <TableHead className="text-center h-10 uppercase text-[9px] font-black text-muted-foreground tracking-widest w-[80px]">Qty</TableHead>
                                                    <TableHead className="text-center h-10 uppercase text-[9px] font-black text-muted-foreground tracking-widest">UOM</TableHead>
                                                    <TableHead className="text-right pr-4 sm:pr-8 h-10 uppercase text-[9px] font-black text-muted-foreground tracking-widest w-[130px]">Amount</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {invoiceData.details.map((item, idx) => (
                                                    <TableRow key={idx} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                        <TableCell className="pl-4 sm:pl-8 py-2.5 sm:py-3">
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
                                                <TableHead className="pl-4 sm:pl-8 h-10 uppercase text-[9px] font-black text-muted-foreground tracking-widest">Product Name</TableHead>
                                                <TableHead className="h-10 uppercase text-[9px] font-black text-muted-foreground tracking-widest">SKU</TableHead>
                                                <TableHead className="text-center h-10 uppercase text-[9px] font-black text-muted-foreground tracking-widest">Unit</TableHead>
                                                <TableHead className="text-right h-10 uppercase text-[9px] font-black text-muted-foreground tracking-widest whitespace-nowrap">Unit Price</TableHead>
                                                <TableHead className="text-center h-10 uppercase text-[9px] font-black text-muted-foreground tracking-widest whitespace-nowrap">Ordered Qty</TableHead>
                                                <TableHead className="text-center h-10 uppercase text-[9px] font-black text-muted-foreground tracking-widest whitespace-nowrap bg-sky-50/50">Available</TableHead>
                                                <TableHead className="text-center h-10 uppercase text-[9px] font-black text-muted-foreground tracking-widest w-[120px] whitespace-nowrap">Alloc Qty</TableHead>
                                                <TableHead className="text-right h-10 uppercase text-[9px] font-black text-muted-foreground tracking-widest">Discount</TableHead>
                                                <TableHead className="text-center h-10 uppercase text-[9px] font-black text-muted-foreground tracking-widest whitespace-nowrap">Discount Type</TableHead>
                                                <TableHead className="text-right pr-4 sm:pr-8 h-10 uppercase text-[9px] font-black text-muted-foreground tracking-widest whitespace-nowrap">Alloc Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loadingDetails ? (
                                                Array.from({ length: 6 }).map((_, i) => (
                                                    <TableRow key={i} className="border-slate-50">
                                                        <TableCell className="pl-4 sm:pl-8 py-3"><div className="h-3.5 w-36 sm:w-56 bg-slate-100 animate-pulse rounded" /></TableCell>
                                                        <TableCell><div className="h-3.5 w-14 bg-slate-100 animate-pulse rounded ml-auto" /></TableCell>
                                                        <TableCell><div className="h-3.5 w-8 bg-slate-100 animate-pulse rounded mx-auto" /></TableCell>
                                                        <TableCell><div className="h-3.5 w-16 bg-slate-100 animate-pulse rounded mx-auto" /></TableCell>
                                                        <TableCell className="pr-4 sm:pr-8"><div className="h-3.5 w-16 bg-slate-100 animate-pulse rounded ml-auto" /></TableCell>
                                                    </TableRow>
                                                ))
                                            ) : details.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={10} className="h-64 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                                        No line items materialized.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                details.map((li, idx) => {
                                                    const productName = li.product_id?.product_name || li.product_id?.description || "Unknown";
                                                    const productCode = li.product_id?.product_code || "N/A";
                                                    const lineAllocated = getLineAllocated(li);
                                                    const isExceeding = (li.allocated_quantity > li.ordered_quantity) || (li.available_qty !== undefined && li.allocated_quantity > li.available_qty);

                                                    return (
                                                        <TableRow key={li.detail_id || li.order_detail_id || idx} className={cn("hover:bg-slate-50/50 transition-colors border-slate-50 group", isExceeding && "bg-destructive/5 hover:bg-destructive/10")}>
                                                            <TableCell className="pl-4 sm:pl-8 py-2.5 sm:py-3.5 min-w-[200px]">
                                                                <span className="font-bold text-slate-900 text-[12px] sm:text-sm group-hover:text-primary transition-colors">{productName}</span>
                                                            </TableCell>
                                                            <TableCell className="py-2.5 sm:py-3.5">
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
                                                                <span className={cn(
                                                                    "inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-lg font-black text-[11px] border tabular-nums",
                                                                    (li.available_qty ?? 0) > 0
                                                                        ? "bg-sky-50 text-sky-600 border-sky-100"
                                                                        : "bg-slate-100 text-slate-400 border-slate-200"
                                                                )}>
                                                                    {li.available_qty ?? 0}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <span className={cn(
                                                                    "inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-lg font-black text-[10px] border tabular-nums",
                                                                    (li.available_qty !== undefined && li.allocated_quantity > li.available_qty)
                                                                        ? "bg-destructive/10 text-destructive border-destructive/20"
                                                                        : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50"
                                                                )}>
                                                                    {li.allocated_quantity}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right text-muted-foreground font-mono tabular-nums text-[12px] whitespace-nowrap px-4 tracking-tighter">
                                                                {getLineDiscount(li) > 0 ? (
                                                                    <span className="text-rose-500 font-bold">-{formatCurrency(getLineDiscount(li))}</span>
                                                                ) : "none"}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400 whitespace-nowrap">
                                                                    {(() => {
                                                                        const val = li.discount_type;
                                                                        if (!val) return "none";
                                                                        const numVal = Number(val);
                                                                        if (!isNaN(numVal) && discountTypes[numVal]) return discountTypes[numVal];
                                                                        return val;
                                                                    })()}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right font-black text-foreground pr-4 sm:pr-8 font-mono text-[13px] sm:text-base tabular-nums tracking-tighter">
                                                                {formatCurrency(lineAllocated)}
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
                                <p className="text-[8px] sm:text-[9px] text-muted-foreground uppercase font-black tracking-widest leading-none"> Gross Total</p>
                                <p className="font-black text-sm sm:text-lg text-foreground leading-none mt-1 tabular-nums">{formatCurrency(isInvoiceStatus ? (invoiceData?.invoice?.gross_amount || 0) : calculatedGross)}</p>
                            </div>
                            <div className="flex flex-col gap-0.5 shrink-0">
                                <p className="text-[8px] sm:text-[9px] text-rose-500 uppercase font-black tracking-widest leading-none">Discount</p>
                                <p className="font-black text-sm sm:text-lg text-rose-500 leading-none mt-1 tabular-nums">-{formatCurrency(isInvoiceStatus ? (invoiceData?.invoice?.discount_amount || 0) : calculatedDiscount)}</p>
                            </div>
                            <div className="w-px h-8 bg-border shrink-0" />
                            <div className="flex flex-col gap-0.5 min-w-0">
                                <p className="text-[8px] sm:text-[9px] text-muted-foreground uppercase font-black tracking-widest leading-none truncate">{isInvoiceStatus ? "Invoice Net" : "Net Amount"}</p>
                                <div className="flex items-baseline gap-1 leading-none mt-1">
                                    <span className="text-[9px] sm:text-[11px] font-black text-muted-foreground/30 uppercase italic shrink-0">PHP</span>
                                    <p className="text-[20px] sm:text-[32px] lg:text-[40px] font-black text-foreground tabular-nums tracking-tighter leading-none">
                                        {formatCurrency(isInvoiceStatus ? (invoiceData?.invoice?.net_amount || 0) : calculatedOrderedTotal).replace("PHP", "").replace("₱", "").trim()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                            {isInvoiceStatus && invoiceData?.pdf && (
                                <Button
                                    onClick={() => setIsPdfOpen(true)}
                                    className="h-9 sm:h-12 px-4 sm:px-6 font-black uppercase tracking-widest text-[10px] sm:text-xs rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-lg transition-all"
                                >
                                    <Package className="mr-2 h-4 w-4" />
                                    View Receipt
                                </Button>
                            )}

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
                                    {isFullyUnallocated ? (
                                        <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-xl animate-in fade-in slide-in-from-right-2 duration-300">
                                            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-300 tracking-tight leading-tight">
                                                    All items are unallocated.
                                                </span>
                                                <span className="text-[9px] font-bold uppercase text-amber-600/80 dark:text-amber-400/80 tracking-tight leading-tight">
                                                    Please allocate at least one item
                                                </span>
                                                <span className="text-[9px] font-bold uppercase text-amber-600/80 dark:text-amber-400/80 tracking-tight leading-tight">
                                                    before approving order.
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button
                                            className="h-9 sm:h-12 px-6 sm:px-10 font-bold uppercase tracking-widest text-[10px] sm:text-xs rounded-xl bg-success hover:bg-success/90 text-success-foreground shadow-lg border-none transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            disabled={isSubmitting}
                                            onClick={() => handleSaveAndAction("approve")}
                                        >
                                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                            Approve
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── PDF PREVIEW DIALOG ──────────────────────────────────── */}
            <Dialog open={isPdfOpen} onOpenChange={setIsPdfOpen}>
                <DialogContent className={cn(
                    "p-0 gap-0 overflow-hidden bg-slate-900 border-none shadow-2xl transition-all duration-300 min-w-0 max-w-[95dvw]",
                    invoiceData?.pdf?.width_mm && invoiceData.pdf.width_mm < 100 ? "sm:max-w-[400px]" : "sm:max-w-[90dvh] lg:max-w-4xl"
                )}>
                    <div className="flex flex-col h-[90dvh]">
                        <div className="px-4 py-3 bg-slate-800 flex items-center justify-between shrink-0">
                            <div className="flex flex-col gap-0.5">
                                <DialogTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">
                                    Digital Document Preview
                                </DialogTitle>
                                <DialogDescription className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
                                    {invoiceData?.pdf?.receipt_numbers || "PDF Rendering..."}
                                </DialogDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                {invoiceData?.pdf?.url && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(invoiceData?.pdf?.url || "", '_blank')}
                                        className="hidden sm:flex h-8 text-[10px] font-black bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white rounded-lg"
                                    >
                                        OPEN TAB
                                    </Button>
                                )}
                                <Button size="icon" variant="ghost" onClick={() => setIsPdfOpen(false)} className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 bg-slate-100 flex justify-center p-2 sm:p-4 overflow-auto scrollbar-thin scrollbar-thumb-slate-300">
                            <div
                                className="bg-white shadow-lg mx-auto"
                                style={{
                                    width: invoiceData?.pdf?.width_mm ? `${(invoiceData.pdf.width_mm * 96) / 25.4}px` : '100%',
                                    minWidth: invoiceData?.pdf?.width_mm ? 'auto' : '100%',
                                    maxWidth: '100%',
                                    height: invoiceData?.pdf?.height_mm ? `${(invoiceData.pdf.height_mm * 96) / 25.4}px` : '100%',
                                    minHeight: '100%'
                                }}
                            >
                                <iframe
                                    src={`${invoiceData?.pdf?.url}#toolbar=1&navpanes=0&scrollbar=1`}
                                    width="100%"
                                    height="100%"
                                    className="border-none"
                                    title="Invoice View"
                                />
                            </div>
                        </div>

                        {(invoiceData?.pdf?.width_mm || invoiceData?.pdf?.height_mm) && (
                            <div className="px-4 py-2 bg-slate-800 text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-4">
                                <span>Sizing:</span>
                                {invoiceData?.pdf?.width_mm && <span>W: {invoiceData.pdf.width_mm}mm</span>}
                                {invoiceData?.pdf?.height_mm && <span>H: {invoiceData.pdf.height_mm}mm</span>}
                                <span className="ml-auto text-sky-500 animate-pulse">OPTIMIZED FIT ACTIVE</span>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
