"use client";

import { useEmployeeStockPurchaseSummary } from "../hooks/useEmployeeStockPurchaseSummary";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { getCardColor } from "../lib/utils";
import { ShoppingCart, DollarSign, Clock, CheckCircle } from "lucide-react";

export function SummaryDashboard() {
    const { metrics, isLoading } = useEmployeeStockPurchaseSummary();

    const cards = [
        {
            title: "Total Purchases",
            value: metrics?.total_purchases || 0,
            subtitle: "Overall number of purchases",
            icon: ShoppingCart,
        },
        {
            title: "Total Amount",
            value: formatCurrency(metrics?.total_amount || 0),
            subtitle: "Gross value of purchases",
            icon: DollarSign,
        },
        {
            title: "Pending Approval",
            value: metrics?.pending_purchases || 0,
            subtitle: "Awaiting final decision",
            icon: Clock,
        },
        {
            title: "Approved Purchases",
            value: metrics?.approved_purchases || 0,
            subtitle: "Finalized transactions",
            icon: CheckCircle,
        },
    ];

    if (isLoading) {
        return <div className="p-4">Loading dashboard...</div>;
    }

    return (
        <div className="grid grid-cols-2 auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 p-4">
            {cards.map((card, index) => {
                const Icon = card.icon;
                return (
                    <Card
                        key={card.title}
                        className={`@container/card bg-transparent bg-linear-to-t ${getCardColor(
                            index
                        )} shadow-xs relative col-span-1`}
                    >
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <CardDescription className="text-sm font-medium">
                                    {card.title}
                                </CardDescription>
                                <Icon className="hidden sm:flex size-5 text-muted-foreground" />
                            </div>

                            <CardTitle className="text-lg sm:text-2xl font-semibold tabular-nums text-foreground @[250px]/card:text-3xl">
                                {card.value}
                            </CardTitle>

                            <CardDescription className="text-xs sm:text-md text-muted-foreground">
                                {card.subtitle}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                );
            })}
        </div>
    );
}
