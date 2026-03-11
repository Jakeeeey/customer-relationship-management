"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import type { CustomerGroup, SalesOrder } from "../hooks/useSalesOrderApproval";

interface CustomerGroupCardProps {
    group: CustomerGroup;
    onClick: () => void;
}

export function CustomerGroupCard({ group, onClick }: CustomerGroupCardProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
        }).format(amount);
    };

    return (
        <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors shadow-sm"
            onClick={onClick}
        >
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base line-clamp-1">{group.customer_name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">Code: {group.customer_code}</p>
                    <div className="flex flex-wrap gap-2 text-sm">
                        <span className="font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md whitespace-nowrap">
                            {group.orders.length} order(s)
                        </span>
                        <span className="font-medium text-emerald-600 whitespace-nowrap">
                            {formatCurrency(group.total_net_amount)}
                        </span>
                    </div>
                </div>

                <div className="flex items-center sm:flex-col sm:items-end justify-between gap-3 shrink-0">
                    {(() => {
                        const statuses = Array.from(new Set(group.orders.map((o: SalesOrder) => o.order_status)));
                        if (statuses.length > 1) {
                            return <Badge variant="outline" className="bg-secondary text-secondary-foreground border-border whitespace-nowrap">MIXED</Badge>;
                        }
                        const status = (statuses[0] || "UNKNOWN") as string;
                        let badgeColor = "bg-secondary text-secondary-foreground";
                        if (status === "For Approval") badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
                        else if (status === "For Consolidation") badgeColor = "bg-purple-100 text-purple-800 border-purple-200";
                        else if (status === "Delivered") badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                        else if (status === "Cancelled") badgeColor = "bg-destructive/10 text-destructive border-destructive/20";

                        return (
                            <Badge variant="outline" className={`${badgeColor} whitespace-nowrap`}>
                                {status.toUpperCase()}
                            </Badge>
                        );
                    })()}
                    <div className="h-8 w-8 rounded-full border flex flex-shrink-0 items-center justify-center bg-background">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
