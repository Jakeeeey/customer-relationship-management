"use client";

import React from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, User, Store, Phone, MapPin, ShieldCheck, Landmark } from "lucide-react";
import { CustomerProspect } from "../types";
import { SimilarityMatchReason, Customer } from "../utils/similarity";

interface CustomerComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
    prospect: CustomerProspect;
    existingCustomer: Customer; 
    reasons: SimilarityMatchReason[];
}

export function CustomerComparisonModal({
    isOpen,
    onClose,
    prospect,
    existingCustomer,
    reasons
}: CustomerComparisonModalProps) {
    
    const compareFields = [
        { label: "Customer Name", key: "customer_name", icon: User },
        { label: "Store Name", key: "store_name", icon: Store },
        { label: "TIN", key: "customer_tin", icon: Landmark },
        { label: "Contact Number", key: "contact_number", icon: Phone },
        { label: "Email", key: "customer_email", icon: Info },
        { label: "Phone/Tel", key: "tel_number", icon: Phone },
        { label: "Province", key: "province", icon: MapPin },
        { label: "City/Mun.", key: "city", icon: MapPin },
        { label: "Barangay", key: "brgy", icon: MapPin },
        { label: "Store Type", key: "store_type", icon: ShieldCheck },
    ];

    const isMatch = (field: string) => {
        const val1 = String(prospect[field as keyof CustomerProspect] || "").toLowerCase().trim();
        const val2 = String(existingCustomer[field as keyof Customer] || "").toLowerCase().trim();
        return val1 === val2 && val1 !== "";
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl border-border/50">
                <DialogHeader className="p-6 pb-2 shrink-0">
                    <div className="flex items-center gap-2">
                        <DialogTitle className="text-xl">Duplicate Comparison</DialogTitle>
                        <Badge variant="outline" className="text-[10px] bg-warning-bg text-warning border-warning/20 font-bold">
                            {reasons.length} Matches Found
                        </Badge>
                    </div>
                    <DialogDescription>
                        Compare the new prospect with the existing customer record.
                    </DialogDescription>
                </DialogHeader>

                {/* Using a standard div with overflow-y-auto for maximum compatibility */}
                <div className="flex-1 overflow-y-auto min-h-0 px-6 py-2 pb-8 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent">
                    <div className="grid grid-cols-[1fr,1fr] gap-x-4 gap-y-4">
                        {/* Headers */}
                        <div className="bg-primary/10 p-3 rounded-xl border border-primary/20 text-center relative overflow-hidden h-fit">
                            <Badge variant="secondary" className="absolute -top-1 -right-1 text-[8px] bg-primary text-white border-0 rounded-none rounded-bl-lg font-bold uppercase">PROSPECT</Badge>
                            <span className="text-[9px] font-bold uppercase text-primary/70 tracking-widest block mb-1">New Entry</span>
                            <span className="font-extrabold text-sm text-primary truncate block uppercase">{prospect.customer_name}</span>
                        </div>
                        <div className="bg-muted/50 p-3 rounded-xl border border-border text-center relative overflow-hidden h-fit">
                            <Badge variant="secondary" className="absolute -top-1 -right-1 text-[8px] bg-muted-foreground/60 text-white border-0 rounded-none rounded-bl-lg font-bold uppercase">EXISTING</Badge>
                            <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest block mb-1">Database Record</span>
                            <span className="font-extrabold text-sm text-foreground truncate block uppercase">{existingCustomer.customer_name}</span>
                        </div>

                        {/* Comparison Rows */}
                        {compareFields.map((field) => {
                            const matched = isMatch(field.key);
                            const val1 = String(prospect[field.key as keyof CustomerProspect] || "N/A");
                            const val2 = String(existingCustomer[field.key as keyof Customer] || "N/A");

                            return (
                                <React.Fragment key={field.key}>
                                    <div className="col-span-2 space-y-1.5 mt-2">
                                        <div className="flex items-center gap-2 px-1">
                                            <field.icon className={`h-3 w-3 ${matched ? 'text-warning' : 'text-muted-foreground/60'}`} />
                                            <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">
                                                {field.label}
                                            </span>
                                            {matched && (
                                                <div className="flex-1 h-[1px] bg-warning/20" />
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className={`p-2.5 px-3 rounded-lg border text-xs transition-colors ${matched ? 'bg-warning-bg border-warning/30 text-foreground font-semibold' : 'bg-background border-border/50'}`}>
                                                {val1}
                                            </div>
                                            <div className={`p-2.5 px-3 rounded-lg border text-xs transition-colors ${matched ? 'bg-warning-bg border-warning/30 text-foreground font-semibold' : 'bg-background border-border/50'}`}>
                                                {val2}
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>

                    <div className="mt-8 mb-4 p-3 bg-primary/10 rounded-xl border border-primary/20">
                        <h4 className="text-[9px] font-bold text-primary uppercase mb-2 flex items-center gap-1.5 px-1">
                            <Info className="h-3 w-3" />
                            Match Indicators
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                            {reasons.map((reason) => (
                                <Badge key={reason} variant="outline" className="bg-background text-[9px] text-primary border-primary/30 font-bold px-2 py-0 h-5">
                                    {reason.replace(/_/g, " ")}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-4 border-t border-border/50 shrink-0">
                    <Button variant="outline" onClick={onClose} className="h-9 px-6 rounded-lg font-bold text-[10px] uppercase tracking-widest">
                        Close Comparison
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
