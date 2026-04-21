"use client";

import React, { useEffect, useRef, useState } from "react";
import { CreditCard, Loader2, Users, Building2, MapPin, Receipt, Check, ChevronsUpDown, Plus, AlertCircle, ArrowRight, UploadCloud } from "lucide-react";
import { useForm, Resolver, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Textarea } from "@/components/ui/textarea";

import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle
} from "@/components/ui/sheet";
import {
    Alert, AlertDescription, AlertTitle
} from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
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
    isLoading?: boolean;
}

// ============================================================================
// 🚀 IMAGE PREVIEW HELPER
// ============================================================================
const renderImagePreview = (imageId: string | null | undefined) => {
    if (!imageId || imageId.trim() === "") return null;

    const isUrl = imageId.startsWith('http');
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8055";
    const imageUrl = isUrl ? imageId : `${baseUrl}/assets/${imageId}`;

    return (
        <div className="mt-4 relative w-full sm:w-[250px] aspect-video rounded-xl overflow-hidden border border-border shadow-sm group bg-muted/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={imageUrl}
                alt="Customer/Store Preview"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://placehold.co/400x300/e2e8f0/64748b?text=Image+Not+Found";
                }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6">
                <p className="text-[9px] font-black uppercase tracking-widest text-white truncate">
                    Store Image
                </p>
            </div>
        </div>
    );
};

// ============================================================================
// CREATABLE COMBOBOX
// ============================================================================
function CreatableCombobox({items, value, onChange, onCreate, placeholder, itemName}: CreatableComboboxProps) {
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
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                    </Button>
                </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 shadow-xl rounded-xl border-border/50">
                <Command className="bg-transparent overflow-hidden rounded-xl">
                    <CommandInput placeholder={`Search or create ${itemName}...`} onValueChange={setInputValue}
                                  className="h-11"/>
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
                                    <Plus className="mr-2 h-4 w-4"/> Create &quot;{inputValue}&quot;
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
                                        className={cn("mr-2 h-4 w-4 text-primary", String(value) === String(item.id) ? "opacity-100" : "opacity-0")}/>
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
// API-DRIVEN SEARCHABLE COMBOBOX
// ============================================================================
function SearchableCombobox({items, value, onChange, placeholder, disabled, isLoading}: SearchableComboboxProps) {
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
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground"/>}
                            {value ? value : (isLoading ? "Fetching..." : placeholder)}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                    </Button>
                </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 shadow-xl rounded-xl border-border/50">
                <Command className="bg-transparent overflow-hidden rounded-xl filter-none">
                    <CommandInput placeholder="Search..." className="h-11"/>
                    <CommandList className="max-h-[250px] overflow-y-auto custom-scrollbar">
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
                                        className={cn("mr-2 h-4 w-4 text-primary", value === item.name ? "opacity-100" : "opacity-0")}/>
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
    customer_code: z.string().optional().or(z.literal("")),
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
    tel_number: z.string(),
    customer_tin: z.string(),
    payment_term: z.coerce.number(),
    store_type: z.coerce.number().nullable(),
    classification: z.coerce.number().nullable(),
    price_type: z.string(),
    discount_type: z.coerce.number().nullable(),
    encoder_id: z.number(),
    isActive: z.coerce.number().default(1),
    isVAT: z.coerce.number().default(0),
    isEWT: z.coerce.number().default(0),
    customer_image: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    otherDetails: z.string().optional().nullable(),
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

export type CustomerFormValues = z.infer<typeof customerSchema>;

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
    customer_image: "", location: "", otherDetails: "",
});

