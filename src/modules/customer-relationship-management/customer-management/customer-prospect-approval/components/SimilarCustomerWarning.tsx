"use client";

import React from "react";
import { AlertTriangle, ChevronRight, Copy } from "lucide-react";
import { SimilarityGroup } from "../utils/similarity";

interface SimilarCustomerWarningProps {
    similarGroups: SimilarityGroup[];
    onCompare: (group: SimilarityGroup) => void;
}

export function SimilarCustomerWarning({ similarGroups, onCompare }: SimilarCustomerWarningProps) {
    if (similarGroups.length === 0) return null;

    const count = similarGroups.length;
    
    return (
        <div className="bg-warning/5 border border-warning/20 rounded-xl overflow-hidden mb-6 animate-in fade-in slide-in-from-top-2 duration-500 shadow-sm relative">
            <div className="flex items-center gap-3 p-3 bg-warning-bg">
                <div className="bg-warning/10 p-1.5 rounded-lg border border-warning/20">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                </div>
                <div className="flex-1">
                    <h5 className="text-foreground font-bold text-xs uppercase tracking-wider mb-0.5 leading-none">
                        Duplicate Warning
                    </h5>
                    <p className="text-warning-foreground/70 text-[10px] uppercase font-medium leading-none">
                        {count === 1 
                            ? "1 Potential match found in database" 
                            : `${count} Potential matches found in database`
                        }
                    </p>
                </div>
                <div className="bg-warning/20 px-2 py-1 rounded text-[10px] font-bold text-warning tabular-nums border border-warning/30">
                    {count}
                </div>
            </div>
            <div className="border-t border-warning/10 bg-muted/30">
                {similarGroups.map((group) => {
                    const existingCustomer = group.customers[1];
                    
                    return (
                        <button
                            key={group.id}
                            onClick={() => onCompare(group)}
                            className="w-full flex items-center justify-between p-2.5 px-3 hover:bg-warning/10 transition-colors border-b border-warning/10 last:border-0 group select-none"
                        >
                            <div className="flex items-center gap-2 overflow-hidden mr-2">
                                <Copy className="h-3 w-3 text-warning/50 shrink-0" />
                                <span className="text-[11px] font-semibold text-foreground/90 truncate" title={existingCustomer.customer_name ?? undefined}>
                                    {existingCustomer.customer_name}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 bg-background/80 px-2 py-0.5 rounded-full border border-warning/20 group-hover:border-warning group-hover:bg-warning-bg transition-all shadow-sm">
                                <span className="text-[9px] font-bold uppercase text-warning">Compare</span>
                                <ChevronRight className="h-2.5 w-2.5 text-warning" />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
