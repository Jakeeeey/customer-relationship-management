import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCardColor } from "../../lib/utils";
import { AlertCircle, FileText, DollarSign } from "lucide-react";

interface SummaryCardsProps {
  stats: {
    totalEligible: number;
    totalAmount: number;
  };
}

export function SummaryCards({ stats }: SummaryCardsProps) {
  const formattedAmount = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(stats.totalAmount);

  const cards = [
    {
      title: "Eligible Orders",
      value: stats.totalEligible,
      subtitle: "For Consolidation & Not Fulfilled",
      icon: FileText,
    },
    {
      title: "Total Net Amount",
      value: formattedAmount,
      subtitle: "Sum of all eligible orders",
      icon: DollarSign,
    },
    {
      title: "Policy Note",
      value: null,
      subtitle:
        "Only Sales Orders marked as 'For Consolidation' or 'Not Fulfilled' can be cancelled here.",
      icon: AlertCircle,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, index) => {
        const Icon = card.icon;
        // Determine the text color for the title to make it pop
        const titleColor = index === 0 ? "text-blue-600 dark:text-blue-400" : 
                           index === 1 ? "text-emerald-600 dark:text-emerald-400" : 
                           "text-amber-600 dark:text-amber-400";

        return (
          <Card
            key={card.title}
            className={`@container/card rounded-2xl bg-gradient-to-br ${getCardColor(
              index,
            )} shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 relative border-none ${
              index === 0 ? "col-span-2 lg:col-span-1" : "col-span-1"
            }`}
          >
            <CardHeader className="p-6">
              <div className="flex items-start justify-between">
                <CardDescription className="text-sm font-semibold tracking-tight uppercase">
                  {card.title}
                </CardDescription>
                <div className="p-2 bg-background/50 rounded-full backdrop-blur-sm">
                  <Icon className="size-5 text-foreground/70" />
                </div>
              </div>

              <CardTitle className="pt-4 text-foreground">
                {card.value !== null && (
                  <div className={`text-4xl font-black tracking-tighter ${titleColor}`}>
                    {card.value}
                  </div>
                )}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm font-medium opacity-80 mt-2 line-clamp-2">
                {card.subtitle}
              </CardDescription>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
