import React, { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
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
import { FormControl } from "@/components/ui/form";

interface ReferenceOption {
    id: number | string;
    name: string;
}

interface CreatableComboboxProps {
    items: ReferenceOption[];
    value: number | string | null | undefined;
    onChange: (value: number | string) => void;
    onCreate: (name: string) => void;
    placeholder: string;
    itemName: string;
    disabled?: boolean;
}

export function CreatableCombobox({ 
    items = [], 
    value, 
    onChange, 
    onCreate, 
    placeholder, 
    itemName,
    disabled 
}: CreatableComboboxProps) {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    
    const selectedItem = items.find((i) => String(i.id) === String(value));
    const exactMatch = items.some((i) => i.name.toLowerCase() === inputValue.toLowerCase());

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <FormControl>
                    <Button 
                        variant="outline" 
                        role="combobox"
                        disabled={disabled}
                        className={cn(
                            "w-full h-11 justify-between bg-muted/30", 
                            !value && "text-muted-foreground"
                        )}
                    >
                        {selectedItem ? selectedItem.name : placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </FormControl>
            </PopoverTrigger>
            <PopoverContent 
                className="w-[300px] p-0 shadow-xl rounded-xl border-border/50"
                onWheel={(e) => e.stopPropagation()}
                onWheelCapture={(e) => e.stopPropagation()}
                align="start"
            >
                <Command className="bg-transparent overflow-hidden rounded-xl">
                    <CommandInput 
                        placeholder={`Search or create ${itemName}...`} 
                        onValueChange={setInputValue}
                        className="h-11" 
                    />
                    <CommandList 
                        className="max-h-[200px] overflow-y-auto custom-scrollbar"
                        onWheel={(e) => e.stopPropagation()}
                        onWheelCapture={(e) => e.stopPropagation()}
                    >
                        <CommandEmpty className="p-2">
                            {inputValue && !exactMatch ? (
                                <Button 
                                    variant="ghost"
                                    className="w-full justify-start text-primary text-xs font-bold uppercase tracking-widest"
                                    onClick={() => {
                                        onCreate(inputValue);
                                        setInputValue("");
                                        setOpen(false);
                                    }}
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Create &quot;{inputValue}&quot;
                                </Button>
                            ) : `No ${itemName} found.`}
                        </CommandEmpty>
                        <CommandGroup>
                            {items.map((item, index) => (
                                <CommandItem
                                    key={item.id || `${item.name}-${index}`}
                                    value={item.name}
                                    onSelect={() => {
                                        onChange(item.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 text-primary", 
                                            String(value) === String(item.id) ? "opacity-100" : "opacity-0"
                                        )} 
                                    />
                                    {item.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
