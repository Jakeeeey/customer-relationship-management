"use client";

import React, { useState } from "react";
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
    Box
} from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SalesmanWithTarget, TacticalSKU, ProductSummary, ProductPricing } from "@/modules/customer-relationship-management/target-settings/types";
import { targetSettingsProvider } from "@/modules/customer-relationship-management/target-settings/providers/fetchProvider";
import { toast } from "sonner";

interface TargetFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    salesman: SalesmanWithTarget;
    allProducts: ProductSummary[];
    productPricing: ProductPricing[];
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

        try {
            await targetSettingsProvider.saveTarget({
                target: {
                    ...targetData,
                    salesman_id: salesman.id,
                    date_range_from: dateFrom,
                    date_range_to: dateTo,
                },
                tacticalSkus: tacticalSkus.filter(s => s.product_id !== 0)
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
            <DialogContent className="sm:max-w-[1000px] w-[95vw] p-0 overflow-hidden bg-white border-none shadow-2xl rounded-3xl">
                <DialogHeader className="p-8 pb-4 bg-slate-50/50 border-b border-slate-100">
                    <DialogTitle className="text-2xl font-black flex justify-between items-center pr-10 text-slate-900">
                        {salesman.current_target?.id ? "Update" : "Set"} Target for {salesman.salesman_name}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 font-medium text-sm mt-1">
                        Configure {operationLabel} targets for {new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </DialogDescription>
                </DialogHeader>

                <div className="px-8 py-6 space-y-8">
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-muted/60 p-1 h-auto rounded-full mb-6">
                            <TabsTrigger value="general" className="rounded-full py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm font-medium">
                                Basic Targets
                            </TabsTrigger>
                            <TabsTrigger value="skus" className="rounded-full py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm font-medium">
                                Tactical SKU
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="general" className="space-y-4 outline-none">
                            <div className={isBooking ? "space-y-4" : "grid grid-cols-2 gap-4"}>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">Volume (Total Sales)</Label>
                                    <Input 
                                        type="number" 
                                        value={targetData.volume || ""} 
                                        onChange={(e) => handleInputChange('volume', e.target.value)}
                                        className="bg-muted/40 border-none h-10"
                                        placeholder="Enter volume target"
                                    />
                                    {isBooking && <p className="text-xs text-muted-foreground">Total sales amount for the month</p>}
                                </div>

                                {isSiteSales && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">New Account</Label>
                                        <Input 
                                            type="number" 
                                            value={targetData.new_accounts || ""} 
                                            onChange={(e) => handleInputChange('new_accounts', e.target.value)}
                                            className="bg-muted/40 border-none h-10"
                                            placeholder="Enter new account target"
                                        />
                                    </div>
                                )}

                                {isSiteSales && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">Productive Outlets</Label>
                                        <Input 
                                            type="number" 
                                            value={targetData.productive_outlets || ""} 
                                            onChange={(e) => handleInputChange('productive_outlets', e.target.value)}
                                            className="bg-muted/40 border-none h-10"
                                            placeholder="Enter productive outlets"
                                        />
                                    </div>
                                )}

                                {isSiteSales && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">Line Sales</Label>
                                        <Input 
                                            type="number" 
                                            value={targetData.line_sales || ""} 
                                            onChange={(e) => handleInputChange('line_sales', e.target.value)}
                                            className="bg-muted/40 border-none h-10"
                                            placeholder="Enter line sales target"
                                        />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">Frequency</Label>
                                    <Input 
                                        type="number" 
                                        value={targetData.frequency || ""} 
                                        onChange={(e) => handleInputChange('frequency', e.target.value)}
                                        className="bg-muted/40 border-none h-10"
                                        placeholder="Enter frequency target"
                                    />
                                    {isBooking && <p className="text-xs text-muted-foreground">Number of customers visited 2+ times</p>}
                                </div>

                                {isSiteSales && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">Basket Count</Label>
                                        <Input 
                                            type="number" 
                                            value={targetData.basket_count || ""} 
                                            onChange={(e) => handleInputChange('basket_count', e.target.value)}
                                            className="bg-muted/40 border-none h-10"
                                            placeholder="Enter basket count target"
                                        />
                                    </div>
                                )}

                                {isSiteSales && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">Reach</Label>
                                        <Input 
                                            type="number" 
                                            value={targetData.reach || ""} 
                                            onChange={(e) => handleInputChange('reach', e.target.value)}
                                            className="bg-muted/40 border-none h-10"
                                            placeholder="Enter reach target"
                                        />
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="skus" className="space-y-6 outline-none max-h-[500px] overflow-y-auto px-1 pr-2">
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

                <DialogFooter className="p-8 pt-4 border-t border-slate-100 bg-slate-50/30 gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={loading} className="px-6 h-11 gap-2 font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl">
                        <X className="w-4 h-4" /> Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white px-10 h-11 gap-2 font-bold shadow-xl rounded-xl transition-all active:scale-[0.98]">
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
