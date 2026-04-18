"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Trash2, Loader2, ShoppingCart } from "lucide-react";
import { formatCurrency, calculateChainNetPrice } from "../utils/priceCalc";
import { LineItem, Product } from "../types";

interface SalesOrderEncodingProps {
    products: Product[];
    loadingProducts: boolean;
    lineItems: LineItem[];
    addProduct: (product: Product, qty: number, uom: string) => void;
    removeLineItem: (id: string) => void;
    updateLineItemQty: (id: string, qty: number) => void;
    summary: { 
        totalAmount: number; 
        netAmount: number; 
        discountAmount: number;
        orderedGross: number;
        orderedNet: number;
        orderedDiscount: number;
        allocatedGross: number;
        allocatedNet: number;
        allocatedDiscount: number;
        allocatedAmount: number;
        vattableSales: number;
        vatAmount: number;
    };
    onSubmit: () => void;
    submitting: boolean;
}

export function SalesOrderEncoding({
    products, loadingProducts, lineItems,
    addProduct, removeLineItem, updateLineItemQty,
    summary, onSubmit, submitting
}: SalesOrderEncodingProps) {
    const [search, setSearch] = useState("");

    const displayProducts = Array.isArray(products)
        ? products.filter(p => {
            const pName = (p.display_name || p.product_name || "").toLowerCase();
            const pCode = (p.product_code || "").toLowerCase();
            const parentName = (p.parent_product_name || "").toLowerCase();
            const s = search.toLowerCase();
            return pName.includes(s) || pCode.includes(s) || parentName.includes(s);
        })
        : [];

    return (
        <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-3 gap-8">
            {/* Catalog Panel */}
            <div className="xl:col-span-1 lg:col-span-1 flex flex-col gap-4">
                <Card className="flex-1 flex flex-col min-h-[600px] shadow-sm">
                    <CardHeader className="p-4 flex flex-row items-center justify-between border-b">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider">
                            Product Catalog ({displayProducts.length} of {products.length})
                        </CardTitle>
                    </CardHeader>
                    <div className="p-3 border-b">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search products..."
                                className="pl-9 h-9 text-xs"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <CardContent className="p-0 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar">
                        {loadingProducts ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" />
                                <span className="text-xs">Loading products...</span>
                            </div>
                        ) : displayProducts.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-xs italic">No matching products found.</div>
                        ) : (
                            <div className="divide-y">
                                {displayProducts.map((p) => {
                                    const netPrice = calculateChainNetPrice(p.base_price, p.discounts || []);
                                    const hasDiscount = netPrice < p.base_price;

                                    return (
                                        <div key={p.product_id} className="p-3 hover:bg-muted/30 transition-colors group relative border-l-2 border-transparent hover:border-primary">
                                            <div className="flex flex-col pr-10">
                                                <span className="font-bold text-sm leading-tight text-foreground">
                                                    {p.display_name}
                                                </span>

                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {p.brand_name && (
                                                        <Badge variant="outline" className="text-[7px] font-black uppercase px-1 py-0 border-blue-100 bg-blue-50/50 text-blue-500 leading-none">
                                                            {p.brand_name}
                                                        </Badge>
                                                    )}
                                                    {p.category_name && (
                                                        <Badge variant="outline" className="text-[7px] font-black uppercase px-1 py-0 border-slate-100 bg-slate-50/50 text-slate-400 leading-none">
                                                            {p.category_name}
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            {hasDiscount && (
                                                                <span className="text-xs text-muted-foreground line-through opacity-70">
                                                                    {formatCurrency(p.base_price)}
                                                                </span>
                                                            )}
                                                            <span className="text-sm font-bold text-emerald-600">
                                                                {formatCurrency(netPrice)}
                                                            </span>
                                                        </div>
                                                        <span className="text-[9px] text-muted-foreground font-black tracking-tighter">
                                                            {p.uom || ''}
                                                            <span className="ml-2 text-indigo-500">• Avail: {Number(p.available_qty) || 0}</span>
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-1 items-center">
                                                        {/* Discount badge removed */}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-primary hover:text-white transition-all shadow-sm"
                                                onClick={() => addProduct(p, 1, p.uom || "PCS")}
                                            >
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card >
            </div >

            {/* Cart Panel */}
            < div className="xl:col-span-3 lg:col-span-2 flex flex-col gap-4" >
                <Card className="flex-1 flex flex-col shadow-sm border-primary/20">
                    <CardHeader className="p-4 flex flex-row items-center justify-between border-b bg-primary/5">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4 text-primary" />
                            <CardTitle className="text-sm font-bold uppercase tracking-wider">Order Items</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 flex flex-col min-h-[400px]">
                        <div className="flex-1 overflow-y-auto max-h-[600px] relative border-b">
                            <Table>
                                <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead className="text-[10px] font-black uppercase bg-muted/50">Product Desc</TableHead>

                                        <TableHead className="text-center text-[10px] font-black uppercase bg-muted/50">UOM</TableHead>
                                        <TableHead className="text-center text-[10px] font-black uppercase bg-muted/50">UC</TableHead>
                                        <TableHead className="text-center text-[10px] font-black uppercase w-[100px] bg-muted/50">Qty</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase bg-muted/50">Unit Price</TableHead>
                                        <TableHead className="text-center text-[10px] font-black uppercase bg-muted/50">Discounts</TableHead>
                                        <TableHead className="text-center text-[10px] font-black uppercase bg-muted/50">Available</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase bg-muted/50">Total</TableHead>
                                        <TableHead className="w-[50px] bg-muted/50"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lineItems.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-muted/10">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-[11px] leading-tight text-slate-900">{item.product.display_name}</span>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {item.product.brand_name && (
                                                            <Badge variant="outline" className="text-[7px] font-black uppercase px-1 py-0 border-blue-100 bg-blue-50/50 text-blue-500">
                                                                {item.product.brand_name}
                                                            </Badge>
                                                        )}
                                                        {item.product.category_name && (
                                                            <Badge variant="outline" className="text-[7px] font-black uppercase px-1 py-0 border-slate-100 bg-slate-50/50 text-slate-400">
                                                                {item.product.category_name}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-center border-x border-muted/20">
                                                <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 border-slate-200 text-slate-500 whitespace-nowrap">
                                                    {item.uom}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center text-[10px] font-black text-indigo-500 border-r border-muted/20">
                                                {Number(item.product.unit_count) || 1}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Input
                                                    type="number"
                                                    className="h-9 w-24 mx-auto text-center font-black border-2 focus:border-primary transition-all shadow-sm"
                                                    value={item.quantity}
                                                    onChange={(e) => updateLineItemQty(item.id, Number(e.target.value) || 0)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right text-[11px] font-medium text-slate-500 tabular-nums">{formatCurrency(item.unitPrice)}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-wrap justify-center gap-1">
                                                    {item.discountType && (
                                                        <Badge className="text-[9px] px-1.5 py-0.5 bg-success/10 text-success border-success/20 dark:bg-success/20 dark:text-success dark:border-success/30 font-black uppercase tracking-tighter">
                                                            {item.discountType}
                                                        </Badge>
                                                    )}
                                                    {!item.discountType && <span className="text-[10px] text-muted-foreground italic">none</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center border-l border-muted/20">
                                                <span className={`text-[10px] font-black tabular-nums ${(Number(item.product.available_qty) || 0) > 0 ? "text-foreground" : "text-destructive"}`}>
                                                    {Number(item.product.available_qty) || 0}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right text-[11px] font-black text-foreground tabular-nums">{formatCurrency(item.netAmount)}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => removeLineItem(item.id)}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {lineItems.length === 0 && (
                                        <TableRow>
                                            <td colSpan={9} className="py-20 text-center text-muted-foreground text-xs italic">
                                                Cart is empty. Select products from the catalog to begin.
                                            </td>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>

                    {/* Summary Footer */}
                    <div className="p-6 bg-muted/20 border-t grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-muted-foreground">Gross Amount</span>
                            <span className="font-bold text-lg">{formatCurrency(summary.orderedGross)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-amber-600">Order Discount</span>
                            <span className="font-bold text-lg text-amber-600">-{formatCurrency(summary.orderedDiscount)}</span>
                        </div>
                        <div className="flex flex-col bg-primary/10 p-3 rounded-lg border border-primary/30">
                            <span className="text-[10px] font-black uppercase text-primary">Net Amount</span>
                            <span className="text-2xl font-black text-primary">{formatCurrency(summary.orderedNet)}</span>
                        </div>
                        <Button
                            className="h-14 text-lg font-black shadow-xl"
                            size="lg"
                            disabled={lineItems.length === 0 || submitting}
                            onClick={onSubmit}
                        >
                            {submitting ? <Loader2 className="animate-spin mr-2" /> : null}
                            {submitting ? "Processing..." : "SUBMIT ORDER"}
                        </Button>
                    </div>
                </Card>
            </div >
        </div >
    );
}
