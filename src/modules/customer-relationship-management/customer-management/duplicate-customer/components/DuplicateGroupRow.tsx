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
        <TableRow className="group/row hover:bg-muted/50 transition-all cursor-default">
            <TableCell className="py-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isHighPriority ? 'bg-warning-bg text-warning' : 'bg-muted text-muted-foreground'}`}>
                        <Users className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="font-semibold text-foreground">
                            {group.customers.length} Potential Records
                        </div>
                        <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground opacity-60">
                            ID: {group.id}
                        </div>
                    </div>
                </div>
            </TableCell>
            
            <TableCell className="py-4">
                <div className="flex flex-col gap-1">
                    {group.customers.slice(0, 2).map((c) => (
                        <div key={c.id} className="flex flex-col mb-1 last:mb-0">
                            <div className="text-sm text-foreground/80 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                                {c.customer_name} 
                                <span className="text-[10px] text-muted-foreground font-mono">({c.customer_code})</span>
                            </div>
                            {c.encoder_name && (
                                <span className="text-[9px] text-muted-foreground ml-3.5 italic">
                                    Created by: {c.encoder_name}
                                </span>
                            )}
                        </div>
                    ))}
                    {group.customers.length > 2 && (
                        <div className="text-[10px] text-muted-foreground pl-3.5 italic">
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
                                    ? 'bg-destructive/10 text-destructive border-destructive/20' 
                                    : 'bg-warning-bg text-warning border-warning/20'
                            }`}
                        >
                            {reason.replace(/_/g, " ")}
                        </Badge>
                    ))}
                </div>
            </TableCell>

            <TableCell className="py-4">
                <div className="flex items-center gap-2 text-sm">
                    <div className="w-24 bg-muted h-1.5 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,0,0,0.1)] ${
                                group.confidence_score >= 0.9 ? 'bg-success' : 
                                group.confidence_score >= 0.7 ? 'bg-warning' : 'bg-muted-foreground/30'
                            }`} 
                            style={{ width: `${group.confidence_score * 100}%` }}
                        />
                    </div>
                    <span className={`text-xs font-bold ${
                        group.confidence_score >= 0.9 ? 'text-success' : 
                        group.confidence_score >= 0.7 ? 'text-warning' : 'text-muted-foreground'
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
                    className="text-primary hover:text-primary hover:bg-primary/10 transition-all duration-200 group/btn"
                >
                    <span className="font-medium group-hover/btn:underline underline-offset-4">Review Details</span>
                    <ArrowRightCircle className="h-4 w-4 ml-2 transition-transform duration-200 group-hover/btn:translate-x-1" />
                </Button>
            </TableCell>
        </TableRow>
    );
};
