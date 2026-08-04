//src/modules/business-intelligence-analytics/sales-report/utils/format.ts
export function formatPHP(n: number) {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(v);
}

export function formatNumber(n: number) {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 }).format(v);
}
