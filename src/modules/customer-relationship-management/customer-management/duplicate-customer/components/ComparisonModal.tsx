import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Customer, DuplicateGroup } from "../types";
import { ActionButtons } from "./ActionButtons";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

interface ComparisonModalProps {
    group: DuplicateGroup | null;
    open: boolean;
    onClose: () => void;
    onResolve: (action: 'merge' | 'dismiss' | 'delete') => void;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
    group,
    open,
    onClose,
    onResolve
}) => {
    if (!group) return null;

    const fieldsToCompare: { label: string; key: keyof Customer | 'address' }[] = [
        { label: "Customer Name", key: "customer_name" },
        { label: "Customer TIN", key: "customer_tin" },
        { label: "Store Name", key: "store_name" },
        { label: "Store Signage", key: "store_signage" },
        { label: "Contact Number", key: "contact_number" },
        { label: "Email Address", key: "customer_email" },
        { label: "Address (Bgy/City/Prov)", key: "address" },
        { label: "Created By", key: "encoder_name" },
    ];

    const getFieldDisplay = (customer: Customer, key: keyof Customer | 'address') => {
        if (key === 'address') {
            const parts = [customer.brgy, customer.city, customer.province].filter(Boolean);
            return parts.length > 0 ? parts.join(", ") : "--";
        }
        const val = customer[key as keyof Customer];
        if (val === null || val === undefined || val === "" || val === "0") return "--";
        return String(val);
    };

    const isMatchAcrossAll = (key: keyof Customer | 'address') => {
        const values = group.customers.map(c => getFieldDisplay(c, key).toLowerCase().trim());
        return values.every(v => v === values[0]);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] lg:max-w-7xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b border-slate-100 bg-white sticky top-0 z-20">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex gap-4">
                            <div className="p-2.5 bg-amber-50 rounded-xl h-fit shrink-0">
                                <AlertTriangle className="h-6 w-6 text-amber-500" />
                            </div>
                            <div className="space-y-1">
                                <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">
                                    Side-by-Side Comparison
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 max-w-lg">
                                    Compare overlapping data points across potential duplicate records. Conflicting fields are highlighted for review.
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 md:justify-end shrink-0">
                            {group.reasons.map(reason => (
                                <Badge key={reason} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-2.5 py-0.5 text-[11px] font-medium shadow-sm">
                                    {reason.replace(/_/g, " ")}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto bg-slate-50/30">
                    <div className="p-6 min-w-max">
                        <div className="rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden">
                            <table className="w-full border-collapse border-hidden">
                                <thead className="sticky top-0 z-30 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                                    <tr className="bg-slate-50">
                                        <th className="p-4 text-left font-semibold text-slate-500 text-xs uppercase tracking-wider w-56 sticky left-0 top-0 bg-slate-50 z-40 border-r border-b border-slate-200">
                                            Data Attribute
                                        </th>
                                        {group.customers.map((customer, idx) => (
                                            <th key={customer.id} className="p-4 text-left font-semibold text-slate-900 min-w-[320px] border-l border-b border-slate-100 bg-slate-50">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Record #{idx + 1}</span>
                                                    <span className="truncate">{customer.customer_name}</span>
                                                    <span className="text-xs font-normal text-slate-500 font-mono mt-0.5">{customer.customer_code}</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {fieldsToCompare.map(({ label, key }) => {
                                        const allMatch = isMatchAcrossAll(key);
                                        const isCritical = ["customer_tin", "customer_email", "contact_number"].includes(key);
                                        
                                        return (
                                            <tr key={key} className="border-b border-slate-100 group/row last:border-0 hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4 text-sm font-semibold text-slate-600 bg-slate-50/50 sticky left-0 z-10 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.02)] group-hover/row:bg-slate-100 transition-colors">
                                                    {label}
                                                </td>
                                                {group.customers.map((customer) => {
                                                    const value = getFieldDisplay(customer, key);
                                                    return (
                                                        <td 
                                                            key={customer.id} 
                                                            className={`p-4 text-sm border-l border-slate-100 transition-colors ${
                                                                !allMatch 
                                                                    ? isCritical 
                                                                        ? "bg-rose-50/40 text-rose-900 font-medium" 
                                                                        : "bg-amber-50/30 text-amber-900 font-medium"
                                                                    : "text-slate-700 font-medium"
                                                            } group-hover/row:bg-slate-50/80`}
                                                        >
                                                            <div className="flex items-start gap-2.5">
                                                                {!allMatch ? (
                                                                    <div className={`mt-0.5 p-0.5 rounded-full shrink-0 ${isCritical ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"}`}>
                                                                        <AlertTriangle className="h-3 w-3" />
                                                                    </div>
                                                                ) : (
                                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                                                )}
                                                                <span className="break-words line-clamp-2">{value}</span>
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-slate-50 border-t border-slate-200 mt-0">
                    <div className="flex flex-col sm:flex-row w-full items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-slate-500 text-xs font-medium">
                            <div className="flex items-center justify-center p-1.5 bg-emerald-100 rounded-full">
                                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            </div>
                            <span>Resolution actions will trigger a system audit log entry.</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-500 hover:text-slate-700">
                                Close
                            </Button>
                            <ActionButtons
                                onDismiss={() => onResolve('dismiss')}
                            />
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
