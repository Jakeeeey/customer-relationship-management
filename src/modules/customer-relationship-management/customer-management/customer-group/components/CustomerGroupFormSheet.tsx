"use client";

import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
import {
    Users,
    Building2,
    Loader2,
    Check,
    ChevronsUpDown,
    Plus,
    ArrowRight,
    Trash2,
    Sparkles
} from "lucide-react";
import { CustomerGroup, CustomerGroupFormData } from "../types";
import { CustomerSelectionDialog } from "./CustomerSelectionDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CustomerRegistration as Customer } from "../../customer-registration/types";

// ============================================================================
// SCHEMA
// ============================================================================
const groupSchema = z.object({
    group_code: z.string().min(1, "Group code is required"),
    group_name: z.string().min(1, "Group name is required"),
    description: z.string().optional().nullable(),
    province: z.string().min(1, "Province is required"),
    city: z.string().min(1, "City is required"),
    brgy: z.string().min(1, "Barangay is required"),
    primary_customer_id: z.coerce.number().nullable().optional(),
    isActive: z.coerce.number().default(1),
    customer_ids: z.array(z.number()).default([]),
});

type GroupFormValues = z.infer<typeof groupSchema>;

interface CustomerGroupFormSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    group: CustomerGroup | null;
    onSubmit: (data: CustomerGroupFormData) => Promise<void>;
}

interface LocationOption {
    code: string;
    name: string;
}

