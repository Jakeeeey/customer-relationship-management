"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Tabs, 
    TabsContent, 
    TabsList, 
    TabsTrigger 
} from "@/components/ui/tabs";
import { 
    Plus, 
    Trash2, 
    Save,
    X,
    Info,
    Box,
    Users,
    Truck,
    AlertCircle,
    TrendingUp,
    Search,
    UserPlus,
    Store,
    BarChart3,
    RefreshCw,
    ShoppingBag,
    MapPin,
    Map
} from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { 
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "@/components/ui/accordion";
import { 
    SalesmanWithTarget, 
    TacticalSKU, 
    ProductSummary, 
    ProductPricing,
    CustomerTarget,
    SupplierTarget,
    CustomerRecord,
    SupplierRecord
} from "@/modules/customer-relationship-management/target-settings/types";
import { targetSettingsProvider } from "@/modules/customer-relationship-management/target-settings/providers/fetchProvider";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface TargetFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    salesman: SalesmanWithTarget;
    allProducts: ProductSummary[];
    productPricing: ProductPricing[];
    allCustomers: CustomerRecord[];
    allSuppliers: SupplierRecord[];
    customerMappings: { salesman_id: number; customer_id: number }[];
    month: number;
    year: number;
    onSuccess: () => void;
}

export function TargetFormDialog({ 
    isOpen, 
    onClose, 
    salesman, 
    allProducts, 
    productPricing,
    allCustomers, 
    allSuppliers, 
    customerMappings,
    month, 
    year, 
    onSuccess 
}: TargetFormDialogProps) {
    const [loading, setLoading] = useState(false);
    const [targetData, setTargetData] = useState({
        volume: salesman.current_target?.volume || 0,
        new_accounts: salesman.current_target?.new_accounts || 0,
        productive_outlets: salesman.current_target?.productive_outlets || 0,
        line_sales: salesman.current_target?.line_sales || 0,
        frequency: salesman.current_target?.frequency || 0,
        basket_count: salesman.current_target?.basket_count || 0,
        reach: salesman.current_target?.reach || 0,
    });

    const [tacticalSkus, setTacticalSkus] = useState<Partial<TacticalSKU>[]>(
        salesman.current_target?.tactical_skus?.map(ts => ({
            id: ts.id,
            product_id: ts.product_id,
            target_quantity: ts.target_quantity,
            target_value: ts.target_value,
            product_name: ts.product_name,
            product_code: ts.product_code
        })) || []
    );

    // Temp state for adding new SKU
    const [newItem, setNewItem] = useState({
        product_id: 0,
        target_quantity: 0
    });

    // --- New Allocation State ---
    const [customerTargets, setCustomerTargets] = useState<Partial<CustomerTarget>[]>(
        salesman.current_target?.customer_targets?.map(ct => ({
            customer_id: ct.customer_id,
            target_amount: ct.target_amount
        })) || []
    );

    const [supplierTargets, setSupplierTargets] = useState<Partial<SupplierTarget>[]>(
        salesman.current_target?.supplier_targets?.map(st => ({
            supplier_id: st.supplier_id,
            target_amount: st.target_amount
        })) || []
    );

    const [customerSearch, setCustomerSearch] = useState("");
    const [supplierSearch, setSupplierSearch] = useState("");

    // --- Reset State when Salesman or Modal changes ---
    useEffect(() => {
        if (isOpen) {
            setTargetData({
                volume: salesman.current_target?.volume || 0,
                new_accounts: salesman.current_target?.new_accounts || 0,
                productive_outlets: salesman.current_target?.productive_outlets || 0,
                line_sales: salesman.current_target?.line_sales || 0,
                frequency: salesman.current_target?.frequency || 0,
                basket_count: salesman.current_target?.basket_count || 0,
                reach: salesman.current_target?.reach || 0,
            });

            setTacticalSkus(
                salesman.current_target?.tactical_skus?.map(ts => ({
                    id: ts.id,
                    product_id: ts.product_id,
                    target_quantity: ts.target_quantity,
                    target_value: ts.target_value,
                    product_name: ts.product_name,
                    product_code: ts.product_code
                })) || []
            );

            setCustomerTargets(
                salesman.current_target?.customer_targets?.map(ct => ({
                    customer_id: ct.customer_id,
                    target_amount: ct.target_amount
                })) || []
            );

            setSupplierTargets(
                salesman.current_target?.supplier_targets?.map(st => ({
                    supplier_id: st.supplier_id,
                    target_amount: st.target_amount
                })) || []
            );

            setCustomerSearch("");
            setSupplierSearch("");
            setLoading(false);
        }
    }, [isOpen, salesman, month, year]);

    // --- Customer Filter Logic ---
    const salesmanCustomerIds = useMemo(() => {
        return customerMappings
            .filter(m => m.salesman_id === salesman.id)
            .map(m => m.customer_id);
    }, [customerMappings, salesman.id]);

    const groupedCustomers = useMemo(() => {
        let list = allCustomers.filter(c => salesmanCustomerIds.includes(c.id));
        
        if (customerSearch) {
            const search = customerSearch.toLowerCase();
            list = list.filter(c => 
                c.customer_name.toLowerCase().includes(search) ||
                c.province?.toLowerCase().includes(search) ||
                c.city?.toLowerCase().includes(search)
            );
        }

        const groups: Record<string, { 
            totalAllocation: number; 
            cities: Record<string, { 
                totalAllocation: number; 
                customers: CustomerRecord[] 
            }> 
        }> = {};
        
        list.forEach(c => {
            const prov = (c.province || "Unknown Province").toUpperCase();
            const city = (c.city || "Unknown City").toUpperCase();
            
            if (!groups[prov]) {
                groups[prov] = { totalAllocation: 0, cities: {} };
            }
            if (!groups[prov].cities[city]) {
                groups[prov].cities[city] = { totalAllocation: 0, customers: [] };
            }
            
            groups[prov].cities[city].customers.push(c);
            
            // Add to province and city totals
            const target = customerTargets.find(ct => ct.customer_id === c.id);
            if (target) {
                const amount = Number(target.target_amount) || 0;
                groups[prov].totalAllocation += amount;
                groups[prov].cities[city].totalAllocation += amount;
            }
        });

        return groups;
    }, [allCustomers, salesmanCustomerIds, customerSearch, customerTargets]);

    const filteredSuppliersList = useMemo(() => {
        let list = allSuppliers;
        if (supplierSearch) {
            list = list.filter(s => s.supplier_name.toLowerCase().includes(supplierSearch.toLowerCase()));
        }
        return list;
    }, [allSuppliers, supplierSearch]);

    // --- Allocation Calculations ---
    const totalAllocatedCustomer = useMemo(() => customerTargets.reduce((sum, ct) => sum + (Number(ct.target_amount) || 0), 0), [customerTargets]);
    const totalAllocatedSupplier = useMemo(() => supplierTargets.reduce((sum, st) => sum + (Number(st.target_amount) || 0), 0), [supplierTargets]);

    const handleCustomerTargetChange = (customerId: number, amount: number) => {
        setCustomerTargets(prev => {
            const existing = prev.find(ct => ct.customer_id === customerId);
            if (existing) {
                if (amount <= 0) return prev.filter(ct => ct.customer_id !== customerId);
                return prev.map(ct => ct.customer_id === customerId ? { ...ct, target_amount: amount } : ct);
            }
            if (amount <= 0) return prev;
            return [...prev, { customer_id: customerId, target_amount: amount }];
        });
    };

    const handleSupplierTargetChange = (supplierId: number, amount: number) => {
        setSupplierTargets(prev => {
            const existing = prev.find(st => st.supplier_id === supplierId);
            if (existing) {
                if (amount <= 0) return prev.filter(st => st.supplier_id !== supplierId);
                return prev.map(st => st.supplier_id === supplierId ? { ...st, target_amount: amount } : st);
            }
            if (amount <= 0) return prev;
            return [...prev, { supplier_id: supplierId, target_amount: amount }];
        });
    };

    const handleInputChange = (field: string, value: string) => {
        setTargetData(prev => ({ ...prev, [field]: Number(value) }));
    };

    const handleAddSku = () => {
        if (!newItem.product_id || newItem.target_quantity <= 0) {
            toast.error("Please select a product and enter a valid quantity");
            return;
        }

        const product = allProducts.find(p => p.product_id === newItem.product_id);
        if (!product) return;

        const price = getProductPrice(newItem.product_id);
        const target_value = newItem.target_quantity * price;

        setTacticalSkus(prev => [
            ...prev, 
            { 
                product_id: newItem.product_id, 
                target_quantity: newItem.target_quantity, 
                target_value: target_value,
                product_name: product.product_name,
                product_code: product.product_code
            }
        ]);

        setNewItem({ product_id: 0, target_quantity: 0 });
    };

    const handleRemoveSku = (index: number) => {
        setTacticalSkus(prev => prev.filter((_, i) => i !== index));
    };

    const getProductPrice = (productId: number) => {
        // 1. Try to find in special pricing
        const specialPrice = productPricing.find(p => p.product_id === productId && p.price_type_id === salesman.price_type_id);
        if (specialPrice) return Number(specialPrice.price);

        // 2. Fallback to product's generic price field (priceA, priceB, etc)
        const product = allProducts.find(p => p.product_id === productId);
        if (product) {
            const priceKey = `price${salesman.price_type || 'A'}`; // Fallback to A if not set
            return Number(product[priceKey]) || 0;
        }

        return 0;
    };

    const handleSkuChange = (index: number, field: keyof TacticalSKU, value: string | number) => {
        const updated = [...tacticalSkus];
        const newSku = { ...updated[index], [field]: value };
        
        // Auto-calculate value if quantity or product changes
        if (field === "product_id" || field === "target_quantity") {
            const price = getProductPrice(newSku.product_id as number || 0);
            newSku.target_value = (newSku.target_quantity as number || 0) * price;
        }
        
        updated[index] = newSku;
        setTacticalSkus(updated);
    };

    const handleSave = async () => {
        setLoading(true);
        const dateFrom = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
        const lastDay = new Date(year, month, 0).getDate();
        const dateTo = `${year}-${String(month).padStart(2, '0')}-${lastDay} 23:59:59`;

        if (totalAllocatedCustomer > targetData.volume) {
            toast.error(`Total customer allocation (₱${totalAllocatedCustomer.toLocaleString()}) exceeds total volume (₱${targetData.volume.toLocaleString()})`);
            setLoading(false);
            return;
        }

        if (totalAllocatedSupplier > targetData.volume) {
            toast.error(`Total supplier allocation (₱${totalAllocatedSupplier.toLocaleString()}) exceeds total volume (₱${targetData.volume.toLocaleString()})`);
            setLoading(false);
            return;
        }

        try {
            await targetSettingsProvider.saveTarget({
                target: {
                    ...targetData,
                    salesman_id: salesman.id,
                    date_range_from: dateFrom,
                    date_range_to: dateTo,
                },
                tacticalSkus: tacticalSkus.filter(s => s.product_id !== 0),
                customerTargets: customerTargets.filter(ct => (ct.target_amount || 0) > 0) as CustomerTarget[],
                supplierTargets: supplierTargets.filter(st => (st.target_amount || 0) > 0) as SupplierTarget[]
            });
            toast.success("Target settings saved successfully");
            onSuccess();
            onClose();
        } catch {
            toast.error("Failed to save target settings");
        } finally {
            setLoading(false);
        }
    };

    const isBooking = salesman.operation === 1;
    const isSiteSales = salesman.operation === 3;
    const operationLabel = isBooking ? "Booking" : (isSiteSales ? "Sites Sales" : "Sales");

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[1000px] w-[95vw] max-h-[90vh] p-0 flex flex-col bg-white border-none shadow-2xl rounded-3xl overflow-hidden">
                <DialogHeader className="p-6 pb-4 bg-slate-50/50 border-b border-slate-100 shrink-0">
                    <DialogTitle className="text-xl font-black flex justify-between items-center pr-10 text-slate-900">
                        {salesman.current_target?.id ? "Update" : "Set"} Target for {salesman.salesman_name}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 font-medium text-xs mt-0.5">
                        Configure {operationLabel} targets for {new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                    <Tabs defaultValue="general" className="w-full h-full">
                        <TabsList className="grid w-full grid-cols-2 bg-muted/60 p-1 h-auto rounded-full mb-6">
                            <TabsTrigger value="general" className="rounded-full py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm font-medium">
                                Basic Targets
                            </TabsTrigger>
                            <TabsTrigger value="skus" className="rounded-full py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm font-medium">
                                Tactical SKU
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="general" className="space-y-6 outline-none">
                            {isBooking ? (
                                /* --- BOOKING LAYOUT --- */
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-slate-50/30 rounded-3xl border border-slate-100 shadow-sm">
                                    <div className="space-y-3">
                                        <Label className="text-sm font-black text-slate-700 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-indigo-500" /> Volume (Total Sales)
                                        </Label>
                                        <div className="relative group">
                                            <Input 
                                                type="number" 
                                                value={targetData.volume || ""} 
                                                onChange={(e) => handleInputChange('volume', e.target.value)}
                                                className="bg-white border-slate-200 h-14 pl-12 font-bold text-2xl rounded-2xl focus:ring-slate-900 shadow-sm transition-all group-hover:border-slate-300"
                                                placeholder="Enter volume target"
                                            />
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">₱</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground font-medium italic pl-1 italic">Set the overall booking target for this month</p>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-sm font-black text-slate-700 flex items-center gap-2">
                                            <RefreshCw className="w-5 h-5 text-blue-500" /> Frequency Target
                                        </Label>
                                        <Input 
                                            type="number" 
                                            value={targetData.frequency || ""} 
                                            onChange={(e) => handleInputChange('frequency', e.target.value)}
                                            className="bg-white border-slate-200 h-14 font-bold text-2xl rounded-2xl focus:ring-slate-900 shadow-sm hover:border-slate-300 transition-all"
                                            placeholder="Enter frequency"
                                        />
                                        <p className="text-xs text-muted-foreground font-medium italic pl-1 italic">Target number of visits per outlet</p>
                                    </div>
                                </div>
                            ) : (
                                /* --- SITE SALES LAYOUT (Operations ID 3) --- */
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 p-6 bg-slate-50/30 rounded-3xl border border-slate-100 shadow-sm">
                                    {/* 1. Volume */}
                                    <div className="space-y-2.5">
                                        <Label className="text-sm font-black text-slate-700 flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-indigo-500" /> Volume (Total Sales)
                                        </Label>
                                        <div className="relative group">
                                            <Input 
                                                type="number" 
                                                value={targetData.volume || ""} 
                                                onChange={(e) => handleInputChange('volume', e.target.value)}
                                                className="bg-white border-slate-200 h-11 pl-10 font-bold text-lg rounded-xl focus:ring-slate-900 shadow-sm transition-all group-hover:border-slate-300"
                                                placeholder="Enter volume target"
                                            />
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₱</span>
                                        </div>
                                    </div>

                                    {/* 2. New Accounts */}
                                    <div className="space-y-2.5">
                                        <Label className="text-sm font-black text-slate-700 flex items-center gap-2">
                                            <UserPlus className="w-4 h-4 text-indigo-500" /> New Account
                                        </Label>
                                        <Input 
                                            type="number" 
                                            value={targetData.new_accounts || ""} 
                                            onChange={(e) => handleInputChange('new_accounts', e.target.value)}
                                            className="bg-white border-slate-200 h-11 font-bold text-lg rounded-xl focus:ring-slate-900 shadow-sm hover:border-slate-300 transition-all"
                                            placeholder="Enter new account target"
                                        />
                                    </div>

                                    {/* 3. Productive Outlets */}
                                    <div className="space-y-2.5">
                                        <Label className="text-sm font-black text-slate-700 flex items-center gap-2">
                                            <Store className="w-4 h-4 text-amber-500" /> Productive Outlets
                                        </Label>
                                        <Input 
                                            type="number" 
                                            value={targetData.productive_outlets || ""} 
                                            onChange={(e) => handleInputChange('productive_outlets', e.target.value)}
                                            className="bg-white border-slate-200 h-11 font-bold text-lg rounded-xl focus:ring-slate-900 shadow-sm hover:border-slate-300 transition-all"
                                            placeholder="Enter productive outlets"
                                        />
                                    </div>

                                    {/* 4. Line Sales */}
                                    <div className="space-y-2.5">
                                        <Label className="text-sm font-black text-slate-700 flex items-center gap-2">
                                            <BarChart3 className="w-4 h-4 text-emerald-500" /> Line Sales
                                        </Label>
                                        <Input 
                                            type="number" 
                                            value={targetData.line_sales || ""} 
                                            onChange={(e) => handleInputChange('line_sales', e.target.value)}
                                            className="bg-white border-slate-200 h-11 font-bold text-lg rounded-xl focus:ring-slate-900 shadow-sm hover:border-slate-300 transition-all"
                                            placeholder="Enter line sales target"
                                        />
                                    </div>

                                    {/* 5. Frequency */}
                                    <div className="space-y-2.5">
                                        <Label className="text-sm font-black text-slate-700 flex items-center gap-2">
                                            <RefreshCw className="w-4 h-4 text-blue-500" /> Frequency
                                        </Label>
                                        <Input 
                                            type="number" 
                                            value={targetData.frequency || ""} 
                                            onChange={(e) => handleInputChange('frequency', e.target.value)}
                                            className="bg-white border-slate-200 h-11 font-bold text-lg rounded-xl focus:ring-slate-900 shadow-sm hover:border-slate-300 transition-all"
                                            placeholder="Enter frequency target"
                                        />
                                    </div>

                                    {/* 6. Basket Count */}
                                    <div className="space-y-2.5">
                                        <Label className="text-sm font-black text-slate-700 flex items-center gap-2">
                                            <ShoppingBag className="w-4 h-4 text-rose-500" /> Basket Count
                                        </Label>
                                        <Input 
                                            type="number" 
                                            value={targetData.basket_count || ""} 
                                            onChange={(e) => handleInputChange('basket_count', e.target.value)}
                                            className="bg-white border-slate-200 h-11 font-bold text-lg rounded-xl focus:ring-slate-900 shadow-sm hover:border-slate-300 transition-all"
                                            placeholder="Enter basket count target"
                                        />
                                    </div>

                                    {/* 7. Reach */}
                                    <div className="space-y-2.5 col-span-1">
                                        <Label className="text-sm font-black text-slate-700 flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-indigo-500" /> Reach
                                        </Label>
                                        <Input 
                                            type="number" 
                                            value={targetData.reach || ""} 
                                            onChange={(e) => handleInputChange('reach', e.target.value)}
                                            className="bg-white border-slate-200 h-11 font-bold text-lg rounded-xl focus:ring-slate-900 shadow-sm hover:border-slate-300 transition-all"
                                            placeholder="Enter reach target"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* --- VOLUME ALLOCATION SECTION --- */}
                            <div className="border-t pt-4 space-y-4">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                            <Box className="w-5 h-5 text-indigo-500" /> Volume Breakdown
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium italic">Distribute the total volume across customers and suppliers</p>
                                    </div>
                                    
                                    <div className="flex gap-4">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Allocated (Customers)</p>
                                            <p className={`text-sm font-bold ${totalAllocatedCustomer > targetData.volume ? 'text-destructive' : 'text-slate-900'}`}>
                                                ₱{totalAllocatedCustomer.toLocaleString()} / ₱{targetData.volume.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Allocated (Suppliers)</p>
                                            <p className={`text-sm font-bold ${totalAllocatedSupplier > targetData.volume ? 'text-destructive' : 'text-slate-900'}`}>
                                                ₱{totalAllocatedSupplier.toLocaleString()} / ₱{targetData.volume.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[400px]">
                                    {/* Left: Customer Side */}
                                    <div className="flex flex-col border border-slate-200 rounded-2xl bg-slate-50/50 overflow-hidden shadow-sm min-h-0 max-h-full">
                                        <div className="p-4 bg-white border-b border-slate-100 space-y-4 flex-none">
                                            <div className="flex items-center gap-2 text-indigo-700 font-black text-xs uppercase tracking-widest">
                                                <Users className="w-4 h-4" /> Customer Allocation
                                            </div>
                                            
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                <Input 
                                                    placeholder="Search province, city, or customer..." 
                                                    className="h-9 pl-9 text-sm border-slate-100 bg-slate-50"
                                                    value={customerSearch}
                                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-200">
                                            <Accordion type="multiple" className="w-full">
                                                {Object.entries(groupedCustomers).length > 0 ? (
                                                    Object.entries(groupedCustomers).map(([province, data]) => (
                                                        <AccordionItem key={province} value={province} className="border-b border-slate-100 px-4">
                                                            <AccordionTrigger className="hover:no-underline py-3 group">
                                                                <div className="flex items-center justify-between w-full pr-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-black text-slate-900 tracking-tight uppercase">{province}</span>
                                                                    </div>
                                                                    <Badge variant="outline" className="bg-indigo-50 border-indigo-100 text-indigo-700 font-bold text-[10px]">
                                                                        ₱{data.totalAllocation.toLocaleString()}
                                                                    </Badge>
                                                                </div>
                                                            </AccordionTrigger>
                                                            <AccordionContent className="pb-4 pt-1 px-2">
                                                                <Accordion type="multiple" className="w-full space-y-1">
                                                                    {Object.entries(data.cities).map(([city, cityData]) => (
                                                                        <AccordionItem key={city} value={city} className="border-none">
                                                                            <AccordionTrigger className="hover:no-underline py-2 px-2 rounded-lg hover:bg-slate-100/50 transition-colors group/city">
                                                                                <div className="flex items-center justify-between w-full pr-4">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Map className="w-3.5 h-3.5 text-slate-400 group-hover/city:text-indigo-500 transition-colors" />
                                                                                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{city}</span>
                                                                                        <Badge variant="secondary" className="ml-2 h-4 px-1 text-[9px] font-black bg-slate-100 text-slate-500 border-none">
                                                                                            {cityData.customers.length}
                                                                                        </Badge>
                                                                                    </div>
                                                                                    <Badge variant="outline" className="bg-white border-slate-200 text-slate-500 font-bold text-[9px] h-5 shadow-sm">
                                                                                        ₱{cityData.totalAllocation.toLocaleString()}
                                                                                    </Badge>
                                                                                </div>
                                                                            </AccordionTrigger>
                                                                            <AccordionContent className="pt-2 pb-1 pl-4 space-y-1.5">
                                                                                {cityData.customers.map(customer => {
                                                                                    const targetValue = customerTargets.find(ct => ct.customer_id === customer.id)?.target_amount || 0;
                                                                                    return (
                                                                                        <div key={customer.id} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-colors">
                                                                                            <div className="flex-1 min-w-0 pr-4">
                                                                                                <p className="text-[10px] font-bold text-slate-900 truncate uppercase">{customer.customer_name}</p>
                                                                                                <p className="text-[9px] text-slate-400 font-medium truncate italic">{customer.brgy || 'N/A'}</p>
                                                                                            </div>
                                                                                            <div className="relative w-28">
                                                                                                <Input 
                                                                                                    type="number"
                                                                                                    value={targetValue || ""}
                                                                                                    onChange={(e) => handleCustomerTargetChange(customer.id, Number(e.target.value))}
                                                                                                    className="h-7 pl-5 text-[10px] font-bold bg-slate-50 border-none rounded-lg focus:ring-indigo-500"
                                                                                                    placeholder="0"
                                                                                                />
                                                                                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">₱</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </AccordionContent>
                                                                        </AccordionItem>
                                                                    ))}
                                                                </Accordion>
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    ))
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white/50 rounded-2xl border-2 border-dashed border-slate-100 m-2">
                                                        <Users className="w-8 h-8 mb-2 opacity-20" />
                                                        <p className="text-[10px] font-black uppercase tracking-widest">No areas found</p>
                                                    </div>
                                                )}
                                            </Accordion>
                                        </div>
                                    </div>

                                    {/* Right: Supplier Side */}
                                    <div className="flex flex-col border border-slate-200 rounded-2xl bg-slate-50/50 overflow-hidden shadow-sm min-h-0 max-h-full">
                                        <div className="p-4 bg-white border-b border-slate-100 space-y-4">
                                            <div className="flex items-center gap-2 text-emerald-700 font-black text-xs uppercase tracking-widest">
                                                <Truck className="w-4 h-4" /> Trade Supplier Allocation
                                                {totalAllocatedSupplier > 0 && (
                                                    <Badge variant="outline" className="ml-auto bg-emerald-50 border-emerald-100 text-emerald-700 font-bold">
                                                        {Math.round((totalAllocatedSupplier / (targetData.volume || 1)) * 100)}% of limit
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                <Input 
                                                    placeholder="Search supplier name..." 
                                                    className="h-9 pl-9 text-sm border-slate-100 bg-slate-50"
                                                    value={supplierSearch}
                                                    onChange={(e) => setSupplierSearch(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-2 min-h-0 scrollbar-thin scrollbar-thumb-slate-200">
                                            <div className="space-y-2">
                                                {filteredSuppliersList.length > 0 ? (
                                                    filteredSuppliersList.map(supplier => {
                                                        const targetValue = supplierTargets.find(st => st.supplier_id === supplier.id)?.target_amount || 0;
                                                        return (
                                                            <div key={supplier.id} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-colors">
                                                                <div className="flex-1 min-w-0 pr-4">
                                                                    <p className="text-xs font-bold text-slate-900 truncate uppercase">{supplier.supplier_name}</p>
                                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-tight">Trade Partner</p>
                                                                </div>
                                                                <div className="relative w-32">
                                                                      <Input 
                                                                        type="number"
                                                                        value={targetValue || ""}
                                                                        onChange={(e) => handleSupplierTargetChange(supplier.id, Number(e.target.value))}
                                                                        className="h-8 pl-6 text-xs font-bold bg-slate-50 border-none rounded-lg focus:ring-emerald-500"
                                                                        placeholder="0"
                                                                    />
                                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">₱</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white/50 rounded-2xl border-2 border-dashed border-slate-100">
                                                        <Truck className="w-8 h-8 mb-2 opacity-20" />
                                                        <p className="text-[10px] font-black uppercase tracking-widest">No suppliers found</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-4 rounded-2xl bg-slate-900 border-none text-white flex items-center justify-between shadow-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/10 rounded-lg">
                                            <AlertCircle className="w-5 h-5 text-indigo-300" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Allocation Status</p>
                                            <p className="text-xs font-medium text-slate-200">Volume budget must cover both customers and suppliers.</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Available Budget</p>
                                        <p className="text-xl font-black text-white">₱{targetData.volume.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="skus" className="space-y-6 outline-none px-1 pr-2">
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-2">
                                <h4 className="text-blue-900 font-semibold flex items-center gap-2">
                                    <Info className="w-4 h-4" /> About Tactical SKU
                                </h4>
                                <p className="text-blue-700 text-sm leading-relaxed">
                                    Assign specific products to this salesman with target quantities. The target volume is automatically calculated based on the product price and price type.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 p-8 border-2 border-slate-100 rounded-3xl bg-slate-50/30">
                                <div className="md:col-span-9 space-y-2.5">
                                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Select Product</Label>
                                    <SearchableSelect 
                                        options={allProducts.map(p => ({ value: String(p.product_id), label: `${p.product_code || 'N/A'} - ${p.product_name}` }))} 
                                        value={String(newItem.product_id)}
                                        onValueChange={(val) => setNewItem(prev => ({ ...prev, product_id: Number(val) }))}
                                    />
                                </div>
                                <div className="md:col-span-3 space-y-2.5">
                                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500 text-center block">Target Quantity</Label>
                                    <Input 
                                        type="number" 
                                        value={newItem.target_quantity || ""} 
                                        onChange={(e) => setNewItem(prev => ({ ...prev, target_quantity: Number(e.target.value) }))}
                                        placeholder="Enter qty"
                                        className="h-10 bg-white border-slate-200 rounded-xl focus:ring-slate-900"
                                    />
                                </div>
                                <Button 
                                    className="col-span-12 bg-slate-900 hover:bg-slate-800 text-white flex gap-2 h-11 shadow-md rounded-xl font-bold transition-all active:scale-[0.98]"
                                    onClick={handleAddSku}
                                >
                                    <Plus className="w-5 h-5" /> Add Product to Target List
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-sm">Assigned Tactical SKUs</h3>
                                {tacticalSkus.length > 0 ? (
                                    <div className="space-y-3">
                                        {tacticalSkus.map((sku, index) => (
                                            <div key={index} className="flex items-center gap-4 p-4 border rounded-2xl bg-white shadow-sm group">
                                                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                                                    <Box className="w-6 h-6 text-blue-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold truncate">{sku.product_name}</h4>
                                                    <p className="text-xs text-muted-foreground uppercase">Product ID: {sku.product_code || `p${sku.product_id}`}</p>
                                                    
                                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Target Quantity</Label>
                                                            <Input 
                                                                type="number" 
                                                                value={sku.target_quantity} 
                                                                onChange={(e) => handleSkuChange(index, "target_quantity", Number(e.target.value))}
                                                                className="h-8 bg-muted/30 border-none"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Target Volume</Label>
                                                            <div className="h-8 flex items-center px-3 bg-muted/10 rounded-md text-muted-foreground font-medium text-sm">
                                                                ₱{Number(sku.target_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    onClick={() => handleRemoveSku(index)}
                                                    className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-2xl bg-muted/10 text-muted-foreground">
                                        <Box className="w-12 h-12 mb-3 text-muted-foreground/30" />
                                        <p className="font-semibold">No tactical SKUs assigned yet</p>
                                        <p className="text-xs">Add products above to set specific targets</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                <DialogFooter className="p-6 pt-4 border-t border-slate-100 bg-slate-50/30 gap-3 shrink-0">
                    <Button variant="ghost" onClick={onClose} disabled={loading} className="px-6 h-10 gap-2 font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl">
                        <X className="w-4 h-4" /> Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white px-10 h-10 gap-2 font-bold shadow-xl rounded-xl transition-all active:scale-[0.98]">
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : <Save className="w-4 h-4" />}
                        Save Target Configuration
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
