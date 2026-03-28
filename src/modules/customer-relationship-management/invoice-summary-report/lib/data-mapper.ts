import { InvoiceReportRow } from "../types";

/**
 * Transforms raw invoice requests into a format for Stacked Bar Charts.
 * Groups by reason_code and counts occurrences of each status.
 */
export const mapToReasonDistribution = (data: InvoiceReportRow[]) => {
  const groups = data.reduce((acc: Record<string, { reason: string; APPROVED: number; REJECTED: number; PENDING: number }>, curr) => {
    // Use the value from curr.reason_code
    const reasonKey = curr.defect_reason || "Uncategorized";

    if (!acc[reasonKey]) {
      acc[reasonKey] = {
        reason: reasonKey,
        APPROVED: 0,
        REJECTED: 0,
        PENDING: 0,
      };
    }

    // Safely increment the status count
    const status = curr.status;
    if (status && status in acc[reasonKey]) {
      acc[reasonKey][status] += 1;
    }

    return acc;
  }, {});

  return Object.values(groups);
};

/**
 * Transforms data for Pie Charts focusing on Decision Ratios.
 * Filters out PENDING to show the Auditor's actual performance.
 */
export const mapToApprovalRatio = (data: InvoiceReportRow[]) => {
  const counts = data.reduce(
    (acc, curr) => {
      const currentStatus = curr.status?.toUpperCase();
      if (currentStatus === "APPROVED") {
        acc.APPROVED += 1;
      } else if (currentStatus === "REJECTED") {
        acc.REJECTED += 1;
      }
      return acc;
    },
    { APPROVED: 0, REJECTED: 0 },
  );
  return [
    {
      status: "APPROVED",
      count: counts.APPROVED,
      fill: "#22c55e",
    },
    {
      status: "REJECTED",
      count: counts.REJECTED,
      fill: "#ef4444",
    },
  ];
};
