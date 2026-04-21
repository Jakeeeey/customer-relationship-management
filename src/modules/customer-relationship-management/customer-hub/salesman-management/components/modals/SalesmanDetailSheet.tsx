"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Loader2, User, UserMinus, Plus, MapPin, Store, Tag, Clock, Receipt, Phone, CreditCard, Layers, Printer
} from "lucide-react";
import { Salesman, Customer } from "../../types";

// Define PaymentTerm type locally to avoid any[] usage
interface PaymentTerm {
    id: number;
    payment_name: string;
    payment_days?: number;
}
import { salesmanProvider } from "../../providers/fetchProvider";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const profileSchema = z.object({
    truck_plate: z.string().optional(),
    inventory_day: z.string().optional(),
    isActive: z.boolean(),
    isInventory: z.boolean(),
    canCollect: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface SalesmanDetailSheetProps {
    salesman: Salesman | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const CustomerCardView = ({ c, paymentTerms }: { c: Customer, paymentTerms: PaymentTerm[] }) => {
    const validStoreName = c.store_name && c.store_name !== '0' ? c.store_name : null;
    const validCustomerName = c.customer_name && c.customer_name !== '0' ? c.customer_name : "Unknown Entity";
    const displayStoreName = validStoreName || validCustomerName;
    const locParts = [c.brgy, c.city, c.province].filter(val => val && val !== '0' && val.trim() !== '');
    const displayLoc = locParts.length > 0 ? locParts.join(", ") : "No location data registered";
    const validContact = c.contact_number && c.contact_number !== '0' ? c.contact_number : null;

    const storeTypeName = typeof c.store_type === 'object' ? c.store_type?.store_type : null;
    const classificationName = typeof c.classification === 'object' ? c.classification?.classification_name : null;

    let paymentTermName = null;
    if (typeof c.payment_term === 'object' && c.payment_term !== null) {
        paymentTermName = (c.payment_term as PaymentTerm).payment_name;
    } else if (c.payment_term) {
        const foundTerm = paymentTerms.find(pt => String(pt.id) === String(c.payment_term));
        paymentTermName = foundTerm ? foundTerm.payment_name : `Term ID: ${c.payment_term}`;
    }

    return (
        <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between">
                <span className="text-sm font-black text-foreground uppercase truncate pr-4">{displayStoreName}</span>
                <Badge variant="outline" className="text-[9px] uppercase font-bold shrink-0">
                    {c.customer_code && c.customer_code !== '0' ? c.customer_code : "NO CODE"}
                </Badge>
            </div>

            {validStoreName && (
                <span className="text-[10px] font-bold text-muted-foreground uppercase truncate">Owner: {validCustomerName}</span>
            )}

            <div className="flex items-center gap-4 mt-0.5 text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 opacity-60 shrink-0" />
                    <span className="text-[10px] font-bold uppercase truncate max-w-[200px]">{displayLoc}</span>
                </div>
                {validContact && (
                    <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 opacity-60 shrink-0" />
                        <span className="text-[10px] font-bold uppercase">{validContact}</span>
                    </div>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {classificationName && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded">
                        <Layers className="w-3 h-3 opacity-60" /> {classificationName}
                    </div>
                )}
                {storeTypeName && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded">
                        <Store className="w-3 h-3 opacity-60" /> {storeTypeName}
                    </div>
                )}
                {c.price_type && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded">
                        <Tag className="w-3 h-3 opacity-60" /> P{c.price_type}
                    </div>
                )}
                {paymentTermName && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded">
                        <Clock className="w-3 h-3 opacity-60" /> {paymentTermName}
                    </div>
                )}
                {c.credit_type !== undefined && c.credit_type !== null && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded">
                        <CreditCard className="w-3 h-3 opacity-60" /> CR-{c.credit_type}
                    </div>
                )}
                {!!c.isVAT && (
                    <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        <Receipt className="w-3 h-3" /> VAT
                    </div>
                )}
                {!!c.isEWT && (
                    <div className="flex items-center gap-1 text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        <Receipt className="w-3 h-3" /> EWT
                    </div>
                )}
            </div>
        </div>
    );
};

