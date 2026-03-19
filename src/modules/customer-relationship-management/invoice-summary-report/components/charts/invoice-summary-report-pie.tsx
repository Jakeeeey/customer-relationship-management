"use client";

import { memo } from "react";
import * as React from "react";
import { TrendingUp } from "lucide-react";
import { Pie, PieChart, Cell } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  count: {
    label: "Decisions",
  },
  APPROVED: {
    label: "Approved",
    color: "#22c55e",
  },
  REJECTED: {
    label: "Rejected",
    color: "#ef4444",
  },
} satisfies ChartConfig;

interface PieChartProps {
  data: { status: string; count: number; fill: string }[];
}

export const InvoiceSummaryPieChart = memo(function InvoiceSummaryPieChart({
  data,
}: PieChartProps) {
  const totalFinalized = React.useMemo(() => {
    return data
      .filter((item) => item.status !== "PENDING")
      .reduce((acc, curr) => acc + curr.count, 0);
  }, [data]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Approval Ratio</CardTitle>
        <CardDescription>Finalized Auditor Decisions</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square h-115 w-full"
        >
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent nameKey="count" hideLabel />}
            />
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              label={({ payload }) => {
                return payload.status;
              }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Decision throughput is stable <TrendingUp className="h-4 w-4" />
        </div>

        <div className="text-muted-foreground leading-none">
          Showing {totalFinalized} finalized requests (Excludes Pending)
        </div>
      </CardFooter>
    </Card>
  );
});
