"use client";

import {useState, useEffect} from "react";
import {Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription} from "@/components/ui/sheet";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Badge} from "@/components/ui/badge";
import {Switch} from "@/components/ui/switch";
import {
    Loader2,
    User,
    Search,
    UserMinus,
    Plus,
    MapPin,
    Store,
    Tag,
    Clock,
    Receipt,
    Phone,
    CreditCard,
    Layers
} from "lucide-react";
import {Salesman, Customer} from "../../types";
import {salesmanProvider} from "../../providers/fetchProvider";
import {toast} from "sonner";

interface SalesmanDetailSheetProps {
    salesman: Salesman | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function SalesmanDetailSheet({salesman, open, onOpenChange, onSuccess}: SalesmanDetailSheetProps) {
    const [activeTab, setActiveTab] = useState("profile");

    const [isUpdating, setIsUpdating] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Salesman>>({});

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Customer[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (salesman && open) {
            setEditForm({
                truck_plate: salesman.truck_plate || "",
                isActive: salesman.isActive ? 1 : 0,
                isInventory: salesman.isInventory ? 1 : 0,
                canCollect: salesman.canCollect ? 1 : 0,
            });
            loadCustomers(salesman.id);
            setActiveTab("profile");
            setSearchQuery("");
            setSearchResults([]);
        }
    }, [salesman, open]);

    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearching(true);
            const results = await salesmanProvider.searchAvailableCustomers(searchQuery);
            const assignedIds = customers.map(c => c.id);
            setSearchResults(results.filter((r: Customer) => !assignedIds.includes(r.id)));
            setIsSearching(false);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, customers]);

    const loadCustomers = async (id: number) => {
        setLoadingCustomers(true);
        const data = await salesmanProvider.getAssignedCustomers(id);
        setCustomers(data);
        setLoadingCustomers(false);
    };

    const handleUpdateProfile = async () => {
        if (!salesman) return;
        setIsUpdating(true);
        try {
            const res = await salesmanProvider.updateSalesman(salesman.id, editForm);
            if (res.success) {
                toast.success("Profile updated successfully");
                onSuccess();
            } else {
                toast.error(res.error || "Update failed");
            }
        } catch {
            toast.error("Critical error");
        } finally {
            setIsUpdating(false);
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

    const CustomerCardContent = ({c}: { c: Customer }) => {
        const validStoreName = c.store_name && c.store_name !== '0' ? c.store_name : null;
        const validCustomerName = c.customer_name && c.customer_name !== '0' ? c.customer_name : "Unknown Entity";
        const displayStoreName = validStoreName || validCustomerName;

        const locParts = [c.brgy, c.city, c.province].filter(val => val && val !== '0' && val.trim() !== '');
        const displayLoc = locParts.length > 0 ? locParts.join(", ") : "No location data registered";

        const validContact = c.contact_number && c.contact_number !== '0' ? c.contact_number : null;

        // 🚀 FIX: Safely parse relations whether they are expanded objects or raw numbers
        const storeTypeName = typeof c.store_type === 'object' ? c.store_type?.store_type : null;
        const classificationName = typeof c.classification === 'object' ? c.classification?.classification_name : null;

        return (
            <div className="flex flex-col gap-1.5 w-full">
                <div className="flex items-center justify-between">
                    <span
                        className="text-sm font-black text-slate-800 uppercase truncate pr-4">{displayStoreName}</span>
                    <Badge variant="outline" className="text-[9px] uppercase font-bold shrink-0">
                        {c.customer_code && c.customer_code !== '0' ? c.customer_code : "NO CODE"}
                    </Badge>
                </div>

                {validStoreName && (
                    <span
                        className="text-[10px] font-bold text-slate-500 uppercase truncate">Owner: {validCustomerName}</span>
                )}

                <div className="flex items-center gap-4 mt-0.5 text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 opacity-60 shrink-0"/>
                        <span className="text-[10px] font-bold uppercase truncate max-w-[200px]">{displayLoc}</span>
                    </div>
                    {validContact && (
                        <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 opacity-60 shrink-0"/>
                            <span className="text-[10px] font-bold uppercase">{validContact}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {classificationName && (
                        <div
                            className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                            <Layers className="w-3 h-3 opacity-60"/> {classificationName}
                        </div>
                    )}
                    {storeTypeName && (
                        <div
                            className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                            <Store className="w-3 h-3 opacity-60"/> {storeTypeName}
                        </div>
                    )}
                    {c.price_type && (
                        <div
                            className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                            <Tag className="w-3 h-3 opacity-60"/> P{c.price_type}
                        </div>
                    )}
                    {c.credit_type !== undefined && c.credit_type !== null && (
                        <div
                            className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                            <CreditCard className="w-3 h-3 opacity-60"/> CR-{c.credit_type}
                        </div>
                    )}
                    {c.payment_term !== undefined && c.payment_term !== null && (
                        <div
                            className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                            <Clock className="w-3 h-3 opacity-60"/> {c.payment_term} Days
                        </div>
                    )}
                    {!!c.isVAT && (
                        <div
                            className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            <Receipt className="w-3 h-3"/> VAT
                        </div>
                    )}
                    {!!c.isEWT && (
                        <div
                            className="flex items-center gap-1 text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            <Receipt className="w-3 h-3"/> EWT
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (!salesman) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[600px] w-full p-0 flex flex-col bg-slate-50 border-l border-slate-200">
                <SheetHeader className="p-6 border-b bg-white">
                    <div className="flex items-center gap-4">
                        <div
                            className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <User className="h-6 w-6"/>
                        </div>
                        <div className="min-w-0">
                            <SheetTitle className="text-xl font-black uppercase text-slate-900 leading-none truncate">
                                {salesman.salesman_name}
                            </SheetTitle>
                            <SheetDescription className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-[10px] uppercase font-bold shrink-0">
                                    {salesman.salesman_code}
                                </Badge>
                                <span className="text-[10px] font-bold text-slate-400 uppercase truncate">
                                    EMP ID: {salesman.employee_id}
                                </span>
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 pt-4 bg-white border-b shrink-0">
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="profile" className="text-xs font-black uppercase tracking-widest">Profile
                                Config</TabsTrigger>
                            <TabsTrigger value="customers" className="text-xs font-black uppercase tracking-widest">Manage
                                Customers</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200">
                        <TabsContent value="profile" className="m-0 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Truck
                                        Plate</Label>
                                    <Input
                                        value={editForm.truck_plate as string}
                                        onChange={(e) => setEditForm({...editForm, truck_plate: e.target.value})}
                                        className="font-bold uppercase"
                                    />
                                </div>

                                <div className="pt-4 space-y-3">
                                    <div
                                        className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                                        <div>
                                            <Label className="text-xs font-black uppercase">Active Status</Label>
                                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Enable or
                                                disable salesman operations</p>
                                        </div>
                                        <Switch
                                            checked={!!editForm.isActive}
                                            onCheckedChange={(c) => setEditForm({...editForm, isActive: c ? 1 : 0})}
                                        />
                                    </div>
                                    <div
                                        className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                                        <div>
                                            <Label className="text-xs font-black uppercase">Inventory Access</Label>
                                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Allow managing
                                                truck inventory</p>
                                        </div>
                                        <Switch
                                            checked={!!editForm.isInventory}
                                            onCheckedChange={(c) => setEditForm({...editForm, isInventory: c ? 1 : 0})}
                                        />
                                    </div>
                                    <div
                                        className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                                        <div>
                                            <Label className="text-xs font-black uppercase">Collection Rights</Label>
                                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Allow cash
                                                collections from customers</p>
                                        </div>
                                        <Switch
                                            checked={!!editForm.canCollect}
                                            onCheckedChange={(c) => setEditForm({...editForm, canCollect: c ? 1 : 0})}
                                        />
                                    </div>
                                </div>

                                <Button
                                    className="w-full mt-6 h-12 font-black uppercase tracking-widest shadow-md"
                                    onClick={handleUpdateProfile}
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
                                    Save Changes
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="customers" className="m-0 space-y-6 pb-20">
                            <div className="relative sticky top-0 z-20 bg-slate-50 pt-1 pb-3">
                                <Search className="absolute left-3 top-[17px] h-4 w-4 text-slate-400"/>
                                <Input
                                    placeholder="Search store name, owner, or code to assign..."
                                    className="pl-9 h-11 text-xs font-bold uppercase border-slate-300 shadow-sm rounded-xl bg-white"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />

                                {searchQuery.length >= 2 && (
                                    <div
                                        className="absolute z-30 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        {isSearching ? (
                                            <div className="p-6 text-center flex flex-col items-center gap-2">
                                                <Loader2 className="w-5 h-5 animate-spin text-primary opacity-50"/>
                                                <span
                                                    className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Searching database...</span>
                                            </div>
                                        ) : searchResults.length > 0 ? (
                                            <ul className="max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                                                {searchResults.map(c => (
                                                    <li key={c.id}
                                                        className="p-4 border-b last:border-0 hover:bg-slate-50 flex items-start justify-between group transition-colors">
                                                        <div className="flex-1 min-w-0 mr-4">
                                                            <CustomerCardContent c={c}/>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            className="h-8 px-3 text-[10px] font-black uppercase tracking-widest shrink-0 mt-1 shadow-sm"
                                                            onClick={() => handleAssignCustomer(c.id)}
                                                        >
                                                            <Plus className="w-3.5 h-3.5 mr-1"/> Add
                                                        </Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div
                                                className="p-6 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">No
                                                available customers found.</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <Label
                                    className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center justify-between">
                                    Currently Assigned Territory
                                    <Badge variant="secondary"
                                           className="text-[9px] px-1.5 h-4">{customers.length}</Badge>
                                </Label>

                                {loadingCustomers ? (
                                    <div className="py-12 flex flex-col items-center gap-2">
                                        <Loader2 className="w-6 h-6 animate-spin text-slate-300"/>
                                    </div>
                                ) : customers.length === 0 ? (
                                    <div
                                        className="py-10 text-center bg-white rounded-xl border border-dashed border-slate-200 shadow-sm flex flex-col items-center gap-2">
                                        <Store className="w-8 h-8 text-slate-200"/>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No
                                            territory assigned</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {customers.map(c => (
                                            <div key={c.junction_id}
                                                 className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-start justify-between group hover:border-slate-300 transition-colors">
                                                <div className="flex-1 min-w-0 mr-4">
                                                    <CustomerCardContent c={c}/>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 shrink-0 mt-1"
                                                    onClick={() => handleUnassignCustomer(c.junction_id!, c.store_name && c.store_name !== '0' ? c.store_name : c.customer_name)}
                                                    title="Remove from territory"
                                                >
                                                    <UserMinus className="w-4 h-4"/>
                                                </Button>
                                            </div>
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