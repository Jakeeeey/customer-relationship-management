// src/modules/customer-relationship-management/structure/task-management-approval/components/TaskForm.tsx
"use client";

import React from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
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
import { Loader2, Save, AlertCircle, Check, ChevronsUpDown, CheckCircle } from "lucide-react";
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
    customer_id: z.string().optional(),
    priority_level: z.string().min(1, "Priority is required"),
    remarks: z.string().optional(),
    sales_amount: z.string().optional(),
    collection_amount: z.string().optional(),
    province: z.string().optional(),
    city: z.string().optional(),
    barangay: z.string().optional(),
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
    onApprove?: (id: number) => Promise<boolean>;
    onReject?: (id: number) => Promise<boolean>;
    isSubmitting?: boolean;
    selectedSalesmanId: string;
    selectedEmployeeId: string;
    selectedDate: Date | null;
}

interface PSGCItem {
    code: string;
    name: string;
}

export const TaskForm: React.FC<TaskFormProps> = ({
    initialData,
    tasks,
    customers,
    onSubmit,
    onApprove,
    onReject,
    selectedSalesmanId,
    selectedEmployeeId,
    selectedDate,
}) => {
    const [provinces, setProvinces] = React.useState<{ value: string; label: string }[]>([]);
    const [cities, setCities] = React.useState<{ value: string; label: string }[]>([]);
    const [barangays, setBarangays] = React.useState<{ value: string; label: string }[]>([]);

    const { control, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm<TaskFormValues>({
        resolver: zodResolver(taskSchema),
        defaultValues: {
            task_id: "",
            name: "",
            customer_id: "",
            priority_level: "",
            remarks: "",
            sales_amount: "",
            collection_amount: "",
            province: "",
            city: "",
            barangay: "",
        }
    });

    const selectedTaskId = useWatch({ control, name: "task_id" });
    const selectedTask = tasks.find(t => String(t.id) === selectedTaskId);
    const taskTypeName = selectedTask?.name.toLowerCase() || "";

    const selectedProvince = useWatch({ control, name: "province" });
    const selectedCity = useWatch({ control, name: "city" });

    // PSGC Data Fetching
    React.useEffect(() => {
        fetch("https://psgc.gitlab.io/api/provinces.json")
            .then(res => res.json())
            .then((data: PSGCItem[]) => {
                setProvinces(data.map((p) => ({ value: p.code, label: p.name })));
            })
            .catch(err => console.error("Error fetching provinces:", err));
    }, []);

    React.useEffect(() => {
        if (selectedProvince) {
            fetch(`https://psgc.gitlab.io/api/provinces/${selectedProvince}/cities-municipalities.json`)
                .then(res => res.json())
                .then((data: PSGCItem[]) => {
                    setCities(data.map((c) => ({ value: c.code, label: c.name })));
                    // Don't reset if it's initial load and matches
                    if (initialData?.city !== selectedCity) {
                        setValue("city", "");
                        setValue("barangay", "");
                    }
                })
                .catch(err => console.error("Error fetching cities:", err));
        } else {
            setCities([]);
        }
    }, [selectedProvince, setValue, initialData, selectedCity]);

    const barangayValue = useWatch({ control, name: "barangay" });
    React.useEffect(() => {
        if (selectedCity) {
            fetch(`https://psgc.gitlab.io/api/cities-municipalities/${selectedCity}/barangays.json`)
                .then(res => res.json())
                .then((data: PSGCItem[]) => {
                    setBarangays(data.map((b) => ({ value: b.code, label: b.name })));
                    if (initialData?.barangay !== barangayValue) {
                        setValue("barangay", "");
                    }
                })
                .catch(err => console.error("Error fetching barangays:", err));
        } else {
            setBarangays([]);
        }
    }, [selectedCity, setValue, initialData, barangayValue]);

    React.useEffect(() => {
        if (initialData) {
            const parts = (initialData.additional_description || "").split(" | ");
            reset({
                task_id: String(initialData.task_id),
                name: parts[0] || "",
                customer_id: String(initialData.customer_id),
                priority_level: initialData.priority_level,
                remarks: parts[1] || "",
                sales_amount: initialData.sales_amount ? String(initialData.sales_amount) : "",
                collection_amount: initialData.collection_amount ? String(initialData.collection_amount) : "",
                province: initialData.province || "",
                city: initialData.city || "",
                barangay: initialData.barangay || "",
            });
        }
    }, [initialData, reset]);

    const handleFormSubmit = async (values: TaskFormValues) => {
        // Use PSGC labels for the payload if needed, or just the codes
        const provLabel = provinces.find(p => p.value === values.province)?.label || values.province;
        const cityLabel = cities.find(c => c.value === values.city)?.label || values.city;
        const brgyLabel = barangays.find(b => b.value === values.barangay)?.label || values.barangay;

        const payload = {
            task_id: parseInt(values.task_id),
            customer_id: values.customer_id ? parseInt(values.customer_id) : null,
            priority_level: values.priority_level,
            additional_description: values.name + (values.remarks ? ` | ${values.remarks}` : ""),
            salesman_id: parseInt(selectedSalesmanId),
            employee_id: parseInt(selectedEmployeeId),
            date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
            province: provLabel || null,
            city: cityLabel || null,
            barangay: brgyLabel || null,
            sales_amount: values.sales_amount ? parseFloat(values.sales_amount) : 0,
            collection_amount: values.collection_amount ? parseFloat(values.collection_amount) : 0,
            approval_status: initialData?.approval_status || "pending",
            ...(initialData?.id && { id: initialData.id })
        };

        await onSubmit(payload as Partial<DailyActionPlan>);
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Header / Review Mode Info */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3 mb-6">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Review Mode</p>
                    <p className="text-[11px] text-amber-600/80 dark:text-amber-400/60 font-medium">You are currently reviewing this task. You can modify details before final approval.</p>
                </div>
            </div>

            {/* Form Content */}
            <div className="space-y-6">
                {/* 1. Task Type */}
                <div className="space-y-2.5">
                    <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
                        1. Task Type
                    </Label>
                    <Controller
                        name="task_id"
                        control={control}
                        render={({ field }) => (
                            <LocalSearchableSelect
                                options={tasks.map(t => ({ value: String(t.id), label: t.name }))}
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder="Select Task Type"
                            />
                        )}
                    />
                </div>

                {/* 2. Description */}
                <div className="space-y-2.5">
                    <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70">
                        2. Brief Description
                    </Label>
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <Input {...field} placeholder="e.g., Client Visit" className="bg-muted/30 border-primary/10 h-12 text-base focus:ring-primary/20" />
                        )}
                    />
                </div>

                {/* Conditional Fields: Location (Area Visit Only) */}
                {taskTypeName === "area visit" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2.5">
                            <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70">Province</Label>
                            <Controller
                                name="province"
                                control={control}
                                render={({ field }) => (
                                    <LocalSearchableSelect
                                        options={provinces}
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        placeholder="Select Province"
                                    />
                                )}
                            />
                        </div>
                        <div className="space-y-2.5">
                            <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70">City/Municipality</Label>
                            <Controller
                                name="city"
                                control={control}
                                render={({ field }) => (
                                    <LocalSearchableSelect
                                        options={cities}
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        placeholder="Select City"
                                    />
                                )}
                            />
                        </div>
                        <div className="space-y-2.5">
                            <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70">Barangay</Label>
                            <Controller
                                name="barangay"
                                control={control}
                                render={({ field }) => (
                                    <LocalSearchableSelect
                                        options={barangays}
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        placeholder="Select Barangay"
                                    />
                                )}
                            />
                        </div>
                    </div>
                )}

                {/* Conditional Fields: Customer (Shown for everything except Area Visit) */}
                {taskTypeName !== "area visit" && (
                    <div className="space-y-2.5">
                        <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70">
                            3. Target Customer
                        </Label>
                        <Controller
                            name="customer_id"
                            control={control}
                            render={({ field }) => (
                                <LocalSearchableSelect
                                    options={customers.map(c => ({ value: String(c.id), label: `${c.store_name} (${c.customer_name})` }))}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    placeholder="Select Customer"
                                />
                            )}
                        />
                    </div>
                )}

                {/* 4. Priority */}
                <div className="space-y-2.5">
                    <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70">
                        4. Priority Level
                    </Label>
                    <Controller
                        name="priority_level"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                <SelectTrigger className="bg-muted/30 border-primary/10 h-12 text-base">
                                    <SelectValue placeholder="Set priority" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-primary/10">
                                    <SelectItem value="low">Low Priority</SelectItem>
                                    <SelectItem value="mid">Medium Priority</SelectItem>
                                    <SelectItem value="high">High Priority</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>

                {/* Conditional Fields: Targets (Shown ONLY for Sales or Collection) */}
                {(taskTypeName === "sales" || taskTypeName === "collection") && (
                    <div className="grid grid-cols-2 gap-4">
                        {taskTypeName === "sales" && (
                            <div className="space-y-2.5">
                                <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70">5. Sales Target</Label>
                                <Controller name="sales_amount" control={control} render={({ field }) => (
                                    <Input {...field} type="number" step="0.01" className="bg-muted/30 border-primary/10 h-12 text-base" />
                                )} />
                            </div>
                        )}
                        {taskTypeName === "collection" && (
                            <div className="space-y-2.5">
                                <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70">6. Collection Target</Label>
                                <Controller name="collection_amount" control={control} render={({ field }) => (
                                    <Input {...field} type="number" step="0.01" className="bg-muted/30 border-primary/10 h-12 text-base" />
                                )} />
                            </div>
                        )}
                    </div>
                )}

                {/* 7. Remarks */}
                <div className="space-y-2.5">
                    <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70">7. Review Remarks</Label>
                    <Controller name="remarks" control={control} render={({ field }) => (
                        <Textarea {...field} placeholder="Add instructions for the salesman..." className="bg-muted/30 border-primary/10 min-h-[100px] resize-none" />
                    )} />
                </div>
            </div>

            {/* Form Footer / Buttons */}
            <div className="flex flex-col gap-4 pt-8 border-t border-primary/5">
                <div className="flex gap-3">
                    {onReject && initialData && (
                        <Button 
                            type="button" 
                            variant="outline" 
                            className="flex-1 h-12 font-black border-red-500/20 text-red-500 hover:bg-red-50 transition-all active:scale-[0.98]" 
                            onClick={() => onReject(initialData.id)}
                        >
                            Reject Task
                        </Button>
                    )}
                    {onApprove && initialData && (
                        <Button 
                            type="button" 
                            className="flex-1 h-12 font-black bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98]" 
                            onClick={() => onApprove(initialData.id)}
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve Task
                        </Button>
                    )}
                </div>
                <div className="flex gap-3">
                    <Button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="h-12 font-black px-8 flex-1 bg-primary text-white shadow-xl shadow-primary/20 transition-all active:scale-[0.98] rounded-xl"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>
        </form>
    );
};
