"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Plus,
    Trash2,
    Loader2,
    ShoppingCart,
    Package,
    Printer
} from "lucide-react";
import { formatCurrency, calculateChainNetPrice } from "../utils";
import { SearchProduct, CartItem } from "../types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DealerSalesInvoiceEncodingProps {
    catalogProducts: SearchProduct[];
    isSearching: boolean;

    cart: CartItem[];
    addToCart: (product: SearchProduct) => void;
    removeFromCart: (productId: number) => void;
    updateCartQuantity: (productId: number, qty: number) => void;

    summary: {
        totalGross: number;
        totalDiscount: number;
        totalNet: number;
        totalVattable?: number;
        totalVat?: number;
    };
    isVatApplicable?: boolean;

    isHeaderComplete: boolean;
    /** Opens the Print Preview modal — replaces the old Create Invoice direct-save button */
    onPrintPreview: () => void;

    maxLength?: number;
    isLimitReached?: boolean;
}

export function DealerSalesInvoiceEncoding({
    catalogProducts,
    isSearching,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    summary,
    isVatApplicable = true,
    isHeaderComplete,
    onPrintPreview,
    maxLength = Infinity,
    isLimitReached = false
}: DealerSalesInvoiceEncodingProps) {
    const [searchQuery, setSearchQuery] = React.useState("");

    // Client-side filtering (Sales Order Parity)
    const filteredProducts = React.useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return catalogProducts;

        const terms = q.split(/\s+/).filter(Boolean);
        return catalogProducts.filter(p => {
            const pName = (p.product_name || "").toLowerCase();
            const pCode = (p.product_code || "").toLowerCase();
            const pDesc = (p.description || "").toLowerCase();
            
            return terms.every(term => 
                pName.includes(term) || pCode.includes(term) || pDesc.includes(term)
            );
        });
    }, [catalogProducts, searchQuery]);

    if (!isHeaderComplete) {
        return (
            <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[32px] bg-slate-50/50 border-slate-200 opacity-60">
                <div className="p-4 rounded-full bg-primary/10 mb-4 text-primary">
                    <Loader2 className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Waiting for selection</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tight">Please complete the header details above to start encoding products.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-3 gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Catalog Panel */}
            <div className="xl:col-span-1 lg:col-span-1 flex flex-col gap-4">
                <Card className="flex flex-col min-h-[750px] shadow-sm border-slate-100 overflow-hidden rounded-[32px]">
                    <CardHeader className="p-4 flex flex-row items-center justify-between border-b bg-slate-50/50">
                        <CardTitle className="flex items-center justify-between w-full">
                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                                Product Catalog ({filteredProducts.length})
                            </span>
                            {isLimitReached && maxLength !== Infinity && (
                                <Badge variant="secondary" className="bg-rose-50 text-rose-500 border-rose-100 text-[8px] font-black uppercase tracking-tighter">
                                    Limit Reached
                                </Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <div className="p-3 space-y-4">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Search products..."
                                className="pl-10 pr-4 h-10 rounded-xl bg-slate-50 border-none font-bold text-[11px] uppercase shadow-inner"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <CardContent className="p-0 flex-1 overflow-hidden">
                        <ScrollArea className="flex-1 h-[650px] px-3">
                            <div className="space-y-2 pb-4">
                                {isSearching ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-40">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Fetching Products...</p>
                                    </div>
                                ) : filteredProducts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-2 opacity-20">
                                        <Package className="h-8 w-8 text-slate-400" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No products found</p>
                                    </div>
                                ) : (
                                    filteredProducts.map(product => {
                                        const isInCart = cart.some(item => item.product_id === product.product_id);
                                        const isActionDisabled = isLimitReached && !isInCart;

                                        return (
                                            <div
                                                key={product.product_id}
                                                className={`p-4 transition-all cursor-pointer group relative border rounded-2xl shadow-sm ${
                                                    isActionDisabled 
                                                        ? 'opacity-40 grayscale-[0.5] bg-slate-100/50 cursor-not-allowed border-slate-200' 
                                                        : 'hover:bg-slate-50 border-slate-200 cursor-pointer'
                                                }`}
                                                onClick={() => !isActionDisabled && addToCart(product)}
                                            >
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex-1 flex flex-col min-w-0">
                                                        <span className="font-bold text-[12px] uppercase text-slate-900 leading-tight">
                                                            {product.description || product.product_name} <span className="text-primary/60 ml-1">({product.unit})</span>
                                                        </span>
                                                        
                                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                                            <Badge variant="outline" className="text-[7px] font-black uppercase px-1 py-0 border-slate-200 text-slate-400">
                                                                {product.product_code}
                                                            </Badge>
                                                            {product.brand_name && (
                                                                <Badge variant="outline" className="text-[7px] font-black uppercase px-1 py-0 border-blue-100 bg-blue-50/50 text-blue-500 leading-none">
                                                                    {product.brand_name}
                                                                </Badge>
                                                            )}
                                                            {product.category_name && (
                                                                <Badge variant="outline" className="text-[7px] font-black uppercase px-1 py-0 border-slate-100 bg-slate-50/50 text-slate-400 leading-none">
                                                                    {product.category_name}
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-col mt-3">
                                                            {(() => {
                                                                const netPrice = calculateChainNetPrice(product.unit_price, product.discounts || []);
                                                                const hasDiscount = netPrice < product.unit_price;
                                                                return (
                                                                    <div className="flex flex-col">
                                                                        {hasDiscount && (
                                                                            <span className="text-[10px] text-slate-400 line-through leading-none mb-0.5">
                                                                                {formatCurrency(product.unit_price)}
                                                                            </span>
                                                                        )}
                                                                        <span className={`text-[13px] font-black leading-none ${hasDiscount ? 'text-teal-600' : 'text-slate-900'}`}>
                                                                            {formatCurrency(netPrice)}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="icon"
                                                        disabled={isActionDisabled}
                                                        className={`h-8 w-8 shrink-0 rounded-xl shadow-lg transition-all active:scale-95 ${
                                                            isActionDisabled
                                                                ? 'bg-slate-300 text-slate-500 shadow-none'
                                                                : 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20'
                                                        }`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!isActionDisabled) addToCart(product);
                                                        }}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* Cart Panel */}
            <div className="xl:col-span-3 lg:col-span-2 flex flex-col gap-4">
                <Card className="flex-1 flex flex-col min-h-[750px] shadow-sm border-primary/10 overflow-hidden rounded-[32px]">
                    <CardHeader className="p-5 border-b bg-primary/5 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                <ShoppingCart className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900">Order Items</CardTitle>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Summary of pending transaction</p>
                            </div>
                        </div>
                        <Badge 
                            variant="outline" 
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                isLimitReached && maxLength !== Infinity
                                    ? 'bg-rose-50 text-rose-500 border-rose-200 animate-pulse' 
                                    : 'bg-primary/10 text-primary border-primary/20'
                            }`}
                        >
                            {cart.length}{maxLength !== Infinity ? ` / ${maxLength}` : ""} ITEMS
                        </Badge>
                    </CardHeader>

                    <CardContent className="p-0 flex flex-col overflow-hidden">
                        <div className="overflow-auto h-[600px] custom-scrollbar">
                            <Table>
                                        <TableHeader className="bg-slate-50/50 sticky top-0 z-10 shadow-sm backdrop-blur-md">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest py-5 pl-8">Product Desc</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Unit</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">UC</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-center w-32">Qty</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Unit Price</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Discounts</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Discount Type</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-8">Total</TableHead>
                                                <TableHead className="w-[80px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {cart.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="h-[500px]">
                                                        <div className="flex flex-col items-center justify-center gap-4 opacity-20">
                                                            <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center">
                                                                <ShoppingCart className="h-8 w-8 text-slate-400" />
                                                            </div>
                                                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Cart is Empty</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                cart.map(item => (
                                                    <TableRow key={item.product_id} className="group hover:bg-slate-50/50 transition-colors">
                                                        <TableCell className="py-5 pl-8">
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-[11px] uppercase text-slate-900 leading-tight">
                                                                    {item.description || item.product_name} <span className="text-primary/60 ml-1">({item.unit})</span>
                                                                </span>
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.product_code}</span>
                                                                    {item.brand_name && (
                                                                        <Badge variant="outline" className="text-[7px] font-black uppercase px-1 py-0 border-blue-100 bg-blue-50/50 text-blue-500 leading-none">
                                                                            {item.brand_name}
                                                                        </Badge>
                                                                    )}
                                                                    {item.category_name && (
                                                                        <Badge variant="outline" className="text-[7px] font-black uppercase px-1 py-0 border-slate-100 bg-slate-50/50 text-slate-400 leading-none">
                                                                            {item.category_name}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="outline" className="text-[9px] font-black uppercase bg-white border-slate-100 text-slate-400 px-2">{item.unit}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center text-[10px] font-black text-indigo-500 tabular-nums">
                                                            {item.unit_count || 1}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Input
                                                                type="number"
                                                                className="h-10 w-24 mx-auto text-center font-black text-sm bg-slate-50 border-slate-200 rounded-lg focus-visible:ring-primary/20 shadow-inner"
                                                                value={item.quantity}
                                                                onChange={(e) => updateCartQuantity(item.product_id, parseInt(e.target.value) || 0)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right text-[11px] font-black text-slate-500 tabular-nums">{formatCurrency(item.unit_price)}</TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex flex-wrap justify-center gap-1">
                                                                {(() => {
                                                                    const netPrice = calculateChainNetPrice(item.unit_price, item.discounts || []);
                                                                    const saving = item.unit_price - netPrice;
                                                                    
                                                                    if (saving > 0) {
                                                                        return (
                                                                            <Badge variant="secondary" className="text-[8px] font-black bg-rose-500 text-white border-rose-600 px-1.5 py-0.5 shadow-sm shadow-rose-500/20">
                                                                                {formatCurrency(saving)}
                                                                            </Badge>
                                                                        );
                                                                    }
                                                                    return <span className="text-[9px] font-black text-slate-300 uppercase italic">0.0</span>;
                                                                })()}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {item.discount_type_name ? (
                                                                <Badge className="text-[8px] font-black bg-amber-50 text-amber-600 border-amber-100 px-1.5 py-0.5 uppercase">
                                                                    {item.discount_type_name}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-[9px] font-black text-slate-300 uppercase italic">NONE</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right pr-8">
                                                            <span className="text-sm font-black text-slate-900 tabular-nums">{formatCurrency(item.total_amount)}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-rose-300 hover:text-rose-500 opacity-100 transition-all hover:bg-rose-50 rounded-lg"
                                                                onClick={() => removeFromCart(item.product_id)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                            </Table>
                        </div>

                        {/* Summary Footer (Sales Order Logic Parity) */}
                        <div className="p-8 bg-slate-50/50 border-t flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-8 md:gap-16">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Gross Total</span>
                                    <span className="font-black text-lg text-slate-900 tabular-nums">{formatCurrency(summary.totalGross)}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-rose-500 tracking-[0.2em] mb-1">Discount</span>
                                    <span className="font-black text-lg text-rose-600 tabular-nums">-{formatCurrency(summary.totalDiscount)}</span>
                                </div>
                                {isVatApplicable && (
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">VAT (12%)</span>
                                        <span className="font-black text-lg text-slate-600 tabular-nums">{formatCurrency(summary.totalVat || 0)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
                                <div className="flex flex-col bg-slate-900 text-white p-5 rounded-2xl shadow-xl shadow-slate-900/20 w-full md:w-64 text-center md:text-left">
                                    <span className="text-[10px] font-black uppercase text-primary/80 tracking-[0.3em] mb-1">Net Amount</span>
                                    <span className="text-2xl font-black tabular-nums tracking-tighter">{formatCurrency(summary.totalNet)}</span>
                                </div>
                                <Button
                                    disabled={cart.length === 0}
                                    className="h-16 px-10 rounded-2xl bg-indigo-600 text-white font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-30 w-full md:w-auto flex items-center gap-3"
                                    onClick={onPrintPreview}
                                >
                                    <Printer className="h-5 w-5" />
                                    Print Preview
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
