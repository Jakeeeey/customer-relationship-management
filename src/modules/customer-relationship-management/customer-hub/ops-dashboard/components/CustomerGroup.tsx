import { useState, useEffect } from "react";
import { STATUS_COLORS, CustomerGroupedOrders, OPSStatus, BulkAction } from "../types";
import { OrderCard } from "./OrderCard";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { User2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerGroupProps {
    group: CustomerGroupedOrders;
    status: OPSStatus;
    bulkAction: BulkAction;
}

const colorToGradientMap: Record<string, string> = {
    blue: "bg-gradient-to-r from-blue-500 to-blue-600",
    cyan: "bg-gradient-to-r from-cyan-500 to-cyan-600",
    indigo: "bg-gradient-to-r from-indigo-500 to-indigo-600",
    purple: "bg-gradient-to-r from-purple-500 to-purple-600",
    violet: "bg-gradient-to-r from-violet-500 to-violet-600",
    sky: "bg-gradient-to-r from-sky-500 to-sky-600",
    emerald: "bg-gradient-to-r from-emerald-500 to-emerald-600",
    green: "bg-gradient-to-r from-green-500 to-green-600",
    amber: "bg-gradient-to-r from-amber-500 to-amber-600",
    red: "bg-gradient-to-r from-red-500 to-red-600",
    slate: "bg-gradient-to-r from-slate-500 to-slate-600",
};

export function CustomerGroup({ group, status, bulkAction }: CustomerGroupProps) {
    const [isOpen, setIsOpen] = useState(false);
    const gradientClass = colorToGradientMap[STATUS_COLORS[status]] || "bg-muted";

    // Handle bulk expand/collapse
    useEffect(() => {
        if (!bulkAction) return;
        
        // Use setTimeout to avoid synchronous setState in effect warning
        const timer = setTimeout(() => {
            if (bulkAction.type === 'expand') {
                setIsOpen(true);
            } else if (bulkAction.type === 'collapse') {
                setIsOpen(false);
            }
        }, 0);

        return () => clearTimeout(timer);
    }, [bulkAction]);

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className="mb-4 last:mb-0"
        >
            <CollapsibleTrigger asChild>
                <div className={cn(
                    "flex items-center gap-1.5 mb-2 px-2 sticky top-0 z-10 py-1.5 rounded-t-lg shadow-sm text-white cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all group",
                    gradientClass
                )}>
                    <ChevronRight className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                        isOpen && "rotate-90"
                    )} />
                    <User2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-white/90" />
                    <span className="text-[11px] font-black tracking-tight py-0.5 break-words min-w-0 uppercase flex-1 leading-tight">
                        {group.customerName}
                    </span>
                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 h-4.5 min-w-5 flex items-center justify-center font-black bg-white/20 text-white border-none shadow-inner shrink-0">
                        {group.orders.length}
                    </Badge>
                </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-2 overflow-hidden px-1">
                {group.orders.map((order) => (
                    <OrderCard key={order.salesOrderNo} order={order} />
                ))}
            </CollapsibleContent>
        </Collapsible>
    );
}
