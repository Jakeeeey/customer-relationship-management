//src/modules/business-intelligence-analytics/sales-report/components/SalesReportKpis.tsx
"use client";

import * as React from "react";
import type { SalesReportKpis } from "../types";
import { formatPHP } from "../utils/format";

import { Card, CardContent } from "@/components/ui/card";

function KpiCard(props: { title: string; value: string; tone?: "default" | "good" | "bad" }) {
  const { title, value, tone = "default" } = props;

  const toneClass =
    tone === "good"
      ? "text-emerald-600"
      : tone === "bad"
        ? "text-red-600"
        : "text-blue-600";

  const bg =
    tone === "bad" ? "bg-red-50 border-red-200" : "bg-background";

  return (
    <Card className={bg}>
      <CardContent className="p-5">
        <div className="text-xs font-semibold text-muted-foreground">{title}</div>
        <div className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

export function SalesReportKpisBar(props: { kpis: SalesReportKpis | null }) {
  const { kpis } = props;

  const allocated = kpis ? formatPHP(kpis.total_allocated) : formatPHP(0);
  const invoiced = kpis ? formatPHP(kpis.total_invoiced) : formatPHP(0);
  const unserved = kpis ? formatPHP(kpis.unserved_balance) : formatPHP(0);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <KpiCard title="TOTAL ALLOCATED (SO)" value={allocated} tone="default" />
      <KpiCard title="TOTAL INVOICED (SI)" value={invoiced} tone="good" />
      <KpiCard title="UNSERVED BALANCE" value={unserved} tone="bad" />
    </div>
  );
}