export function SalesmanDetailSheet({ salesman, open, onOpenChange, onSuccess }: SalesmanDetailSheetProps) {
    const [activeTab, setActiveTab] = useState("profile");
    const [vehicles, setVehicles] = useState<{ id: number, plate_number: string }[]>([]);

    const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Customer[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            truck_plate: "",
            inventory_day: undefined,
            isActive: true,
            isInventory: false,
            canCollect: false,
        }
    });

    const loadCustomers = useCallback(async (id: number) => {
        setLoadingCustomers(true);
        const data = await salesmanProvider.getAssignedCustomers(id);
        setCustomers(data);
        setLoadingCustomers(false);
    }, []);

    useEffect(() => {
        salesmanProvider.getVehicles().then(setVehicles).catch(console.error);

        fetch("/api/crm/customer/references?type=payment_term")
            .then(res => res.json())
            .then(json => setPaymentTerms(json.data || []))
            .catch(console.error);
    }, []);

    useEffect(() => {
        if (salesman && open) {
            // 🚀 FIX: Wrapped state updates inside an async initializer block
            const initializeSheet = async () => {
                form.reset({
                    truck_plate: salesman.truck_plate || "",
                    inventory_day: salesman.inventory_day ? String(salesman.inventory_day) : undefined,
                    isActive: !!salesman.isActive,
                    isInventory: !!salesman.isInventory,
                    canCollect: !!salesman.canCollect,
                });
                await loadCustomers(salesman.id);
                setActiveTab("profile");
                setSearchQuery("");
                setSearchResults([]);
            };
            initializeSheet();
        }
    }, [salesman, open, form, loadCustomers]);

    useEffect(() => {
        // 🚀 FIX: Wrap everything inside an async runner block
        const handleSearch = async () => {
            if (searchQuery.length < 2) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            const results = await salesmanProvider.searchAvailableCustomers(searchQuery, salesman?.price_type);
            const assignedIds = customers.map(c => c.id);
            setSearchResults(results.filter((r: Customer) => !assignedIds.includes(r.id)));
            setIsSearching(false);
        };

        const timer = setTimeout(handleSearch, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, customers, salesman]);

    const handleUpdateProfile = async (values: ProfileFormValues) => {
        if (!salesman) return;

        try {
            const payload: Partial<Salesman> = {
                truck_plate: values.truck_plate,
                inventory_day: values.inventory_day ? Number(values.inventory_day) : undefined,
                isActive: values.isActive ? 1 : 0,
                isInventory: values.isInventory ? 1 : 0,
                canCollect: values.canCollect ? 1 : 0,
            };

            const res = await salesmanProvider.updateSalesman(salesman.id, payload);
            if (res.success) {
                toast.success("Profile updated successfully");
                onSuccess();
            } else {
                toast.error(res.error || "Update failed");
            }
        } catch {
            toast.error("Critical error");
        }
    };

    const handleAssignCustomer = async (customerId: number) => {
        if (!salesman) return;
        try {
            const res = await salesmanProvider.assignCustomer(salesman.id, customerId);
            if (res.success) {
                toast.success("Customer assigned");
                setSearchQuery("");
                loadCustomers(salesman.id);
                onSuccess();
            }
        } catch {
            toast.error("Failed to assign customer");
        }
    };

    const handleUnassignCustomer = async (junctionId: number, customerName: string) => {
        try {
            const res = await salesmanProvider.unassignCustomer(junctionId);
            if (res.success) {
                toast.success(`${customerName} removed`);
                loadCustomers(salesman!.id);
                onSuccess();
            }
        } catch {
            toast.error("Failed to remove customer");
        }
    };

    const handlePrintTerritory = () => {
        const doc = new jsPDF();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("SALESMAN TERRITORY ROSTER", 14, 20);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Salesman: ${salesman?.salesman_name} (${salesman?.salesman_code})`, 14, 30);
        doc.text(`Price Tier: Price ${salesman?.price_type || 'A'}`, 14, 36);
        doc.text(`Assigned Vehicle: ${salesman?.truck_plate || 'None'}`, 14, 42);

        const getPaymentName = (term: unknown) => {
            if (typeof term === 'object' && term !== null) return (term as PaymentTerm).payment_name || "Cash";
            if (term) {
                const found = paymentTerms.find(pt => String(pt.id) === String(term));
                return found ? found.payment_name : `Term ID: ${term}`;
            }
            return "Cash";
        };

        autoTable(doc, {
            startY: 50,
            headStyles: {fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold'},
            bodyStyles: {fontSize: 8},
            head: [['Code', 'Store / Customer Name', 'Location', 'Contact', 'Term']],
            body: customers.map(c => [
                c.customer_code || "N/A",
                c.store_name && c.store_name !== '0' ? c.store_name : (c.customer_name || 'N/A'),
                [c.brgy, c.city, c.province].filter(val => val && val !== '0').join(", ") || "N/A",
                c.contact_number && c.contact_number !== '0' ? c.contact_number : ("N/A"),
                // 🚀 FIX: Removed the 'any' cast and used proper 'unknown' typing in the helper
                getPaymentName(c.payment_term)
            ])
        });

        window.open(doc.output('bloburl'), '_blank');
    };

    if (!salesman) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[600px] w-full p-0 flex flex-col bg-background border-l border-border">
                <SheetHeader className="p-6 border-b bg-card">
                    <div className="flex items-center gap-4">
                        <div
                            className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <User className="h-6 w-6"/>
                        </div>
                        <div className="min-w-0">
                            <SheetTitle className="text-xl font-black uppercase text-foreground leading-none truncate">
                                {salesman.salesman_name}
                            </SheetTitle>
                            <SheetDescription className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-[10px] uppercase font-bold shrink-0">
                                    {salesman.salesman_code}
                                </Badge>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase truncate">
                                    EMP ID: {salesman.employee_id}
                                </span>
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 pt-4 bg-card border-b shrink-0">
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="profile" className="text-xs font-black uppercase tracking-widest">Profile Config</TabsTrigger>
                            <TabsTrigger value="customers" className="text-xs font-black uppercase tracking-widest">Manage Customers</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-muted/10 custom-scrollbar">
                        <TabsContent value="profile" className="m-0 space-y-6">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleUpdateProfile)} className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="truck_plate" render={({field}) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Truck Plate Assignment</FormLabel>
                                                <Select value={field.value || ""} onValueChange={field.onChange}>
                                                    <FormControl>
                                                        <SelectTrigger className="font-bold uppercase h-11 bg-background">
                                                            <SelectValue placeholder="Select Valid Vehicle"/>
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {vehicles.length === 0 && (
                                                            <SelectItem value="none" disabled>Loading vehicles...</SelectItem>
                                                        )}
                                                        {vehicles.map(v => (
                                                            <SelectItem key={v.id} value={v.plate_number}>{v.plate_number}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage/>
                                            </FormItem>
                                        )}/>

                                        <FormField control={form.control} name="inventory_day" render={({field}) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Inventory Schedule Day</FormLabel>
                                                <Select value={field.value || ""} onValueChange={field.onChange}>
                                                    <FormControl>
                                                        <SelectTrigger className="font-bold uppercase h-11 bg-background">
                                                            <SelectValue placeholder="Select Schedule"/>
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="1">Monday</SelectItem>
                                                        <SelectItem value="2">Tuesday</SelectItem>
                                                        <SelectItem value="3">Wednesday</SelectItem>
                                                        <SelectItem value="4">Thursday</SelectItem>
                                                        <SelectItem value="5">Friday</SelectItem>
                                                        <SelectItem value="6">Saturday</SelectItem>
                                                        <SelectItem value="7">Sunday</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage/>
                                            </FormItem>
                                        )}/>
                                    </div>

                                    <Separator/>

                                    <div className="space-y-3">
                                        <FormField control={form.control} name="isActive" render={({field}) => (
                                            <FormItem className="flex items-center justify-between p-4 rounded-xl bg-card border border-border shadow-sm">
                                                <div>
                                                    <FormLabel className="text-xs font-black uppercase">Active Status</FormLabel>
                                                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Enable or disable salesman operations</p>
                                                </div>
                                                <FormControl>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange}/>
                                                </FormControl>
                                            </FormItem>
                                        )}/>

                                        <FormField control={form.control} name="isInventory" render={({field}) => (
                                            <FormItem className="flex items-center justify-between p-4 rounded-xl bg-card border border-border shadow-sm">
                                                <div>
                                                    <FormLabel className="text-xs font-black uppercase">Inventory Access</FormLabel>
                                                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Allow managing truck inventory</p>
                                                </div>
                                                <FormControl>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange}/>
                                                </FormControl>
                                            </FormItem>
                                        )}/>

                                        <FormField control={form.control} name="canCollect" render={({field}) => (
                                            <FormItem className="flex items-center justify-between p-4 rounded-xl bg-card border border-border shadow-sm">
                                                <div>
                                                    <FormLabel className="text-xs font-black uppercase">Collection Rights</FormLabel>
                                                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Allow cash collections from customers</p>
                                                </div>
                                                <FormControl>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange}/>
                                                </FormControl>
                                            </FormItem>
                                        )}/>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full mt-6 h-12 font-black uppercase tracking-widest shadow-md"
                                        disabled={form.formState.isSubmitting}
                                    >
                                        {form.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
                                        Save Changes
                                    </Button>
                                </form>
                            </Form>
                        </TabsContent>

                        <TabsContent value="customers" className="m-0 space-y-6 pb-6">
                            <Command className="rounded-xl border border-border shadow-sm overflow-visible bg-card">
                                <CommandInput
                                    placeholder={`Search valid Price ${salesman.price_type || 'A'} customers...`}
                                    value={searchQuery}
                                    onValueChange={setSearchQuery}
                                    className="h-12 text-xs font-bold uppercase"
                                />
                                {searchQuery.length >= 2 && (
                                    <CommandList className="max-h-[350px] absolute w-full mt-14 z-50 bg-card border border-border rounded-xl shadow-2xl custom-scrollbar">
                                        {isSearching ? (
                                            <div className="p-6 text-center flex flex-col items-center gap-2">
                                                <Loader2 className="w-5 h-5 animate-spin text-primary opacity-50"/>
                                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Applying Pricing Filters...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <CommandEmpty className="p-6 text-center text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                                    No unassigned Price {salesman.price_type || 'A'} customers found.
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    {searchResults.map(c => (
                                                        <CommandItem
                                                            key={c.id}
                                                            value={c.store_name || c.customer_name}
                                                            className="flex items-start justify-between p-4 border-b last:border-0 hover:bg-muted/50"
                                                            onSelect={() => handleAssignCustomer(c.id)}
                                                        >
                                                            <div className="flex-1 min-w-0 mr-4">
                                                                <CustomerCardView c={c} paymentTerms={paymentTerms} />
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                className="h-8 px-3 text-[10px] font-black uppercase tracking-widest shrink-0 shadow-sm"
                                                            >
                                                                <Plus className="w-3.5 h-3.5 mr-1"/> Add
                                                            </Button>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </>
                                        )}
                                    </CommandList>
                                )}
                            </Command>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                        Currently Assigned Territory
                                        <Badge variant="secondary" className="text-[9px] px-1.5 h-4">{customers.length}</Badge>
                                    </span>
                                    {customers.length > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-[9px] font-black uppercase tracking-widest text-primary border-primary/20 hover:bg-primary/10"
                                            onClick={handlePrintTerritory}
                                        >
                                            <Printer className="w-3 h-3 mr-1.5"/> Print Roster
                                        </Button>
                                    )}
                                </div>

                                {loadingCustomers ? (
                                    <div className="py-12 flex flex-col items-center gap-2">
                                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground"/>
                                    </div>
                                ) : customers.length === 0 ? (
                                    <Card className="border-dashed shadow-sm">
                                        <CardContent className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
                                            <Store className="w-8 h-8 opacity-20"/>
                                            <p className="text-[10px] font-black uppercase tracking-widest">No territory assigned</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="space-y-2.5">
                                        {customers.map(c => (
                                            <Card key={c.junction_id} className="shadow-sm group hover:border-muted-foreground/30 transition-colors">
                                                <CardContent className="p-4 flex items-start justify-between">
                                                    <div className="flex-1 min-w-0 mr-4">
                                                        <CustomerCardView c={c} paymentTerms={paymentTerms} />
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 shrink-0 mt-1"
                                                        onClick={() => handleUnassignCustomer(c.junction_id!, c.store_name && c.store_name !== '0' ? c.store_name : c.customer_name)}
                                                        title="Remove from territory"
                                                    >
                                                        <UserMinus className="w-4 h-4"/>
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}