import type { OrderCancellationApprovalRow } from "../types";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(dateInput: string | null | undefined): string {
  if (!dateInput) return "-";
  const parsed = new Date(dateInput);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(parsed);
}

export function computePendingAmount(rows: OrderCancellationApprovalRow[]): number {
  return rows.reduce((sum, row) => sum + (row.totalAmount || 0), 0);
}

export function normalizeSearchKeyword(value: string): string {
  return value.trim().toLowerCase();
}
