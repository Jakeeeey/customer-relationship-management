"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, Package, Calculator, AlertCircle, Loader2, MessageSquare } from "lucide-react";
import { formatCurrency, calculateChainNetPrice } from "../utils/priceCalc";
import { LineItem, Salesman, Customer, Supplier, ReceiptType, SalesType } from "../types";

interface SalesOrderCheckoutProps {
    orderNo: string;
    lineItems: LineItem[];
    allocatedQuantities: Record<string, number>;
    inventory?: Record<number, number>;
    updateAllocatedQty: (id: string, qty: number) => void;
    summary: {
        totalAmount: number;
        netAmount: number;
        discountAmount: number;
        allocatedAmount: number;
        orderedGross: number;
        orderedNet: number;
        allocatedGross: number;
        allocatedNet: number;
        allocatedDiscount: number;
    };
    onBack: () => void;
    onConfirm: () => void;
    submitting: boolean;
    isValidAllocation: boolean;
    orderRemarks: string;
    setOrderRemarks: (val: string) => void;
    header: {
        salesman: Salesman | null;
        account: Salesman | null;
        customer: Customer | null;
        supplier: Supplier | null;
        receiptType: ReceiptType | null;
        salesType: SalesType | null;
        dueDate: string;
        deliveryDate: string;
        poNo: string;
    };
}

