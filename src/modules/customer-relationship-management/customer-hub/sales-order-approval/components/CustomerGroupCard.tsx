"use client";

import React from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import type { CustomerGroup } from "../hooks/useSalesOrderApproval";

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
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-base line-clamp-1">{group.customer_name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">Code: {group.customer_code}</p>
                    <div className="flex gap-3 text-sm">
                        <span className="font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md">
                            {group.orders.length} order(s)
                        </span>
                        <span className="font-medium text-emerald-600">
                            {formatCurrency(group.total_net_amount)}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3 shrink-0 ml-4">
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                        FOR APPROVAL
                    </Badge>
                    <div className="h-8 w-8 rounded-full border flex items-center justify-center bg-background">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
