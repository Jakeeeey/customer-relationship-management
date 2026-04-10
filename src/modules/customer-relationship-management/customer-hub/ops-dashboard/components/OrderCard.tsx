import { Card, CardContent } from "@/components/ui/card";
import { STATUS_COLORS, OPSOrder } from "../types";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface OrderCardProps {
    order: OPSOrder;
}

const colorToBorderMap: Record<string, string> = {
    blue: "border-l-blue-500",
    cyan: "border-l-cyan-500",
    indigo: "border-l-indigo-500",
    purple: "border-l-purple-500",
    violet: "border-l-violet-500",
    sky: "border-l-sky-500",
    emerald: "border-l-emerald-500",
    green: "border-l-green-500",
    amber: "border-l-amber-500",
    red: "border-l-red-500",
    slate: "border-l-slate-500",
};

export function OrderCard({ order }: OrderCardProps) {
    const formattedAmount = new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
    }).format(order.amount);

    const borderColorClass = colorToBorderMap[STATUS_COLORS[order.status]] || "border-l-primary/50";

    return (
        <Card className={cn("mb-2 shadow-sm hover:shadow-md transition-shadow border-l-4", borderColorClass)}>
            <CardContent className="p-3 space-y-2">
                <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold text-muted-foreground break-all min-w-0" title={order.salesOrderNo}>
                        {order.salesOrderNo}
                    </span>
                    <span className="text-xs bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground font-bold shrink-0">
                        {order.poNo}
                    </span>
                </div>
                
                <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-muted-foreground">
                        {format(new Date(order.poDate), "MMM dd, yyyy")}
                    </span>
                </div>

                <Separator className="my-1 opacity-50" />

                <div className="flex justify-between items-center">
                    <span className="text-base font-black text-primary">{formattedAmount}</span>
                </div>
            </CardContent>
        </Card>
    );
}
