"use client";

import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
        <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl overflow-hidden mb-6 animate-in fade-in slide-in-from-top-2 duration-500 shadow-sm relative">
            <div className="flex items-center gap-3 p-3 bg-amber-50">
                <div className="bg-amber-100 p-1.5 rounded-lg border border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                    <h5 className="text-amber-900 font-bold text-xs uppercase tracking-wider mb-0.5 leading-none">
                        Duplicate Warning
                    </h5>
                    <p className="text-amber-800/70 text-[10px] uppercase font-medium leading-none">
                        {count === 1 
                            ? "1 Potential match found in database" 
                            : `${count} Potential matches found in database`
                        }
                    </p>
                </div>
                <div className="bg-amber-200/50 px-2 py-1 rounded text-[10px] font-bold text-amber-800 tabular-nums border border-amber-300/30">
                    {count}
                </div>
            </div>
            <div className="border-t border-amber-200/40 bg-white/40">
                {similarGroups.map((group) => {
                    const existingCustomer = group.customers[1];
                    
                    return (
                        <button
                            key={group.id}
                            onClick={() => onCompare(group)}
                            className="w-full flex items-center justify-between p-2.5 px-3 hover:bg-amber-100/50 transition-colors border-b border-amber-200/20 last:border-0 group select-none"
                        >
                            <div className="flex items-center gap-2 overflow-hidden mr-2">
                                <Copy className="h-3 w-3 text-amber-600/50 shrink-0" />
                                <span className="text-[11px] font-semibold text-amber-900 truncate" title={existingCustomer.customer_name}>
                                    {existingCustomer.customer_name}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 bg-white/80 px-2 py-0.5 rounded-full border border-amber-200 group-hover:border-amber-400 group-hover:bg-amber-50 transition-all shadow-sm">
                                <span className="text-[9px] font-bold uppercase text-amber-700">Compare</span>
                                <ChevronRight className="h-2.5 w-2.5 text-amber-600" />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
