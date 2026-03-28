"use-client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCardColor } from "@/modules/customer-relationship-management/invoice-cancellation/lib/utils";
import {
  AlertCircleIcon,
  CheckCircle,
  ListChecks,
  ShieldAlert,
} from "lucide-react";

interface ApprovalSummaryCardsProps {
  stats: {
    approved: number;
    pending: number;
    highValue: number;
  };
}

export function InvoiceSummaryApprovalCard({
  stats,
}: ApprovalSummaryCardsProps) {
  const cards = [
    {
      title: "Approved Invoice",
      value: stats.approved,
      subtitle: "Invoices awaiting your review",
      icon: CheckCircle,
    },
    {
      title: "Pending Invoice",
      value: stats.pending,
      subtitle: "Invoices awaiting your review",
      icon: ListChecks,
    },
    {
      title: "High Value Alerts",
      value: stats.highValue,
      subtitle: "Invoices exceeding threshold",
      icon: AlertCircleIcon,
    },
    {
      title: "Audit Protocol",
      value: null,
      subtitle:
        "Approving a request will automatically void the invoice and reset the Sales Order to 'For Invoicing'.",
      icon: ShieldAlert,
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
            )} shadow-xs relative ${index === 4 ? "col-span-2 lg:col-span-1" : "col-span-1"}`}
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
