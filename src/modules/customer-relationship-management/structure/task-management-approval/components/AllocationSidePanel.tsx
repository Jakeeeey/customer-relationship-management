// src/modules/customer-relationship-management/structure/task-management-approval/components/AllocationSidePanel.tsx
"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
    Activity,
    ShoppingBag,
    Wallet,
    Layers
} from "lucide-react";
import { 
    Accordion, 
    AccordionContent, 
    AccordionItem, 
    AccordionTrigger 
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { CustomerAllocation } from "../types";

interface AllocationSidePanelProps {
    customerAllocations: CustomerAllocation[];
}

export const AllocationSidePanel: React.FC<AllocationSidePanelProps> = ({
    customerAllocations
}) => {
    return (
        <Card className="w-[330px] h-full border-none shadow-2xl bg-gradient-to-b from-card/95 to-card/50 backdrop-blur-xl overflow-hidden relative group flex flex-col">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl opacity-50" />
            
            <CardContent className="p-4 flex flex-col h-full relative z-10 font-[family-name:(--font-outfit)]">
                <div className="flex-1 flex flex-col min-h-0 gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-primary">
                            <Activity className="w-4 h-4" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Allocation Overview</span>
                        </div>
                        <h3 className="text-xl font-black tracking-tight text-foreground uppercase leading-tight">
                            Field <span className="text-primary">Performance</span>
                        </h3>
                    </div>

                    <Accordion type="single" collapsible defaultValue="sales" className="flex-1 flex flex-col min-h-0">
                        {/* Sales Accordion */}
                        <AccordionItem value="sales" className="border-none">
                            <AccordionTrigger className="hover:no-underline py-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                        <ShoppingBag className="w-3 h-3" />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-wider">Sales</span>
                                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                                        {customerAllocations.length}
                                    </span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="flex-1 min-h-0">
                                <ScrollArea className="h-[400px] xl:h-[500px]">
                                    <div className="space-y-2 pt-2">
                                        {customerAllocations.length > 0 ? (
                                            customerAllocations.map((alloc) => (
                                                <DraggableCustomerCard key={alloc.customer_id} alloc={alloc} />
                                            ))
                                        ) : (
                                            <div className="py-8 text-center border-2 border-dashed border-primary/5 rounded-2xl">
                                                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">No Allocations</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </AccordionContent>
                        </AccordionItem>

                        {/* Collections Accordion */}
                        <AccordionItem value="collections" className="border-none">
                            <AccordionTrigger className="hover:no-underline py-2 opacity-50 hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                                        <Wallet className="w-3 h-3" />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-wider">Collections</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="py-4 text-center border border-dashed border-primary/10 rounded-xl">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-40 italic">Coming Soon</span>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* Others Accordion */}
                        <AccordionItem value="others" className="border-none">
                            <AccordionTrigger className="hover:no-underline py-2 opacity-50 hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                                        <Layers className="w-3 h-3" />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-wider">Others</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="py-4 text-center border border-dashed border-primary/10 rounded-xl">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-40 italic">Coming Soon</span>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                </div>

                <div className="mt-auto pt-4 border-t border-primary/5">
                    <div className="text-center">
                        <p className="text-[9px] font-medium text-muted-foreground italic">
                            Synchronized with Target Settings
                        </p>
                        <p className="text-[8px] font-black text-primary/30 uppercase tracking-[0.3em] mt-1">
                            Supervisor View
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const DraggableCustomerCard = ({ alloc }: { alloc: CustomerAllocation }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `customer-${alloc.customer_id}`,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                "group/item relative p-3 rounded-xl border transition-all duration-300 cursor-grab active:cursor-grabbing",
                isDragging ? "opacity-30 z-50 ring-2 ring-primary bg-background shadow-2xl scale-105" : "bg-background/40 hover:bg-background/60",
                alloc.isFullyAllocated 
                    ? "border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 shadow-lg shadow-emerald-500/5" 
                    : "border-primary/5 hover:border-primary/20"
            )}
        >
            <div className="flex justify-between items-start gap-3">
                <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <span className={cn(
                            "text-[10px] font-black uppercase leading-tight truncate",
                            alloc.isFullyAllocated ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"
                        )}>
                            {alloc.store_name}
                        </span>
                        {alloc.isFullyAllocated && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        )}
                    </div>
                    <span className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-tighter mt-0.5">
                        {alloc.customer_code}
                    </span>
                    
                    {/* Progress indicator */}
                    <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[7px] font-bold uppercase tracking-wider">
                            <span className={alloc.isFullyAllocated ? "text-emerald-600/60" : "text-muted-foreground/40"}>
                                Allocated: ₱{alloc.assignedAmount.toLocaleString()}
                            </span>
                        </div>
                        <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
                            <div 
                                className={cn(
                                    "h-full transition-all duration-500",
                                    alloc.isFullyAllocated ? "bg-emerald-500" : "bg-primary/40"
                                )}
                                style={{ width: `${Math.min(100, (alloc.assignedAmount / alloc.target_amount) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <span className={cn(
                        "text-[10px] font-black italic whitespace-nowrap",
                        alloc.isFullyAllocated ? "text-emerald-600" : "text-primary"
                    )}>
                        ₱{alloc.target_amount.toLocaleString()}
                    </span>
                    {alloc.remainingAmount > 0 && !alloc.isFullyAllocated && (
                        <div className="text-[7px] font-black text-primary/40 mt-1 uppercase italic">
                            -₱{alloc.remainingAmount.toLocaleString()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