export function SalesOrderCheckout({
    orderNo, lineItems, allocatedQuantities, inventory = {}, updateAllocatedQty,
    summary, onBack, onConfirm, submitting, header, isValidAllocation,
    orderRemarks, setOrderRemarks
}: SalesOrderCheckoutProps) {
    return (
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
            {/* Minimal Header */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={onBack} disabled={submitting} className="group text-muted-foreground hover:text-primary transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Encoding
                </Button>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="px-3 py-1 text-xs font-bold border-primary/30 text-primary bg-primary/5 uppercase tracking-widest">
                        Reviewing Order
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Main Tabular Section */}
                <div className="xl:col-span-3 flex flex-col gap-6">
                    <Card className="shadow-2xl border-none bg-white/80 backdrop-blur-md overflow-hidden">
                        <CardHeader className="p-8 border-b bg-gradient-to-r from-slate-50 to-white">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-primary/60 text-[10px] font-black uppercase tracking-[0.2em]">
                                        <Package className="w-3 h-3" />
                                        Document Identifier
                                    </div>
                                    <h1 className="text-4xl font-black tracking-tighter text-slate-900">{orderNo}</h1>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Customer</span>
                                        <span className="text-xs font-bold text-slate-700">{header.customer?.customer_name || "N/A"}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Supplier</span>
                                        <span className="text-xs font-bold text-slate-700">{header.supplier?.supplier_name || "N/A"}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Sales Type</span>
                                        <span className="text-xs font-bold text-primary">{header.salesType?.operation_name || "Standard"}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Receipt Type</span>
                                        <span className="text-xs font-bold text-emerald-600">
                                            {header.receiptType?.shortcut ? `${header.receiptType.shortcut} - ` : ""}
                                            {header.receiptType?.type || "Standard"}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Account Rep</span>
                                        <span className="text-xs font-bold text-indigo-600">{header.account?.salesman_name || "N/A"}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Delivery Date</span>
                                        <span className="text-xs font-bold text-orange-600">{header.deliveryDate || "N/A"}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Due Date</span>
                                        <span className="text-xs font-bold text-slate-700">{header.dueDate || "N/A"}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">PO#</span>
                                        <span className="text-xs font-bold text-slate-700">{header.poNo || "N/A"}</span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="flex-1 overflow-y-auto max-h-[500px] relative">
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="py-5 px-8 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50">Product Specification</TableHead>
                                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50">Available</TableHead>
                                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50">Ordered</TableHead>
                                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-slate-900 bg-slate-100/50">Allocated</TableHead>
                                            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50">Unit Price</TableHead>
                                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50">Applied Discounts</TableHead>
                                            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 text-right">Allocated Net</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {lineItems.map((item) => {
                                            const allocatedQty = allocatedQuantities[item.id] ?? item.quantity;
                                            const netPrice = calculateChainNetPrice(item.unitPrice, item.discounts);
                                            const allocatedTotal = netPrice * allocatedQty;

                                            return (
                                                <TableRow key={item.id} className="hover:bg-slate-50/50 border-b group transition-colors">
                                                    <TableCell className="py-6 px-8">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors italic">
                                                                {item.product.display_name}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="text-[9px] font-black px-1.5 py-0 border-slate-200 text-slate-400">
                                                                    {item.uom}
                                                                </Badge>
                                                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">
                                                                    {item.discountType}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="text-center border-x border-slate-50">
                                                        <Badge variant="secondary" className="text-[11px] font-black bg-slate-100 text-slate-600">
                                                            {inventory[item.product.product_id] !== undefined ? inventory[item.product.product_id] : 0}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-slate-400 tabular-nums">{item.quantity}</TableCell>
                                                    <TableCell className="text-center bg-slate-50/30 relative py-8">
                                                        <Input
                                                            type="number"
                                                            className={`h-11 w-24 mx-auto text-center font-black text-base border-2 transition-all rounded-xl shadow-inner ${allocatedQty > item.quantity
                                                                ? "border-red-500 ring-red-100 ring-4 bg-red-50"
                                                                : "border-slate-200 focus:border-primary focus:ring-primary/10 bg-white"
                                                                }`}
                                                            value={allocatedQty}
                                                            onChange={(e) => updateAllocatedQty(item.id, Number(e.target.value) || 0)}
                                                        />
                                                        {allocatedQty > item.quantity && (
                                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-1.5 flex items-center gap-1 bg-red-500 text-[7px] text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-lg animate-in fade-in slide-in-from-top-1 duration-300 z-50">
                                                                <AlertCircle className="w-2 h-2" />
                                                                Limit Exceeded
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-slate-400 tabular-nums text-xs">{formatCurrency(item.unitPrice)}</TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex flex-wrap justify-center gap-1">
                                                            {item.discounts.map((d, i) => (
                                                                <Badge key={i} className="text-[8px] px-1 py-0 bg-slate-100 text-slate-600 border-slate-200 font-bold">
                                                                    -{d}%
                                                                </Badge>
                                                            ))}
                                                            {item.discounts.length === 0 && <span className="text-[10px] text-slate-300 italic">None</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right py-6 px-8">
                                                        <span className="font-black text-sm text-slate-900 tabular-nums">
                                                            {formatCurrency(allocatedTotal)}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Summary */}
                <div className="xl:col-span-1 flex flex-col gap-6">
                    <Card className="shadow-2xl border-none bg-slate-900 text-white overflow-hidden sticky top-6">
                        <CardHeader className="p-8 pb-4">
                            <div className="flex items-center gap-2 text-primary/80 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                                <Calculator className="w-3 h-3" />
                                Payment Summary
                            </div>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center group">
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider group-hover:text-slate-300 transition-colors">Gross Amount</span>
                                    {/* Gross Amount: Base sa Ordered Quantity */}
                                    <span className="text-sm font-bold tabular-nums">{formatCurrency(summary.orderedGross)}</span>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-amber-500 font-bold uppercase tracking-wider group-hover:text-amber-400 transition-colors">Tier Discounts</span>
                                        <span className="text-[9px] text-slate-500 font-bold">Allocated Deductions</span>
                                    </div>
                                    {/* Allocated Discount: Discount na para lang sa allocated quantity */}
                                    <span className="text-sm font-bold tabular-nums text-amber-500">-{formatCurrency(summary.allocatedDiscount)}</span>
                                </div>
                                <div className="pt-6 border-t border-slate-800 space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            <MessageSquare className="w-3 h-3" />
                                            Order Remarks
                                        </div>
                                        {/* Dito pwedeng mag-input ng special instructions para sa order */}
                                        <Textarea
                                            placeholder="Add special instructions, delivery notes, etc."
                                            className="bg-slate-800/50 border-slate-700 text-slate-200 text-xs min-h-[80px] focus:border-primary/50 transition-all resize-none"
                                            value={orderRemarks}
                                            onChange={(e) => setOrderRemarks(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Order Total</span>
                                            <span className="text-xs text-slate-300 font-medium tabular-nums opacity-60">Full Fulfillment (Net)</span>
                                        </div>
                                        {/* Order Total: Net amount base sa buong ordered quantity */}
                                        <span className="text-base font-bold text-slate-400 tabular-nums">
                                            {formatCurrency(summary.orderedNet)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pt-4 border-t border-slate-800/50">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-primary font-black uppercase tracking-widest">Actual Fulfillment</span>
                                            <span className="text-xs text-slate-400 font-medium">Grand Total (Net)</span>
                                        </div>
                                        {/* Actual Fulfillment: Net amount base sa allocated quantity (Grand Total) */}
                                        <span className="text-3xl font-black text-emerald-400 tabular-nums tracking-tighter decoration-emerald-500/30 underline underline-offset-8">
                                            {formatCurrency(summary.allocatedNet)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 pt-6">
                            <div className="space-y-4">
                                <Button
                                    className={`w-full h-16 text-sm font-black uppercase tracking-[0.2em] shadow-2xl transition-all duration-500 rounded-xl ${!isValidAllocation
                                        ? "bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700 shadow-none"
                                        : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:scale-[1.02] hover:shadow-emerald-500/20 active:scale-95 shadow-emerald-500/10"
                                        }`}
                                    onClick={onConfirm}
                                    disabled={submitting || !isValidAllocation}
                                >
                                    {submitting ? (
                                        <span className="flex items-center gap-3 animate-pulse">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Authenticating Order...
                                        </span>
                                    ) : !isValidAllocation ? (
                                        <span className="flex items-center gap-2 opacity-50">
                                            <AlertCircle className="w-4 h-4" />
                                            Check Allocation Limits
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-3">
                                            Commit Sales Order
                                            <CheckCircle2 className="w-6 h-6 text-slate-950/50" />
                                        </span>
                                    )}
                                </Button>
                                <p className="text-[9px] text-center text-slate-500 font-medium px-4 leading-relaxed italic">
                                    By confirming, this order will be set to <strong className="text-slate-400 not-italic uppercase tracking-wider">For Approval</strong> status and synced with the central ERP.
                                </p>
                            </div>
                        </CardContent>
                    </Card>



                </div>
            </div>
        </div>
    );
}
