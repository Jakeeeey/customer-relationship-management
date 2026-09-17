"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileEdit, CheckCircle2, AlertCircle, PackageSearch } from "lucide-react";

interface OrderConfirmationDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (status: "Draft" | "For Approval") => void;
    orderNo: string;
    hasZeroAllocation: boolean;
    isExistingOrder?: boolean;
    existingOrderStatus?: string;
}

export function OrderConfirmationDialog({
    open,
    onClose,
    onConfirm,
    orderNo,
    hasZeroAllocation,
    isExistingOrder = false,
    existingOrderStatus
}: OrderConfirmationDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl">
                <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent p-8">
                    <DialogHeader className="space-y-4">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shadow-inner">
                            <PackageSearch className="w-9 h-9" />
                        </div>
                        <div className="text-center space-y-1">
                            <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                                {isExistingOrder ? "Update Order Entry" : "Confirm Order Flow"}
                            </DialogTitle>
                            <DialogDescription className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                                Order #{orderNo}
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    {hasZeroAllocation && (
                        <div className="mt-6 p-4 rounded-2xl bg-amber-500/5 border border-amber-200/50 flex gap-4 items-start animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-amber-700 uppercase tracking-tighter">Partial Allocation Detected</span>
                                <span className="text-[11px] font-medium text-amber-600/80 leading-relaxed mt-0.5">
                                    {isExistingOrder 
                                        ? "This is an existing record with zero-allocation items. Submit for approval to commit these changes."
                                        : "Some items have zero allocation. Would you like to save this as a Draft for later fulfillment or proceed directly to Approval?"}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-3 mt-8">
                        <Button
                            variant="outline"
                            className="h-20 rounded-2xl border-2 border-slate-100 hover:border-indigo-500/30 hover:bg-indigo-50/50 flex flex-col items-center justify-center gap-1 transition-all group"
                            onClick={() => onConfirm("Draft")}
                        >
                            <div className="flex items-center gap-2 font-black text-indigo-700 tracking-tight uppercase group-hover:scale-110 transition-transform">
                                <FileEdit className="w-5 h-5" />
                                {existingOrderStatus === "Draft" ? "Update Draft" : "Save as Draft"}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60 italic">Handle fulfillment later</span>
                        </Button>

                        <Button
                            className="h-20 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white flex flex-col items-center justify-center gap-1 transition-all group"
                            onClick={() => onConfirm("For Approval")}
                        >
                            <div className="flex items-center gap-2 font-black tracking-tight uppercase group-hover:scale-110 transition-transform">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                {isExistingOrder ? "Commit to Approval" : "Submit for Approval"}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-60 italic">
                                {isExistingOrder ? "Update status to For Approval" : "Bypass Draft Workflow"}
                            </span>
                        </Button>
                    </div>

                    <p className="mt-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-40">
                        Select a target status to proceed
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
