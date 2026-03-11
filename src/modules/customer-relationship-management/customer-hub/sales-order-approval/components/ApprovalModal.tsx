"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, Check, AlertCircle, Clock, Trash2 } from "lucide-react";

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

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="w-full sm:max-w-6xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
                <div className="p-6 pb-4 shrink-0 bg-slate-50/50">
                    <DialogHeader>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-2 rounded-lg">
                                    <Clock className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-black">SO No: {order.order_no}</DialogTitle>
                                    <DialogDescription className="text-base font-medium">
                                        {order.customer_name} <span className="text-muted-foreground ml-1">({order.customer_code})</span>
                                    </DialogDescription>
                                </div>
                            </div>
                            <Badge variant="outline" className={`
                                px-4 py-1 text-sm font-bold shadow-sm
                                ${order.order_status === "For Approval" ? "bg-amber-100 text-amber-800 border-amber-200" : ""}
                                ${order.order_status === "For Consolidation" ? "bg-purple-100 text-purple-800 border-purple-200" : ""}
                                ${order.order_status === "Delivered" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : ""}
                                ${order.order_status === "Cancelled" ? "bg-destructive/10 text-destructive border-destructive/20" : ""}
                                ${order.order_status === "On Hold" ? "bg-slate-200 text-slate-900 border-slate-300" : ""}
                            `}>
                                {order.order_status.toUpperCase()}
                            </Badge>
                        </div>
                    </DialogHeader>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pb-2">
                        <div className="bg-white border rounded-xl p-4 shadow-sm">
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Order Date</p>
                            <p className="font-bold text-lg">{order.order_date ? format(new Date(order.order_date), "MMM d, yyyy") : "N/A"}</p>
                        </div>
                        <div className="bg-white border rounded-xl p-4 shadow-sm">
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">PO Number</p>
                            <p className="font-bold text-lg">{order.po_no || "N/A"}</p>
                        </div>
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 shadow-sm">
                            <p className="text-[10px] text-primary uppercase font-black tracking-widest">Ordered Total</p>
                            <p className="font-black text-xl text-primary">{formatCurrency(order.net_amount)}</p>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Main Content Area: Order vs Invoice */}
                <div className="flex-1 overflow-y-auto min-h-[400px]">
                    {isInvoiceStatus ? (
                        loadingInvoice ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Generating Invoice Preview...</p>
                            </div>
                        ) : !invoiceData?.invoice ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-4">
                                <AlertCircle className="h-12 w-12 opacity-20" />
                                <p className="italic text-lg">Invoice record not yet generated for this order.</p>
                            </div>
                        ) : (
                            <div className="p-8 max-w-4xl mx-auto space-y-8">
                                {/* Invoice Branding & Header */}
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">SALES INVOICE</h2>
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{invoiceData.invoice.invoice_no}</p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <div className="flex items-center gap-2 justify-end">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Invoice Date:</span>
                                            <span className="text-sm font-bold">{invoiceData.invoice.invoice_date ? format(new Date(invoiceData.invoice.invoice_date), "MMM d, yyyy") : "N/A"}</span>
                                        </div>
                                        <div className="flex items-center gap-2 justify-end">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sales ID:</span>
                                            <span className="text-sm font-bold italic">{invoiceData.invoice.salesman_id}</span>
                                        </div>
                                    </div>
                                </div>

                                <Separator className="bg-slate-200" />

                                {/* Invoice Items Table */}
                                <div className="border rounded-2xl overflow-hidden shadow-sm">
                                    <Table>
                                        <TableHeader className="bg-slate-900">
                                            <TableRow className="hover:bg-slate-900 border-none">
                                                <TableHead className="text-slate-100 font-bold pl-6">Item / Description</TableHead>
                                                <TableHead className="text-slate-100 text-right font-bold">Price</TableHead>
                                                <TableHead className="text-slate-100 text-center font-bold w-[100px]">Qty</TableHead>
                                                <TableHead className="text-slate-100 text-right font-bold w-[120px]">Discount</TableHead>
                                                <TableHead className="text-slate-100 text-right font-bold pr-6 w-[150px]">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="bg-white">
                                            {invoiceData.details.map((item, idx) => {
                                                const prod = item.product_id;
                                                return (
                                                    <TableRow key={idx} className="border-slate-100">
                                                        <TableCell className="pl-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-900">{prod?.product_name || "Unknown"}</span>
                                                                <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">{prod?.description || prod?.product_code}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium text-slate-600">{formatCurrency(item.unit_price)}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="secondary" className="font-black bg-slate-100 text-slate-700">{item.quantity}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right text-destructive font-bold">-{formatCurrency(item.discount_amount)}</TableCell>
                                                        <TableCell className="text-right font-black text-slate-900 pr-6">{formatCurrency(item.total_amount)}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Invoice Calculations */}
                                <div className="flex flex-col items-end space-y-2 pt-4">
                                    <div className="flex items-center gap-12 text-sm text-slate-500">
                                        <span className="uppercase font-bold tracking-widest">Gross Total</span>
                                        <span className="font-bold text-slate-700 w-32 text-right">{formatCurrency(invoiceData.invoice.gross_amount)}</span>
                                    </div>
                                    <div className="flex items-center gap-12 text-sm text-destructive">
                                        <span className="uppercase font-bold tracking-widest">Total Discount</span>
                                        <span className="font-bold w-32 text-right">-{formatCurrency(invoiceData.invoice.discount_amount)}</span>
                                    </div>
                                    <div className="flex items-center gap-12 text-sm text-slate-500">
                                        <span className="uppercase font-bold tracking-widest">VAT Amount</span>
                                        <span className="font-bold text-slate-700 w-32 text-right">{formatCurrency(invoiceData.invoice.vat_amount)}</span>
                                    </div>
                                    <div className="h-[1px] w-64 bg-slate-200 my-2" />
                                    <div className="flex items-center gap-12">
                                        <span className="text-sm uppercase font-black tracking-widest text-primary">Invoice Net Total</span>
                                        <span className="text-3xl font-black text-slate-900 w-48 text-right underline decoration-primary decoration-4 underline-offset-8">
                                            {formatCurrency(invoiceData.invoice.net_amount)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    ) : (
                        /* Order Mode View */
                        <Table>
                            <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="pl-6 w-[350px]">Product / Description</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right w-[100px]">Ordered Qty</TableHead>
                                    <TableHead className="text-right w-[140px]">Allocated Qty</TableHead>
                                    <TableHead className="text-right">Discount</TableHead>
                                    <TableHead className="text-right pr-6"> Allocated Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingDetails ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="pl-6"><div className="h-4 w-64 bg-muted animate-pulse rounded" /></TableCell>
                                            <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                                            <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                                            <TableCell><div className="h-8 w-20 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                                            <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                                            <TableCell className="pr-6"><div className="h-4 w-20 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : details.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                                            No line items found for this order.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    details.map((li, idx) => {
                                        const productName = li.product_id?.product_name || li.product_id?.description || "Unknown Product";
                                        const productCode = li.product_id?.product_code || "N/A";
                                        const description = li.product_id?.description;
                                        const lineTotal = (li.allocated_quantity * li.unit_price) - (li.discount_amount || 0);

                                        return (
                                            <TableRow key={li.order_detail_id || idx} className="hover:bg-muted/20">
                                                <TableCell className="pl-6">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm text-slate-800">{productName}</span>
                                                        {description && description !== productName && (
                                                            <span className="text-[10px] text-muted-foreground italic leading-tight">{description}</span>
                                                        )}
                                                        <span className="text-[10px] font-mono text-primary/70 mt-0.5">{productCode}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-slate-600">{formatCurrency(li.unit_price)}</TableCell>
                                                <TableCell className="text-right font-bold text-slate-500">{li.ordered_quantity}</TableCell>
                                                <TableCell className="text-right">
                                                    {isActionable ? (
                                                        <Input
                                                            type="number"
                                                            value={li.allocated_quantity}
                                                            onChange={(e) => updateAllocatedQty(idx, e.target.value)}
                                                            className="w-24 text-right h-8 font-black text-emerald-700 bg-emerald-50 border-emerald-200 focus-visible:ring-emerald-500 ml-auto"
                                                            disabled={isSubmitting}
                                                        />
                                                    ) : (
                                                        <span className="font-black text-slate-700">{li.allocated_quantity}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right text-destructive font-medium">
                                                    -{formatCurrency(li.discount_amount)}
                                                </TableCell>
                                                <TableCell className="text-right font-black text-slate-900 pr-6">
                                                    {formatCurrency(lineTotal > 0 ? lineTotal : 0)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-6 shrink-0">
                    <div className="flex flex-col items-center sm:items-start">
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest pl-1">
                            {isInvoiceStatus ? "Billed Amount" : "Allocated Total"}
                        </p>
                        <p className={`text-3xl font-black ${isInvoiceStatus ? "text-slate-900" : "text-emerald-600"}`}>
                            {formatCurrency(isInvoiceStatus ? (invoiceData?.invoice?.net_amount || 0) : calculatedAllocatedTotal)}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="font-bold border-transparent hover:bg-slate-200"
                        >
                            Close
                        </Button>

                        {!isInvoiceStatus && (
                            <>
                                <div className="h-8 w-[1px] bg-slate-300 hidden sm:block mx-1" />

                                {(isActionable || order.order_status === "For Approval") && (
                                    <Button
                                        variant="destructive"
                                        className="font-black px-6 gap-2 h-11"
                                        disabled={isSubmitting}
                                        onClick={() => handleSaveAndAction("cancel")}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Cancel Order
                                    </Button>
                                )}

                                {canHold && (
                                    <Button
                                        variant="secondary"
                                        className="font-black px-6 gap-2 h-11 bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300"
                                        disabled={isSubmitting}
                                        onClick={() => handleSaveAndAction("hold")}
                                    >
                                        <AlertCircle className="h-4 w-4" />
                                        On Hold
                                    </Button>
                                )}

                                {isActionable && (
                                    <Button
                                        className="font-black px-8 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg h-11"
                                        disabled={isSubmitting}
                                        onClick={() => handleSaveAndAction("approve")}
                                    >
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
                                        Approve Order
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
