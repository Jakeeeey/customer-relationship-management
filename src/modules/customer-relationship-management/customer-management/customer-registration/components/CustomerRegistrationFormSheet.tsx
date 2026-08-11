"use client";

import React, { useEffect, useState, useRef } from "react";
import { Loader2, Users, Building2, MapPin, Check, ChevronsUpDown, ArrowRight, RefreshCcw, Upload } from "lucide-react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Sheet, SheetContent, SheetDescription, SheetTitle
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
import {
    Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CustomerRegistration, CustomerRegistrationFormValues, customerRegistrationSchema } from "../types";
import { CustomerGeotagMap } from "./CustomerGeotagMap";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
    allowCustomValue?: boolean;
}

function SearchableCombobox({ items, value, onChange, placeholder, disabled, isLoading, allowCustomValue }: SearchableComboboxProps) {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    
    const showCustomOption = allowCustomValue && inputValue && !items.some(item => item.name.toLowerCase() === inputValue.toLowerCase());

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <FormControl>
                    <Button
                        variant="outline"
                        role="combobox"
                        disabled={disabled || isLoading}
                        className={cn("w-full h-16 justify-between bg-muted/20 border-border/40 rounded-3xl focus:ring-blue-500/20 text-sm font-bold shadow-sm px-6 hover:bg-muted/30 transition-all", !value && "text-muted-foreground", (disabled || isLoading) && "opacity-50 cursor-not-allowed")}
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
                    <CommandInput placeholder="Search..." className="h-11" value={inputValue} onValueChange={setInputValue} />
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
                                        setInputValue("");
                                    }}
                                >
                                    <Check
                                        className={cn("mr-2 h-4 w-4 text-primary shrink-0", value === item.name ? "opacity-100" : "opacity-0")} />
                                    {item.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        {showCustomOption && (
                            <CommandGroup heading="Custom">
                                <CommandItem
                                    value={inputValue}
                                    onSelect={() => {
                                        onChange(inputValue);
                                        setOpen(false);
                                        setInputValue("");
                                    }}
                                >
                                    <Check className="mr-2 h-4 w-4 text-primary shrink-0 opacity-0" />
                                    Use "{inputValue}"
                                </CommandItem>
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

interface CustomerRegistrationFormSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: CustomerRegistration | null;
    onSubmit: (data: CustomerRegistrationFormValues) => Promise<void>;
}

export function CustomerRegistrationFormSheet({ open, onOpenChange, customer, onSubmit }: CustomerRegistrationFormSheetProps) {
    const [provincesList, setProvincesList] = useState<LocationOption[]>([]);
    const [citiesList, setCitiesList] = useState<LocationOption[]>([]);
    const [barangaysList, setBarangaysList] = useState<LocationOption[]>([]);

    // Use refs to avoid closure issues in reverseGeocode retries
    const provincesRef = useRef<LocationOption[]>([]);
    const citiesRef = useRef<LocationOption[]>([]);
    const barangaysRef = useRef<LocationOption[]>([]);

    const [storeTypes, setStoreTypes] = useState<{ id: number; store_type: string }[]>([]);
    const [classifications, setClassifications] = useState<{ id: number; classification_name: string }[]>([]);

    useEffect(() => { provincesRef.current = provincesList; }, [provincesList]);
    useEffect(() => { citiesRef.current = citiesList; }, [citiesList]);
    useEffect(() => { barangaysRef.current = barangaysList; }, [barangaysList]);

    const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [isLoadingBarangays, setIsLoadingBarangays] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<CustomerRegistrationFormValues>({
        resolver: zodResolver(customerRegistrationSchema) as Resolver<CustomerRegistrationFormValues>,
        defaultValues: {
            customer_name: "", store_name: "", store_signage: "", contact_number: "",
            customer_email: "", brgy: "", city: "", province: "", tel_number: "", customer_tin: "",
            location: "", type: "Regular", isActive: 1, isVAT: 0, isEWT: 0, image: "",
        },
    });

    const selectedProvince = form.watch("province");
    const selectedCity = form.watch("city");
    const currentLocation = form.watch("location");

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

    // Fetch Store Types and Classifications
    useEffect(() => {
        if (!open) return;
        const fetchOptions = async () => {
            try {
                const [stRes, clRes] = await Promise.all([
                    fetch("/api/crm/customer-management/store-type"),
                    fetch("/api/crm/customer-management/classification")
                ]);
                if (stRes.ok) {
                    const json = await stRes.json();
                    if (json.ok) setStoreTypes(json.data);
                }
                if (clRes.ok) {
                    const json = await clRes.json();
                    if (json.ok) setClassifications(json.data);
                }
            } catch (err) {
                console.error("Error fetching options:", err);
            }
        };
        fetchOptions();
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

    useEffect(() => {
        if (open && customer) {
            form.reset({
                ...customer,
                store_signage: customer.store_signage || "",
                tel_number: customer.tel_number || "",
                customer_tin: customer.customer_tin || "",
                customer_email: customer.customer_email || "",
                location: customer.location || "",
                store_type: customer.store_type || undefined,
            });
        } else if (open && !customer) {
            form.reset({
                customer_name: "", store_name: "", store_signage: "", contact_number: "",
                customer_email: "", brgy: "", city: "", province: "", tel_number: "", customer_tin: "",
                location: "", type: "Regular", isActive: 1, isVAT: 0, isEWT: 0, image: "",
            });
        }
    }, [open, customer, form]);

    const reverseGeocode = async (loc: string) => {
        if (!loc) return;
        const coords = loc.split(",");
        if (coords.length !== 2) return;

        setIsGeocoding(true);
        toast.info("Identifying location...", { icon: "📍" });

        try {
            const lat = coords[0].trim();
            const lon = coords[1].trim();

            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();

            if (data && data.address) {
                const { province, city, town, municipality, suburb, village, neighbourhood, quarter, state } = data.address;
                const provinceName = province || state || "";
                const cityName = city || town || municipality || "";
                const brgyName = suburb || village || neighbourhood || quarter || "";

                const findMatch = (list: LocationOption[], val: string) => {
                    if (!val) return null;
                    const clean = (s: string) => s.toLowerCase()
                        .replace(/city of|province of|municipality of/g, "")
                        .replace(/\s+/g, " ")
                        .trim();
                    
                    const target = clean(val);
                    return list.find(item => {
                        const itemName = clean(item.name);
                        return itemName.includes(target) || target.includes(itemName);
                    });
                };

                // Step 1: Province
                const provinceMatch = findMatch(provincesRef.current, provinceName);
                if (provinceMatch) {
                    form.setValue("province", provinceMatch.name, { shouldValidate: true });
                    
                    // Step 2: City (Wait for citiesList to populate)
                    let cityRetry = 0;
                    const trySetCity = () => {
                        const cityMatch = findMatch(citiesRef.current, cityName);
                        if (cityMatch) {
                            form.setValue("city", cityMatch.name, { shouldValidate: true });
                            
                            // Step 3: Barangay (Wait for barangaysList)
                            let brgyRetry = 0;
                            const trySetBrgy = () => {
                                const brgyMatch = findMatch(barangaysRef.current, brgyName);
                                if (brgyMatch) {
                                    form.setValue("brgy", brgyMatch.name, { shouldValidate: true });
                                    toast.success(`Location identified: ${brgyMatch.name}, ${cityMatch.name}`);
                                } else if (brgyRetry < 10) {
                                    brgyRetry++;
                                    setTimeout(trySetBrgy, 800);
                                }
                            };
                            setTimeout(trySetBrgy, 800);
                        } else if (cityRetry < 10) {
                            cityRetry++;
                            setTimeout(trySetCity, 800);
                        }
                    };
                    setTimeout(trySetCity, 800);
                } else {
                    toast.error(`Could not match province: ${provinceName}`);
                }
            }
        } catch (err) {
            console.error("Geocoding failure:", err);
            toast.error("Geocoding service unavailable");
        } finally {
            setIsGeocoding(false);
        }
    };

    const handleAutoFillAddress = () => {
        const loc = form.getValues("location");
        if (!loc) {
            toast.error("Please enter coordinates first (Lat, Lon)");
            return;
        }
        reverseGeocode(loc);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        toast.info("Uploading image...", { icon: "⏳" });

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/crm/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");
            
            const data = await res.json();
            form.setValue("image", data.id, { shouldValidate: true });
            toast.success("Image uploaded successfully!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to upload image.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleFormSubmit = async (values: CustomerRegistrationFormValues) => {
        setIsSubmitting(true);
        try {
            await onSubmit(values);
            onOpenChange(false);
            toast.success("Registration saved successfully!");
        } catch (err) {
            console.error("Submit error:", err);
            toast.error("Failed to save registration.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-[850px] p-0 border-l border-border/40 shadow-2xl flex flex-col bg-background">
                {/* Modern Header Section */}
                <div className="p-10 border-b border-border/40 bg-muted/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -mr-32 -mt-32" />
                    
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="h-20 w-20 rounded-[2.5rem] bg-blue-50 flex items-center justify-center text-blue-600 shadow-xl shadow-blue-600/10 border border-blue-100/50">
                            <Users className="h-10 w-10" />
                        </div>
                        <div className="space-y-1">
                            <SheetTitle className="text-3xl font-black uppercase tracking-tighter text-foreground italic">
                                {customer ? "Edit Customer" : "Register Customer"}
                            </SheetTitle>
                            <div className="flex items-center gap-3">
                                <SheetDescription className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 m-0">
                                    {customer ? `Editing ID: ${customer.customer_code || customer.id}` : "New Profile Registration"}
                                </SheetDescription>
                                <Badge variant="outline" className="border-blue-500/20 text-blue-600 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-blue-50/50">
                                    {customer ? "Active" : "Draft"}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex-1 flex flex-col overflow-hidden">
                        <Tabs defaultValue="basic" className="flex-1 flex flex-col overflow-hidden w-full">
                            <div className="px-10 pt-8 pb-4 bg-background shrink-0 z-10 border-b border-border/40 shadow-sm">
                                <TabsList className="w-full h-16 grid grid-cols-2 bg-muted/30 p-1.5 rounded-3xl border border-border/40">
                                    <TabsTrigger value="basic" className="rounded-2xl data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-blue-600 gap-3 text-[11px] font-bold uppercase tracking-widest transition-all">
                                        <Building2 className="h-4 w-4" />
                                        BASIC
                                    </TabsTrigger>
                                    <TabsTrigger value="location" className="rounded-2xl data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-blue-600 gap-3 text-[11px] font-bold uppercase tracking-widest transition-all">
                                        <MapPin className="h-4 w-4" />
                                        LOCATION
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar px-10 pb-10 pt-8">
                                    <TabsContent value="basic" className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300 m-0">
                                        <div className="flex flex-col items-center justify-center py-4 space-y-4">
                                            <div 
                                                className="h-24 w-24 rounded-[2.5rem] bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100/50 relative overflow-hidden group cursor-pointer"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                {form.watch("image") ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img 
                                                        src={`${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/assets/${form.watch("image")}`} 
                                                        alt="Customer Avatar" 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                ) : (
                                                    <Users className="h-10 w-10" />
                                                )}
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {isUploading ? <RefreshCcw className="h-6 w-6 text-white animate-spin" /> : <Upload className="h-6 w-6 text-white" />}
                                                </div>
                                            </div>
                                            <div className="h-1.5 w-12 bg-blue-600/10 rounded-full" />
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                        </div>

                                        <div className="space-y-8">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                <FormField
                                                    control={form.control}
                                                    name="customer_code"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Customer Code</FormLabel>
                                                            <FormControl>
                                                                <Input {...field} disabled className="h-16 bg-muted/40 border-border/40 rounded-3xl text-sm font-bold shadow-sm px-6 cursor-not-allowed opacity-70" placeholder="MAIN-XXXX (Auto)" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="type"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Customer Type</FormLabel>
                                                            <SearchableSelect
                                                                options={[
                                                                    { value: "Regular", label: "Regular" },
                                                                    { value: "Employee", label: "Employee" }
                                                                ]}
                                                                value={field.value}
                                                                onValueChange={field.onChange}
                                                                placeholder="Select type"
                                                                className="h-16 bg-muted/20 border-border/40 rounded-3xl focus:ring-blue-500/20 text-sm font-bold shadow-sm px-6 hover:bg-muted/30 transition-all"
                                                            />
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name="customer_name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Client Full Name</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} className="h-16 bg-muted/20 border-border/40 rounded-3xl focus-visible:ring-blue-500/20 text-sm font-bold shadow-sm px-6" placeholder="Ex. John Doe" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                <FormField
                                                    control={form.control}
                                                    name="store_type"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Store Type</FormLabel>
                                                            <SearchableSelect
                                                                options={storeTypes.map(st => ({ value: st.id.toString(), label: st.store_type }))}
                                                                value={field.value?.toString()}
                                                                onValueChange={field.onChange}
                                                                placeholder="Select type"
                                                                className="h-16 bg-muted/20 border-border/40 rounded-3xl focus:ring-blue-500/20 text-sm font-bold shadow-sm px-6 hover:bg-muted/30 transition-all"
                                                            />
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="classification"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Classification</FormLabel>
                                                            <SearchableSelect
                                                                options={classifications.map(cl => ({ value: cl.id.toString(), label: cl.classification_name }))}
                                                                value={field.value?.toString()}
                                                                onValueChange={field.onChange}
                                                                placeholder="Select classification..."
                                                                className="h-16 bg-muted/20 border-border/40 rounded-3xl focus:ring-blue-500/20 text-sm font-bold shadow-sm px-6 hover:bg-muted/30 transition-all"
                                                            />
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                <FormField
                                                    control={form.control}
                                                    name="store_name"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Business Store Name</FormLabel>
                                                            <FormControl>
                                                                <Input {...field} className="h-16 bg-muted/20 border-border/40 rounded-3xl focus-visible:ring-blue-500/20 text-sm font-bold shadow-sm px-6" placeholder="Ex. Costsaver's Supermarket" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="store_signage"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Signage / Landmarks</FormLabel>
                                                            <FormControl>
                                                                <Input {...field} value={field.value || ""} className="h-16 bg-muted/20 border-border/40 rounded-3xl focus-visible:ring-blue-500/20 text-sm font-bold shadow-sm px-6" placeholder="e.g. Beside main gate" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name="otherDetails"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Remarks</FormLabel>
                                                        <FormControl>
                                                            <textarea
                                                                {...field}
                                                                value={field.value || ""}
                                                                className="w-full min-h-[120px] p-6 bg-muted/20 border border-border/40 rounded-3xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-bold shadow-sm transition-all resize-none custom-scrollbar"
                                                                placeholder="Additional customer remarks..."
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="grid grid-cols-1 gap-6 p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100/50 mt-8">
                                                <FormField
                                                    control={form.control}
                                                    name="isActive"
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-border/40 bg-background p-4 shadow-sm h-[72px]">
                                                            <div className="space-y-0.5 pr-2">
                                                                <FormLabel className="text-xs font-bold uppercase tracking-wider">Active Status</FormLabel>
                                                                <p className="text-[10px] text-muted-foreground font-medium leading-tight">Enable to show in lists</p>
                                                            </div>
                                                            <FormControl>
                                                                <Switch
                                                                    checked={field.value === 1}
                                                                    onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                                                                    className="data-[state=checked]:bg-blue-600 shrink-0"
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="location" className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300 m-0">
                                        <div className="space-y-10">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                <FormField
                                                    control={form.control}
                                                    name="province"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Province</FormLabel>
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
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="city"
                                                        render={({ field }) => (
                                                            <FormItem className="flex flex-col min-w-0">
                                                                <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1 truncate">City / Mun.</FormLabel>
                                                                <SearchableCombobox
                                                                    items={citiesList}
                                                                    value={field.value}
                                                                    onChange={field.onChange}
                                                                    placeholder="City"
                                                                    isLoading={isLoadingCities}
                                                                    disabled={!selectedProvince}
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
                                                                <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1 truncate">Barangay</FormLabel>
                                                                <SearchableCombobox
                                                                    items={barangaysList}
                                                                    value={field.value}
                                                                    onChange={field.onChange}
                                                                    placeholder="Brgy"
                                                                    isLoading={isLoadingBarangays}
                                                                    disabled={!selectedCity}
                                                                    allowCustomValue={true}
                                                                />
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between px-2">
                                                    <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Geo Tag (Coordinates)</FormLabel>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={isGeocoding || !form.getValues("location")}
                                                        onClick={handleAutoFillAddress}
                                                        className="h-10 rounded-xl border-blue-600/20 bg-blue-50/30 text-blue-600 text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all px-4"
                                                    >
                                                        {isGeocoding ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <MapPin className="h-3 w-3 mr-2" />}
                                                        Auto-Fill Address
                                                    </Button>
                                                </div>
                                                <FormField
                                                    control={form.control}
                                                    name="location"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <Input {...field} value={field.value || ""} className="h-16 bg-muted/20 border-border/40 rounded-3xl focus-visible:ring-blue-500/20 font-mono text-sm font-bold shadow-sm px-6" placeholder="14.5995, 120.9842" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <div className="rounded-[2.5rem] overflow-hidden border border-border/40 shadow-xl bg-muted/5 p-2">
                                                <CustomerGeotagMap 
                                                    location={currentLocation || ""}
                                                    onLocationChange={(newLoc) => form.setValue("location", newLoc, { shouldValidate: true })}
                                                    storeName={form.watch("store_name")}
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                <FormField
                                                    control={form.control}
                                                    name="contact_number"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Mobile Number</FormLabel>
                                                            <FormControl>
                                                                <Input 
                                                                    {...field} 
                                                                    type="tel"
                                                                    onChange={(e) => field.onChange(e.target.value.replace(/[^0-9+\s\-()]/g, ''))}
                                                                    className="h-16 bg-muted/20 border-border/40 rounded-3xl focus-visible:ring-blue-500/20 text-sm font-bold shadow-sm px-6" 
                                                                    placeholder="09123456789" 
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name="tel_number"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Telephone Number</FormLabel>
                                                            <FormControl>
                                                                <Input 
                                                                    {...field} 
                                                                    type="tel"
                                                                    value={field.value || ""} 
                                                                    onChange={(e) => field.onChange(e.target.value.replace(/[^0-9+\s\-()]/g, ''))}
                                                                    className="h-16 bg-muted/20 border-border/40 rounded-3xl focus-visible:ring-blue-500/20 text-sm font-bold shadow-sm px-6" 
                                                                    placeholder="(02) 123-4567" 
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name="customer_email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Email Address</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} value={field.value || ""} className="h-16 bg-muted/20 border-border/40 rounded-3xl focus-visible:ring-blue-500/20 text-sm font-bold shadow-sm px-6" placeholder="customer@example.com" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </TabsContent>
                                </div>
                            </Tabs>

                        <div className="p-8 border-t border-border/40 bg-muted/5 flex items-center justify-end gap-4 mt-auto shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="h-14 rounded-2xl border-border/50 font-black uppercase tracking-widest text-[10px] px-8 hover:bg-muted transition-all"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] px-10 shadow-lg shadow-blue-600/20 transition-all gap-3 group"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Check className="h-4 w-4 group-hover:scale-125 transition-transform" />
                                        <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                    </>
                                )}
                                {customer ? "Update Profile" : "Create Profile"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}
