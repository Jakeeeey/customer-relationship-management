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

export interface SearchableSelectProps {
    options: { value: string; label: string }[];
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    icon?: React.ReactNode;
}

export function SearchableSelect({
    options,
    value,
    onValueChange,
    placeholder = "Select option...",
    disabled = false,
    className,
    icon,
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false);

    // Find the label for the current value
    const selectedLabel = React.useMemo(() => {
        return options.find((opt) => opt.value === value)?.label;
    }, [options, value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-start font-normal h-10 rounded-xl shadow-sm border-border/60 bg-background", !value && "text-muted-foreground", className)}
                    disabled={disabled}
                >
                    {icon && <span className="mr-2">{icon}</span>}
                    <span className="truncate flex-1 text-left">
                        {selectedLabel || placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((opt) => (
                                <CommandItem
                                    key={opt.value}
                                    value={`${opt.label} - ${opt.value}`} // Unique string for cmdk filtering
                                    onSelect={() => {
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
    );
}
