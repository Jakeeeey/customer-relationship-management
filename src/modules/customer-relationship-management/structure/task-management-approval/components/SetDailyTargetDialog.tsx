// src/modules/customer-relationship-management/structure/task-management-approval/components/SetDailyTargetDialog.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingBag, Save, Loader2 } from "lucide-react";

interface SetDailyTargetDialogProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: number | null;
    customerName: string;
    date: string | null;
    initialAmount?: number;
    onConfirm: (amount: number) => Promise<boolean>;
}

export const SetDailyTargetDialog: React.FC<SetDailyTargetDialogProps> = ({
    isOpen,
    onClose,
    customerName,
    date,
    initialAmount = 0,
    onConfirm,
}) => {
    const [amount, setAmount] = useState<string>(initialAmount.toString());
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                setAmount(initialAmount > 0 ? initialAmount.toString() : "");
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [isOpen, initialAmount]);

    const handleConfirm = async () => {
        const val = parseFloat(amount);
        if (isNaN(val) || val < 0) return;

        setIsSubmitting(true);
        const success = await onConfirm(val);
        setIsSubmitting(false);
        if (success) onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[400px] rounded-3xl border-primary/20 bg-background/95 backdrop-blur-2xl shadow-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-2xl bg-primary/10 text-primary">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">Set Sales Target</DialogTitle>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground/80 leading-tight">
                            {customerName}
                        </p>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                            {date ? new Date(date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : ""}
                        </p>
                    </div>
                </DialogHeader>

                <div className="py-6 space-y-4">
                    <div className="space-y-2.5">
                        <Label htmlFor="amount" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                            Daily Target Amount (₱)
                        </Label>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-primary/30 group-focus-within:text-primary transition-colors italic">₱</span>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="h-16 pl-12 text-2xl font-black bg-muted/30 border-primary/10 focus:ring-primary/20 transition-all rounded-2xl"
                                autoFocus
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-3 sm:gap-0">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black/5"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
                        className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-primary text-white shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Confirm Target
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
