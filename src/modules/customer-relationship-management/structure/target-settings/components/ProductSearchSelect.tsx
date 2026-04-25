"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

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

export interface ProductSearchSelectProps {
    options: { value: string; label: string }[];
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function ProductSearchSelect({
    options,
    value,
    onValueChange,
    placeholder = "Select option...",
    disabled = false,
    className,
}: ProductSearchSelectProps) {
    const [open, setOpen] = React.useState(false);

    // Find the label for the current value
    const selectedLabel = React.useMemo(() => {
        return options.find((opt) => opt.value === value)?.label;
    }, [options, value]);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={false}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between h-10 border-slate-200 rounded-xl px-4 text-sm font-medium", !value && "text-muted-foreground", className)}
                    disabled={disabled}
                >
                    <span className="truncate">{selectedLabel || placeholder}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent 
                className="w-[--radix-popover-trigger-width] p-0 border-slate-200 shadow-xl rounded-xl" 
                align="start"
                onPointerDownOutside={() => {
                    // Prevent closing when clicking outside if needed, 
                    // but default is usually fine for a search select.
                }}
            >
                <Command className="rounded-xl">
                    <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} className="h-10" />
                    <CommandList 
                        className="max-h-[300px] overflow-y-auto"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((opt) => (
                                <CommandItem
                                    key={opt.value}
                                    value={opt.label}
                                    onSelect={() => {
                                        onValueChange(opt.value);
                                        setOpen(false);
                                    }}
                                    className="rounded-lg mx-1 my-0.5"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === opt.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <span className="truncate">{opt.label}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
