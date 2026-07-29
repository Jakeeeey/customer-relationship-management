//src/modules/customer-relationship-management/customer-management/dealer-list/components/PSGCCombobox.tsx
"use client";

/**
 * PSGCCombobox
 * ─────────────────────────────────────────────────────────────────────────────
 * Searchable dropdown for Philippine Standard Geographic Code data.
 * Uses DropdownMenu + sticky search input (same pattern as CustomerFormSheet
 * in the IDS project) — avoids Command/Popover selection bugs.
 *
 * Data source: psgc.gitlab.io/api  (direct browser fetch, no proxy needed)
 */

import React, { useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface PSGCOption {
  code: string;
  name: string;
}

export interface PSGCComboboxProps {
  /** Unique DOM id for the trigger button */
  id?: string;
  /** Currently selected name (what we store in Directus) */
  value: string;
  /** Called on selection with (name, code) */
  onSelect: (name: string, code: string) => void;
  /** Options to display */
  items: PSGCOption[];
  /** Placeholder text shown when nothing is selected */
  placeholder?: string;
  /** Disables the trigger while parent level has not been selected */
  disabled?: boolean;
  /** Shows a spinner inside the trigger */
  isLoading?: boolean;
  /** Additional className for the trigger button */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PSGCCombobox({
  id,
  value,
  onSelect,
  items,
  placeholder = "Select…",
  disabled = false,
  isLoading = false,
  className,
}: PSGCComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    return items.filter((i) =>
      i.name.toLowerCase().includes(query.trim().toLowerCase()),
    );
  }, [items, query]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery("");
    // Focus the search input after the dropdown opens
    if (next) setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange} >
      <DropdownMenuTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            "w-full h-10 justify-between font-normal text-sm bg-background",
            !value && "text-muted-foreground",
            (disabled || isLoading) && "opacity-50 cursor-not-allowed",
            className,
          )}
        >
          <div className="flex items-center truncate">
            {isLoading && (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
            )}
            <span className="truncate">
              {value ? value : isLoading ? "Loading…" : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-full sm:w-[--radix-popper-anchor-width] min-w-[--radix-popper-anchor-width] p-0 shadow-xl rounded-xl"
        align="start"
        style={{
  width: "max(var(--radix-popper-anchor-width), 100%)",
}}
        sideOffset={6}
      >
        {/* ── Sticky search ── */}
        <div className="flex items-center border-b px-3 sticky top-0 bg-popover z-10">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Search…"
            className="flex h-10  bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* ── Empty state ── */}
        {filteredItems.length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No results found.
          </div>
        )}

        {/* ── Items ── */}
        <div className="max-h-60 overflow-y-auto">
          {filteredItems.map((item, index) => (
            <DropdownMenuItem
              key={item.code || `${item.name}-${index}`}
              onSelect={() => {
                onSelect(item.name, item.code);
                setOpen(false);
                setQuery("");
              }}
              className={cn(
                "cursor-pointer px-3 py-2",
                value === item.name && "bg-accent/50 font-medium",
              )}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4 text-primary shrink-0",
                  value === item.name ? "opacity-100" : "opacity-0",
                )}
              />
              {item.name}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
