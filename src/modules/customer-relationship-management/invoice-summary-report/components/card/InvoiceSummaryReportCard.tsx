"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { getCardColor } from "@/modules/customer-relationship-management/invoice-cancellation/lib/utils";
import { AlertCircleIcon, CheckCircle, Clock, ListChecks } from "lucide-react";

// Define the interface for the stats we calculated in the Page
interface InvoiceSummaryCardProps {
  stats: {
    totalAmount: number;
    totalRequests: number;
    approvedCount: number;
    pendingCount: number;
  };
}

export function InvoiceSummaryCard({ stats }: InvoiceSummaryCardProps) {
  // Mapping the dynamic data to your existing card structure
  const cards = [
    {
      title: "Total Requested",
      value: formatCurrency(stats.totalAmount),
      subtitle: "Gross value of cancellations",
      icon: AlertCircleIcon,
    },
    {
      title: "Total Requests",
      value: stats.totalRequests,
      subtitle: "Number of submissions",
      icon: ListChecks,
    },
    {
      title: "Approved Requests",
      value: stats.approvedCount,
      subtitle: "Finalized by auditor",
      icon: CheckCircle,
    },
    {
      title: "Pending Review",
      value: stats.pendingCount,
      subtitle: "Awaiting decision",
      icon: Clock,
    },
  ];

  return (
    <div className="grid grid-cols-2 auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className={`@container/card bg-transparent bg-linear-to-t ${getCardColor(
              index,
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
