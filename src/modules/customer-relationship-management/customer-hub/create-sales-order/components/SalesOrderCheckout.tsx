"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, Package, Calculator, AlertCircle, Loader2, MessageSquare } from "lucide-react";
import { formatCurrency, calculateChainNetPrice } from "../utils/priceCalc";
import { LineItem, Salesman, Customer, Supplier, ReceiptType, SalesType, Branch, PaymentTerm } from "../types";

import { OrderConfirmationDialog } from "./OrderConfirmationDialog";
import { useState } from "react";

interface SalesOrderCheckoutProps {
    orderNo: string;
    lineItems: LineItem[];
    allocatedQuantities: Record<string, number>;
    updateAllocatedQty: (id: string, qty: number) => void;
    summary: {
        totalAmount: number;     // Ordered Gross
        netAmount: number;       // Ordered Net
        discountAmount: number;  // Ordered Discount
        orderedGross: number;
        orderedNet: number;
        orderedDiscount: number;
        allocatedGross: number;
        allocatedNet: number;
        allocatedDiscount: number;
        allocatedAmount: number; // Allocated Net
        vattableSales: number;
        vatAmount: number;
    };
    onBack: () => void;
    onConfirm: (status?: "Draft" | "For Approval") => void;
    submitting: boolean;
    orderRemarks: string;
    setOrderRemarks: (val: string) => void;
    isExistingOrder?: boolean;
    existingOrderStatus?: string;
    header: {
        salesman: Salesman | null;
        account: Salesman | null;
        customer: Customer | null;
        supplier: Supplier | null;
        branch: Branch | null;
        receiptType: ReceiptType | null;
        salesType: SalesType | null;
        dueDate: string;
        deliveryDate: string;
        poNo: string;
        paymentTerms?: number | null;
        paymentTermsList?: PaymentTerm[];
    };
}

