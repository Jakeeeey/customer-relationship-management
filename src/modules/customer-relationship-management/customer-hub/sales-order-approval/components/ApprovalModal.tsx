"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, Check } from "lucide-react";

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

import type { SalesOrder, OrderDetail } from "../hooks/useSalesOrderApproval";
import { getPaymentSummary, getOrderDetails } from "../providers/fetchProvider";

import { Input } from "@/components/ui/input";
import { AlertCircle, Clock, Trash2 } from "lucide-react";

interface ApprovalModalProps {
    order: SalesOrder | null;
    open: boolean;
    onClose: () => void;
    onApprove: (orderIds: (string | number)[]) => Promise<boolean>;
    onHold: (orderIds: (string | number)[]) => Promise<boolean>;
    onCancel: (orderIds: (string | number)[]) => Promise<boolean>;
    onSaveDetails: (orderId: number, header: any, items: any[]) => Promise<boolean>;
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
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open && order) {
            const fetchDetails = async () => {
                setLoadingDetails(true);
                try {
                    const data = await getOrderDetails(order.order_id);
                    // Ensure allocated_quantity is at least initialized to ordered_quantity if 0
                    const enriched = (data || []).map((item: any) => ({
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
        } else {
            setDetails([]);
        }
    }, [open, order]);

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
                            <p className="font-bold text-lg">{format(new Date(order.order_date), "MMM d, yyyy")}</p>
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

                {/* Line Items Table */}
                <div className="flex-1 overflow-y-auto min-h-[300px]">
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
                                    const productName = (li.product_id as any)?.product_name || (li.product_id as any)?.description || "Unknown Product";
                                    const productCode = (li.product_id as any)?.product_code || "N/A";
                                    const description = (li.product_id as any)?.description;
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
                                                <Input
                                                    type="number"
                                                    value={li.allocated_quantity}
                                                    onChange={(e) => updateAllocatedQty(idx, e.target.value)}
                                                    className="w-24 text-right h-8 font-black text-emerald-700 bg-emerald-50 border-emerald-200 focus-visible:ring-emerald-500 ml-auto"
                                                    disabled={!isActionable || isSubmitting}
                                                />
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
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-6 shrink-0">
                    <div className="flex flex-col items-center sm:items-start">
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest pl-1">Allocated Total</p>
                        <p className="text-3xl font-black text-emerald-600">{formatCurrency(calculatedAllocatedTotal)}</p>
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
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
