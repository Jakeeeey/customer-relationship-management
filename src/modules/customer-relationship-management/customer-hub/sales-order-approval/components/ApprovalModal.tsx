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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

import type { CustomerGroup } from "../hooks/useSalesOrderApproval";
import { getPaymentSummary } from "../providers/fetchProvider";

interface ApprovalModalProps {
    group: CustomerGroup | null;
    open: boolean;
    onClose: () => void;
    onApprove: (orderIds: (string | number)[]) => Promise<boolean>;
}

export function ApprovalModal({ group, open, onClose, onApprove }: ApprovalModalProps) {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [summary, setSummary] = useState({ invoiceTotal: 0, paidTotal: 0, unpaidTotal: 0 });

    useEffect(() => {
        if (open && group && group.orders.length > 0) {
            // Auto select all 'For Approval' orders when opening
            const actionableIds = group.orders
                .filter(o => o.order_status === "For Approval")
                .map(o => o.order_id);
            setSelectedIds(new Set(actionableIds));

            // Fetch payment summary for this customer group's orders
            const fetchSummary = async () => {
                setLoadingSummary(true);
                try {
                    const orderIds = group.orders.map(o => o.order_id);
                    const orderNos = group.orders.map(o => o.order_no).filter(Boolean);
                    const data = await getPaymentSummary(orderIds, orderNos);
                    setSummary(data);
                } catch (error) {
                    console.error("Failed to load payment summary", error);
                } finally {
                    setLoadingSummary(false);
                }
            };
            fetchSummary();
        } else {
            setSelectedIds(new Set());
            setSummary({ invoiceTotal: 0, paidTotal: 0, unpaidTotal: 0 });
        }
    }, [open, group]);

    if (!group) return null;

    const actionableOrders = group.orders.filter(o => o.order_status === "For Approval");
    const allSelected = actionableOrders.length > 0 && selectedIds.size === actionableOrders.length;

    const handleToggleAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(actionableOrders.map(o => o.order_id)));
        }
    };

    const handleToggleOne = (id: number) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleApproveSelected = async () => {
        if (selectedIds.size === 0) return;
        setIsSubmitting(true);
        const success = await onApprove(Array.from(selectedIds));
        setIsSubmitting(false);
        if (success) onClose();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
        }).format(amount);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <div className="p-6 pb-4 shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-xl">{group.customer_name}</DialogTitle>
                        <DialogDescription>Customer Code: {group.customer_code}</DialogDescription>
                    </DialogHeader>

                    {/* Payment Summary Panel */}
                    <div className="mt-6 rounded-lg border bg-card text-card-foreground shadow-sm p-4">
                        <h4 className="font-semibold mb-3 flex items-center justify-between">
                            Payment Summary
                            {loadingSummary && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </h4>
                        {!loadingSummary && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground mb-1">Invoice Total</p>
                                    <p className="font-medium">{formatCurrency(summary.invoiceTotal)}</p>
                                </div>
                                <div className="sm:border-l sm:pl-4">
                                    <p className="text-muted-foreground mb-1">Paid Total</p>
                                    <p className="font-medium text-emerald-600">{formatCurrency(summary.paidTotal)}</p>
                                </div>
                                <div className="sm:border-l sm:pl-4">
                                    <p className="text-muted-foreground mb-1">Unpaid Total</p>
                                    <p className={`font-semibold ${summary.unpaidTotal > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                                        {formatCurrency(summary.unpaidTotal)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <Separator />

                {/* Orders List */}
                <div className="flex-1 overflow-y-auto p-6 pt-4">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold">Orders ({group.orders.length})</h4>
                        {actionableOrders.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={handleToggleAll} className="h-8 text-xs">
                                {allSelected ? "Deselect All" : "Select All"}
                            </Button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {group.orders.map((order) => {
                            const isActionable = order.order_status === "For Approval";
                            const isSelected = selectedIds.has(order.order_id);

                            // Badge color logic
                            let badgeColor = "bg-secondary text-secondary-foreground";
                            if (isActionable) badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
                            else if (order.order_status === "For Consolidation") badgeColor = "bg-purple-100 text-purple-800 border-purple-200";
                            else if (order.order_status === "Delivered") badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                            else if (order.order_status === "Cancelled") badgeColor = "bg-destructive/10 text-destructive border-destructive/20";

                            return (
                                <div
                                    key={order.order_id}
                                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${isSelected ? 'bg-primary/5 border-primary/20' : 'bg-card'} ${!isActionable && 'opacity-75'}`}
                                >
                                    {isActionable && (
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => handleToggleOne(order.order_id)}
                                            className="mt-1"
                                        />
                                    )}
                                    <div
                                        className={`flex-1 min-w-0 ${isActionable ? 'cursor-pointer' : ''}`}
                                        onClick={() => isActionable && handleToggleOne(order.order_id)}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-4 mb-2 sm:mb-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-medium text-sm leading-none">{order.order_no}</p>
                                                {!isActionable && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${badgeColor}`}>
                                                        {order.order_status}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="font-semibold text-sm">
                                                {formatCurrency(Number(order.net_amount) || 0)}
                                            </p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs text-muted-foreground gap-1">
                                            <p className="break-words">PO: {order.po_no || "N/A"}</p>
                                            <p className="shrink-0">{format(new Date(order.order_date), "MMM d, yyyy")}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sticky Action Footer */}
                {actionableOrders.length > 0 && (
                    <div className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky bottom-0 z-10">
                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                            size="lg"
                            disabled={selectedIds.size === 0 || isSubmitting}
                            onClick={handleApproveSelected}
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            ) : (
                                <Check className="h-5 w-5 mr-2" />
                            )}
                            Approve Selected ({selectedIds.size})
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
