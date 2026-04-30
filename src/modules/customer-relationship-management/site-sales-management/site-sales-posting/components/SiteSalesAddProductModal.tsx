"use client";

import React, { useState, useMemo } from 'react';
import { 
    Dialog, 
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Search, 
    Plus, 
    Trash2, 
    ShoppingCart, 
    Package,
    ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { SearchProduct, SalesInvoiceDetail } from '../types';
import { cn } from '@/lib/utils';

interface SiteSalesAddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (items: SalesInvoiceDetail[]) => void;
    products: SearchProduct[];
    isLoading: boolean;
    supplierName: string | null;
}

interface CartItem extends SearchProduct {
    quantity: number;
    discount: number;
}

export const SiteSalesAddProductModal: React.FC<SiteSalesAddProductModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    products,
    isLoading,
    supplierName
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);


    const filteredProducts = useMemo(() => {
        let filtered = products;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(p => 
                (p.product_name?.toLowerCase() || "").includes(q) || 
                (p.product_code?.toLowerCase() || "").includes(q) ||
                (p.description?.toLowerCase() || "").includes(q)
            );
        }
        if (showOnlyAvailable) {
            filtered = filtered.filter(p => (p.available_qty || 0) > 0);
        }
        return filtered;
    }, [products, searchQuery, showOnlyAvailable]);

    const addToCart = (product: SearchProduct) => {
        if ((product.available_qty || 0) <= 0) {
            toast.error("Product is out of stock", {
                description: `${product.product_name} is currently unavailable.`,
            });
            return;
        }
        
        setCart(prev => {
            const existing = prev.find(item => item.product_id === product.product_id);
            if (existing) {
                return prev.map(item => 
                    item.product_id === product.product_id 
                        ? { ...item, quantity: item.quantity + 1 } 
                        : item
                );
            }
            return [...prev, { ...product, quantity: 1, discount: 0 }];
        });
    };

    const removeFromCart = (productId: number) => {
        setCart(prev => prev.filter(item => item.product_id !== productId));
    };

    const updateQuantity = (productId: number, qty: number) => {
        if (qty < 0) return;
        setCart(prev => prev.map(item => 
            item.product_id === productId ? { ...item, quantity: qty } : item
        ));
    };

    const totals = useMemo(() => {
        const gross = cart.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
        const discount = cart.reduce((acc, item) => acc + item.discount, 0);
        return {
            gross,
            discount,
            net: gross - discount
        };
    }, [cart]);

    const handleSubmit = () => {
        const details: SalesInvoiceDetail[] = cart.map(item => ({
            detail_id: undefined,
            invoice_id: 0, 
            product_id: {
                product_id: item.product_id,
                product_name: item.product_name,
                description: item.description,
                product_code: item.product_code
            },
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_amount: item.discount,
            total_amount: (item.quantity * item.unit_price) - item.discount,
            unit: item.unit?.toString() || 'PCS'
        }));
        onConfirm(details);
        setCart([]); // Clear cart after submit
        setSearchQuery(""); // Clear search after submit
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                setSearchQuery("");
                setCart([]);
                setShowOnlyAvailable(false);
                onClose();
            }
        }}>
            <DialogContent className="sm:max-w-none !w-[98vw] h-[95vh] p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950 flex flex-col">
                <DialogHeader className="sr-only">
                    <DialogTitle>Add Products to Order</DialogTitle>
                    <DialogDescription>Select products from the catalog and add them to your order.</DialogDescription>
                </DialogHeader>
                <div className="flex h-full overflow-hidden">
                    {/* Left Sidebar - Product Catalog */}
                    <div className="w-[420px] h-full border-r-2 border-slate-200/50 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900/50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
                        <div className="p-8 space-y-5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white flex items-center gap-2">
                                    <Package className="h-4 w-4 text-primary" />
                                    Product Catalog <span className="text-primary/50 text-[10px] bg-primary/5 px-2 py-0.5 rounded-full">({filteredProducts.length})</span>
                                </h2>
                            </div>
                            <div className="flex gap-2">
                                <div className="relative group flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                                    <Input 
                                        placeholder="Search products..." 
                                        className="pl-11 h-12 bg-slate-50 dark:bg-slate-900 border-transparent focus:border-primary/30 focus:bg-white rounded-2xl transition-all text-xs font-bold shadow-inner"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className={`h-12 w-12 rounded-2xl transition-all ${
                                        showOnlyAvailable 
                                        ? "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20" 
                                        : "bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100"
                                    }`}
                                    onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
                                    title={showOnlyAvailable ? "Showing In-Stock Only" : "Show All Products"}
                                >
                                    <Package className={`h-5 w-5 ${showOnlyAvailable ? "animate-pulse" : ""}`} />
                                </Button>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 w-full h-[calc(95vh-140px)]">
                            <div className="px-8 pb-8 space-y-3">
                                {isLoading ? (
                                    <div className="space-y-4">
                                        <div className="flex flex-col items-center justify-center py-10 space-y-3">
                                            <div className="relative">
                                                <div className="h-12 w-12 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                                                <Package className="h-5 w-5 text-primary/40 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                            </div>
                                            <p className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] animate-pulse">Fetching Products...</p>
                                        </div>
                                        {Array(4).fill(0).map((_, i) => (
                                            <div key={i} className="p-5 bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-950/30 rounded-[28px] space-y-3 shadow-sm opacity-50">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="space-y-2 flex-1">
                                                        <div className="h-3 w-3/4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                                                        <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                                                    </div>
                                                    <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : filteredProducts.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50/50 rounded-3xl mx-2 border-2 border-dashed border-slate-100">
                                        <Package className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No products found</p>
                                    </div>
                                ) : (
                                    filteredProducts.map((p) => (
                                        <div 
                                            key={p.product_id}
                                            className="group relative p-6 bg-white dark:bg-slate-900 border border-rose-500/80 dark:border-rose-500/50 rounded-[28px] shadow-sm hover:shadow-xl hover:shadow-rose-500/10 transition-all cursor-default"
                                        >
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="space-y-2 flex-1">
                                                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 leading-relaxed uppercase tracking-tight line-clamp-2">
                                                        {p.description || p.product_name} <span className="text-primary/60 ml-1">({p.unit})</span>
                                                    </h3>
                                                    <div className="flex flex-wrap gap-1">
                                                        {p.brand_name && (
                                                            <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 text-[8px] font-black h-4 px-1.5 uppercase">
                                                                {p.brand_name}
                                                            </Badge>
                                                        )}
                                                        {p.category_name && (
                                                            <Badge variant="secondary" className="bg-slate-50 text-slate-500 border-slate-100 text-[8px] font-black h-4 px-1.5 uppercase">
                                                                {p.category_name}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">₱{Number(p.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                        <Badge 
                                                            variant="outline" 
                                                            className={`text-[9px] font-black h-5 uppercase tracking-widest ${
                                                                (p.available_qty || 0) > 10 
                                                                ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                                                : (p.available_qty || 0) > 0 
                                                                ? "bg-amber-50 text-amber-600 border-amber-100"
                                                                : "bg-rose-50 text-rose-600 border-rose-100"
                                                            }`}
                                                        >
                                                            Avail: {p.available_qty || 0}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <Button 
                                                    size="icon" 
                                                    disabled={(p.available_qty || 0) <= 0}
                                                    className={`h-11 w-11 rounded-[18px] transition-all shadow-lg active:scale-90 ${
                                                        (p.available_qty || 0) <= 0 
                                                        ? "bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600 shadow-none cursor-not-allowed" 
                                                        : "bg-pink-500 text-white hover:bg-pink-600 shadow-pink-500/30"
                                                    }`}
                                                    onClick={() => addToCart(p)}
                                                >
                                                    <Plus className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Right Content - Order Items */}
                    <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950 border-l border-slate-200/60 dark:border-slate-800">
                        {/* Header */}
                        <div className="p-8 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-pink-500 rounded-2xl shadow-xl shadow-pink-500/20">
                                    <ShoppingCart className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Order Items</h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supplier:</p>
                                        <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-black border-pink-200 text-pink-600 bg-pink-50 uppercase tracking-tighter">
                                            {supplierName || 'NOT IDENTIFIED'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Table Area */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <Table>
                                <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4 pl-6">Product Desc</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">UOM</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">UC</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center w-32">Qty</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Unit Price</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Discounts</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Available</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-6">Total</TableHead>
                                        <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cart.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-[40vh] text-center">
                                                <div className="flex flex-col items-center justify-center space-y-3 opacity-30">
                                                    <ShoppingCart className="h-12 w-12 text-slate-300" />
                                                    <p className="text-sm font-bold text-slate-400 italic">Cart is empty. Select products from the catalog to begin.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        cart.map((item) => (
                                            <TableRow key={item.product_id} className="group hover:bg-slate-50/30 transition-colors">
                                                <TableCell className="pl-6 py-4">
                                                    <div className="space-y-0.5">
                                                        <p className="text-xs font-black text-slate-800 dark:text-slate-200 line-clamp-1">{item.description || item.product_name}</p>
                                                        <p className="text-[9px] font-bold text-primary uppercase tracking-tighter">{item.product_code}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className="bg-slate-50 text-[9px] font-bold h-5 uppercase border-slate-100">
                                                        {item.unit || 'PCS'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-xs text-primary">{item.unit_count}</TableCell>
                                                <TableCell className="px-2">
                                                    <Input 
                                                        type="number" 
                                                        value={item.quantity}
                                                        onChange={(e) => updateQuantity(item.product_id, Number(e.target.value))}
                                                        className="h-10 text-center font-black text-sm bg-white dark:bg-slate-900 border-slate-200 focus:ring-primary rounded-lg"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right text-xs font-black text-slate-600 dark:text-slate-400">
                                                    ₱{Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge className={cn(
                                                        "text-[9px] font-black h-5 uppercase px-2",
                                                        item.discount > 0 ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600"
                                                    )}>
                                                        {item.discount > 0 ? `₱${item.discount}` : 'NONE'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className={`text-xs font-black ${
                                                        (item.available_qty || 0) > 10 ? "text-emerald-500" :
                                                        (item.available_qty || 0) > 0 ? "text-amber-500" : "text-rose-500"
                                                    }`}>
                                                        {item.available_qty || 0}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-black text-slate-900 dark:text-white pr-6">
                                                    ₱{((item.quantity * item.unit_price) - item.discount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                        onClick={() => removeFromCart(item.product_id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Summary Footer */}
                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30">
                            <div className="flex items-end justify-between">
                                <div className="flex gap-12">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gross Amount</p>
                                        <p className="text-xl font-black text-slate-900 dark:text-white">
                                            ₱{totals.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Discount</p>
                                        <p className="text-xl font-black text-rose-500">
                                            -₱{totals.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="bg-pink-50 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/50 rounded-2xl px-8 py-4 text-center">
                                        <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-1">Net Amount</p>
                                        <p className="text-3xl font-black text-pink-600 dark:text-pink-400">
                                            ₱{totals.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>

                                    <Button 
                                        disabled={cart.length === 0}
                                        onClick={handleSubmit}
                                        className="h-16 px-12 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-rose-500/30 transition-all active:scale-95 group"
                                    >
                                        Submit Order
                                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