export function CustomerGroupFormSheet({
    open,
    onOpenChange,
    group,
    onSubmit,
}: CustomerGroupFormSheetProps) {
    const [isSelectionDialogOpen, setIsSelectionDialogOpen] = useState(false);
    const [provincesList, setProvincesList] = useState<LocationOption[]>([]);
    const [citiesList, setCitiesList] = useState<LocationOption[]>([]);
    const [barangaysList, setBarangaysList] = useState<LocationOption[]>([]);
    const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [isLoadingBarangays, setIsLoadingBarangays] = useState(false);

    // Track group members for the primary customer selection
    const [groupMembers, setGroupMembers] = useState<Customer[]>([]);

    // Original customer IDs to track removals
    const [originalCustomerIds, setOriginalCustomerIds] = useState<number[]>([]);

    const form = useForm<GroupFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(groupSchema) as any,
        defaultValues: {
            group_code: "",
            group_name: "",
            description: "",
            province: "",
            city: "",
            brgy: "",
            primary_customer_id: null,
            isActive: 1,
            customer_ids: [] as number[],
        },
    });

    const selectedProvince = form.watch("province");
    const selectedCity = form.watch("city");
    const selectedCustomerIds = form.watch("customer_ids");

    // ========================================================================
    // Location Data Fetching
    // ========================================================================
    
    // Fetch Provinces
    useEffect(() => {
        if (!open) return;
        const fetchProvinces = async () => {
            setIsLoadingProvinces(true);
            try {
                const res = await fetch("/api/psgc/provinces");
                if (!res.ok) throw new Error("Failed to fetch provinces");
                const data = await res.json();
                setProvincesList(data.map((p: { code: string; name: string }) => ({ code: p.code, name: p.name })));
            } catch (err) {
                console.error("Provinces fetch error:", err);
            } finally {
                setIsLoadingProvinces(false);
            }
        };
        fetchProvinces();
    }, [open]);

    // Fetch Cities based on Province
    useEffect(() => {
        const fetchCities = async () => {
            if (!selectedProvince || provincesList.length === 0) {
                setCitiesList([]);
                return;
            }
            const provObj = provincesList.find(p => p.name.toLowerCase().trim() === selectedProvince.toLowerCase().trim());
            if (!provObj) return;

            setIsLoadingCities(true);
            try {
                const res = await fetch(`/api/psgc/provinces/${provObj.code}/cities-municipalities`);
                if (!res.ok) throw new Error("Failed to fetch cities");
                const data = await res.json();
                setCitiesList(data.map((c: { code: string; name: string }) => ({ code: c.code, name: c.name })));
            } catch (err) {
                console.error("Cities fetch error:", err);
            } finally {
                setIsLoadingCities(false);
            }
        };
        fetchCities();
    }, [selectedProvince, provincesList]);

    // Fetch Barangays based on City
    useEffect(() => {
        const fetchBarangays = async () => {
            if (!selectedCity || citiesList.length === 0) {
                setBarangaysList([]);
                return;
            }
            const cityObj = citiesList.find(c => c.name.toLowerCase().trim() === selectedCity.toLowerCase().trim());
            if (!cityObj) return;

            setIsLoadingBarangays(true);
            try {
                const res = await fetch(`/api/psgc/cities-municipalities/${cityObj.code}/barangays`);
                if (!res.ok) throw new Error("Failed to fetch barangays");
                const data = await res.json();
                setBarangaysList(data.map((b: { code: string; name: string }) => ({ code: b.code, name: b.name })));
            } catch (err) {
                console.error("Barangays fetch error:", err);
            } finally {
                setIsLoadingBarangays(false);
            }
        };
        fetchBarangays();
    }, [selectedCity, citiesList]);

    // ========================================================================
    // EFFECT: Initialize Form
    // ========================================================================
    useEffect(() => {
        if (open) {
            if (group) {
                // Fetch current members
                fetchGroupMembers(group.id);

                const ids = group.customers?.map(c => c.id) || [];
                setOriginalCustomerIds(ids);

                form.reset({
                    group_code: group.group_code,
                    group_name: group.group_name,
                    description: group.description || "",
                    province: group.province || "",
                    city: group.city || "",
                    brgy: group.brgy || "",
                    primary_customer_id: group.primary_customer_id,
                    isActive: group.isActive,
                    customer_ids: ids,
                });
            } else {
                setOriginalCustomerIds([]);
                setGroupMembers([]);
                form.reset({
                    group_code: `GRP-${Date.now().toString().slice(-6)}`,
                    group_name: "",
                    description: "",
                    province: "",
                    city: "",
                    brgy: "",
                    primary_customer_id: null,
                    isActive: 1,
                    customer_ids: [],
                });
            }
        }
    }, [group, open, form]);

    const fetchGroupMembers = async (id: number) => {
        try {
            const res = await fetch(`/api/crm/customer?groupId=${id}&pageSize=1000`);
            const data = await res.json();
            setGroupMembers(data.customers || []);
        } catch (error) {
            console.error("Failed to fetch members", error);
        }
    };

    // When customer_ids change, we might need to fetch names for the summary list
    useEffect(() => {
        const syncMembers = async () => {
            if (selectedCustomerIds.length === 0) {
                setGroupMembers([]);
                return;
            }

            // If we have selected IDs that are not in groupMembers, fetch them
            const missingIds = selectedCustomerIds.filter(id => !groupMembers.some(m => m.id === id));
            if (missingIds.length > 0) {
                try {
                    // This is slightly inefficient but for small lists it's fine
                    // Ideally we'd have a bulk GET by ID endpoint
                    const res = await fetch(`/api/crm/customer?pageSize=1000`);
                    const data = await res.json();
                    const all = data.customers || [];
                    const fetchedMembers = all.filter((c: { id: number }) => selectedCustomerIds.includes(c.id));
                    setGroupMembers(prev => {
                        const existingIds = new Set(prev.map((m: Customer) => m.id));
                        const combined = [...prev];
                        fetchedMembers.forEach((m: Customer) => {
                            if (!existingIds.has(m.id)) {
                                combined.push(m);
                            }
                        });
                        return combined.filter((m: Customer) => selectedCustomerIds.includes(m.id));
                    });
                } catch (error) {
                    console.error("Failed to sync members", error);
                }
            } else {
                // Just filter existing groupMembers to match selectedCustomerIds
                setGroupMembers(prev => prev.filter(m => selectedCustomerIds.includes(m.id)));
            }
        };

        if (open) syncMembers();
    }, [selectedCustomerIds, open, groupMembers]);

    // ========================================================================
    // Recommend address and auto-select primary
    useEffect(() => {
        // Only recommend for NEW groups or if existing group address is totally empty
        if (open && groupMembers.length > 0) {
            const firstMember = groupMembers[0];
            
            // 1. Auto-select Primary if not set
            if (!form.getValues("primary_customer_id")) {
                form.setValue("primary_customer_id", firstMember.id);
            }

            // 2. Recommend Address
            const currentProvince = form.getValues("province");
            const currentCity = form.getValues("city");
            const currentBrgy = form.getValues("brgy");

            // Auto-fill if ALL address fields are currently empty
            if (!currentProvince && !currentCity && !currentBrgy) {
                const hasAddress = firstMember.province || firstMember.city || firstMember.brgy;
                
                if (hasAddress) {
                    if (firstMember.province) form.setValue("province", firstMember.province);
                    if (firstMember.city) form.setValue("city", firstMember.city);
                    if (firstMember.brgy) form.setValue("brgy", firstMember.brgy);
                    
                    toast.info(`Recommended address applied from ${firstMember.customer_name}`, {
                        description: "You can still change these details manually.",
                        duration: 5000,
                    });
                }
            }
        }
    }, [groupMembers, open, form]);


    const handleFormSubmit: SubmitHandler<GroupFormValues> = async (values) => {
        const removedIds = originalCustomerIds.filter(id => !values.customer_ids.includes(id));
        const newIds = values.customer_ids.filter(id => !originalCustomerIds.includes(id));

        const payload: CustomerGroupFormData = {
            ...values,
            id: group?.id,
            customer_ids: newIds,
            removed_customer_ids: removedIds,
        };

        try {
            await onSubmit(payload);
            onOpenChange(false);
        } catch {
            toast.error("Failed to save group. Please try again.");
        }
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col bg-background shadow-2xl border-l-border/40">
                    <div className="p-8 bg-muted/10 border-b border-border/50 shrink-0">
                        <SheetHeader className="text-left">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner">
                                    <Building2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <SheetTitle className="text-3xl font-black uppercase tracking-tighter italic">
                                        {group ? "Edit Group" : "New Group"}
                                    </SheetTitle>
                                    <SheetDescription className="font-bold text-xs uppercase tracking-widest mt-1">
                                        {group ? `Editing ${group.group_name}` : "Create a new customer group"}
                                    </SheetDescription>
                                </div>
                            </div>
                        </SheetHeader>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                {/* Basic Info */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Basic Information</h3>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="group_code"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Group Code</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} readOnly className="bg-muted/50 font-bold" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="group_name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Group Name</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} placeholder="Enter group name..." className="h-11 bg-muted/30 rounded-xl" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description</FormLabel>
                                                <FormControl>
                                                    <Textarea {...field} value={field.value || ""} placeholder="Optional group description..." className="min-h-[80px] bg-muted/30 rounded-xl resize-none" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Address Section */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Location Details</h3>
                                        </div>
                                        {groupMembers.length > 0 && (
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/5 text-primary animate-pulse">
                                                <Sparkles className="h-3 w-3" />
                                                <span className="text-[9px] font-black uppercase tracking-tighter">Smart Recommender Active</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="province"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Province</FormLabel>
                                                    <SearchableCombobox
                                                        items={provincesList}
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        placeholder="Select Province"
                                                        isLoading={isLoadingProvinces}
                                                    />
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <FormField
                                                control={form.control}
                                                name="city"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col min-w-0">
                                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">City/Municipality</FormLabel>
                                                        <SearchableCombobox
                                                            items={citiesList}
                                                            value={field.value}
                                                            onChange={field.onChange}
                                                            placeholder="Select City"
                                                            disabled={!selectedProvince}
                                                            isLoading={isLoadingCities}
                                                        />
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="brgy"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col min-w-0">
                                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">Barangay</FormLabel>
                                                        <SearchableCombobox
                                                            items={barangaysList}
                                                            value={field.value}
                                                            onChange={field.onChange}
                                                            placeholder="Select Barangay"
                                                            disabled={!selectedCity}
                                                            isLoading={isLoadingBarangays}
                                                        />
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Members Section */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Group Members</h3>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsSelectionDialogOpen(true)}
                                            className="h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-lg border-primary/20 text-primary hover:bg-primary/5"
                                        >
                                            <Plus className="h-3 w-3 mr-1.5" /> Manage Members
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {groupMembers.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-10 bg-muted/20 border border-dashed border-border rounded-2xl text-muted-foreground">
                                                <Users className="h-8 w-8 mb-2 opacity-10" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">No members added yet</span>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-2">
                                                {groupMembers.map((member) => (
                                                    <div key={member.id} className="flex items-center justify-between p-3 bg-muted/30 border border-border/50 rounded-xl group transition-all hover:bg-muted/50">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                                {member.customer_name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold">{member.customer_name}</p>
                                                                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest">
                                                                    {member.customer_code} • {member.store_name}
                                                                </p>
                                                                {(member.province || member.city) && (
                                                                    <p className="text-[8px] font-bold text-primary/60 uppercase tracking-tighter mt-0.5">
                                                                        {member.province}{member.city ? `, ${member.city}` : ''}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => form.setValue("customer_ids", selectedCustomerIds.filter(id => id !== member.id))}
                                                            className="h-7 w-7 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {groupMembers.length > 0 && (
                                        <FormField
                                            control={form.control}
                                            name="primary_customer_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Primary Customer</FormLabel>
                                                    <SearchableSelect
                                                        options={groupMembers.map((member) => ({
                                                            value: member.id.toString(),
                                                            label: `${member.customer_name} (${member.customer_code})`
                                                        }))}
                                                        value={field.value?.toString()}
                                                        onValueChange={field.onChange}
                                                        placeholder="Select primary contact for this group..."
                                                        className="h-11 bg-primary/5 border-primary/20 rounded-xl focus:ring-primary/20 text-xs font-bold"
                                                    />
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="p-8 bg-muted/30 border-t border-border/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FormField
                                        control={form.control}
                                        name="isActive"
                                        render={({ field }) => (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border/50 rounded-full">
                                                <input
                                                    type="checkbox"
                                                    id="isActive"
                                                    checked={field.value === 1}
                                                    onChange={(e) => field.onChange(e.target.checked ? 1 : 0)}
                                                    className="rounded border-border text-primary focus:ring-primary"
                                                />
                                                <label htmlFor="isActive" className="text-[10px] font-black uppercase tracking-widest cursor-pointer">Active Group</label>
                                            </div>
                                        )}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="h-11 px-6 text-xs font-bold uppercase tracking-widest">
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="h-11 px-8 text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20">
                                        {group ? "Update Group" : "Create Group"} <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </Form>
                </SheetContent>
            </Sheet>

            <CustomerSelectionDialog
                open={isSelectionDialogOpen}
                onOpenChange={setIsSelectionDialogOpen}
                groupName={form.watch("group_name")}
                selectedCustomerIds={selectedCustomerIds}
                onSelectionChange={(ids) => form.setValue("customer_ids", ids, { shouldValidate: true })}
                groupId={group?.id}
            />
        </>
    );
}

// ============================================================================
// HELPER: SEARCHABLE COMBOBOX (REUSED FROM CUSTOMER MODULE)
// ============================================================================
interface SearchableComboboxProps {
    items: LocationOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
    isLoading?: boolean;
}

function SearchableCombobox({ items, value, onChange, placeholder, disabled, isLoading }: SearchableComboboxProps) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <FormControl>
                    <Button
                        variant="outline"
                        role="combobox"
                        disabled={disabled || isLoading}
                        className={cn("w-full h-11 justify-between bg-muted/30 border-border/40 rounded-xl focus:ring-primary/20 font-bold", !value && "text-muted-foreground", (disabled || isLoading) && "opacity-50 cursor-not-allowed")}
                    >
                        <div className="flex items-center flex-1 min-w-0 text-left mr-2 overflow-hidden">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
                            <span className="truncate block flex-1">{value ? value : (isLoading ? "Fetching..." : placeholder)}</span>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 shadow-xl rounded-xl border-border/50">
                <Command className="bg-transparent rounded-xl">
                    <CommandInput placeholder="Search..." className="h-11" />
                    <CommandList 
                        className="custom-scrollbar"
                        style={{ maxHeight: "min(250px, calc(var(--radix-popover-content-available-height) - 45px))" }}
                    >
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {items.map((item, index) => (
                                <CommandItem
                                    key={item.code || `${item.name}-${index}`}
                                    value={item.name}
                                    onSelect={() => {
                                        onChange(item.name);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn("mr-2 h-4 w-4 text-primary shrink-0", value === item.name ? "opacity-100" : "opacity-0")} />
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