export function SalesOrderCheckout({
    orderNo, lineItems, allocatedQuantities, updateAllocatedQty,
    summary, onBack, onConfirm, submitting, header,
    orderRemarks, setOrderRemarks, isExistingOrder = false, existingOrderStatus
}: SalesOrderCheckoutProps) {
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    const allAllocationsZero = lineItems.every(item => (allocatedQuantities[item.id] ?? 0) === 0);
    const hasZeroAllocation = lineItems.some(item => (allocatedQuantities[item.id] ?? 0) === 0);

    const handleConfirmClick = () => {
        if (allAllocationsZero) {
            // 🚀 Hard rule: If absolute zero is allocated, it MUST be a Draft. Skip modal.
            console.log("[Checkout] All allocations are zero. Auto-saving to Draft.");
            onConfirm("Draft");
        } else if (hasZeroAllocation) {
            // ⚖️ Partial allocation detected. Always show modal to let user choose target status.
            console.log("[Checkout] Partial allocation detected. Showing workflow selection modal.");
            setShowConfirmDialog(true);
        } else {
            // ✅ Full allocation. Proceed directly to Approval.
            console.log("[Checkout] Full allocation detected. Proceeding to Approval.");
            onConfirm("For Approval");
        }
    };

    const handleFinalConfirm = (status: "Draft" | "For Approval") => {
        setShowConfirmDialog(false);
        onConfirm(status);
    };
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
                        {isExistingOrder ? "Modifying Draft" : "Reviewing Order"}
                    </Badge>
                </div>
            </div>

            <div className="flex flex-col gap-6 w-full">
                {/* Main Tabular Section */}
                <div className="flex flex-col gap-6">
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
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Branch</span>
                                        <span className="text-xs font-bold text-slate-700">{header.branch?.branch_name || "N/A"}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Sales Type</span>
                                        <span className="text-xs font-bold text-primary">{header.salesType?.operation_name || "Standard"}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Receipt Type</span>
                                        <span className="text-xs font-bold text-emerald-600">
                                            {/* {header.receiptType?.shortcut ? `${header.receiptType.shortcut} - ` : ""} */}
                                            {header.receiptType?.type || "Standard"}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Salesman</span>
                                        <span className="text-xs font-bold text-indigo-600">{header.account?.salesman_name || "N/A"} {header.account?.salesman_code ? `(${header.account.salesman_code})` : ""}</span>
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
                                    {header.paymentTerms !== undefined && header.paymentTerms !== null && (
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-sky-600 uppercase tracking-wider mb-1">Terms</span>
                                            <span className="text-xs font-bold text-sky-700">
                                                {header.paymentTermsList?.find(pt => Number(pt.id) === Number(header.paymentTerms))?.payment_name || `${header.paymentTerms} Days`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="flex-1 overflow-y-auto max-h-[500px] relative">
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="py-5 px-8 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50">Product Specification</TableHead>
                                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50">Unit Count</TableHead>
                                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50">Ordered</TableHead>
                                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50">Available</TableHead>
                                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-slate-900 bg-slate-100/50">Allocated</TableHead>
                                            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50">Unit Price</TableHead>
                                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50"> Discounts Type</TableHead>
                                            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 text-right">Net Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {lineItems.map((item) => {
                                            const allocatedQty = allocatedQuantities[item.id] ?? 0;
                                            // Exact Mapping Support for visual row total
                                            const allocatedTotal = (item.savedAllocatedQty !== undefined && allocatedQty === item.savedAllocatedQty && item.savedNetAmount !== undefined)
                                                ? item.savedNetAmount
                                                : calculateChainNetPrice(item.unitPrice, item.discounts) * allocatedQty;

                                            return (
                                                <TableRow key={item.id} className="hover:bg-slate-50/50 border-b group transition-colors">
                                                    <TableCell className="py-6 px-8">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors italic">
                                                                {item.product.display_name}
                                                            </span>
                                                            <div className="flex flex-wrap gap-1 mb-1">
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
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="text-[9px] font-black px-1.5 py-0 border-slate-200 text-slate-400">
                                                                    {item.uom}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="text-center font-black text-slate-600 tabular-nums">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-lg leading-none">{Number(item.product.unit_count) || Number(item.product.unit_of_measurement_count) || 1}</span>
                                                            <span className="text-[9px] text-muted-foreground uppercase font-black mt-1 tracking-widest">PCS</span>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="text-center font-black text-slate-900 tabular-nums">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-lg leading-none">{item.quantity}</span>
                                                            <span className="text-[9px] text-muted-foreground uppercase font-black mt-1 tracking-widest">{item.uom}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-slate-600 tabular-nums">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-lg leading-none">{Number(item.product.available_qty) || 0}</span>
                                                            <span className="text-[9px] text-muted-foreground uppercase font-black mt-1 tracking-widest">{item.uom}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center bg-slate-50/30 relative py-8">
                                                        {(() => {
                                                            const isExceedingOrder = allocatedQty > item.quantity;
                                                            const isExceedingStock = allocatedQty > 0 && allocatedQty > (Number(item.product.available_qty) || 0);
                                                            const hasError = isExceedingOrder || isExceedingStock;

                                                            return (
                                                                <>
                                                                    <Input
                                                                        type="number"
                                                                        className={`h-11 w-24 mx-auto text-center font-black text-base border-2 transition-all rounded-xl shadow-inner ${hasError
                                                                            ? "border-red-500 ring-red-100 ring-4 bg-red-50"
                                                                            : "border-slate-200 focus:border-primary focus:ring-primary/10 bg-white"
                                                                            }`}
                                                                        value={allocatedQty}
                                                                        onChange={(e) => updateAllocatedQty(item.id, Number(e.target.value) || 0)}
                                                                    />
                                                                    <div className="mt-1.5 flex flex-col items-center">
                                                                        <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest leading-none">{item.uom}</span>
                                                                    </div>
                                                                    {hasError && (
                                                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-1.5 flex items-center gap-1 bg-red-500 text-[9px] text-white px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-lg animate-in fade-in slide-in-from-top-1 duration-300 z-50 whitespace-nowrap">
                                                                            <AlertCircle className="w-3 h-3" />
                                                                            {isExceedingStock ? "Exceeds Stock" : "Exceeds Order Qty"}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-slate-400 tabular-nums text-xs">{formatCurrency(item.unitPrice)}</TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex flex-wrap justify-center gap-1">
                                                            {item.discountType && (
                                                                <Badge className="text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-600 border-slate-200 font-black uppercase tracking-tighter">
                                                                    {item.discountType}
                                                                </Badge>
                                                            )}
                                                            {!item.discountType && <span className="text-[10px] text-slate-300 italic">None</span>}
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
                        </CardContent>                    </Card>
                </div>

                {/* Sidebar Summary - Now Below Section */}
                <div className="w-full flex flex-col gap-6">
                    <Card className="shadow-2xl border-none bg-slate-900 text-white overflow-hidden">
                        <CardHeader className="p-8 pb-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="space-y-4 flex-1">
                                    <div className="flex items-center gap-2 text-primary/80 text-[12px] font-black uppercase tracking-[0.2em] mb-4">
                                        <Calculator className="w-4 h-4" />
                                        Payment Summary
                                    </div>
                                    <div className="flex flex-col md:flex-row md:items-center gap-8">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1 opacity-60">Ordered Gross</span>
                                            <span className="text-xl font-black tabular-nums text-slate-400 tracking-tight">{formatCurrency(summary.orderedGross)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-amber-500 font-black uppercase tracking-widest mb-1">Discount</span>
                                            </div>
                                            <span className="text-xl font-black tabular-nums text-amber-500 tracking-tight">-{formatCurrency(summary.orderedDiscount)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest mb-1 opacity-90">Net Amount</span>
                                            <span className="text-xl font-black tabular-nums text-slate-300 tracking-tight">{formatCurrency(summary.orderedNet)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1 opacity-60">VAT</span>
                                            <span className="text-lg font-black tabular-nums opacity-60 tracking-tight">{formatCurrency(summary.vatAmount)}</span>
                                        </div>
                                        <div className="flex flex-col ml-auto bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 backdrop-blur-xl">
                                            <span className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] mb-1">Allocated Amount</span>
                                            <span className="text-4xl font-black text-emerald-400 tabular-nums tracking-tighter tabular-nums underline underline-offset-[12px] decoration-emerald-500/30">
                                                {formatCurrency(summary.allocatedAmount)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-8 pt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                            {/* Order Remarks: Moved below actual fulfillment */}
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <MessageSquare className="w-3 h-3" />
                                    Order Remarks
                                </div>
                                <Textarea
                                    placeholder="Add special instructions, delivery notes, etc."
                                    className="bg-slate-800/50 border-slate-700 text-slate-200 text-sm min-h-[100px] focus:border-primary/50 transition-all resize-none rounded-xl"
                                    value={orderRemarks}
                                    onChange={(e) => setOrderRemarks(e.target.value)}
                                />
                            </div>

                            <div className="space-y-4">
                                {(() => {
                                    const anyHasError = lineItems.some(item => {
                                        const alloc = allocatedQuantities[item.id] ?? 0;
                                        const avail = Number(item.product.available_qty) || 0;
                                        return (alloc > item.quantity) || (alloc > 0 && alloc > avail);
                                    });

                                    return (
                                        <>
                                            {anyHasError && (
                                                <div className="flex items-center justify-center gap-2 text-rose-500 bg-rose-50/50 py-2 rounded-lg border border-rose-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                    <AlertCircle className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Adjust over-allocated items</span>
                                                </div>
                                            )}
                                            <Button
                                                className={`w-full h-16 text-base font-black uppercase tracking-[0.2em] shadow-2xl transition-all duration-500 rounded-xl ${anyHasError ? 'bg-slate-700 opacity-50 cursor-not-allowed text-slate-400' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:scale-[1.02] hover:shadow-emerald-500/20 active:scale-95 shadow-emerald-500/10'}`}
                                                onClick={handleConfirmClick}
                                                disabled={submitting || anyHasError}
                                            >
                                                {submitting ? (
                                                    <span className="flex items-center gap-3 animate-pulse">
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        Authenticating Order...
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-3">
                                                        SUBMIT SALES ORDER
                                                        <CheckCircle2 className="w-6 h-6 text-slate-950/50" />
                                                    </span>
                                                )}
                                            </Button>
                                        </>
                                    );
                                })()}
                                <p className="text-[10px] text-center text-slate-500 font-medium leading-relaxed italic">
                                    Finalize your allocation and select target workflow status.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <OrderConfirmationDialog
                open={showConfirmDialog}
                onClose={() => setShowConfirmDialog(false)}
                onConfirm={handleFinalConfirm}
                orderNo={orderNo}
                hasZeroAllocation={hasZeroAllocation}
                isExistingOrder={isExistingOrder}
                existingOrderStatus={existingOrderStatus}
            />
        </div>
    );
}
