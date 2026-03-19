"use client";

import { memo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  APPROVED: {
    label: "Approved",
    color: "#22c55e",
  },
  REJECTED: {
    label: "Rejected",
    color: "#ef4444",
  },
  PENDING: {
    label: "Pending",
    color: "#f59e0b",
  },
} satisfies ChartConfig;

interface BarChartProps {
  data: { reason: string; APPROVED: number; REJECTED: number; PENDING: number }[];
  totalAmount?: number;
  totalRequests?: number;
}

export const InvoiceSummaryBarChart = memo(function InvoiceSummaryBarChart({
  data,
  totalAmount = 0,
  totalRequests = 0,
}: BarChartProps) {
  const formattedAmount = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(totalAmount);
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
        <div className="grid gap-1">
          <CardTitle>Reason Distribution</CardTitle>
          <CardDescription>
            ({totalRequests}) Reasons grouped by status
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-87.5 w-full">
          <BarChart
            accessibilityLayer
            data={data}
            margin={{
              top: 20,
              right: 20,
              bottom: 20,
              left: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="reason" tickLine={false} tickMargin={10} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar
              dataKey="APPROVED"
              fill="#22c55e"
              radius={4}
              stackId="a"
            />
            <Bar
              dataKey="REJECTED"
              fill="#ef4444"
              radius={4}
              stackId="a"
            />
            <Bar
              dataKey="PENDING"
              fill="#f59e0b"
              radius={4}
              stackId="a"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          {formattedAmount} Total Requests Amount
        </div>
        <div className="leading-none text-muted-foreground">
          Calculation based on requested cancellation values
        </div>
      </CardFooter>
    </Card>
  );
});
