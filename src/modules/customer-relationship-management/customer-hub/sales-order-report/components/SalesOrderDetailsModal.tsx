"use client";

import React, { useState, useEffect } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
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
import { Package, Truck, Calendar, User, Store, MessageSquare, AlertCircle } from "lucide-react";
import { salesOrderProvider } from "../providers/fetchProvider";
import { SalesOrder, Customer, Salesman, Branch, SalesOrderDetail } from "../types";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

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
    const [invoiceData, setInvoiceData] = useState<{ invoice: any, details: any[] } | null>(null);
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

    const columns: ColumnDef<SalesOrderDetail>[] = [
        {
            accessorKey: "product_id",
            header: "Product",
            cell: ({ row }: { row: { original: SalesOrderDetail } }) => {
                const product = row.original.product_id;
                return (
                    <div className="flex flex-col">
                        <span className="font-bold text-xs italic">
                            {typeof product === "object" ? product.product_name : product}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                            {typeof product === "object" ? product.product_code : ""}
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: "ordered_quantity",
            header: "Qty",
            cell: ({ row }: { row: { original: SalesOrderDetail } }) => <div className="text-center font-mono">{row.original.ordered_quantity}</div>,
        },
        {
            accessorKey: "allocated_quantity",
            header: "Alloc",
            cell: ({ row }: { row: { original: SalesOrderDetail } }) => (
                <div className="text-center font-bold text-primary tabular-nums">
                    {row.original.allocated_quantity}
                </div>
            ),
        },
        {
            accessorKey: "unit_price",
            header: "Price",
            cell: ({ row }: { row: { original: SalesOrderDetail } }) => <div className="text-right font-mono text-[11px]">{formatCurrency(row.original.unit_price)}</div>,
        },
        {
            accessorKey: "discount_amount",
            header: "Disc",
            cell: ({ row }: { row: { original: SalesOrderDetail } }) => <div className="text-right font-mono text-[11px] text-muted-foreground">{formatCurrency(row.original.discount_amount)}</div>,
        },
        {
            accessorKey: "net_amount",
            header: "Net",
            cell: ({ row }: { row: { original: SalesOrderDetail } }) => <div className="text-right font-bold font-mono text-[11px]">{formatCurrency(row.original.net_amount)}</div>,
        },
    ];

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="sm:max-w-xl w-full p-0 flex flex-col gap-0 border-l shadow-2xl overflow-hidden">
                <SheetHeader className="p-6 pb-4 bg-slate-50/50 border-b shrink-0">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded border border-primary/10">Sales Order Detail</span>
                        </div>
                        <SheetTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                            {order.order_no}
                            <Badge variant="outline" className={`text-[10px] font-bold uppercase ${order.order_status === "For Approval" ? "bg-yellow-100 text-yellow-800 border-yellow-200" : "bg-emerald-100 text-emerald-800 border-emerald-200"}`}>
                                {order.order_status}
                            </Badge>
                        </SheetTitle>
                        <SheetDescription className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            Created on {order.created_date ? new Date(order.created_date).toLocaleString() : "-"}
                        </SheetDescription>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {isInvoiceStatus ? (
                        loadingInvoice ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-3">
                                <Package className="h-8 w-8 animate-spin text-primary" />
                                <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Generating Invoice...</span>
                            </div>
                        ) : !invoiceData?.invoice ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-4">
                                <AlertCircle className="h-12 w-12 opacity-20" />
                                <p className="italic text-lg">Billing record not found for this status.</p>
                            </div>
                        ) : (
                            <div className="p-4 space-y-8 bg-white rounded-2xl border shadow-sm mx-2">
                                <div className="flex justify-between items-start pt-2 px-2">
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic underline decoration-primary decoration-4">SALES INVOICE</h2>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Inv No:</span>
                                            <span className="text-sm font-black text-primary">{invoiceData.invoice.invoice_no}</span>
                                        </div>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <div className="flex items-center gap-2 justify-end">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date:</span>
                                            <span className="text-xs font-bold">{invoiceData.invoice.invoice_date ? new Date(invoiceData.invoice.invoice_date).toLocaleDateString() : "-"}</span>
                                        </div>
                                        <div className="flex items-center gap-2 justify-end">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Salesman:</span>
                                            <span className="text-xs font-bold">{salesman?.salesman_name || invoiceData.invoice.salesman_id}</span>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="overflow-hidden border rounded-xl overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-900">
                                            <TableRow className="hover:bg-slate-900 border-none">
                                                <TableHead className="text-slate-100 font-bold h-10 px-4">Description</TableHead>
                                                <TableHead className="text-slate-100 text-right font-bold h-10">Price</TableHead>
                                                <TableHead className="text-slate-100 text-center font-bold h-10">Qty</TableHead>
                                                <TableHead className="text-slate-100 text-right font-bold h-10 pr-4">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {invoiceData.details.map((item, idx) => (
                                                <TableRow key={idx} className="border-slate-100 hover:bg-slate-50">
                                                    <TableCell className="py-3 px-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-800">{(item.product_id as any)?.product_name || "Product"}</span>
                                                            <span className="text-[10px] text-muted-foreground font-mono">{(item.product_id as any)?.description || (item.product_id as any)?.product_code}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-slate-600 tabular-nums">{formatCurrency(item.unit_price)}</TableCell>
                                                    <TableCell className="text-center font-black text-slate-900 tabular-nums">{item.quantity}</TableCell>
                                                    <TableCell className="text-right font-black text-slate-950 pr-4 tabular-nums">{formatCurrency(item.total_amount)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="flex flex-col items-end gap-1 px-2 pb-2">
                                    <div className="flex justify-between w-64 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                                        <span>Gross Total</span>
                                        <span className="text-slate-600 tabular-nums">{formatCurrency(invoiceData.invoice.gross_amount)}</span>
                                    </div>
                                    <div className="flex justify-between w-64 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                                        <span>VAT Amount</span>
                                        <span className="text-slate-600 tabular-nums">{formatCurrency(invoiceData.invoice.vat_amount || 0)}</span>
                                    </div>
                                    <div className="flex justify-between w-64 text-[11px] font-bold text-destructive uppercase tracking-tight">
                                        <span>Discount</span>
                                        <span className="tabular-nums">-{formatCurrency(invoiceData.invoice.discount_amount)}</span>
                                    </div>
                                    <div className="h-4" />
                                    <div className="flex justify-between items-center w-80 pt-4 border-t-2 border-slate-900">
                                        <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Invoice Net Total</span>
                                        <span className="text-2xl font-black text-slate-900 tabular-nums tracking-tighter">{formatCurrency(invoiceData.invoice.net_amount)}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border bg-card/50 shadow-sm space-y-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">
                                            <Store className="w-3 h-3 inline mr-1" /> Customer
                                        </span>
                                        <span className="text-sm font-bold text-slate-900 leading-tight">{customer?.store_name || order.customer_code}</span>
                                        <span className="text-[11px] font-medium text-slate-500 font-mono mt-0.5">{order.customer_code}</span>
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl border bg-card/50 shadow-sm space-y-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">
                                            <User className="w-3 h-3 inline mr-1" /> Sales Personnel
                                        </span>
                                        <span className="text-sm font-bold text-indigo-600">{salesman?.salesman_name || order.salesman_id}</span>
                                        <span className="text-[11px] font-medium text-slate-400 font-mono mt-0.5">{branch?.branch_name || "N/A Branch"}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl border bg-slate-950 text-white shadow-lg grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                        <Calendar className="w-3 h-3 inline mr-1" /> Order Date
                                    </span>
                                    <span className="text-sm font-bold">{order.order_date || "-"}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                        <Truck className="w-3 h-3 inline mr-1" /> Delivery Date
                                    </span>
                                    <span className="text-sm font-bold text-orange-400">{order.delivery_date || "-"}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <Package className="w-3 h-3 text-primary" />
                                        Order Line Items
                                    </h3>
                                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border">{details.length} Items</span>
                                </div>

                                <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                                    {loading ? (
                                        <div className="p-8 flex flex-col items-center justify-center gap-3">
                                            <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Retrieving Details...</span>
                                        </div>
                                    ) : (
                                        <DataTable columns={columns} data={details} />
                                    )}
                                </div>
                            </div>

                            {order.remarks && (
                                <div className="p-4 rounded-xl border bg-amber-50/50 border-amber-200/50">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">
                                        <MessageSquare className="w-3 h-3" />
                                        Internal Remarks
                                    </div>
                                    <p className="text-xs font-medium text-amber-900 italic leading-relaxed whitespace-pre-wrap">{order.remarks}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-6 border-t bg-slate-50/80 backdrop-blur-sm shrink-0">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500 uppercase tracking-wider">
                                {isInvoiceStatus ? "Invoice Total" : "Net Amount"}
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                                {formatCurrency(isInvoiceStatus ? (invoiceData?.invoice?.net_amount || 0) : (order.net_amount || 0))}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                                    {isInvoiceStatus ? "Final Billed" : "Grand Total"}
                                </span>
                                <span className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">
                                    ({isInvoiceStatus ? "Post-Consolidation" : "Allocated Fulfillment"})
                                </span>
                            </div>
                            <span className="text-2xl font-black text-slate-900 tabular-nums tracking-tighter">
                                {formatCurrency(isInvoiceStatus ? (invoiceData?.invoice?.net_amount || 0) : order.allocated_amount)}
                            </span>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
