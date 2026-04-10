import { STATUS_COLORS, CustomerGroupedOrders, OPSStatus } from "../types";
import { OrderCard } from "./OrderCard";
import { Badge } from "@/components/ui/badge";
import { User2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerGroupProps {
    group: CustomerGroupedOrders;
    status: OPSStatus;
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

export function CustomerGroup({ group, status }: CustomerGroupProps) {
    const gradientClass = colorToGradientMap[STATUS_COLORS[status]] || "bg-muted";

    return (
        <div className="mb-4 last:mb-0">
            <div className={cn(
                "flex items-center gap-2 mb-2 px-2 sticky top-0 z-10 py-1.5 rounded-t-lg shadow-sm text-white",
                gradientClass
            )}>
                <User2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-white/90" />
                <span className="text-sm font-black tracking-tight py-0.5 break-words min-w-0 uppercase">
                    {group.customerName}
                </span>
                <Badge variant="secondary" className="ml-auto text-[11px] px-1.5 h-5 min-w-6 flex items-center justify-center font-black bg-white/20 text-white border-none shadow-inner">
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
