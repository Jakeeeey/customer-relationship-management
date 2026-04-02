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
import { Loader2, Trash2, Save } from "lucide-react";

const taskSchema = z.object({
    task_id: z.string().min(1, "Task is required"),
    name: z.string().min(1, "Description is required"),
    customer_id: z.string().min(1, "Customer is required"),
    priority_level: z.string().min(1, "Priority is required"),
    remarks: z.string().optional(),
});

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
            priority_level: "mid",
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
                priority_level: "mid",
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

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="space-y-6">
                <div className="space-y-2.5">
                    <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70">1. Select Task Type</Label>
                    <Controller
                        name="task_id"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="bg-muted/30 border-primary/10 h-12 text-base">
                                    <SelectValue placeholder="Select Task Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tasks.map((t) => (
                                        <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>

                <div className="space-y-2.5">
                    <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70">2. Brief Description</Label>
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <Input 
                                {...field} 
                                placeholder="e.g., Client Visit or Store Audit" 
                                className="bg-muted/30 border-primary/10 h-12 text-base"
                            />
                        )}
                    />
                </div>

                <div className="space-y-2.5">
                    <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70">3. Target Customer</Label>
                    <Controller
                        name="customer_id"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="bg-muted/30 border-primary/10 h-12 text-base">
                                    <SelectValue placeholder="Select Customer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.store_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>

                <div className="space-y-2.5">
                    <Label className="text-[11px] uppercase font-black tracking-[0.15em] text-primary/70">4. Priority Level</Label>
                    <Controller
                        name="priority_level"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="bg-muted/30 border-primary/10 h-12 text-base">
                                    <SelectValue placeholder="Set priority" />
                                </SelectTrigger>
                                <SelectContent>
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
    );
};
