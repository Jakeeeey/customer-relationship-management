"use client";

import React from "react";
import { NormalizeRequest } from "../types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface Props {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    target: NormalizeRequest | null;
    action: "Approved" | "Rejected" | null;
    isProcessing: boolean;
    onConfirm: () => void;
}

export function ApprovalConfirmationDialog({ isOpen, onOpenChange, target, action, isProcessing, onConfirm }: Props) {
    if (!target || !action) return null;

    const isApprove = action === "Approved";

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Confirm {isApprove ? "Approval" : "Rejection"}
                    </AlertDialogTitle>
                </AlertDialogHeader>
                <div className="space-y-4 py-2 text-sm text-muted-foreground">
                    <p>
                        Are you sure you want to{" "}
                        <strong className={isApprove ? "text-green-600" : "text-red-600"}>
                            {isApprove ? "approve" : "reject"}
                        </strong>{" "}
                        this normalization request?
                    </p>
                    
                    <div className="rounded-lg border bg-white shadow-sm overflow-hidden flex flex-col">
                        <div className="px-5 py-2">
                            <table className="w-full">
                                <tbody>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3 text-gray-500 font-semibold uppercase text-[10px] tracking-wide">Invoice No.</td>
                                        <td className="py-3 text-right font-bold text-gray-900">{target.invoice_no}</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3 text-gray-500 font-semibold uppercase text-[10px] tracking-wide">Requested By</td>
                                        <td className="py-3 text-right text-gray-900 font-medium">{target.requested_by_name ?? `User #${target.requested_by}`}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 text-gray-500 font-semibold uppercase text-[10px] tracking-wide">Remarks</td>
                                        <td className="py-3 text-right text-gray-900 font-bold">{target.remarks || "—"}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* INVOICE ITEMS (Only show if exists) */}
                        {target.invoice_details && target.invoice_details.length > 0 && (
                            <div className="bg-gray-50 p-4 border-t border-gray-100">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                    Invoice Items
                                </div>
                                <div className="border rounded-md max-h-[250px] overflow-y-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-muted/50 text-muted-foreground sticky top-0">
                                            <tr>
                                                <th className="font-medium p-2">Product Name</th>
                                                <th className="font-medium p-2 text-right">Qty</th>
                                                <th className="font-medium p-2 text-right">Unit Price</th>
                                                <th className="font-medium p-2 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {target.invoice_details.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="p-2 font-medium">
                                                        {item.product_name ? `${item.product_name} (${item.product_id})` : item.product_id}
                                                    </td>
                                                    <td className="p-2 text-right">{item.quantity}</td>
                                                    <td className="p-2 text-right">
                                                        {item.unit_price?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="p-2 text-right font-medium">
                                                        {item.total_amount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isProcessing} className="border-gray-300">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => { e.preventDefault(); onConfirm(); }}
                        disabled={isProcessing}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isProcessing ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                        ) : (
                            `Confirm ${isApprove ? "Approval" : "Rejection"}`
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
