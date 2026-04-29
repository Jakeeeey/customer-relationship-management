"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type NameFilterComboboxProps = {
	value: string;
	onValueChange: (value: string) => void;
	names: string[];
};

type ComboboxOption = {
	value: string;
	label: string;
};

export default function NameFilterCombobox({
	value,
	onValueChange,
	names,
}: NameFilterComboboxProps) {
	const [open, setOpen] = useState(false);

	const options = useMemo<ComboboxOption[]>(() => {
		return [{ value: "all", label: "All Suppliers" }, ...names.map((name) => ({ value: name, label: name }))];
	}, [names]);

	const selectedLabel = useMemo(() => {
		return options.find((option) => option.value === value)?.label ?? "All Suppliers";
	}, [options, value]);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="h-10 w-full justify-between border border-slate-300 bg-white/95 shadow-sm hover:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-900"
				>
					<span className="truncate text-left">{selectedLabel}</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				sideOffset={8}
				className="w-(--radix-popover-trigger-width) border border-slate-300 bg-white p-0 text-slate-900 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
			>
				<Command className="bg-transparent">
					<CommandInput placeholder="Search supplier name..." className="h-9" />
					<CommandList>
						<CommandEmpty>No supplier found.</CommandEmpty>
						{options.map((option) => (
							<CommandItem
								key={option.value}
								value={option.label}
								onSelect={(currentValue) => {
									const normalizedCurrent = currentValue.trim().toLowerCase();
									const match = options.find(
										(item) => item.label.trim().toLowerCase() === normalizedCurrent
									);

									onValueChange(match?.value ?? "all");
									setOpen(false);
								}}
							>
								<Check
									className={cn(
										"mr-2 h-4 w-4",
										value === option.value ? "opacity-100" : "opacity-0"
									)}
								/>
								{option.label}
							</CommandItem>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
