// src/modules/customer-relationship-management/structure/task-management/components/TaskForm.tsx
"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Task, Customer, DailyActionPlan } from "../types";
import { Loader2, Trash2, Save, AlertCircle, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

const taskSchema = z.object({
    task_id: z.string().min(1, "Task is required"),
    name: z.string().min(1, "Brief description is required"),
    customer_id: z.string().min(1, "Customer is required"),
    priority_level: z.string().min(1, "Priority is required"),
    remarks: z.string().optional(),
});

interface LocalSearchableSelectProps {
    options: { value: string; label: string }[];
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
}

const LocalSearchableSelect: React.FC<LocalSearchableSelectProps> = ({
    options,
    value,
    onValueChange,
    placeholder = "Select option..."
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
                    className={cn(
                        "w-full justify-between h-auto min-h-12 whitespace-normal py-2.5 text-left bg-muted/30 border-primary/10 hover:border-primary/30 font-medium transition-all focus:ring-2 focus:ring-primary/20",
                        !value && "text-muted-foreground"
                    )}
                >
                    <span className="flex-1">{selectedLabel || placeholder}</span>
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

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskFormProps {
    initialData?: DailyActionPlan | null;
    tasks: Task[];
    customers: Customer[];
    onSubmit: (data: Partial<DailyActionPlan>) => Promise<boolean>;
    onDelete?: (id: number) => Promise<boolean>;
    isSubmitting?: boolean;
    selectedSalesmanId: string;
    selectedEmployeeId: string;
    selectedDate: Date | null;
}

export const TaskForm: React.FC<TaskFormProps> = ({
    initialData,
    tasks,
    customers,
    onSubmit,
    onDelete,
    selectedSalesmanId,
    selectedEmployeeId,
    selectedDate,
}) => {
    const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<TaskFormValues>({
        resolver: zodResolver(taskSchema),
        defaultValues: {
            task_id: "",
            name: "",
            customer_id: "",
            priority_level: "",
            remarks: "",
        }
    });

    React.useEffect(() => {
        if (initialData) {
            const parts = (initialData.additional_description || "").split(" | ");
            reset({
                task_id: String(initialData.task_id),
                name: parts[0] || "",
                customer_id: String(initialData.customer_id),
                priority_level: initialData.priority_level,
                remarks: parts[1] || "",
            });
        } else {
            reset({
                task_id: "",
                name: "",
                customer_id: "",
                priority_level: "",
                remarks: "",
            });
        }
    }, [initialData, reset]);

    const handleFormSubmit = async (values: TaskFormValues) => {
        const payload = {
            task_id: parseInt(values.task_id),
            customer_id: parseInt(values.customer_id),
            priority_level: values.priority_level,
            additional_description: values.name + (values.remarks ? ` | ${values.remarks}` : ""),
            salesman_id: parseInt(selectedSalesmanId),
            employee_id: parseInt(selectedEmployeeId),
            date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
            ...(initialData?.id && { id: initialData.id })
        };

        await onSubmit(payload as Partial<DailyActionPlan>);
    };

    const onValidationError = () => {
        toast.error("Please complete all required fields (*)", {
            description: "Task Type, Brief Description, Target Customer, and Priority Level are required.",
            duration: 4000,
        });
    };

    return (
        <>
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(var(--primary-rgb), 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(var(--primary-rgb), 0.2);
                }
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(var(--primary-rgb), 0.1) transparent;
                }
            `}</style>
            <form onSubmit={handleSubmit(handleFormSubmit, onValidationError)} className="space-y-6">
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-start gap-3 mb-6">
                <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                    <p className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider">Required Fields Notice</p>
                    <p className="text-[11px] text-orange-600/80 dark:text-orange-400/60 font-medium">Please ensure all fields marked with an asterisk (<span className="text-red-500">*</span>) are completed before submission.</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-2.5">
                    <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
                        1. Select Task Type
                        <span className="text-red-500 text-lg leading-none">*</span>
                    </Label>
                    <Controller
                        name="task_id"
                        control={control}
                        render={({ field }) => (
                            <LocalSearchableSelect
                                options={tasks.map(t => ({ 
                                    value: String(t.id), 
                                    label: t.name 
                                }))}
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder="Select Task Type"
                            />
                        )}
                    />
                </div>

                <div className="space-y-2.5">
                    <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
                        2. Brief Description
                        <span className="text-red-500 text-lg leading-none">*</span>
                    </Label>
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <Input 
                                {...field} 
                                placeholder="e.g., Client Visit or Store Audit" 
                                className="bg-muted/30 border-primary/10 h-12 text-base focus:ring-primary/20"
                            />
                        )}
                    />
                </div>

                <div className="space-y-2.5">
                    <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
                        3. Target Customer
                        <span className="text-red-500 text-lg leading-none">*</span>
                    </Label>
                    <Controller
                        name="customer_id"
                        control={control}
                        render={({ field }) => (
                            <LocalSearchableSelect
                                options={customers.map(c => ({ 
                                    value: String(c.id), 
                                    label: `${c.store_name} (${c.customer_name})`
                                }))}
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder="Select Customer"
                            />
                        )}
                    />
                </div>

                <div className="space-y-2.5">
                    <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
                        4. Priority Level
                        <span className="text-red-500 text-lg leading-none">*</span>
                    </Label>
                    <Controller
                        name="priority_level"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                <SelectTrigger className="bg-muted/30 border-primary/10 h-12 text-base">
                                    <SelectValue placeholder="Set priority" />
                                </SelectTrigger>
                                <SelectContent 
                                    className="max-h-[300px] overflow-y-auto shadow-xl custom-scrollbar"
                                    onWheel={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                >
                                    <SelectItem value="low">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            <span>Low Priority</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="mid">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                                            <span>Medium Priority</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="high">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                            <span>High Priority</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>

                <div className="space-y-2.5">
                    <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70">5. Special Instructions</Label>
                    <Controller
                        name="remarks"
                        control={control}
                        render={({ field }) => (
                            <Textarea 
                                {...field} 
                                placeholder="Provide specific details for the salesman to follow..." 
                                className="bg-muted/30 border-primary/10 min-h-[120px] resize-none focus:ring-primary/20 text-base"
                            />
                        )}
                    />
                </div>
            </div>

            <div className="flex justify-between items-center pt-8 border-t border-primary/5">
                {initialData && onDelete && (
                    <Button 
                        type="button" 
                        variant="destructive" 
                        className="font-bold flex items-center gap-2"
                        onClick={async () => {
                            if (confirm("Delete this task?")) {
                                await onDelete(initialData.id);
                            }
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </Button>
                )}
                <div className="flex gap-3 ml-auto">
                    <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="bg-primary font-bold px-8"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        {initialData ? "Update Task" : "Create Task"}
                    </Button>
                </div>
            </div>
        </form>
    </>
    );
};