// ============================================================================
// 🚀 MAP HELPER COMPONENT
// ============================================================================
const renderMap = (locationString: string | null | undefined) => {
    if (!locationString) {
        return (
            <div
                className="w-full h-[250px] bg-muted/30 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground">
                <MapPin className="h-8 w-8 mb-2 opacity-20"/>
                <span className="text-xs font-bold uppercase tracking-widest">No Geo-Tag Available</span>
            </div>
        );
    }

    const [lat, lon] = locationString.split(",").map(s => s.trim());

    return (
        <div className="w-full rounded-xl border border-border shadow-inner overflow-hidden relative group mt-4">
            <iframe
                width="100%"
                height="250"
                style={{border: 0}}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${lat},${lon}&z=16&output=embed`}
            ></iframe>
            <div
                className="absolute top-3 right-3 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-border shadow-sm flex items-center gap-1.5 pointer-events-none">
                <span className="relative flex h-2 w-2">
                  <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-foreground">Live Location</span>
            </div>
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function CustomerFormSheet({ open, onOpenChange, customer, onSubmit, defaultTab = "basic" }: CustomerFormSheetProps) {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [storeTypes, setStoreTypes] = useState<ReferenceOption[]>([]);
    const [classifications, setClassifications] = useState<ReferenceOption[]>([]);
    const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
    const [bankNames, setBankNames] = useState<ReferenceOption[]>([]);

    const [provincesList, setProvincesList] = useState<LocationOption[]>([]);
    const [citiesList, setCitiesList] = useState<LocationOption[]>([]);
    const [barangaysList, setBarangaysList] = useState<LocationOption[]>([]);

    const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [isLoadingBarangays, setIsLoadingBarangays] = useState(false);
    const [isLoadingPaymentTerms, setIsLoadingPaymentTerms] = useState(false);
    const [isLoadingBankNames, setIsLoadingBankNames] = useState(false);

    // 🚀 STATES FOR NEW FEATURES
    const [isUploading, setIsUploading] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<CustomerFormValues>({
        resolver: zodResolver(customerSchema) as Resolver<CustomerFormValues>,
        defaultValues: getDefaultValues(),
    });

    const selectedProvince = form.watch("province");
    const selectedCity = form.watch("city");

    // ========================================================================
    // 🚀 NEW FEATURE: AUTOMATIC IMAGE UPLOAD
    // ========================================================================
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            // Calls a Next.js endpoint that forwards the file to Directus
            const res = await fetch("/api/crm/upload", {
                method: "POST",
                body: formData
            });

            if (!res.ok) throw new Error("Upload failed");
            const data = await res.json();

            // Instantly fill the input with the returned Directus UUID
            form.setValue("customer_image", data.id || data.data?.id, { shouldValidate: true });
            toast.success("Image uploaded successfully!");
        } catch {
            toast.error("Failed to upload image. Please ensure the /api/crm/upload endpoint exists.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
        }
    };

    // ========================================================================
    // 🚀 NEW FEATURE: REVERSE GEOCODING (Coordinates -> Address)
    // ========================================================================
    const handleAutoFillAddress = async () => {
        const loc = form.getValues("location");
        if (!loc) {
            toast.error("Please enter coordinates first (Lat, Lon)");
            return;
        }

        const coords = loc.split(",");
        if (coords.length !== 2) {
            toast.error("Invalid format. Please use 'Lat, Lon'");
            return;
        }

        setIsGeocoding(true);
        try {
            const lat = coords[0].trim();
            const lon = coords[1].trim();

            // Ping the free OpenStreetMap Reverse Geocoding API
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();

            if (data && data.address) {
                const address = data.address;
                // Attempt to map OSM location names to our form fields
                const province = address.province || address.state || address.region || "";
                const city = address.city || address.town || address.municipality || "";
                const brgy = address.suburb || address.village || address.neighbourhood || address.quarter || "";

                if (province) form.setValue("province", province, { shouldValidate: true });
                if (city) form.setValue("city", city, { shouldValidate: true });
                if (brgy) form.setValue("brgy", brgy, { shouldValidate: true });

                toast.success("Address auto-filled from map data!");
            } else {
                toast.error("Could not resolve address from these coordinates.");
            }
        } catch {
            toast.error("Failed to fetch address data from maps.");
        } finally {
            setIsGeocoding(false);
        }
    };

    // [Rest of your existing useEffects for PSGC & References...]
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
                    setProvincesList(data.map((p: { code: string; name: string }) => ({code: p.code, name: p.name})));
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
                    setCitiesList(data.map((c: { code: string; name: string }) => ({code: c.code, name: c.name})));
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
                    setBarangaysList(data.map((b: { code: string; name: string }) => ({code: b.code, name: b.name})));
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
                    setStoreTypes(json.data?.map((item: { id: number; store_type: string }) => ({
                        id: item.id,
                        name: item.store_type
                    })) || []);
                }

                if (classRes.ok) {
                    const json = await classRes.json();
                    setClassifications(json.data?.map((item: { id: number; classification_name: string }) => ({
                        id: item.id,
                        name: item.classification_name
                    })) || []);
                }
            } catch {
                if (isMounted) console.error("Failed to fetch references");
            }
        };

        if (open) fetchRefs();

        return () => { isMounted = false; };
    }, [open]);

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
            } catch {
                console.error("Failed to fetch payment terms");
            } finally {
                if (isMounted) setIsLoadingPaymentTerms(false);
            }
        };

        fetchPaymentTerms();
        return () => { isMounted = false; };
    }, [open]);

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
            } catch {
                console.error("Failed to fetch bank names");
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
                    customer_image: customer.customer_image || "",
                    location: customer.location ? String(customer.location) : "",
                    otherDetails: customer.otherDetails || "",
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

    // Helper to count errors per tab
    const getTabErrorCount = (tab: string) => {
        const errorKeys = Object.keys(form.formState.errors);
        if (errorKeys.length === 0) return 0;

        switch (tab) {
            case "basic":
                return errorKeys.filter(k =>
                    ["customer_code", "customer_name", "store_type", "classification", "store_name", "store_signage"].includes(k)
                ).length;
            case "address":
                return errorKeys.filter(k =>
                    ["province", "city", "brgy", "contact_number", "tel_number", "customer_email"].includes(k)
                ).length;
            case "billing":
                return errorKeys.filter(k =>
                    ["payment_term", "price_type", "isActive", "isVAT", "isEWT"].includes(k)
                ).length;
            case "bank":
                return form.formState.errors.bank_accounts ? 1 : 0;
            default:
                return 0;
        }
    };

    const TabBadge = ({ count }: { count: number }) => {
        if (count === 0) return null;
        return (
            <Badge variant="destructive" className="ml-2 h-4 w-4 p-0 flex items-center justify-center text-[10px] animate-in zoom-in">
                {count}
            </Badge>
        );
    };

    const navigateToFirstError = () => {
        if (getTabErrorCount("basic") > 0) setActiveTab("basic");
        else if (getTabErrorCount("address") > 0) setActiveTab("address");
        else if (getTabErrorCount("billing") > 0) setActiveTab("billing");
    };

    const hasExternalErrors = getTabErrorCount("basic") > 0 || getTabErrorCount("address") > 0 || getTabErrorCount("billing") > 0;

    const onFormError = () => {
        toast.error("Please fill in all required fields in the highlighted tabs.");
    };

    // [handleCreateStoreType & handleCreateClassification omitted for brevity, they remain unchanged]
    const handleCreateStoreType = async (name: string) => {
        try {
            const res = await fetch("/api/crm/customer/references", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({type: "store_type", name})
            });
            if (!res.ok) throw new Error("Failed to create store type");
            const json = await res.json();
            const newId = json.data.id;
            setStoreTypes(prev => [...prev, {id: newId, name}]);
            form.setValue("store_type", newId, {shouldValidate: true});
            toast.success(`Store Type "${name}" created successfully!`);
        } catch {
            toast.error("Failed to create store type.");
        }
    };

    const handleCreateClassification = async (name: string) => {
        try {
            const res = await fetch("/api/crm/customer/references", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({type: "classification", name})
            });
            if (!res.ok) throw new Error("Failed to create classification");
            const json = await res.json();
            const newId = json.data.id;
            setClassifications(prev => [...prev, {id: newId, name}]);
            form.setValue("classification", newId, {shouldValidate: true});
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
                                <Users className="h-6 w-6"/>
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

                            <div className="px-6 md:px-8 pt-4 shrink-0 bg-background z-10 space-y-4">
                                {defaultTab === "bank" && hasExternalErrors && (
                                    <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 animate-in slide-in-from-top-2 duration-300">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle className="text-sm font-black uppercase tracking-tight">Profile Incomplete</AlertTitle>
                                        <AlertDescription className="flex items-center justify-between gap-4 mt-1">
                                            <span className="text-xs font-bold leading-relaxed">
                                                This customer has missing required information in other sections. Please complete them to save changes.
                                            </span>
                                            <Button 
                                                type="button" 
                                                variant="destructive" 
                                                size="sm" 
                                                onClick={navigateToFirstError}
                                                className="h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-lg shrink-0"
                                            >
                                                Fix Issues <ArrowRight className="ml-1.5 h-3 w-3" />
                                            </Button>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted/50 rounded-xl">
                                    <TabsTrigger value="basic"
                                                 disabled={defaultTab === "bank" && getTabErrorCount("basic") === 0}
                                                 className="py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center">
                                        <Building2 className="w-3.5 h-3.5 mr-2 hidden md:block" />
                                        Basic
                                        <TabBadge count={getTabErrorCount("basic")} />
                                    </TabsTrigger>
                                    <TabsTrigger value="address"
                                                 disabled={defaultTab === "bank" && getTabErrorCount("address") === 0}
                                                 className="py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center">
                                        <MapPin className="w-3.5 h-3.5 mr-2 hidden md:block" />
                                        Location
                                        <TabBadge count={getTabErrorCount("address")} />
                                    </TabsTrigger>
                                    <TabsTrigger value="billing"
                                                 disabled={defaultTab === "bank" && getTabErrorCount("billing") === 0}
                                                 className="py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center">
                                        <Receipt className="w-3.5 h-3.5 mr-2 hidden md:block" />
                                        Billing
                                        <TabBadge count={getTabErrorCount("billing")} />
                                    </TabsTrigger>
                                    <TabsTrigger value="bank"
                                                 className="py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center">
                                        <CreditCard className="w-3.5 h-3.5 mr-2 hidden md:block" />
                                        Bank
                                        <TabBadge count={getTabErrorCount("bank")} />
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">

                                <TabsContent value="basic"
                                             className="space-y-6 m-0 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="customer_code" render={({field}) => (
                                            <FormItem>
                                                <FormLabel
                                                    className="font-bold uppercase text-xs text-muted-foreground">
                                                    Customer Code
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-11 bg-muted/30 cursor-not-allowed font-mono text-muted-foreground"
                                                        placeholder="AUTO-GENERATED"
                                                        disabled
                                                        {...field}
                                                        value={field.value || "AUTO-GENERATED"}
                                                    />
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="customer_name"
                                                   render={({field}) => (
                                                       <FormItem><FormLabel
                                                           className="font-bold uppercase text-xs text-muted-foreground">Customer
                                                           Name</FormLabel><FormControl><Input
                                                           className="h-11 bg-muted/30"
                                                           placeholder="John Doe" {...field} /></FormControl><FormMessage/></FormItem>
                                                   )}/>

                                        <FormField control={form.control} name="store_type" render={({field}) => (
                                            <FormItem className="flex flex-col pt-1.5"><FormLabel
                                                className="font-bold uppercase text-xs text-muted-foreground">Store
                                                Type</FormLabel><CreatableCombobox items={storeTypes}
                                                                                   value={field.value}
                                                                                   onChange={field.onChange}
                                                                                   onCreate={handleCreateStoreType}
                                                                                   placeholder="Select or create..."
                                                                                   itemName="Store Type"/><FormMessage/></FormItem>
                                        )}/>

                                        <FormField control={form.control} name="classification" render={({field}) => (
                                            <FormItem className="flex flex-col pt-1.5"><FormLabel
                                                className="font-bold uppercase text-xs text-muted-foreground">Classification</FormLabel><CreatableCombobox
                                                items={classifications} value={field.value} onChange={field.onChange}
                                                onCreate={handleCreateClassification} placeholder="Select or create..."
                                                itemName="Classification"/><FormMessage/></FormItem>
                                        )}/>

                                        <FormField control={form.control} name="store_name" render={({field}) => (
                                            <FormItem><FormLabel
                                                className="font-bold uppercase text-xs text-muted-foreground">Store
                                                Name</FormLabel><FormControl><Input className="h-11 bg-muted/30"
                                                                                    placeholder="Main Branch" {...field} /></FormControl><FormMessage/></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="store_signage" render={({field}) => (
                                            <FormItem><FormLabel
                                                className="font-bold uppercase text-xs text-muted-foreground">Store
                                                Signage</FormLabel><FormControl><Input className="h-11 bg-muted/30"
                                                                                       placeholder="Doe's General Store" {...field} /></FormControl><FormMessage/></FormItem>
                                        )}/>

                                        {/* 🚀 FIXED: Interactive Image Upload & Preview */}
                                        <FormField control={form.control} name="customer_image" render={({field}) => (
                                            <FormItem className="md:col-span-2">
                                                <FormLabel className="font-bold uppercase text-xs text-muted-foreground">
                                                    Store / Customer Image (UUID or URL)
                                                </FormLabel>
                                                <div className="flex gap-2 items-center">
                                                    <FormControl>
                                                        <Input
                                                            className="h-11 bg-muted/30 font-mono text-xs flex-1"
                                                            placeholder="Paste Directus UUID or URL..."
                                                            {...field}
                                                            value={field.value || ""}
                                                        />
                                                    </FormControl>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="h-11 px-4 border-dashed border-primary text-primary hover:bg-primary/10 transition-colors"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={isUploading}
                                                    >
                                                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                                                        {isUploading ? "Uploading..." : "Upload File"}
                                                    </Button>
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={handleImageUpload}
                                                    />
                                                </div>
                                                <FormMessage/>
                                                {renderImagePreview(field.value)}
                                            </FormItem>
                                        )}/>

                                        <FormField control={form.control} name="otherDetails" render={({field}) => (
                                            <FormItem className="md:col-span-2">
                                                <FormLabel
                                                    className="font-bold uppercase text-xs text-muted-foreground">Remarks</FormLabel>
                                                <FormControl><Textarea className="bg-muted/30 min-h-[100px] resize-none"
                                                                       placeholder="Additional customer remarks..." {...field}
                                                                       value={field.value || ""}/></FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}/>
                                    </div>
                                </TabsContent>

                                <TabsContent value="address"
                                             className="space-y-6 m-0 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="province" render={({field}) => (
                                            <FormItem className="flex flex-col md:col-span-2">
                                                <FormLabel
                                                    className="font-bold uppercase text-xs text-muted-foreground">Province</FormLabel>
                                                <SearchableCombobox
                                                    items={provincesList}
                                                    value={field.value}
                                                    isLoading={isLoadingProvinces}
                                                    onChange={(val: string) => {
                                                        field.onChange(val);
                                                        form.setValue("city", "", {shouldValidate: true});
                                                        form.setValue("brgy", "", {shouldValidate: true});
                                                    }}
                                                    placeholder="Search province..."
                                                    disabled={isLoadingProvinces}
                                                />
                                                <FormMessage/>
                                            </FormItem>
                                        )}/>

                                        <FormField control={form.control} name="city" render={({field}) => (
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
                                                        form.setValue("brgy", "", {shouldValidate: true});
                                                    }}
                                                    placeholder={selectedProvince ? "Search city..." : "Select province first"}
                                                    disabled={!selectedProvince || isLoadingCities}
                                                />
                                                <FormMessage/>
                                            </FormItem>
                                        )}/>

                                        <FormField control={form.control} name="brgy" render={({field}) => (
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
                                                <FormMessage/>
                                            </FormItem>
                                        )}/>

                                        {/* 🚀 FIXED: Auto-Fill Address Button Added */}
                                        <FormField control={form.control} name="location" render={({field}) => (
                                            <FormItem className="md:col-span-2">
                                                <FormLabel className="font-bold uppercase text-xs text-muted-foreground">
                                                    Geo Tag (Coordinates)
                                                </FormLabel>
                                                <div className="flex gap-2">
                                                    <FormControl>
                                                        <Input
                                                            className="h-11 bg-muted/30 font-mono flex-1"
                                                            placeholder="e.g., 16.0433, 120.3333"
                                                            {...field}
                                                            value={field.value || ""}
                                                        />
                                                    </FormControl>
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        className="h-11 shadow-sm font-bold tracking-wide"
                                                        onClick={handleAutoFillAddress}
                                                        disabled={isGeocoding || !field.value}
                                                    >
                                                        {isGeocoding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2 text-amber-500" />}
                                                        Auto-Fill Address
                                                    </Button>
                                                </div>
                                                <FormMessage/>

                                                <div className="mt-4">
                                                    {renderMap(field.value)}
                                                </div>
                                            </FormItem>
                                        )}/>

                                        <FormField control={form.control} name="contact_number" render={({field}) => (
                                            <FormItem><FormLabel
                                                className="font-bold uppercase text-xs text-muted-foreground">Mobile
                                                Number</FormLabel><FormControl><Input className="h-11 bg-muted/30"
                                                                                      placeholder="09123456789" {...field} /></FormControl><FormMessage/></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="tel_number" render={({field}) => (
                                            <FormItem><FormLabel
                                                className="font-bold uppercase text-xs text-muted-foreground">Telephone
                                                Number</FormLabel><FormControl><Input
                                                className="h-11 bg-muted/30" {...field} /></FormControl><FormMessage/></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="customer_email" render={({field}) => (
                                            <FormItem className="md:col-span-2"><FormLabel
                                                className="font-bold uppercase text-xs text-muted-foreground">Email
                                                Address</FormLabel><FormControl><Input className="h-11 bg-muted/30"
                                                                                       type="email"
                                                                                       placeholder="customer@example.com" {...field} /></FormControl><FormMessage/></FormItem>
                                        )}/>
                                    </div>
                                </TabsContent>

                                <TabsContent value="billing"
                                             className="space-y-6 m-0 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="payment_term" render={({field}) => (
                                            <FormItem>
                                                <FormLabel
                                                    className="font-bold uppercase text-xs text-muted-foreground">
                                                    Payment Term
                                                </FormLabel>
                                                <Select
                                                    disabled={isLoadingPaymentTerms}
                                                    onValueChange={(val) => field.onChange(Number(val))}
                                                    value={field.value ? String(field.value) : ""}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="h-11 bg-muted/30">
                                                            <SelectValue
                                                                placeholder={isLoadingPaymentTerms ? "Loading terms..." : "Select payment term"}/>
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
                                                <FormMessage/>
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="price_type" render={({field}) => (
                                            <FormItem><FormLabel
                                                className="font-bold uppercase text-xs text-muted-foreground">Price
                                                Type</FormLabel><FormControl><Input className="h-11 bg-muted/30"
                                                                                    placeholder="Retail/Wholesale" {...field} /></FormControl><FormMessage/></FormItem>
                                        )}/>
                                    </div>

                                    <div
                                        className="bg-muted/20 p-5 rounded-2xl border border-border/50 flex flex-col sm:flex-row gap-8 mt-6">
                                        <FormField control={form.control} name="isActive" render={({field}) => (
                                            <FormItem
                                                className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox
                                                checked={field.value === 1}
                                                onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                                                className="w-5 h-5 rounded-md"/></FormControl><FormLabel
                                                className="font-bold uppercase text-xs cursor-pointer">Active
                                                Account</FormLabel></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="isVAT" render={({field}) => (
                                            <FormItem
                                                className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox
                                                checked={field.value === 1}
                                                onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                                                className="w-5 h-5 rounded-md"/></FormControl><FormLabel
                                                className="font-bold uppercase text-xs cursor-pointer">VAT
                                                Registered</FormLabel></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="isEWT" render={({field}) => (
                                            <FormItem
                                                className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox
                                                checked={field.value === 1}
                                                onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                                                className="w-5 h-5 rounded-md"/></FormControl><FormLabel
                                                className="font-bold uppercase text-xs cursor-pointer">Subject to
                                                EWT</FormLabel></FormItem>
                                        )}/>
                                    </div>
                                </TabsContent>

                                <TabsContent value="bank" className="m-0 animate-in fade-in slide-in-from-bottom-2">
                                    <BankAccountManager
                                        accounts={form.watch("bank_accounts") || []}
                                        banks={bankNames}
                                        onAccountsChange={(accounts) => form.setValue("bank_accounts", accounts, {shouldDirty: true})}
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
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                {customer ? "Save Changes" : "Create Customer"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}