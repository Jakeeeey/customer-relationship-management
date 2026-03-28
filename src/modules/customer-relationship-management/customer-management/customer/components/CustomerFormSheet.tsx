"use client";

import React, { useEffect, useState } from "react";
import { CreditCard, Loader2, Users, Building2, MapPin, Receipt, Check, ChevronsUpDown, Plus } from "lucide-react";
import { useForm, FieldErrors, Resolver, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle
} from "@/components/ui/sheet";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import {
    Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from "@/components/ui/command";
import {
    Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerWithRelations, ReferenceItem } from "../types";
import { BankAccountManager } from "./BankAccountManager";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================================
// 🚀 ON-THE-FLY CREATABLE COMBOBOX COMPONENT
// ============================================================================
function CreatableCombobox({ items, value, onChange, onCreate, placeholder, itemName }: any) {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");

    const selectedItem = items.find((i: any) => i.id === value);
    const exactMatch = items.some((i: any) => i.name.toLowerCase() === inputValue.toLowerCase());

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <FormControl>
                    <Button
                        variant="outline"
                        role="combobox"
                        className={cn("w-full h-11 justify-between bg-muted/30", !value && "text-muted-foreground")}
                    >
                        {selectedItem ? selectedItem.name : placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 shadow-xl rounded-xl border-border/50">
                <Command className="bg-transparent overflow-hidden rounded-xl">
                    <CommandInput
                        placeholder={`Search or create ${itemName}...`}
                        onValueChange={setInputValue}
                        className="h-11"
                    />
                    <CommandList className="max-h-[200px] overflow-y-auto custom-scrollbar">
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
                                    <Plus className="mr-2 h-4 w-4" /> Create "{inputValue}"
                                </Button>
                            ) : `No ${itemName} found.`}
                        </CommandEmpty>
                        <CommandGroup>
                            {items.map((item: any) => (
                                <CommandItem
                                    key={item.id}
                                    value={item.name}
                                    onSelect={() => {
                                        onChange(item.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn("mr-2 h-4 w-4 text-primary", value === item.id ? "opacity-100" : "opacity-0")} />
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

// ============================================================================
// SCHEMA & TYPES
// ============================================================================
const customerSchema = z.object({
    customer_code: z.string().min(1, "Customer code is required"),
    customer_name: z.string().min(1, "Customer name is required"),
    store_name: z.string().min(1, "Store name is required"),
    store_signage: z.string(),
    contact_number: z.string().min(1, "Contact number is required"),
    customer_email: z.string().email().or(z.literal("")),
    brgy: z.string(), city: z.string(), province: z.string(),
    type: z.enum(["Regular", "Employee"]),
    user_id: z.coerce.number().nullable(),
    tel_number: z.string(), customer_tin: z.string(),
    payment_term: z.coerce.number(),
    store_type: z.coerce.number().nullable(),
    classification: z.coerce.number().nullable(),
    price_type: z.string(),
    isActive: z.coerce.number(), isVAT: z.coerce.number(), isEWT: z.coerce.number(),
    discount_type: z.coerce.number().nullable(),
    encoder_id: z.number(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: CustomerWithRelations | null;
    onSubmit: (data: CustomerFormValues) => Promise<void>;
    defaultTab?: string;
}

// 🚀 FACTORY FOR DEFAULT VALUES to ensure a clean slate every time
const getDefaultValues = (): CustomerFormValues => ({
    customer_code: "", customer_name: "", store_name: "", store_signage: "", contact_number: "",
    customer_email: "", brgy: "", city: "", province: "", tel_number: "", customer_tin: "",
    payment_term: 0, store_type: null, classification: null, price_type: "", isActive: 1, isVAT: 0, isEWT: 0,
    discount_type: null, type: "Regular", user_id: null, encoder_id: 1,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function CustomerFormSheet({
                                      open,
                                      onOpenChange,
                                      customer,
                                      onSubmit,
                                      defaultTab = "basic"
                                  }: CustomerFormSheetProps) {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [storeTypes, setStoreTypes] = useState<any[]>([]);
    const [classifications, setClassifications] = useState<any[]>([]);
    const [users, setUsers] = useState<ReferenceItem[]>([]);

    useEffect(() => {
        if (open) setActiveTab(defaultTab);
    }, [open, defaultTab]);

    useEffect(() => {
        const fetchRefs = async () => {
            try {
                const [storeRes, classRes, userRes] = await Promise.all([
                    fetch("/api/crm/customer/references?type=store_type"),
                    fetch("/api/crm/customer/references?type=classification"),
                    fetch("/api/crm/customer/references?type=user"),
                ]);

                if (storeRes.ok) {
                    const json = await storeRes.json();
                    setStoreTypes(json.data?.map((item: any) => ({
                        id: item.id,
                        name: item.store_type
                    })) || []);
                }

                if (classRes.ok) {
                    const json = await classRes.json();
                    setClassifications(json.data?.map((item: any) => ({
                        id: item.id,
                        name: item.classification_name
                    })) || []);
                }

                if (userRes.ok) {
                    const json = await userRes.json();
                    setUsers(json.data || []);
                }
            } catch (err) {
                console.error("Failed to fetch references", err);
                toast.error("Failed to load dropdown options.");
            }
        };

        if (open) fetchRefs();
    }, [open]);

    const form = useForm<CustomerFormValues>({
        resolver: zodResolver(customerSchema) as Resolver<CustomerFormValues>,
        defaultValues: getDefaultValues(), // 🚀 Use factory here
    });

    // 🚀 FIX: Hard reset logic when sheet opens
    useEffect(() => {
        if (open) {
            if (customer) {
                // We are editing, populate with existing data
                form.reset({
                    ...customer,
                    store_signage: customer.store_signage || "",
                    customer_email: customer.customer_email || "",
                    brgy: customer.brgy || "",
                    city: customer.city || "",
                    province: customer.province || "",
                    tel_number: customer.tel_number || "",
                    customer_tin: customer.customer_tin || "",
                    payment_term: customer.payment_term || 0,
                    store_type: customer.store_type || null,
                    price_type: customer.price_type || "",
                    isActive: customer.isActive ?? 1,
                    isVAT: customer.isVAT ?? 0,
                    isEWT: customer.isEWT ?? 0,
                    discount_type: customer.discount_type || null,
                    type: customer.type || "Regular",
                    user_id: customer.user_id || null,
                    encoder_id: customer.encoder_id || 1,
                    classification: (customer as any).classification || null
                });
            } else {
                // We are creating new, hard reset to factory defaults
                form.reset(getDefaultValues());
            }
        }
    }, [customer, form, open]); // 🚀 Ensure 'open' triggers this check

    const handleFormSubmit: SubmitHandler<CustomerFormValues> = async (values) => {
        try {
            await onSubmit(values);
            toast.success(`Customer ${customer ? "updated" : "created"} successfully`);
            onOpenChange(false);
        } catch (error) {
            toast.error("Failed to save customer. Please try again.");
        }
    };

    const onFormError = (errors: FieldErrors<CustomerFormValues>) => {
        toast.error("Please fill in all required fields in the highlighted tabs.");
    };

    const handleCreateStoreType = async (name: string) => {
        try {
            const res = await fetch("/api/crm/customer/references", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "store_type", name })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to create store type");
            }

            const json = await res.json();
            const newId = json.data.id;

            setStoreTypes(prev => [...prev, { id: newId, name }]);
            form.setValue("store_type", newId, { shouldValidate: true });

            toast.success(`Store Type "${name}" created successfully!`);
        } catch (error) {
            console.error("Store Type creation error:", error);
            toast.error("Failed to create store type. Please try again.");
        }
    };

    const handleCreateClassification = async (name: string) => {
        try {
            const res = await fetch("/api/crm/customer/references", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "classification", name })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to create classification");
            }

            const json = await res.json();
            const newId = json.data.id;

            setClassifications(prev => [...prev, { id: newId, name }]);
            form.setValue("classification", newId, { shouldValidate: true });

            toast.success(`Classification "${name}" created successfully!`);
        } catch (error) {
            console.error("Classification creation error:", error);
            toast.error("Failed to create classification. Please try again.");
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-2xl md:max-w-3xl p-0 flex flex-col bg-background shadow-2xl border-l-border/40">

                {/* HEADER */}
                <div className="p-6 md:p-8 bg-muted/10 border-b border-border/50 shrink-0">
                    <SheetHeader className="text-left">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner hidden sm:flex">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <SheetTitle className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic">
                                    {customer ? "Edit Customer" : "New Customer"}
                                </SheetTitle>
                                <SheetDescription className="font-bold text-xs uppercase tracking-widest mt-1">
                                    {customer ? `Editing ID: ${customer.customer_code}` : "Create a new customer profile"}
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit, onFormError)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">

                            {/* TAB NAVIGATION */}
                            <div className="px-6 md:px-8 pt-4 shrink-0 bg-background z-10">
                                <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted/50 rounded-xl">
                                    <TabsTrigger value="basic" className="py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg">
                                        <Building2 className="w-3.5 h-3.5 mr-2 hidden md:block" /> Basic
                                    </TabsTrigger>
                                    <TabsTrigger value="address" className="py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg">
                                        <MapPin className="w-3.5 h-3.5 mr-2 hidden md:block" /> Location
                                    </TabsTrigger>
                                    <TabsTrigger value="billing" className="py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg">
                                        <Receipt className="w-3.5 h-3.5 mr-2 hidden md:block" /> Billing
                                    </TabsTrigger>
                                    <TabsTrigger value="bank" className="py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg">
                                        <CreditCard className="w-3.5 h-3.5 mr-2 hidden md:block" /> Bank
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            {/* TAB CONTENT AREAS */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">

                                {/* BASIC INFO TAB */}
                                <TabsContent value="basic" className="space-y-6 m-0 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="customer_code" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-bold uppercase text-xs text-muted-foreground">Customer Code</FormLabel>
                                                <FormControl><Input className="h-11 bg-muted/30" placeholder="CUST-001" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="customer_name" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-bold uppercase text-xs text-muted-foreground">Customer Name</FormLabel>
                                                <FormControl><Input className="h-11 bg-muted/30" placeholder="John Doe" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                        {/* 🚀 ON-THE-FLY STORE TYPE */}
                                        <FormField control={form.control} name="store_type" render={({ field }) => (
                                            <FormItem className="flex flex-col pt-1.5">
                                                <FormLabel className="font-bold uppercase text-xs text-muted-foreground">Store Type</FormLabel>
                                                <CreatableCombobox
                                                    items={storeTypes}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    onCreate={handleCreateStoreType}
                                                    placeholder="Select or create..."
                                                    itemName="Store Type"
                                                />
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                        {/* 🚀 ON-THE-FLY CLASSIFICATION */}
                                        <FormField control={form.control} name="classification" render={({ field }) => (
                                            <FormItem className="flex flex-col pt-1.5">
                                                <FormLabel className="font-bold uppercase text-xs text-muted-foreground">Classification</FormLabel>
                                                <CreatableCombobox
                                                    items={classifications}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    onCreate={handleCreateClassification}
                                                    placeholder="Select or create..."
                                                    itemName="Classification"
                                                />
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="store_name" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-bold uppercase text-xs text-muted-foreground">Store Name</FormLabel>
                                                <FormControl><Input className="h-11 bg-muted/30" placeholder="Main Branch" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="store_signage" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-bold uppercase text-xs text-muted-foreground">Store Signage</FormLabel>
                                                <FormControl><Input className="h-11 bg-muted/30" placeholder="Doe's General Store" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                </TabsContent>

                                {/* ADDRESS TAB */}
                                <TabsContent value="address" className="space-y-6 m-0 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="brgy" render={({ field }) => (
                                            <FormItem><FormLabel className="font-bold uppercase text-xs text-muted-foreground">Barangay</FormLabel><FormControl><Input className="h-11 bg-muted/30" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="city" render={({ field }) => (
                                            <FormItem><FormLabel className="font-bold uppercase text-xs text-muted-foreground">City</FormLabel><FormControl><Input className="h-11 bg-muted/30" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="province" render={({ field }) => (
                                            <FormItem className="md:col-span-2"><FormLabel className="font-bold uppercase text-xs text-muted-foreground">Province</FormLabel><FormControl><Input className="h-11 bg-muted/30" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="contact_number" render={({ field }) => (
                                            <FormItem><FormLabel className="font-bold uppercase text-xs text-muted-foreground">Mobile Number</FormLabel><FormControl><Input className="h-11 bg-muted/30" placeholder="09123456789" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="tel_number" render={({ field }) => (
                                            <FormItem><FormLabel className="font-bold uppercase text-xs text-muted-foreground">Telephone Number</FormLabel><FormControl><Input className="h-11 bg-muted/30" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="customer_email" render={({ field }) => (
                                            <FormItem className="md:col-span-2"><FormLabel className="font-bold uppercase text-xs text-muted-foreground">Email Address</FormLabel><FormControl><Input className="h-11 bg-muted/30" type="email" placeholder="customer@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                </TabsContent>

                                {/* BILLING TAB */}
                                <TabsContent value="billing" className="space-y-6 m-0 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="payment_term" render={({ field }) => (
                                            <FormItem><FormLabel className="font-bold uppercase text-xs text-muted-foreground">Payment Term (Days)</FormLabel><FormControl><Input className="h-11 bg-muted/30" type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="price_type" render={({ field }) => (
                                            <FormItem><FormLabel className="font-bold uppercase text-xs text-muted-foreground">Price Type</FormLabel><FormControl><Input className="h-11 bg-muted/30" placeholder="Retail/Wholesale" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>

                                    <div className="bg-muted/20 p-5 rounded-2xl border border-border/50 flex flex-col sm:flex-row gap-8 mt-6">
                                        <FormField control={form.control} name="isActive" render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value === 1} onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)} className="w-5 h-5 rounded-md" /></FormControl><FormLabel className="font-bold uppercase text-xs cursor-pointer">Active Account</FormLabel></FormItem>
                                        )} />
                                        <FormField control={form.control} name="isVAT" render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value === 1} onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)} className="w-5 h-5 rounded-md" /></FormControl><FormLabel className="font-bold uppercase text-xs cursor-pointer">VAT Registered</FormLabel></FormItem>
                                        )} />
                                        <FormField control={form.control} name="isEWT" render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value === 1} onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)} className="w-5 h-5 rounded-md" /></FormControl><FormLabel className="font-bold uppercase text-xs cursor-pointer">Subject to EWT</FormLabel></FormItem>
                                        )} />
                                    </div>
                                </TabsContent>

                                {/* BANK ACCOUNTS TAB */}
                                <TabsContent value="bank" className="m-0 animate-in fade-in slide-in-from-bottom-2">
                                    {customer?.id ? (
                                        <BankAccountManager customerId={customer.id} />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-24 px-4 border-2 border-dashed border-border/60 rounded-2xl bg-muted/10 text-center">
                                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                                <CreditCard className="h-8 w-8 text-primary" />
                                            </div>
                                            <h4 className="font-black text-lg uppercase tracking-widest text-foreground mb-2">Save Customer First</h4>
                                            <p className="text-sm font-medium text-muted-foreground max-w-[320px]">
                                                You need to create and save this customer profile before attaching bank accounts.
                                            </p>
                                        </div>
                                    )}
                                </TabsContent>
                            </div>
                        </Tabs>

                        {/* STICKY FOOTER */}
                        <div className="p-4 md:p-6 border-t border-border/50 bg-card/95 backdrop-blur-md shrink-0 flex items-center justify-end gap-3 z-20 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-12 px-6 font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-muted">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.formState.isSubmitting} className="h-12 px-8 font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-all active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground">
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {customer ? "Save Changes" : "Create Customer"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}