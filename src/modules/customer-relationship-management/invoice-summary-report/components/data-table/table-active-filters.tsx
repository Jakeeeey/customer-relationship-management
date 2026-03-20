import { X, Filter, BookmarkPlus, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColumnFiltersState } from "@tanstack/react-table";
import { formatFilterId, getFilterValueLabel } from "../../lib/utils";

interface ActiveFiltersProps {
  filters: ColumnFiltersState;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onSaveView: (name: string) => void;
}

export function ActiveFilters({
  filters,
  onRemove,
  onClearAll,
  onSaveView,
}: ActiveFiltersProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-dashed p-3 bg-muted/30 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 pr-2 border-r mr-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Active Filters
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const valueLabel = getFilterValueLabel(filter.id, filter.value);
            if (!valueLabel) return null;

            return (
              <Badge
                key={filter.id}
                variant="outline"
                className="h-7 items-center gap-0 overflow-hidden pl-2 pr-1 font-medium bg-background/50 border-muted-foreground/20 shadow-none transition-colors hover:bg-muted/50"
              >
                <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground/60">
                  {formatFilterId(filter.id)}
                </span>

                <span className="mx-1.5 h-1 w-1 rounded-full bg-muted-foreground/30" />

                <span className="text-[11px] font-semibold text-foreground">
                  {valueLabel}
                </span>

                <button
                  onClick={() => onRemove(filter.id)}
                  className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove {filter.id} filter</span>
                </button>
              </Badge>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const name = prompt("Enter view name:");
            if (name) onSaveView(name);
          }}
          className="h-8 gap-2 text-xs font-semibold shadow-sm hover:bg-primary/5 hover:text-primary transition-colors border-dashed"
        >
          <BookmarkPlus className="h-3.5 w-3.5" />
          Save Filter
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-8 gap-2 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Clear All
        </Button>
      </div>
    </div>
  );
}
