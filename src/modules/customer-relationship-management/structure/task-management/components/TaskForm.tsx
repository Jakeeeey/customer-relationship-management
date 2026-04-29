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
    review_remarks: z.string().optional(),
    sales_amount: z.string().optional(),
    collection_amount: z.string().optional(),
    province: z.string().optional(),
    province_code: z.string().optional(),
    city: z.string().optional(),
    city_code: z.string().optional(),
    barangay: z.string().optional(),
    barangay_code: z.string().optional(),
}).superRefine(() => {
    // Strict conditional validation can be added here
},);



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
    const [provinces, setProvinces] = React.useState<{ code: string; name: string }[]>([]);
    const [cities, setCities] = React.useState<{ code: string; name: string }[]>([]);
    const [barangays, setBarangays] = React.useState<{ code: string; name: string }[]>([]);
    const [isLoadingLocations, setIsLoadingLocations] = React.useState(false);

    const { control, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm<TaskFormValues>({
        resolver: zodResolver(taskSchema),
        defaultValues: {
            task_id: "",
            name: "",
            customer_id: "",
            priority_level: "",
            review_remarks: "",
            sales_amount: "",
            collection_amount: "",
            province: "",
            province_code: "",
            city: "",
            city_code: "",
            barangay: "",
            barangay_code: "",
        }
    });

    const watchedTaskId = watch("task_id");
    const watchedProvinceCode = watch("province_code");
    const watchedCityCode = watch("city_code");

    const selectedTaskType = React.useMemo(() => 
        tasks.find(t => String(t.id) === watchedTaskId), 
    [tasks, watchedTaskId]);

    const isAreaVisit = selectedTaskType?.name.toLowerCase().includes("area visit");
    const isSales = selectedTaskType?.name.toLowerCase().includes("sales");
    const isCollection = selectedTaskType?.name.toLowerCase().includes("collection");

    // Fetch Provinces
    React.useEffect(() => {
        const fetchProvinces = async () => {
            try {
                const res = await fetch("https://psgc.gitlab.io/api/provinces/");
                const data = await res.json();
                setProvinces(data.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)));
            } catch (error) {
                console.error("Failed to fetch provinces", error);
            }
        };
        fetchProvinces();
    }, []);

    // Fetch Cities when province changes
    React.useEffect(() => {
        if (!watchedProvinceCode) {
            setCities([]);
            return;
        }
        const fetchCities = async () => {
            setIsLoadingLocations(true);
            try {
                const res = await fetch(`https://psgc.gitlab.io/api/provinces/${watchedProvinceCode}/cities-municipalities/`);
                const data = await res.json();
                setCities(data.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)));
            } catch (error) {
                console.error("Failed to fetch cities", error);
            } finally {
                setIsLoadingLocations(false);
            }
        };
        fetchCities();
    }, [watchedProvinceCode]);

    // Fetch Barangays when city changes
    React.useEffect(() => {
        if (!watchedCityCode) {
            setBarangays([]);
            return;
        }
        const fetchBarangays = async () => {
            setIsLoadingLocations(true);
            try {
                const res = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${watchedCityCode}/barangays/`);
                const data = await res.json();
                setBarangays(data.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)));
            } catch (error) {
                console.error("Failed to fetch barangays", error);
            } finally {
                setIsLoadingLocations(false);
            }
        };
        fetchBarangays();
    }, [watchedCityCode]);

    React.useEffect(() => {
        if (initialData) {
            const parts = (initialData.additional_description || "").split(" | ");
            reset({
                task_id: String(initialData.task_id),
                name: parts[0] || "",
                customer_id: String(initialData.customer_id),
                priority_level: initialData.priority_level,
                review_remarks: initialData.reviewed_at ? (parts[2] || "") : "", // Assuming review remarks as 3rd part
                sales_amount: initialData.sales_amount ? String(initialData.sales_amount) : "",
                collection_amount: initialData.collection_amount ? String(initialData.collection_amount) : "",
                province: initialData.province || "",
                city: initialData.city || "",
                barangay: initialData.barangay || "",
            });
        } else {
            reset({
                task_id: "",
                name: "",
                customer_id: "",
                priority_level: "",
                review_remarks: "",
                sales_amount: "",
                collection_amount: "",
                province: "",
                city: "",
                barangay: "",
            });
        }
    }, [initialData, reset]);
    // Attempt to set province_code when initialData.province exists and provinces are loaded
    React.useEffect(() => {
        if (initialData?.province && provinces.length > 0 && !watchedProvinceCode) {
            const found = provinces.find(p => p.name.toLowerCase() === initialData.province?.toLowerCase());
            if (found) setValue("province_code", found.code);
        }
    }, [initialData, provinces, watchedProvinceCode, setValue]);

    // Attempt to set city_code when initialData.city exists and cities are loaded
    React.useEffect(() => {
        if (initialData?.city && cities.length > 0 && !watchedCityCode) {
            const found = cities.find(c => c.name.toLowerCase() === initialData.city?.toLowerCase());
            if (found) setValue("city_code", found.code);
        }
    }, [initialData, cities, watchedCityCode, setValue]);

    // Attempt to set barangay_code when initialData.barangay exists and barangays are loaded
    React.useEffect(() => {
        if (initialData?.barangay && barangays.length > 0) {
            const watchedBarangayCode = control._formValues.barangay_code;
            if (!watchedBarangayCode) {
                const found = barangays.find(b => b.name.toLowerCase() === initialData.barangay?.toLowerCase());
                if (found) setValue("barangay_code", found.code);
            }
        }
    }, [initialData, barangays, setValue, control._formValues.barangay_code]);

    const handleFormSubmit = async (values: TaskFormValues) => {
        // Manual validation for conditional fields
        if (isAreaVisit && (!values.province_code || !values.city_code || !values.barangay_code)) {
            onValidationError();
            return;
        }
        if (isSales && (!values.sales_amount || parseFloat(values.sales_amount) <= 0)) {
            onValidationError();
            return;
        }
        if (isCollection && (!values.collection_amount || parseFloat(values.collection_amount) <= 0)) {
            onValidationError();
            return;
        }

        const selectedCustomer = customers.find(c => String(c.id) === values.customer_id);
        
        let additionalDesc = values.name;
        if (values.review_remarks) additionalDesc += ` | ${values.review_remarks}`;

        const payload = {
            task_id: parseInt(values.task_id),
            customer_id: parseInt(values.customer_id),
            priority_level: values.priority_level,
            additional_description: additionalDesc,
            salesman_id: parseInt(selectedSalesmanId),
            employee_id: parseInt(selectedEmployeeId),
            date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
            province: isAreaVisit ? values.province : (selectedCustomer?.province || null),
            city: isAreaVisit ? values.city : (selectedCustomer?.city || null),
            barangay: isAreaVisit ? values.barangay : (selectedCustomer?.barangay || null),
            sales_amount: isSales ? parseFloat(values.sales_amount || "0") : 0,
            collection_amount: isCollection ? parseFloat(values.collection_amount || "0") : 0,
            approval_status: initialData?.approval_status || "pending",
            ...(initialData?.id && { id: initialData.id })
        };

        await onSubmit(payload as Partial<DailyActionPlan>);
    };

    const onValidationError = () => {
        toast.error("Please complete all required fields (*)", {
            description: "Task Type, Description, Customer, and Priority (plus conditional Location or Targets) are required.",
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

                {isAreaVisit && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2.5">
                                <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
                                    Province <span className="text-red-500 text-lg leading-none">*</span>
                                </Label>
                                <Controller
                                    name="province_code"
                                    control={control}
                                    render={({ field }) => (
                                        <LocalSearchableSelect
                                            options={provinces.map(p => ({ 
                                                value: p.code, 
                                                label: p.name 
                                            }))}
                                            value={field.value}
                                            onValueChange={(val) => {
                                                field.onChange(val);
                                                const name = provinces.find(p => p.code === val)?.name || "";
                                                setValue("province", name);
                                                setValue("city_code", "");
                                                setValue("city", "");
                                                setValue("barangay_code", "");
                                                setValue("barangay", "");
                                            }}
                                            placeholder="Select Province"
                                        />
                                    )}
                                />
                            </div>
                            <div className="space-y-2.5">
                                <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
                                    City/Municipality <span className="text-red-500 text-lg leading-none">*</span>
                                </Label>
                                <Controller
                                    name="city_code"
                                    control={control}
                                    render={({ field }) => (
                                        <LocalSearchableSelect
                                            options={cities.map(c => ({ 
                                                value: c.code, 
                                                label: c.name 
                                            }))}
                                            value={field.value}
                                            onValueChange={(val) => {
                                                field.onChange(val);
                                                const name = cities.find(c => c.code === val)?.name || "";
                                                setValue("city", name);
                                                setValue("barangay_code", "");
                                                setValue("barangay", "");
                                            }}
                                            placeholder={isLoadingLocations ? "Loading..." : "Select City"}
                                        />
                                    )}
                                />
                            </div>
                            <div className="space-y-2.5">
                                <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
                                    Barangay <span className="text-red-500 text-lg leading-none">*</span>
                                </Label>
                                <Controller
                                    name="barangay_code"
                                    control={control}
                                    render={({ field }) => (
                                        <LocalSearchableSelect
                                            options={barangays.map(b => ({ 
                                                value: b.code, 
                                                label: b.name 
                                            }))}
                                            value={field.value}
                                            onValueChange={(val) => {
                                                field.onChange(val);
                                                const name = barangays.find(b => b.code === val)?.name || "";
                                                setValue("barangay", name);
                                            }}
                                            placeholder={isLoadingLocations ? "Loading..." : "Select Barangay"}
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {isSales && (
                    <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-500">
                        <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
                            Sales Amount Target <span className="text-red-500 text-lg leading-none">*</span>
                        </Label>
                        <Controller
                            name="sales_amount"
                            control={control}
                            render={({ field }) => (
                                <Input 
                                    {...field} 
                                    type="number"
                                    step="0.01"
                                    placeholder="Enter target sales amount (₱)" 
                                    className="bg-muted/30 border-primary/10 h-12 text-base focus:ring-primary/20"
                                />
                            )}
                        />
                    </div>
                )}

                {isCollection && (
                    <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-500">
                        <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
                            Collection Target <span className="text-red-500 text-lg leading-none">*</span>
                        </Label>
                        <Controller
                            name="collection_amount"
                            control={control}
                            render={({ field }) => (
                                <Input 
                                    {...field} 
                                    type="number"
                                    step="0.01"
                                    placeholder="Enter target collection amount (₱)" 
                                    className="bg-muted/30 border-primary/10 h-12 text-base focus:ring-primary/20"
                                />
                            )}
                        />
                    </div>
                )}

                {!isAreaVisit && !isSales && !isCollection && (
                    <div className="space-y-2.5 opacity-50">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground italic">No additional fields for this task type</p>
                    </div>
                )}

                <div className="space-y-2.5">
                    <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70">Review Remarks</Label>
                    <Controller
                        name="review_remarks"
                        control={control}
                        render={({ field }) => (
                            <Textarea 
                                {...field} 
                                placeholder="Supervisor's feedback or review notes..." 
                                className="bg-muted/30 border-primary/10 min-h-[100px] resize-none focus:ring-primary/20 text-base border-dashed"
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
