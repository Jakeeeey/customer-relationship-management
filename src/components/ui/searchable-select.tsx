"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

export interface SearchableSelectProps {
    options: { value: string; label: string }[];
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    allowClear?: boolean;
}

export function SearchableSelect({
    options,
    value,
    onValueChange,
    placeholder = "Select option...",
    disabled = false,
    className,
    allowClear = true,
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false);

    // Find the label for the current value
    const selectedLabel = React.useMemo(() => {
        return options.find((opt) => opt.value === value)?.label;
    }, [options, value]);

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onValueChange("all");
    };

    return (
        <div className="flex items-center gap-1 group relative">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn("w-full justify-between pr-8", !value && "text-muted-foreground", className)}
                        disabled={disabled}
                    >
                        <span className="truncate">{selectedLabel || placeholder}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                
                {allowClear && value && value !== "all" && (
                    <button
                        onClick={handleClear}
                        className="absolute right-8 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors z-10"
                        title="Clear selection"
                    >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                )}

                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((opt) => (
                                <CommandItem
                                    key={opt.value}
                                    value={opt.label} // Use label for searching
                                    onSelect={() => {
                                        // We need to map back to the ID/value since CommandItem uses text content or value prop
                                        // Here we used label as value for search, so we find the option by label and call onValueChange with its value
                                        // However, simpler is to use the option.value if unique, but Command compares normalized search.
                                        // Let's stick to using the opt.value if we want precise selection.
                                        // Re-eval: onSelect returns the value prop (opt.label).
                                        // Actually, let's use the option value but ensure standard shadcn pattern.

                                        onValueChange(opt.value);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === opt.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {opt.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
            </Popover>
        </div>
    );
}
