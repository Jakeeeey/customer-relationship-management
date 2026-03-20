"use-client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCardColor } from "@/modules/customer-relationship-management/invoice-cancellation/lib/utils";
import { AlertCircle, Clock, FileText } from "lucide-react";

interface InvoiceSummaryCardsProps {
  stats: {
    totalEligible: number;
    pending: number;
  };
}

export function InvoiceSummaryCards({ stats }: InvoiceSummaryCardsProps) {
  const cards = [
    {
      title: "Eligible Invoices",
      value: stats.totalEligible,
      subtitle: "Current invoices for dispatch",
      icon: FileText,
    },
    {
      title: "Locked for Review",
      value: stats.pending,
      subtitle: "Invoices currently pending approval",
      icon: Clock,
    },
    {
      title: "Policy Note",
      value: null,
      subtitle:
        "Only 'Booking' type invoices can be cancelled here. Re-issuance happens after Audit approval.",
      icon: AlertCircle,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className={`@container/card bg-transparent bg-linear-to-t ${getCardColor(
              index,
            )} shadow-xs relative ${
              index === 0 ? "col-span-2 lg:col-span-1" : "col-span-1"
            }`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardDescription className="text-sm font-medium">
                  {card.title}
                </CardDescription>
                <Icon className="hidden sm:flex size-5 text-muted-foreground" />
              </div>

              <CardTitle className="text-lg sm:text-2xl font-semibold tabular-nums text-foreground @[250px]/card:text-3xl">
                {card.value !== null && (
                  <div className="text-3xl font-semibold">{card.value}</div>
                )}
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
