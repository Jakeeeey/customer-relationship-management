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
    ArrowRight,
    Check,
    ChevronsUpDown
} from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { SearchProduct, SalesInvoiceDetail, CartItem } from '../types';
import { calculateChainNetPrice } from '../utils';
import { cn } from '@/lib/utils';

interface SiteSalesAddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (items: SalesInvoiceDetail[]) => void;
    products: SearchProduct[];
    isLoading: boolean;
    initialDetails: SalesInvoiceDetail[];
    suppliers: { id: number; supplier_name: string; supplier_shortcut?: string }[];
    onSupplierChange: (supplierId: string | number) => void;
    currentSupplierId: string | number | null;
}

export const SiteSalesAddProductModal: React.FC<SiteSalesAddProductModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    products,
    isLoading,
    initialDetails,
    suppliers,
    onSupplierChange,
    currentSupplierId
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [openSupplier, setOpenSupplier] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);

    // Initialize cart from initialDetails when modal opens
    React.useEffect(() => {
        if (isOpen) {
            const initialCart: CartItem[] = initialDetails.map(item => {
                const prod = item.product_id && typeof item.product_id === 'object' ? item.product_id : null;
                return {
                    detail_id: item.detail_id, // PRESERVE THIS!
                    product_id: prod?.product_id || 0,
                    product_name: prod?.product_name || 'N/A',
                    description: prod?.description || '',
                    product_code: prod?.product_code || 'N/A',
                    unit_price: Number(item.unit_price),
                    unit: item.unit_name || 'PCS',
                    quantity: Number(item.quantity),
                    discount_amount: Number(item.discount_amount),
                    total_amount: Number(item.total_amount),
                    discount_type: item.discount_type?.toString() || null,
                    discount_type_name: item.discount_type_name || null,
                    unit_count: Number(item.unit_count) || 1, // Use actual unit count from API
                    available_qty: 0, // Not needed for existing items
                    brand_name: item.brand_name || null,
                    category_name: item.category_name || null,
                    discounts: item.discounts || [],
                    unit_discount: Number(item.quantity) > 0 ? Number(item.discount_amount) / Number(item.quantity) : 0
                };
            });
            setCart(initialCart);
        }
    }, [isOpen, initialDetails]);


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
        return filtered;
    }, [products, searchQuery]);

    const addToCart = (product: SearchProduct) => {
        const netUnitPrice = calculateChainNetPrice(product.unit_price, product.discounts || []);
        const totalAmount = netUnitPrice * 1;

        setCart(prev => {
            const existing = prev.find(item => item.product_id === product.product_id);
            if (existing) {
                const newQty = existing.quantity + 1;
                return prev.map(item =>
                    item.product_id === product.product_id
                        ? { ...item, quantity: newQty, total_amount: netUnitPrice * newQty, discount_amount: (item.unit_price - netUnitPrice) * newQty }
                        : item
                );
            }
            return [...prev, { 
                ...product, 
                quantity: 1, 
                unit_discount: (product.unit_price - netUnitPrice),
                discount_amount: (product.unit_price - netUnitPrice),
                total_amount: totalAmount
            }];
        });
    };

    const removeFromCart = (productId: number) => {
        setCart(prev => prev.filter(item => item.product_id !== productId));
    };

    const updateQuantity = (productId: number, qty: number) => {
        setCart(prev => prev.map(item => {
            if (item.product_id === productId) {
                const newQty = Math.max(0, qty);
                
                // 1. Recalculate unit discount if we have chained discounts
                let currentUnitDiscount = item.unit_discount || 0;
                if (item.discounts && item.discounts.length > 0) {
                    const netUnitPrice = calculateChainNetPrice(item.unit_price, item.discounts);
                    currentUnitDiscount = item.unit_price - netUnitPrice;
                }

                const netUnitPrice = item.unit_price - currentUnitDiscount;
                
                return {
                    ...item,
                    quantity: newQty,
                    unit_discount: currentUnitDiscount, // Preserve the "memory"
                    discount_amount: currentUnitDiscount * newQty,
                    total_amount: netUnitPrice * newQty
                };
            }
            return item;
        }));
    };

    const totals = useMemo(() => {
        const gross = cart.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
        const discount = cart.reduce((acc, item) => acc + item.discount_amount, 0);
        return {
            gross,
            discount,
            net: gross - discount
        };
    }, [cart]);

    const handleSubmit = () => {
        const details: SalesInvoiceDetail[] = cart.map(item => ({
            detail_id: item.detail_id, // PASS THIS BACK!
            invoice_id: 0,
            product_id: {
                product_id: item.product_id,
                product_name: item.product_name,
                product_code: item.product_code
            },
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_amount: item.discount_amount,
            discount_type: item.discount_type,
            discount_type_name: item.discount_type_name,
            total_amount: item.total_amount,
            unit: item.unit?.toString() || 'PCS',
            unit_name: item.unit?.toString() || 'PCS',
            brand_name: item.brand_name,
            category_name: item.category_name,
            unit_count: item.unit_count
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
                                    Catalog <span className="text-primary/50 text-[10px] bg-primary/5 px-2 py-0.5 rounded-full">({filteredProducts.length})</span>
                                </h2>
                            </div>
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Supplier Filter</p>
                                    <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openSupplier}
                                                className="w-full justify-between h-11 bg-slate-50 dark:bg-slate-900 border-transparent rounded-xl text-xs font-black uppercase tracking-tight shadow-inner focus:ring-1 focus:ring-primary/20 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <span className="truncate">
                                                    {currentSupplierId 
                                                        ? suppliers.find((s) => s.id.toString() === currentSupplierId.toString())?.supplier_name 
                                                        : "Select Supplier..."}
                                                </span>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[350px] p-0" align="start">
                                            <Command onWheel={(e) => e.stopPropagation()}>
                                                <CommandInput placeholder="Search supplier..." className="h-9" />
                                                <CommandList>
                                                    <CommandEmpty>No supplier found.</CommandEmpty>
                                                    <CommandGroup>
                                                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                                                            {suppliers.map((s) => (
                                                                <CommandItem
                                                                    key={s.id}
                                                                    value={`${s.supplier_name} ${s.supplier_shortcut || ""} ${s.id}`}
                                                                    onSelect={() => {
                                                                        onSupplierChange(s.id.toString());
                                                                        setOpenSupplier(false);
                                                                    }}
                                                                    className="text-xs font-bold uppercase py-2.5"
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            currentSupplierId?.toString() === s.id.toString() ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {s.supplier_name} {s.supplier_shortcut && `(${s.supplier_shortcut})`}
                                                                </CommandItem>
                                                            ))}
                                                        </div>
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="relative group flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        placeholder="Search products..."
                                        className="pl-11 pr-4 h-12 bg-slate-50 dark:bg-slate-900 border-transparent focus:border-primary/30 focus:bg-white rounded-2xl transition-all text-xs font-bold shadow-inner"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
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
                                                        <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">₱{calculateChainNetPrice(Number(p.unit_price), p.discounts || []).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                        {p.discounts && p.discounts.length > 0 && (
                                                            <span className="text-[10px] font-bold text-slate-400 line-through">₱{Number(p.unit_price).toLocaleString()}</span>
                                                        )}
                                                    </div>
                                                    {/* Avail badge removed */}
                                                </div>
                                                <Button
                                                    size="icon"
                                                    className="h-11 w-11 rounded-[18px] bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/30 transition-all active:scale-90"
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
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Search:</p>
                                        <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-black border-pink-200 text-pink-600 bg-pink-50 uppercase tracking-tighter">
                                            {currentSupplierId === 'all' ? 'ALL SUPPLIERS' : (suppliers.find(s => s.id.toString() === currentSupplierId?.toString())?.supplier_name || 'CUSTOM SELECTION')}
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
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Discount Type</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-6">Total</TableHead>
                                        <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cart.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={10} className="h-[40vh] text-center">
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
                                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                                            {item.brand_name && (
                                                                <Badge variant="outline" className="text-[7px] font-black uppercase px-1 py-0 border-blue-100 bg-blue-50/50 text-blue-500 leading-none h-3.5">
                                                                    {item.brand_name}
                                                                </Badge>
                                                            )}
                                                            {item.category_name && (
                                                                <Badge variant="outline" className="text-[7px] font-black uppercase px-1 py-0 border-slate-100 bg-slate-50/50 text-slate-400 leading-none h-3.5">
                                                                    {item.category_name}
                                                                </Badge>
                                                            )}
                                                        </div>
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
                                                        min={0}
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
                                                        item.discount_amount > 0 ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600"
                                                    )}>
                                                        {item.discount_amount > 0 ? `₱${item.discount_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '0.0'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {item.discount_amount > 0 && item.discount_type_name ? (
                                                        <Badge className="text-[8px] font-black h-4 uppercase px-1.5 bg-amber-500 hover:bg-amber-600 border-none text-white">
                                                            {item.discount_type_name}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-300 italic">NONE</span>
                                                    )}
                                                </TableCell>
                                                {/* Avail cell removed */}
                                                <TableCell className="text-right font-black text-slate-900 dark:text-white pr-6">
                                                    ₱{item.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                                        Save Order
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
