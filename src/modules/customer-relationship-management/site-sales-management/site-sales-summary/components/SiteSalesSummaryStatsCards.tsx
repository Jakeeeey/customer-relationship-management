import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, RotateCcw, FileText } from "lucide-react";
import { SiteSalesSummaryStats } from "../types";
import { cn } from "@/lib/utils";

interface SiteSalesSummaryStatsCardsProps {
    stats: SiteSalesSummaryStats;
    isLoading?: boolean;
}

const SiteSalesSummaryStatsCards: React.FC<SiteSalesSummaryStatsCardsProps> = ({ stats, isLoading }) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(value);
    };

    const cards = [
        {
            title: "Total Gross Sales",
            value: stats.totalGross,
            icon: Receipt,
            color: "text-blue-500",
            bg: "bg-blue-50",
            darkBg: "dark:bg-blue-500/10",
            description: "Accumulated gross amount",
        },
        {
            title: "Total Returns",
            value: stats.totalReturns,
            icon: RotateCcw,
            color: "text-rose-500",
            bg: "bg-rose-50",
            darkBg: "dark:bg-rose-500/10",
            description: "Sum of linked sales returns",
        },
        {
            title: "Total Credits",
            value: stats.totalCredits,
            icon: FileText,
            color: "text-amber-500",
            bg: "bg-amber-50",
            darkBg: "dark:bg-amber-500/10",
            description: "Sum of linked credit memos",
        },
        {
            title: "Total Debits",
            value: stats.totalDebits,
            icon: FileText,
            color: "text-indigo-500",
            bg: "bg-indigo-50",
            darkBg: "dark:bg-indigo-500/10",
            description: "Sum of linked debit memos",
        },
        {
            title: "Total Balance",
            value: stats.totalBalance,
            icon: Receipt,
            color: "text-emerald-500",
            bg: "bg-emerald-50",
            darkBg: "dark:bg-emerald-500/10",
            description: "Net - Credits - Returns + Debits",
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
            {cards.map((card, index) => (
                <Card
                    key={index}
                    className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 group"
                >
                    <CardContent className="p-0">
                        <div className="p-6 relative">
                            {/* Decorative background circle */}
                            <div className={cn(
                                "absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150",
                                card.bg,
                                "dark:bg-white/5"
                            )} />

                            <div className="flex justify-between items-start relative z-10">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        {card.title}
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        <h2 className={cn(
                                            "text-2xl font-black tracking-tight transition-all duration-300",
                                            isLoading ? "opacity-40 blur-[2px]" : "opacity-100"
                                        )}>
                                            {formatCurrency(card.value)}
                                        </h2>
                                    </div>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium italic">
                                        {card.description}
                                    </p>
                                </div>

                                <div className={cn(
                                    "p-3 rounded-2xl transition-all duration-300 group-hover:rotate-12 group-hover:scale-110",
                                    card.bg,
                                    card.darkBg
                                )}>
                                    <card.icon className={cn("w-6 h-6", card.color)} />
                                </div>
                            </div>

                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default SiteSalesSummaryStatsCards;
