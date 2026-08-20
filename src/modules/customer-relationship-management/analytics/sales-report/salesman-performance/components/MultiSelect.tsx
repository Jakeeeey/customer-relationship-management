//src/modules/business-intelligence-analytics/sales-report/components/MultiSelect.tsx
"use client";

import * as React from "react";
import { Check, ChevronDown, Square } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type MultiSelectOption = {
  label: string;
  value: string;
};

type Props = {
  mode: "single" | "multi";
  placeholder?: string;
  options: MultiSelectOption[];
  value: string[]; // single uses [selected] or []
  onChange: (next: string[]) => void;
  disabled?: boolean;
  className?: string;
};

function getLabel(options: MultiSelectOption[], v: string) {
  return options.find((o) => o.value === v)?.label ?? v;
}

export function MultiSelect(props: Props) {
  const { mode, placeholder, options, value, onChange, disabled, className } = props;

  const [open, setOpen] = React.useState(false);

  const selectedSet = React.useMemo(() => new Set(value ?? []), [value]);

  const triggerLabel = React.useMemo(() => {
    if (!value || value.length === 0) return placeholder ?? "Select";

    if (mode === "single") {
      return getLabel(options, value[0]);
    }

    // multi
    const count = value.length;
    return `${placeholder ?? "Selected"} (${count})`;
  }, [mode, options, placeholder, value]);

  function toggleMulti(v: string) {
    const next = new Set(selectedSet);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(Array.from(next));
  }

  function setSingle(v: string) {
    onChange([v]);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between", className)}
        >
          <span className={cn("truncate text-left", !value?.length && "text-muted-foreground")}>
            {triggerLabel}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            <CommandGroup>
              {options.map((opt) => {
                const selected = selectedSet.has(opt.value);

                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => {
                      if (mode === "multi") toggleMulti(opt.value);
                      else setSingle(opt.value);
                    }}
                    className={cn(
                      "flex items-center gap-2",
                      mode === "single" && selected && "bg-accent text-accent-foreground",
                    )}
                  >
                    {/* ✅ SHOW CHECKBOX ONLY WHEN MULTI */}
                    {mode === "multi" ? (
                      selected ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4 opacity-50" />
                      )
                    ) : null}

                    <span className="truncate">{opt.label}</span>

                    {/* ✅ OPTIONAL subtle indicator for SINGLE without checkbox (right check) */}
                    {mode === "single" && selected ? (
                      <Check className="ml-auto h-4 w-4 opacity-70" />
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
