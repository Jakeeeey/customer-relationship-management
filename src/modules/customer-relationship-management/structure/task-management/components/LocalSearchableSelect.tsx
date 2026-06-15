// src/modules/customer-relationship-management/structure/task-management/components/LocalSearchableSelect.tsx
"use client";

import React from "react";
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

interface LocalSearchableSelectProps {
    options: { value: string; label: string }[];
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export const LocalSearchableSelect: React.FC<LocalSearchableSelectProps> = ({
    options,
    value,
    onValueChange,
    placeholder = "Select option...",
    disabled = false
}) => {
    const [open, setOpen] = React.useState(false);
    const selectedLabel = options.find((opt) => opt.value === value)?.label;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-between h-10 whitespace-normal px-4 text-left bg-background/40 border-primary/10 hover:border-primary/30 font-medium text-sm transition-all focus:ring-2 focus:ring-primary/20",
                        !value && "text-muted-foreground"
                    )}
                >
                    <span className="truncate">{selectedLabel || placeholder}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent 
                className="w-[--radix-popover-trigger-width] p-0 shadow-xl border-primary/10" 
                align="start"
                onWheel={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
            >
                <Command className="w-full">
                    <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} className="h-11" />
                    <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((opt) => (
                                <CommandItem
                                    key={opt.value}
                                    value={opt.label + " " + opt.value}
                                    onSelect={() => {
                                        onValueChange(opt.value);
                                        setOpen(false);
                                    }}
                                    className="py-3 px-4 cursor-pointer data-[selected=true]:bg-primary/5"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 text-primary",
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
};
