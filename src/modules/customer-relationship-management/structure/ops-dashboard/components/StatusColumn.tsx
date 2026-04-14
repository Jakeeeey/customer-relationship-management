"use client"

import { STATUS_COLORS, StatusGroupedOrders, BulkAction } from "../types";
import { CustomerGroup } from "./CustomerGroup";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusColumnProps {
    statusGroup: StatusGroupedOrders;
    bulkAction: BulkAction;
}

const colorToTailwindMap: Record<string, string> = {
    blue: "border-b-blue-500",
    cyan: "border-b-cyan-500",
    indigo: "border-b-indigo-500",
    purple: "border-b-purple-500",
    violet: "border-b-violet-500",
    sky: "border-b-sky-500",
    emerald: "border-b-emerald-500",
    green: "border-b-green-500",
    amber: "border-b-amber-500",
    red: "border-b-red-500",
    slate: "border-b-slate-500",
};

export function StatusColumn({ statusGroup, bulkAction }: StatusColumnProps) {
    const totalOrders = statusGroup.customerGroups.reduce(
        (acc, group) => acc + group.orders.length,
        0
    );

    const borderColorClass = colorToTailwindMap[STATUS_COLORS[statusGroup.status]] || "border-b-muted-foreground/30";

    return (
        <div className="flex flex-col h-full min-w-[280px] w-[280px] border-x first:border-l-0 last:border-r-0 bg-background/50">
            <div className={cn(
                "flex items-center justify-between p-3 border-b-2 gap-2 sticky top-0 bg-background z-20",
                borderColorClass
            )}>
                <h3 className="text-base font-black truncate uppercase tracking-widest">
                    {statusGroup.status}
                </h3>
                <Badge variant={totalOrders > 0 ? "default" : "secondary"} className="h-6 px-2 text-xs font-black shadow-sm">
                    {totalOrders}
                </Badge>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-1 scrollbar-thin">
                <div className="pr-2 pb-10">
                {statusGroup.customerGroups.length > 0 ? (
                    statusGroup.customerGroups.map((group) => (
                        <CustomerGroup 
                            key={group.customerName} 
                            group={group} 
                            status={statusGroup.status} 
                            bulkAction={bulkAction}
                        />
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 pointer-events-none select-none">
                        <span className="text-[10px] font-black uppercase tracking-tighter italic">Empty</span>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
}
