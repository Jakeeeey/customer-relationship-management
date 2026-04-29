import { formatCurrency } from "../utils/businessRules";

type Props = {
  queueCount: number;
  visibleAmount: number;
};

export function OrderCancellationApprovalStats({
  queueCount,
  visibleAmount,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pending Queue</p>
        <p className="mt-1 text-2xl font-black tracking-tight">{queueCount}</p>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Visible Amount</p>
        <p className="mt-1 text-2xl font-black tracking-tight">{formatCurrency(visibleAmount)}</p>
      </div>
    </div>
  );
}
