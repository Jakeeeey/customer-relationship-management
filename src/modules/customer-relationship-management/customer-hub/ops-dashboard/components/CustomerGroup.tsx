import { STATUS_COLORS, CustomerGroupedOrders, OPSStatus } from "../types";
import { OrderCard } from "./OrderCard";
import { Badge } from "@/components/ui/badge";
import { User2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerGroupProps {
    group: CustomerGroupedOrders;
    status: OPSStatus;
}

const colorToTextMap: Record<string, string> = {
    gray: "text-gray-500",
    orange: "text-orange-500",
    blue: "text-blue-500",
    cyan: "text-cyan-500",
    indigo: "text-indigo-500",
    purple: "text-purple-500",
    violet: "text-violet-500",
    sky: "text-sky-500",
    emerald: "text-emerald-500",
    green: "text-green-500",
    amber: "text-amber-500",
    red: "text-red-500",
    slate: "text-slate-500",
};

export function CustomerGroup({ group, status }: CustomerGroupProps) {
    const textColorClass = colorToTextMap[STATUS_COLORS[status]] || "text-muted-foreground";

    return (
        <div className="mb-4 last:mb-0">
            <div className="flex items-center gap-2 mb-2 px-1 sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-1 border-b border-border/50">
                <User2 className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", textColorClass)} />
                <span className="text-xs font-bold tracking-tight py-0.5 break-words min-w-0">
                    {group.customerName}
                </span>
                <Badge variant="outline" className={cn("ml-auto text-[10px] px-1 h-4 min-w-4 flex items-center justify-center font-bold", textColorClass)}>
                    {group.orders.length}
                </Badge>
            </div>
            <div className="space-y-2">
                {group.orders.map((order) => (
                    <OrderCard key={order.salesOrderNo} order={order} />
                ))}
            </div>
        </div>
    );
}
