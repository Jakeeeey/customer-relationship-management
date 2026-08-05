"use client";
import * as React from "react";
import { Check, ChevronsUpDown, Search as SearchIcon } from "lucide-react";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md",
      className
    )}
    {...props}
  />
));
Command.displayName = "LocalCommand";

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex h-9 items-center gap-2 border-b px-3">
    <SearchIcon className="size-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = "LocalCommandInput";

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn(
      "max-h-[300px] overflow-x-hidden overflow-y-auto",
      className
    )}
    {...props}
  />
));
CommandList.displayName = "LocalCommandList";

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-6 text-center text-sm"
    {...props}
  />
));
CommandEmpty.displayName = "LocalCommandEmpty";

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "text-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
      className
    )}
    {...props}
  />
));
CommandGroup.displayName = "LocalCommandGroup";

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
      className
    )}
    {...props}
  />
));
CommandItem.displayName = "LocalCommandItem";

export interface MultiSearchableSelectProps {
    options: { value: string; label: string }[];
    value: string[];
    onValueChange: (value: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function LocalMultiSearchableSelect({
    options = [],
    value = [],
    onValueChange,
    placeholder = "Select options...",
    disabled = false,
    className,
}: MultiSearchableSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const commandListRef = React.useRef<HTMLDivElement>(null);

    // Scroll reset on search change
    React.useEffect(() => {
        if (commandListRef.current) {
            commandListRef.current.scrollTop = 0;
        }
    }, [search]);

    // Reset search when closing
    React.useEffect(() => {
        if (!open) {
            setSearch("");
        }
    }, [open]);

    // Display string summarizing current selections
    const selectedDisplay = React.useMemo(() => {
        if (value.length === 0) return placeholder;
        
        const labels = value
            .map((val) => options.find((opt) => opt.value === val)?.label)
            .filter(Boolean);
            
        if (labels.length <= 2) {
            return labels.join(", ");
        }
        return `${labels.length} selected`;
    }, [options, value, placeholder]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between font-bold", value.length === 0 && "text-muted-foreground", className)}
                    disabled={disabled}
                >
                    <span className="block truncate text-left w-[calc(100%-20px)]">{selectedDisplay}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput 
                        placeholder={`Search...`} 
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList ref={commandListRef}>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((opt) => {
                                const isSelected = value.includes(opt.value);
                                return (
                                    <CommandItem
                                        key={opt.value}
                                        value={opt.label}
                                        onSelect={() => {
                                            let newValue: string[];
                                            if (opt.value === "All") {
                                                newValue = isSelected ? [] : ["All"];
                                            } else {
                                                if (isSelected) {
                                                    newValue = value.filter((v) => v !== opt.value);
                                                } else {
                                                    newValue = [...value.filter((v) => v !== "All"), opt.value];
                                                }
                                            }
                                            // Fallback to "All" if empty and "All" is in the options list
                                            if (newValue.length === 0 && options.some(o => o.value === "All")) {
                                                newValue = ["All"];
                                            }
                                            onValueChange(newValue);
                                        }}
                                    >
                                        <div className={cn(
                                            "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 dark:border-slate-700 transition-all",
                                            isSelected ? "bg-blue-600 border-blue-600 text-white" : "bg-transparent"
                                        )}>
                                            {isSelected && <Check className="h-3 w-3" />}
                                        </div>
                                        <span className="truncate">{opt.label}</span>
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
