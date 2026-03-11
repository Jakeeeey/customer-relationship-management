"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import {
    Package,
    Calendar,
    Store,
    AlertCircle,
    Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { salesOrderProvider } from "../providers/fetchProvider";
import { SalesOrder, Customer, Salesman, Branch, SalesOrderDetail } from "../types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SalesOrderDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: SalesOrder | null;
    customers: Customer[];
    salesmen: Salesman[];
    branches: Branch[];
}

export function SalesOrderDetailsModal({
    isOpen,
    onClose,
    order,
    customers,
    salesmen,
    branches,
}: SalesOrderDetailsModalProps) {
    const [details, setDetails] = useState<SalesOrderDetail[]>([]);
    const [invoiceData, setInvoiceData] = useState<{
        invoice: {
            invoice_no: string;
            invoice_date: string;
            salesman_id: string;
            gross_amount: number;
            vat_amount: number;
            discount_amount: number;
            net_amount: number;
        },
        details: {
            product_id: { product_name: string; product_code: string; description?: string } | null;
            unit_price: number;
            quantity: number;
            total_amount: number;
        }[]
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingInvoice, setLoadingInvoice] = useState(false);

    const isInvoiceStatus = ["For Loading", "For Shipping", "En Route", "Delivered"].includes(order?.order_status || "");

    useEffect(() => {
        if (isOpen && order) {
            if (isInvoiceStatus) {
                const loadInvoice = async () => {
                    setLoadingInvoice(true);
                    try {
                        const data = await salesOrderProvider.getInvoiceDetails(order.order_id, order.order_no);
                        setInvoiceData(data);
                    } catch (error) {
                        console.error("Failed to fetch invoice details", error);
                    } finally {
                        setLoadingInvoice(false);
                    }
                };
                loadInvoice();
            } else {
                const loadDetails = async () => {
                    setLoading(true);
                    try {
                        const data = await salesOrderProvider.getSalesOrderDetails(order.order_id);
                        setDetails(data);
                    } catch (error) {
                        console.error("Failed to fetch order details", error);
                    } finally {
                        setLoading(false);
                    }
                };
                loadDetails();
            }
        } else {
            setDetails([]);
            setInvoiceData(null);
        }
    }, [isOpen, order, isInvoiceStatus]);

    if (!order) return null;

    const customer = customers.find((c) => c.customer_code === order.customer_code);
    const salesman = salesmen.find((s) => s.id === order.salesman_id);
    const branch = branches.find((b) => b.id === order.branch_id);


    const getStatusStyle = (status: string) => {
        switch (status) {
            case "For Approval": return "bg-amber-100 text-amber-900 border-amber-200 ring-amber-500/20";
            case "Delivered": return "bg-emerald-100 text-emerald-900 border-emerald-200 ring-emerald-500/20";
            case "Cancelled": return "bg-rose-100 text-rose-900 border-rose-200 ring-rose-500/20";
            case "On Hold": return "bg-slate-100 text-slate-900 border-slate-200 ring-slate-500/20";
            default: return "bg-blue-100 text-blue-900 border-blue-200 ring-blue-500/20";
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="w-full sm:max-w-6xl max-h-[95vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
                {/* Header Section */}
                <div className="p-6 pb-4 shrink-0 bg-slate-50/50">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-lg">
                                <Clock className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black">SO No: {order.order_no}</DialogTitle>
                                <DialogDescription className="text-sm font-semibold flex items-center gap-2">
                                    <Store className="h-3 w-3" />
                                    {customer?.store_name || "Unknown Customer"}
                                    <span className="text-muted-foreground ml-1">({order.customer_code})</span>
                                </DialogDescription>
                            </div>
                        </div>
                        <Badge variant="outline" className={`
                            px-4 py-1 text-[10px] font-black shadow-sm tracking-widest
                            ${getStatusStyle(order.order_status || "").replace("ring-", "")}
                        `}>
                            {order.order_status?.toUpperCase()}
                        </Badge>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-8 pb-2">
                        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-1">
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Order Date</p>
                            <p className="font-bold text-sm">
                                {order.order_date ? new Date(order.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A"}
                            </p>
                        </div>
                        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-1">
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Fulfillment Hub</p>
                            <p className="font-bold text-sm truncate">{branch?.branch_name || "Primary Hub"}</p>
                        </div>
                        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-1">
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Handler</p>
                            <p className="font-bold text-sm truncate">{salesman?.salesman_name || "N/A"}</p>
                        </div>
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 shadow-sm flex flex-col gap-1">
                            <p className="text-[10px] text-primary uppercase font-black tracking-widest leading-none">Total Value</p>
                            <p className="font-black text-lg text-primary">{formatCurrency(order.allocated_amount || 0)}</p>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto min-h-[400px]">
                    {isInvoiceStatus ? (
                        loadingInvoice ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] animate-pulse">Reconstructing Invoice...</p>
                            </div>
                        ) : !invoiceData?.invoice ? (
                            <div className="flex flex-col items-center justify-center h-96 text-center px-12 gap-6 group">
                                <div className="p-6 bg-slate-50 rounded-full border-2 border-dashed border-slate-200 group-hover:bg-slate-100 transition-colors">
                                    <AlertCircle className="h-12 w-12 text-slate-300" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-slate-900 uppercase">Billing Record Pending</h3>
                                    <p className="text-sm text-slate-500 max-w-sm font-medium leading-relaxed">
                                        This order has been promoted to a billing state, but the physical invoice has not yet been committed to the data vault.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
                                {/* Invoice Header */}
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">SALES INVOICE</h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-primary" />
                                            {invoiceData.invoice.invoice_no}
                                        </p>
                                    </div>
                                    <div className="text-right space-y-2">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Issue Date</span>
                                            <span className="text-sm font-bold">{new Date(invoiceData.invoice.invoice_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>

                                <Separator className="bg-slate-200" />

                                {/* Invoice Table */}
                                <div className="border rounded-2xl overflow-hidden shadow-sm bg-white">
                                    <Table>
                                        <TableHeader className="bg-slate-900 border-none">
                                            <TableRow className="hover:bg-slate-900 border-none">
                                                <TableHead className="text-slate-100 font-bold pl-6 h-12 uppercase text-[10px] tracking-widest">Item Description</TableHead>
                                                <TableHead className="text-slate-100 text-right font-bold h-12 uppercase text-[10px] tracking-widest">Price</TableHead>
                                                <TableHead className="text-slate-100 text-center font-bold h-12 uppercase text-[10px] tracking-widest w-[100px]">Qty</TableHead>
                                                <TableHead className="text-slate-100 text-right font-bold h-12 uppercase text-[10px] tracking-widest pr-6 w-[150px]">Subtotal</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {invoiceData.details.map((item, idx) => (
                                                <TableRow key={idx} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                                                    <TableCell className="pl-6 py-5">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-slate-900 text-[13px]">{item.product_id?.product_name || "N/A Item"}</span>
                                                            <span className="text-[10px] text-muted-foreground font-mono font-bold tracking-tighter">{item.product_id?.product_code}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-slate-500 font-mono tracking-tight tabular-nums text-xs">
                                                        {formatCurrency(item.unit_price)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="secondary" className="font-black bg-slate-100 text-slate-700 min-w-[32px] justify-center">
                                                            {item.quantity}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-black text-slate-900 pr-6 font-mono text-sm tabular-nums tracking-tighter">
                                                        {formatCurrency(item.total_amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Financials */}
                                <div className="flex flex-col items-end space-y-3 pt-6 px-4">
                                    <div className="flex items-center gap-12 text-sm">
                                        <span className="uppercase font-black tracking-widest text-[10px] text-slate-400">Gross Total</span>
                                        <span className="font-bold text-slate-600 w-32 text-right font-mono tabular-nums">{formatCurrency(invoiceData.invoice.gross_amount)}</span>
                                    </div>
                                    <div className="flex items-center gap-12 text-sm text-rose-500">
                                        <span className="uppercase font-black tracking-widest text-[10px]"> Discount</span>
                                        <span className="font-bold w-32 text-right font-mono tabular-nums">-{formatCurrency(invoiceData.invoice.discount_amount)}</span>
                                    </div>
                                    <div className="flex items-center gap-12 text-sm">
                                        <span className="uppercase font-black tracking-widest text-[10px] text-slate-400">VAT (12%)</span>
                                        <span className="font-bold text-slate-600 w-32 text-right font-mono tabular-nums">{formatCurrency(invoiceData.invoice.vat_amount || 0)}</span>
                                    </div>
                                    <Separator className="w-64 bg-slate-200 mt-4" />
                                    <div className="flex items-center gap-12 pt-2">
                                        <span className="text-[10px] uppercase font-black tracking-[0.2em] text-primary">Total Amount</span>
                                        <span className="text-4xl font-black text-slate-950 w-64 text-right tabular-nums tracking-tighter">
                                            {formatCurrency(invoiceData.invoice.net_amount)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    ) : (
                        /* Manifest Table */
                        <div className="p-0 border-none animate-in fade-in duration-700">
                            <Table>
                                <TableHeader className="bg-slate-50/80 sticky top-0 z-10 border-b backdrop-blur-sm">
                                    <TableRow className="hover:bg-transparent border-none">
                                        <TableHead className="pl-8 h-12 uppercase text-[9px] font-black text-slate-400 tracking-[0.2em]">Product / SKU</TableHead>
                                        <TableHead className="text-right h-12 uppercase text-[9px] font-black text-slate-400 tracking-[0.2em]">Unit Price</TableHead>
                                        <TableHead className="text-center h-12 uppercase text-[9px] font-black text-slate-400 tracking-[0.2em]">Ordered</TableHead>
                                        <TableHead className="text-center h-12 uppercase text-[9px] font-black text-slate-400 tracking-[0.2em]">Allocated</TableHead>
                                        <TableHead className="text-right pr-8 h-12 uppercase text-[9px] font-black text-slate-400 tracking-[0.2em]">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 6 }).map((_, i) => (
                                            <TableRow key={i} className="border-slate-50">
                                                <TableCell className="pl-8 py-5"><div className="h-4 w-64 bg-slate-100 animate-pulse rounded" /></TableCell>
                                                <TableCell><div className="h-4 w-16 bg-slate-100 animate-pulse rounded ml-auto" /></TableCell>
                                                <TableCell><div className="h-4 w-12 bg-slate-100 animate-pulse rounded mx-auto" /></TableCell>
                                                <TableCell><div className="h-4 w-12 bg-slate-100 animate-pulse rounded mx-auto" /></TableCell>
                                                <TableCell className="pr-8"><div className="h-4 w-20 bg-slate-100 animate-pulse rounded ml-auto" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : details.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-64 text-center text-slate-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Package className="h-8 w-8 opacity-20" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest">No line items materialized for this record.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        details.map((li, idx) => {
                                            const product = li.product_id;
                                            const productName = typeof product === "object" ? product?.product_name : (product || "N/A");
                                            const productCode = typeof product === "object" ? product?.product_code : "";

                                            return (
                                                <TableRow key={li.detail_id || idx} className="hover:bg-slate-50/50 transition-colors border-slate-50 group">
                                                    <TableCell className="pl-8 py-5">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-black text-slate-900 text-[13px] group-hover:text-primary transition-colors">{productName}</span>
                                                            <span className="text-[10px] font-mono text-slate-400 font-bold tracking-tighter">{productCode}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-slate-500 font-mono tracking-tight tabular-nums text-xs">
                                                        {formatCurrency(li.unit_price)}
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-slate-400 text-xs tabular-nums">
                                                        {li.ordered_quantity}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-lg bg-emerald-50 text-emerald-700 font-black text-[11px] border border-emerald-100 tabular-nums">
                                                            {li.allocated_quantity}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-black text-slate-950 pr-8 font-mono text-sm tabular-nums tracking-tighter">
                                                        {formatCurrency(li.net_amount || 0)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-8 border-t bg-white flex flex-col sm:flex-row justify-between items-center gap-8 shrink-0 relative z-10">
                    <div className="flex items-center gap-12">
                        <div className="flex flex-col gap-1">
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Line Item Count</p>
                            <p className="font-black text-xl text-slate-900">{details.length || invoiceData?.details.length || 0}</p>
                        </div>
                        <div className="w-px h-10 bg-slate-100" />
                        <div className="flex flex-col gap-1">
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">
                                {isInvoiceStatus ? "CONSOLIDATED SETTLEMENT" : "NET PROJECTED VALUE"}
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-[11px] font-bold text-slate-300 uppercase italic">PHP</span>
                                <p className="text-4xl font-black text-slate-950 tabular-nums tracking-tighter">
                                    {formatCurrency(isInvoiceStatus ? (invoiceData?.invoice?.net_amount || 0) : (order.allocated_amount || 0)).replace("PHP", "").trim()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="font-black text-[11px] uppercase tracking-widest px-8 border-2 border-slate-200 hover:bg-slate-50 active:scale-95 transition-all h-12"
                        >
                            Close Record
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
