"use client";

import { Label } from "@/components/ui/label";
import { SalesOrder } from "../types";

interface SalesOrderSummaryProps {
    order: Partial<SalesOrder>;
}

export function SalesOrderSummary({ order }: SalesOrderSummaryProps) {
    const summaryItems = [
        { label: "Gross Amount", value: order.total_amount || 0 },
        { label: "Discount Amount", value: order.discount_amount || 0 },
        { label: "Net Amount", value: order.net_amount || 0 },
        { label: "VAT", value: 0 },
        { label: "Total Amount", value: order.total_amount || 0 },
        { label: "Allocated Amount", value: order.allocated_amount || 0 },
    ];

    const plans = [
        { label: "Pre Dispatch Plan", value: "N/A" },
        { label: "Consolidation", value: "N/A" },
        { label: "Dispatch Plan", value: "N/A" },
    ];

    return (
        <div className="space-y-8">
            {/* Summary Values */}
            <div className="space-y-3">
                {summaryItems.map((item) => (
                    <div key={item.label} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">{item.label}</span>
                        <span className="font-bold">
                            {typeof item.value === "number"
                                ? item.value.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })
                                : item.value}
                        </span>
                    </div>
                ))}
            </div>

            {/* Plans Section */}
            <div className="pt-4 border-t border-dashed space-y-2">
                {plans.map((plan) => (
                    <div key={plan.label} className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">{plan.label}</span>
                        <span className="font-medium">{plan.value}</span>
                    </div>
                ))}
            </div>

            {/* Status Badge - Impactful */}
            <div className="pt-4 flex flex-col items-center">
                <div className="px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20">
                    <span className="text-xs font-black tracking-[0.2em] uppercase">
                        {order.order_status || "FOR_APPROVAL"}
                    </span>
                </div>
            </div>
        </div>
    );
}
