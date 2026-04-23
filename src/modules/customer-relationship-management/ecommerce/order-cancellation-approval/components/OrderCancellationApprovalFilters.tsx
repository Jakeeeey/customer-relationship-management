import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  searchKeyword: string;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
};

export function OrderCancellationApprovalFilters({
  searchKeyword,
  isLoading,
  onSearchChange,
  onRefresh,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border bg-card p-3 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchKeyword}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search order no, customer, or supplier..."
          className="h-10 rounded-xl border-border/60 bg-background pl-9 shadow-sm"
        />
      </div>

      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          disabled={isLoading}
          onClick={onRefresh}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
}
