import * as z from "zod";

export const summaryMetricsSchema = z.object({
    total_purchases: z.number(),
    total_amount: z.number(),
    pending_purchases: z.number(),
    approved_purchases: z.number(),
});

export type SummaryMetrics = z.infer<typeof summaryMetricsSchema>;
