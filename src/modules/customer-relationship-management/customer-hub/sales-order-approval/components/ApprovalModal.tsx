"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, Check, AlertCircle, Clock, Ban, Store, X } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
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
            product_id: { product_name: string; product_code: string; description?: string } | null;
            unit_price: number;
            quantity: number;
            total_amount: number;
            discount_amount: number;
        }[]
    } | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [loadingInvoice, setLoadingInvoice] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isInvoiceStatus = ["For Loading", "For Shipping", "En Route", "Delivered"].includes(order?.order_status || "");

    useEffect(() => {
        if (open && order) {
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
    const calculatedAllocatedTotal = details.reduce((sum, item) => {
        const lineTotal = (item.allocated_quantity * item.unit_price) - (item.discount_amount || 0);
        return sum + (lineTotal > 0 ? lineTotal : 0);
    }, 0);

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

    const lineCount = isInvoiceStatus ? (invoiceData?.details.length || 0) : details.length;

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
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
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
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
                                            {order.customer_name || "Unknown Customer"}
                                        </span>
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
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
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
                        <div className="bg-white border border-slate-100 rounded-xl p-3 sm:p-4 flex flex-col gap-1 shadow-sm">
                            <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none">Order Date</p>
                            <p className="font-bold text-[12px] sm:text-sm text-slate-900 mt-0.5">
                                {order.order_date ? format(new Date(order.order_date), "MMM d, yyyy") : "N/A"}
                            </p>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-xl p-3 sm:p-4 flex flex-col gap-1 shadow-sm">
                            <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none">PO Number</p>
                            <p className="font-bold text-[12px] sm:text-sm text-slate-900 truncate mt-0.5">
                                {order.po_no || "N/A"}
                            </p>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-xl p-3 sm:p-4 flex flex-col gap-1 shadow-sm">
                            <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none">Ordered Total</p>
                            <p className="font-bold text-[12px] sm:text-sm text-slate-900 truncate mt-0.5">
                                {formatCurrency(order.net_amount)}
                            </p>
                        </div>
                        <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-xl p-3 sm:p-4 flex flex-col gap-1 shadow-sm">
                            <p className="text-[8px] sm:text-[10px] text-[#0284C7] uppercase font-black tracking-widest leading-none">
                                {isInvoiceStatus ? "Invoice Total" : "Allocated Total"}
                            </p>
                            <p className="font-black text-[13px] sm:text-lg text-[#0284C7] tabular-nums mt-0.5">
                                {formatCurrency(isInvoiceStatus ? (invoiceData?.invoice?.net_amount || 0) : calculatedAllocatedTotal)}
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
                                                            <span className="font-bold text-slate-900 text-[12px] sm:text-sm">{item.product_id?.product_name || "N/A Item"}</span>
                                                            <span className="text-[9px] text-slate-400 font-bold tracking-tighter font-mono">{item.product_id?.product_code}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-slate-500 font-mono tracking-tight tabular-nums text-[12px] sm:text-sm">{formatCurrency(item.unit_price)}</TableCell>
                                                    <TableCell className="text-center font-bold text-slate-500 text-[12px] sm:text-sm tabular-nums">{item.quantity}</TableCell>
                                                    <TableCell className="text-right font-black text-slate-950 pr-4 sm:pr-8 font-mono text-[13px] sm:text-base tabular-nums tracking-tighter">{formatCurrency(item.total_amount)}</TableCell>
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
                                    <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableHead className="pl-4 sm:pl-8 h-11 uppercase text-[9px] font-black text-[#94A3B8] tracking-widest">Product / SKU</TableHead>
                                            <TableHead className="text-right h-11 uppercase text-[9px] font-black text-[#94A3B8] tracking-widest">Price</TableHead>
                                            <TableHead className="text-center h-11 uppercase text-[9px] font-black text-[#94A3B8] tracking-widest">Ordered</TableHead>
                                            <TableHead className="text-center h-11 uppercase text-[9px] font-black text-[#94A3B8] tracking-widest w-[120px]">Allocated</TableHead>
                                            <TableHead className="text-right pr-4 sm:pr-8 h-11 uppercase text-[9px] font-black text-[#94A3B8] tracking-widest">Allocated Total</TableHead>
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
                                            <TableRow><TableCell colSpan={5} className="h-64 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">No line items materialized.</TableCell></TableRow>
                                        ) : (
                                            details.map((li, idx) => {
                                                const productName = li.product_id?.product_name || li.product_id?.description || "Unknown";
                                                const productCode = li.product_id?.product_code || "N/A";
                                                const lineTotal = (li.allocated_quantity * li.unit_price) - (li.discount_amount || 0);

                                                return (
                                                    <TableRow key={li.order_detail_id || idx} className="hover:bg-slate-50/50 transition-colors border-slate-50 group">
                                                        <TableCell className="pl-4 sm:pl-8 py-4 sm:py-5">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="font-bold text-slate-900 text-[12px] sm:text-sm group-hover:text-primary transition-colors">{productName}</span>
                                                                <span className="text-[9px] font-bold text-slate-400 tracking-tighter font-mono">{productCode}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-slate-500 font-mono tracking-tight tabular-nums text-[12px] sm:text-sm">{formatCurrency(li.unit_price)}</TableCell>
                                                        <TableCell className="text-center font-bold text-slate-400 text-[12px] sm:text-sm tabular-nums">{li.ordered_quantity}</TableCell>
                                                        <TableCell className="text-center">
                                                            {isActionable ? (
                                                                <Input
                                                                    type="number"
                                                                    value={li.allocated_quantity}
                                                                    onChange={(e) => updateAllocatedQty(idx, e.target.value)}
                                                                    className="w-20 text-center h-7 text-[11px] font-black text-emerald-700 bg-emerald-50 border-emerald-200 focus-visible:ring-emerald-500 mx-auto"
                                                                    disabled={isSubmitting}
                                                                />
                                                            ) : (
                                                                <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-lg bg-[#F0FDF4] text-[#16A34A] font-black text-[10px] border border-[#DCFCE7] tabular-nums">{li.allocated_quantity}</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right font-black text-slate-950 pr-4 sm:pr-8 font-mono text-[13px] sm:text-base tabular-nums tracking-tighter">{formatCurrency(lineTotal > 0 ? lineTotal : 0)}</TableCell>
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
                    <div className="flex items-center gap-4 sm:gap-10 min-w-0">
                        <div className="flex flex-col gap-0.5 shrink-0">
                            <p className="text-[8px] sm:text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none">Items</p>
                            <p className="font-black text-base sm:text-xl text-slate-900 leading-none mt-1 tabular-nums">{lineCount}</p>
                        </div>
                        <div className="w-px h-8 bg-slate-100 shrink-0" />
                        <div className="flex flex-col gap-0.5 min-w-0">
                            <p className="text-[8px] sm:text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none truncate">{isInvoiceStatus ? "Invoice Total" : "Net Allocation"}</p>
                            <div className="flex items-baseline gap-1 leading-none mt-1">
                                <span className="text-[9px] sm:text-[11px] font-black text-slate-300 uppercase italic shrink-0">PHP</span>
                                <p className="text-[20px] sm:text-[36px] lg:text-[48px] font-black text-slate-950 tabular-nums tracking-tighter leading-none">
                                    {formatCurrency(isInvoiceStatus ? (invoiceData?.invoice?.net_amount || 0) : calculatedAllocatedTotal).replace("PHP", "").replace("₱", "").trim()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="h-9 sm:h-12 px-4 sm:px-8 font-black uppercase tracking-widest text-[10px] sm:text-xs rounded-xl"
                        >
                            <span className="hidden sm:inline">Close Record</span>
                            <span className="sm:hidden">Close</span>
                        </Button>

                        {!isInvoiceStatus && isActionable && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="destructive"
                                    className="h-9 sm:h-12 px-4 sm:px-6 font-black uppercase tracking-widest text-[10px] sm:text-xs rounded-xl"
                                    disabled={isSubmitting}
                                    onClick={() => handleSaveAndAction("cancel")}
                                >
                                    Cancel
                                </Button>
                                {canHold && (
                                    <Button
                                        variant="secondary"
                                        className="h-9 sm:h-12 px-4 font-black uppercase tracking-widest text-[10px] sm:text-xs rounded-xl bg-slate-100 border-slate-200"
                                        disabled={isSubmitting}
                                        onClick={() => handleSaveAndAction("hold")}
                                    >
                                        On Hold
                                    </Button>
                                )}
                                <Button
                                    className="h-9 sm:h-12 px-6 sm:px-10 font-black uppercase tracking-widest text-[10px] sm:text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                                    disabled={isSubmitting}
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
