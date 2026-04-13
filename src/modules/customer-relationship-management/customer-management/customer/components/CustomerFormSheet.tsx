"use client";

import React, { useEffect, useState } from "react";
import { CreditCard, Loader2, Users, Building2, MapPin, Receipt, Check, ChevronsUpDown, Plus } from "lucide-react";
import { useForm, Resolver, SubmitHandler } from "react-hook-form";
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
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CustomerWithRelations, PaymentTerm, ReferenceOption } from "../types";
import { BankAccountManager } from "./BankAccountManager";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface CreatableComboboxProps {
    items: ReferenceOption[];
    value: number | string | null;
    onChange: (value: number | string) => void;
    onCreate: (name: string) => void;
    placeholder: string;
    itemName: string;
}

// 🚀 NEW: Interface for PSGC API Data
interface LocationOption {
    code: string;
    name: string;
}

interface SearchableComboboxProps {
    items: LocationOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
    isLoading?: boolean; // 🚀 Added to show network state
}

// ============================================================================
// 🚀 CREATABLE COMBOBOX (For Store Types / Classifications)
// ============================================================================
function CreatableCombobox({ items, value, onChange, onCreate, placeholder, itemName }: CreatableComboboxProps) {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const selectedItem = items.find((i) => String(i.id) === String(value));
    const exactMatch = items.some((i) => i.name.toLowerCase() === inputValue.toLowerCase());

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <FormControl>
                    <Button variant="outline" role="combobox"
                            className={cn("w-full h-11 justify-between bg-muted/30", !value && "text-muted-foreground")}>
                        {selectedItem ? selectedItem.name : placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 shadow-xl rounded-xl border-border/50">
                <Command className="bg-transparent overflow-hidden rounded-xl">
                    <CommandInput placeholder={`Search or create ${itemName}...`} onValueChange={setInputValue}
                                  className="h-11" />
                    <CommandList className="max-h-[200px] overflow-y-auto custom-scrollbar">
                        <CommandEmpty className="p-2">
                            {inputValue && !exactMatch ? (
                                <Button variant="ghost"
                                        className="w-full justify-start text-primary text-xs font-bold uppercase tracking-widest"
                                        onClick={() => {
                                            onCreate(inputValue);
                                            setInputValue("");
                                            setOpen(false);
                                        }}>
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
                                        className={cn("mr-2 h-4 w-4 text-primary", String(value) === String(item.id) ? "opacity-100" : "opacity-0")} />
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
// 🚀 API-DRIVEN SEARCHABLE COMBOBOX
// ============================================================================
function SearchableCombobox({ items, value, onChange, placeholder, disabled, isLoading }: SearchableComboboxProps) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <FormControl>
                    <Button
                        variant="outline"
                        role="combobox"
                        disabled={disabled || isLoading}
                        className={cn("w-full h-11 justify-between bg-muted/30", !value && "text-muted-foreground", (disabled || isLoading) && "opacity-50 cursor-not-allowed")}
                    >
                        <div className="flex items-center truncate">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />}
                            {value ? value : (isLoading ? "Fetching..." : placeholder)}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 shadow-xl rounded-xl border-border/50">
                <Command className="bg-transparent overflow-hidden rounded-xl filter-none">
                    <CommandInput placeholder="Search..." className="h-11" />
                    <CommandList className="max-h-[250px] overflow-y-auto custom-scrollbar">
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {items.map((item, index) => (
                                <CommandItem
                                    key={item.code || `${item.name}-${index}`} // 🚀 Uses PSGC API code
                                    value={item.name}
                                    onSelect={() => {
                                        onChange(item.name);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn("mr-2 h-4 w-4 text-primary", value === item.name ? "opacity-100" : "opacity-0")} />
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
    brgy: z.string().min(1, "Barangay is required"),
    city: z.string().min(1, "City is required"),
    province: z.string().min(1, "Province is required"),
    type: z.enum(["Regular", "Employee"]),
    user_id: z.coerce.number().nullable(),
    tel_number: z.string(), customer_tin: z.string(),
    payment_term: z.coerce.number(),
    store_type: z.coerce.number().nullable(),
    classification: z.coerce.number().nullable(),
    price_type: z.string(),
    discount_type: z.coerce.number().nullable(),
    encoder_id: z.number(),
    isActive: z.coerce.number().default(1),
    isVAT: z.coerce.number().default(0),
    isEWT: z.coerce.number().default(0),
    bank_accounts: z.array(z.object({
        id: z.number().optional(),
        customer_id: z.number().optional(),
        bank_name: z.coerce.number(),
        account_name: z.string().min(1, "Account name is required"),
        account_number: z.string().min(1, "Account number is required"),
        account_type: z.enum(["Savings", "Checking", "Other"]),
        branch_of_account: z.string().optional().nullable(),
        is_primary: z.coerce.number().default(0),
        notes: z.string().optional().nullable(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
    })).default([]),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: CustomerWithRelations | null;
    onSubmit: (data: CustomerFormValues) => Promise<void>;
    defaultTab?: string;
}

const getDefaultValues = (): CustomerFormValues => ({
    customer_code: "", customer_name: "", store_name: "", store_signage: "", contact_number: "",
    customer_email: "", brgy: "", city: "", province: "", tel_number: "", customer_tin: "",
    payment_term: 0, store_type: null, classification: null, price_type: "", isActive: 1, isVAT: 0, isEWT: 0,
    discount_type: null, type: "Regular", user_id: null, encoder_id: 1, bank_accounts: [],
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
    const [storeTypes, setStoreTypes] = useState<ReferenceOption[]>([]);
    const [classifications, setClassifications] = useState<ReferenceOption[]>([]);
    const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
    const [bankNames, setBankNames] = useState<ReferenceOption[]>([]);

    // 🚀 PSGC API States
    const [provincesList, setProvincesList] = useState<LocationOption[]>([]);
    const [citiesList, setCitiesList] = useState<LocationOption[]>([]);
    const [barangaysList, setBarangaysList] = useState<LocationOption[]>([]);

    // 🚀 Loading States
    const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [isLoadingBarangays, setIsLoadingBarangays] = useState(false);
    const [isLoadingPaymentTerms, setIsLoadingPaymentTerms] = useState(false);
    const [isLoadingBankNames, setIsLoadingBankNames] = useState(false);

    const form = useForm<CustomerFormValues>({
        resolver: zodResolver(customerSchema) as Resolver<CustomerFormValues>,
        defaultValues: getDefaultValues(),
    });

    const selectedProvince = form.watch("province");
    const selectedCity = form.watch("city");

    // ========================================================================
    // 🚀 LIVE PSGC API INTEGRATION
    // ========================================================================

    // 1. Fetch Provinces on Mount
    useEffect(() => {
        if (!open) return;
        let isMounted = true;

        const fetchProvinces = async () => {
            setIsLoadingProvinces(true);
            try {
                const res = await fetch("https://psgc.gitlab.io/api/provinces/");
                if (!res.ok) throw new Error("Failed to fetch provinces");
                const data = await res.json();
                if (isMounted) {
                    setProvincesList(data.map((p: { code: string; name: string }) => ({ code: p.code, name: p.name })));
                }
            } catch {
                console.error("Failed to fetch provinces");
            } finally {
                if (isMounted) setIsLoadingProvinces(false);
            }
        };
        fetchProvinces();
        return () => { isMounted = false; };
    }, [open]);

    // 2. Fetch Cities when Province changes
    useEffect(() => {
        let isMounted = true;
        const fetchCities = async () => {
            if (!selectedProvince || provincesList.length === 0) {
                setCitiesList([]);
                return;
            }

            const provObj = provincesList.find(p => p.name === selectedProvince);
            if (!provObj) return;

            setIsLoadingCities(true);
            try {
                const res = await fetch(`https://psgc.gitlab.io/api/provinces/${provObj.code}/cities-municipalities/`);
                if (!res.ok) throw new Error("Failed to fetch cities");
                const data = await res.json();
                if (isMounted) {
                    setCitiesList(data.map((c: { code: string; name: string }) => ({ code: c.code, name: c.name })));
                }
            } catch {
                console.error("Failed to fetch provinces");
            } finally {
                if (isMounted) setIsLoadingCities(false);
            }
        };
        fetchCities();
        return () => { isMounted = false; };
    }, [selectedProvince, provincesList]);

    // 3. Fetch Barangays when City changes
    useEffect(() => {
        let isMounted = true;
        const fetchBarangays = async () => {
            if (!selectedCity || citiesList.length === 0) {
                setBarangaysList([]);
                return;
            }

            const cityObj = citiesList.find(c => c.name === selectedCity);
            if (!cityObj) return;

            setIsLoadingBarangays(true);
            try {
                const res = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${cityObj.code}/barangays/`);
                if (!res.ok) throw new Error("Failed to fetch barangays");
                const data = await res.json();
                if (isMounted) {
                    setBarangaysList(data.map((b: { code: string; name: string }) => ({ code: b.code, name: b.name })));
                }
            } catch {
                console.error("Failed to fetch provinces");
            } finally {
                if (isMounted) setIsLoadingBarangays(false);
            }
        };
        fetchBarangays();
        return () => { isMounted = false; };
    }, [selectedCity, citiesList]);


    // ========================================================================
    // 🚀 INTERNAL REFERENCE DATA FETCHING
    // ========================================================================
    useEffect(() => {
        if (open) setActiveTab(defaultTab);
    }, [open, defaultTab]);

    useEffect(() => {
        let isMounted = true;
        const fetchRefs = async () => {
            try {
                const [storeRes, classRes] = await Promise.all([
                    fetch("/api/crm/customer/references?type=store_type"),
                    fetch("/api/crm/customer/references?type=classification"),
                ]);

                if (!isMounted) return;

                if (storeRes.ok) {
                    const json = await storeRes.json();
                    setStoreTypes(json.data?.map((item: { id: number; store_type: string }) => ({ id: item.id, name: item.store_type })) || []);
                }

                if (classRes.ok) {
                    const json = await classRes.json();
                    setClassifications(json.data?.map((item: { id: number; classification_name: string }) => ({
                        id: item.id,
                        name: item.classification_name
                    })) || []);
                }
            } catch (err) {
                if (isMounted) console.error("Failed to fetch references", err);
            }
        };

        if (open) fetchRefs();

        return () => { isMounted = false; };
    }, [open]);

    // 4. Fetch Payment Terms from Directus
    useEffect(() => {
        if (!open) return;
        let isMounted = true;

        const fetchPaymentTerms = async () => {
            setIsLoadingPaymentTerms(true);
            try {
                const res = await fetch("/api/crm/customer/references?type=payment_term");
                if (!res.ok) throw new Error("Failed to fetch payment terms");
                const json = await res.json();
                if (isMounted) {
                    setPaymentTerms(json.data || []);
                }
            } catch (err) {
                console.error("Failed to fetch payment terms", err);
            } finally {
                if (isMounted) setIsLoadingPaymentTerms(false);
            }
        };

        fetchPaymentTerms();
        return () => { isMounted = false; };
    }, [open]);

    // 5. Fetch Bank Names
    useEffect(() => {
        if (!open) return;
        let isMounted = true;

        const fetchBankNames = async () => {
            setIsLoadingBankNames(true);
            try {
                const res = await fetch("/api/crm/customer/references?type=bank_name");
                if (!res.ok) throw new Error("Failed to fetch bank names");
                const json = await res.json();
                if (isMounted) {
                    setBankNames(json.data?.map((item: { id: number; bank_name: string }) => ({
                        id: item.id,
                        name: item.bank_name
                    })) || []);
                }
            } catch (err) {
                console.error("Failed to fetch bank names", err);
            } finally {
                if (isMounted) setIsLoadingBankNames(false);
            }
        };

        fetchBankNames();
        return () => { isMounted = false; };
    }, [open]);

    useEffect(() => {
        if (open) {
            if (customer) {
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
                    classification: customer.classification || null,
                    bank_accounts: customer.bank_accounts || [],
                });
            } else {
                form.reset(getDefaultValues());
            }
        }
    }, [customer, form, open]);

    const handleFormSubmit: SubmitHandler<CustomerFormValues> = async (values) => {
        try {
            await onSubmit(values);
            onOpenChange(false);
        } catch {
            toast.error("Failed to save customer. Please try again.");
        }
    };

    const onFormError = () => {
        toast.error("Please fill in all required fields in the highlighted tabs.");
    };

    const handleCreateStoreType = async (name: string) => {
        try {
            const res = await fetch("/api/crm/customer/references", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "store_type", name })
            });
            if (!res.ok) throw new Error("Failed to create store type");
            const json = await res.json();
            const newId = json.data.id;
            setStoreTypes(prev => [...prev, { id: newId, name }]);
            form.setValue("store_type", newId, { shouldValidate: true });
            toast.success(`Store Type "${name}" created successfully!`);
        } catch {
            toast.error("Failed to create store type.");
        }
    };

    const handleCreateClassification = async (name: string) => {
        try {
            const res = await fetch("/api/crm/customer/references", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "classification", name })
            });
            if (!res.ok) throw new Error("Failed to create classification");
            const json = await res.json();
            const newId = json.data.id;
            setClassifications(prev => [...prev, { id: newId, name }]);
            form.setValue("classification", newId, { shouldValidate: true });
            toast.success(`Classification "${name}" created successfully!`);
        } catch {
            toast.error("Failed to create classification.");
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className="w-full sm:max-w-2xl md:max-w-3xl p-0 flex flex-col bg-background shadow-2xl border-l-border/40">

                <div className="p-6 md:p-8 bg-muted/10 border-b border-border/50 shrink-0">
                    <SheetHeader className="text-left">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner hidden sm:flex">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <SheetTitle
                                    className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic">
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
                    <form onSubmit={form.handleSubmit(handleFormSubmit, onFormError)}
                          className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">

                            <div className="px-6 md:px-8 pt-4 shrink-0 bg-background z-10">
                                <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted/50 rounded-xl">
                                    <TabsTrigger value="basic"
                                                 className="py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg"><Building2
                                        className="w-3.5 h-3.5 mr-2 hidden md:block" /> Basic</TabsTrigger>
                                    <TabsTrigger value="address"
                                                 className="py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg"><MapPin
                                        className="w-3.5 h-3.5 mr-2 hidden md:block" /> Location</TabsTrigger>
                                    <TabsTrigger value="billing"
                                                 className="py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg"><Receipt
                                        className="w-3.5 h-3.5 mr-2 hidden md:block" /> Billing</TabsTrigger>
                                    <TabsTrigger value="bank"
                                                 className="py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg"><CreditCard
                                        className="w-3.5 h-3.5 mr-2 hidden md:block" /> Bank</TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">

                                <TabsContent value="basic"
                                             className="space-y-6 m-0 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="customer_code" render={({ field }) => (
                                            <FormItem><FormLabel
                                                className="font-bold uppercase text-xs text-muted-foreground">Customer
                                                Code</FormLabel><FormControl><Input className="h-11 bg-muted/30"
                                                                                    placeholder="CUST-001" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="customer_name" render={({ field }) => (
                                            <FormItem><FormLabel
                                                className="font-bold uppercase text-xs text-muted-foreground">Customer
                                                Name</FormLabel><FormControl><Input className="h-11 bg-muted/30"
                                                                                    placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />

                                        <FormField control={form.control} name="store_type" render={({ field }) => (
                                            <FormItem className="flex flex-col pt-1.5"><FormLabel
                                                className="font-bold uppercase text-xs text-muted-foreground">Store
                                                Type</FormLabel><CreatableCombobox items={storeTypes}
                                                                                   value={field.value}
                                                                                   onChange={field.onChange}
                                                                                   onCreate={handleCreateStoreType}
                                                                                   placeholder="Select or create..."
                                                                                   itemName="Store Type" /><FormMessage /></FormItem>
                                        )} />

                                        <FormField control={form.control} name="classification" render={({ field }) => (
                                            <FormItem className="flex flex-col pt-1.5"><FormLabel
                                                className="font-bold uppercase text-xs text-muted-foreground">Classification</FormLabel><CreatableCombobox
                                                items={classifications} value={field.value} onChange={field.onChange}
                                                onCreate={handleCreateClassification} placeholder="Select or create..."
                                                itemName="Classification" /><FormMessage /></FormItem>
                                        )} />

                                        <FormField control={form.control} name="store_name" render={({ field }) => (
                                            <FormItem><FormLabel
                                                className="font-bold uppercase text-xs text-muted-foreground">Store
                                                Name</FormLabel><FormControl><Input className="h-11 bg-muted/30"
                                                                                    placeholder="Main Branch" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="store_signage" render={({ field }) => (
                                            <FormItem><FormLabel
                                                className="font-bold uppercase text-xs text-muted-foreground">Store
                                                Signage</FormLabel><FormControl><Input className="h-11 bg-muted/30"
                                                                                       placeholder="Doe's General Store" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="address"
                                             className="space-y-6 m-0 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="province" render={({ field }) => (
                                            <FormItem className="flex flex-col md:col-span-2">
                                                <FormLabel
                                                    className="font-bold uppercase text-xs text-muted-foreground">Province</FormLabel>
                                                <SearchableCombobox
                                                    items={provincesList}
                                                    value={field.value}
                                                    isLoading={isLoadingProvinces}
                                                    onChange={(val: string) => {
                                                        field.onChange(val);
                                                        form.setValue("city", "", { shouldValidate: true });
                                                        form.setValue("brgy", "", { shouldValidate: true });
                                                    }}
                                                    placeholder="Search province..."
                                                    disabled={isLoadingProvinces}
                                                />
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="city" render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel
                                                    className="font-bold uppercase text-xs text-muted-foreground">City /
                                                    Municipality</FormLabel>
                                                <SearchableCombobox
                                                    items={citiesList}
                                                    value={field.value}
                                                    isLoading={isLoadingCities}
                                                    onChange={(val: string) => {
                                                        field.onChange(val);
                                                        form.setValue("brgy", "", { shouldValidate: true });
                                                    }}
                                                    placeholder={selectedProvince ? "Search city..." : "Select province first"}
                                                    disabled={!selectedProvince || isLoadingCities}
                                                />
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="brgy" render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel
                                                    className="font-bold uppercase text-xs text-muted-foreground">Barangay</FormLabel>
                                                <SearchableCombobox
                                                    items={barangaysList}
                                                    value={field.value}
                                                    isLoading={isLoadingBarangays}
                                                    onChange={field.onChange}
                                                    placeholder={selectedCity ? "Search barangay..." : "Select city first"}
                                                    disabled={!selectedCity || isLoadingBarangays}
                                                />
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="contact_number" render={({ field }) => (
                                            <FormItem><FormLabel
                                                className="font-bold uppercase text-xs text-muted-foreground">Mobile
                                                Number</FormLabel><FormControl><Input className="h-11 bg-muted/30"
                                                                                      placeholder="09123456789" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="tel_number" render={({ field }) => (
                                            <FormItem><FormLabel
                                                className="font-bold uppercase text-xs text-muted-foreground">Telephone
                                                Number</FormLabel><FormControl><Input
                                                className="h-11 bg-muted/30" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="customer_email" render={({ field }) => (
                                            <FormItem className="md:col-span-2"><FormLabel
                                                className="font-bold uppercase text-xs text-muted-foreground">Email
                                                Address</FormLabel><FormControl><Input className="h-11 bg-muted/30"
                                                                                       type="email"
                                                                                       placeholder="customer@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="billing"
                                             className="space-y-6 m-0 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="payment_term" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-bold uppercase text-xs text-muted-foreground">
                                                    Payment Term
                                                </FormLabel>
                                                <Select
                                                    disabled={isLoadingPaymentTerms}
                                                    onValueChange={(val) => field.onChange(Number(val))}
                                                    value={field.value ? String(field.value) : ""}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="h-11 bg-muted/30">
                                                            <SelectValue placeholder={isLoadingPaymentTerms ? "Loading terms..." : "Select payment term"} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {paymentTerms.map((term) => (
                                                            <SelectItem key={term.id} value={String(term.id)}>
                                                                {term.payment_name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="price_type" render={({ field }) => (
                                            <FormItem><FormLabel
                                                className="font-bold uppercase text-xs text-muted-foreground">Price
                                                Type</FormLabel><FormControl><Input className="h-11 bg-muted/30"
                                                                                    placeholder="Retail/Wholesale" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>

                                    <div
                                        className="bg-muted/20 p-5 rounded-2xl border border-border/50 flex flex-col sm:flex-row gap-8 mt-6">
                                        <FormField control={form.control} name="isActive" render={({ field }) => (
                                            <FormItem
                                                className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox
                                                checked={field.value === 1}
                                                onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                                                className="w-5 h-5 rounded-md" /></FormControl><FormLabel
                                                className="font-bold uppercase text-xs cursor-pointer">Active
                                                Account</FormLabel></FormItem>
                                        )} />
                                        <FormField control={form.control} name="isVAT" render={({ field }) => (
                                            <FormItem
                                                className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox
                                                checked={field.value === 1}
                                                onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                                                className="w-5 h-5 rounded-md" /></FormControl><FormLabel
                                                className="font-bold uppercase text-xs cursor-pointer">VAT
                                                Registered</FormLabel></FormItem>
                                        )} />
                                        <FormField control={form.control} name="isEWT" render={({ field }) => (
                                            <FormItem
                                                className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox
                                                checked={field.value === 1}
                                                onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                                                className="w-5 h-5 rounded-md" /></FormControl><FormLabel
                                                className="font-bold uppercase text-xs cursor-pointer">Subject to
                                                EWT</FormLabel></FormItem>
                                        )} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="bank" className="m-0 animate-in fade-in slide-in-from-bottom-2">
                                    <BankAccountManager 
                                        accounts={form.watch("bank_accounts") || []} 
                                        banks={bankNames}
                                        onAccountsChange={(accounts) => form.setValue("bank_accounts", accounts, { shouldDirty: true })}
                                        isLoading={isLoadingBankNames}
                                    />
                                </TabsContent>
                            </div>
                        </Tabs>

                        <div
                            className="p-4 md:p-6 border-t border-border/50 bg-card/95 backdrop-blur-md shrink-0 flex items-center justify-end gap-3 z-20 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
                                    className="h-12 px-6 font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-muted">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}
                                    className="h-12 px-8 font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-all active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground">
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