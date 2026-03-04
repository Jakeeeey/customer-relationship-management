"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, Check } from "lucide-react";

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

import type { CustomerGroup } from "../hooks/useSalesOrderApproval";
import { getPaymentSummary } from "../providers/fetchProvider";

interface ApprovalDrawerProps {
    group: CustomerGroup | null;
    open: boolean;
    onClose: () => void;
    onApprove: (orderIds: (string | number)[]) => Promise<boolean>;
}

export function ApprovalDrawer({ group, open, onClose, onApprove }: ApprovalDrawerProps) {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [summary, setSummary] = useState({ invoiceTotal: 0, paidTotal: 0, unpaidTotal: 0 });

    useEffect(() => {
        if (open && group && group.orders.length > 0) {
            // Auto select all when opening
            setSelectedIds(new Set(group.orders.map(o => o.order_id)));

            // Fetch payment summary for this customer group's orders
            const fetchSummary = async () => {
                setLoadingSummary(true);
                try {
                    const orderIds = group.orders.map(o => o.order_id);
                    const data = await getPaymentSummary(orderIds);
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

    const allSelected = selectedIds.size === group.orders.length;

    const handleToggleAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(group.orders.map(o => o.order_id)));
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
        <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto flex flex-col p-0">
                <div className="p-6 pb-4">
                    <SheetHeader>
                        <SheetTitle className="text-xl">{group.customer_name}</SheetTitle>
                        <SheetDescription>Customer Code: {group.customer_code}</SheetDescription>
                    </SheetHeader>

                    {/* Payment Summary Panel */}
                    <div className="mt-6 rounded-lg border bg-card text-card-foreground shadow-sm p-4">
                        <h4 className="font-semibold mb-3 flex items-center justify-between">
                            Payment Summary
                            {loadingSummary && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </h4>
                        {!loadingSummary && (
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground mb-1">Invoice Total</p>
                                    <p className="font-medium">{formatCurrency(summary.invoiceTotal)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground mb-1">Paid Total</p>
                                    <p className="font-medium text-emerald-600">{formatCurrency(summary.paidTotal)}</p>
                                </div>
                                <div className="border-l pl-4">
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
                        <Button variant="ghost" size="sm" onClick={handleToggleAll} className="h-8 text-xs">
                            {allSelected ? "Deselect All" : "Select All"}
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {group.orders.map((order) => {
                            const isSelected = selectedIds.has(order.order_id);
                            return (
                                <div
                                    key={order.order_id}
                                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${isSelected ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}
                                >
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => handleToggleOne(order.order_id)}
                                        className="mt-1"
                                    />
                                    <div className="flex-1 min-w-0" onClick={() => handleToggleOne(order.order_id)}>
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="font-medium text-sm leading-none">{order.order_no}</p>
                                            <p className="font-semibold text-sm">
                                                {formatCurrency(Number(order.net_amount) || 0)}
                                            </p>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                                            <p>PO: {order.po_no || "N/A"}</p>
                                            <p>{format(new Date(order.order_date), "MMM d, yyyy")}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky bottom-0 z-10">
                    <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
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
            </SheetContent>
        </Sheet>
    );
}
