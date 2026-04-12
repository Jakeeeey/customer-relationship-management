import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import { DuplicateGroup } from "../types";
import { Users, ArrowRightCircle } from "lucide-react";

interface DuplicateGroupRowProps {
    group: DuplicateGroup;
    onViewDetails: (group: DuplicateGroup) => void;
}

export const DuplicateGroupRow: React.FC<DuplicateGroupRowProps> = ({ 
    group, 
    onViewDetails 
}) => {
    // Determine color based on reasons (simplified logic)
    const isHighPriority = group.reasons.some(r => r === 'SHARED_TIN' || r === 'EXACT_NAME_MATCH');

    return (
        <TableRow className="group/row hover:bg-slate-50/80 transition-all cursor-default">
            <TableCell className="py-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isHighPriority ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                        <Users className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="font-semibold text-slate-900">
                            {group.customers.length} Potential Records
                        </div>
                        <div className="text-xs text-slate-400">
                            ID: {group.id}
                        </div>
                    </div>
                </div>
            </TableCell>
            
            <TableCell className="py-4">
                <div className="flex flex-col gap-1">
                    {group.customers.slice(0, 2).map((c) => (
                        <div key={c.id} className="flex flex-col mb-1 last:mb-0">
                            <div className="text-sm text-slate-600 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                {c.customer_name} 
                                <span className="text-[10px] text-slate-400 font-mono">({c.customer_code})</span>
                            </div>
                            {c.encoder_name && (
                                <span className="text-[9px] text-slate-400 ml-3.5 italic">
                                    Created by: {c.encoder_name}
                                </span>
                            )}
                        </div>
                    ))}
                    {group.customers.length > 2 && (
                        <div className="text-[10px] text-slate-400 pl-3.5 italic">
                            + {group.customers.length - 2} more...
                        </div>
                    )}
                </div>
            </TableCell>

            <TableCell className="py-4">
                <div className="flex flex-wrap gap-1.5 max-w-[300px]">
                    {group.reasons.map(reason => (
                        <Badge 
                            key={reason} 
                            variant="secondary" 
                            className={`text-[10px] px-2 py-0 h-5 border shadow-sm ${
                                reason.includes('TIN') || reason.includes('EXACT') 
                                    ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                        >
                            {reason.replace(/_/g, " ")}
                        </Badge>
                    ))}
                </div>
            </TableCell>

            <TableCell className="py-4">
                <div className="flex items-center gap-2 text-sm">
                    <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                                group.confidence_score >= 0.9 ? 'bg-emerald-500' : 
                                group.confidence_score >= 0.7 ? 'bg-amber-500' : 'bg-slate-400'
                            }`} 
                            style={{ width: `${group.confidence_score * 100}%` }}
                        />
                    </div>
                    <span className={`text-xs font-bold ${
                        group.confidence_score >= 0.9 ? 'text-emerald-600' : 
                        group.confidence_score >= 0.7 ? 'text-amber-600' : 'text-slate-500'
                    }`}>
                        {Math.round(group.confidence_score * 100)}%
                    </span>
                </div>
            </TableCell>

            <TableCell className="py-4 text-right">
                <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onViewDetails(group)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200 group/btn"
                >
                    <span className="font-medium group-hover/btn:underline underline-offset-4">Review Details</span>
                    <ArrowRightCircle className="h-4 w-4 ml-2 transition-transform duration-200 group-hover/btn:translate-x-1" />
                </Button>
            </TableCell>
        </TableRow>
    );
};
