//src/modules/customer-relationship-management/customer-management/dealer-list/components/KPICards.tsx
"use client";

import React from "react";
import { Building2, Users, MapPin, Layers3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { DealerKPIs } from "../types";

interface KPICardsProps {
  kpis: DealerKPIs;
  loading: boolean;
}

const cards = [
  {
    key: "totalDealers" as const,
    label: "Total Dealers",
    icon: Building2,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    key: "activeDealers" as const,
    label: "With Name",
    icon: Users,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    key: "dealerTypes" as const,
    label: "Dealer Types",
    icon: Layers3,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    key: "provinces" as const,
    label: "Provinces",
    icon: MapPin,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
] as const;

export default function KPICards({ kpis, loading }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map(({ key, label, icon: Icon, color, bg }) => (
        <div
          key={key}
          className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3"
        >
          <div className={`rounded-lg ${bg} p-2.5 shrink-0`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div className="min-w-0">
            {loading ? (
              <Skeleton className="h-6 w-12 mb-1" />
            ) : (
              <p className="text-2xl font-bold leading-tight">
                {kpis[key].toLocaleString()}
              </p>
            )}
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
