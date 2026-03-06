"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import { salesOrderProvider } from "../providers/fetchProvider";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Package, ShoppingBag, Truck, Calendar, User, Store, Tag, CornerDownRight } from "lucide-react";
import { SalesOrder, Customer, Salesman, Branch } from "../types";
import { Separator } from "@/components/ui/separator";

interface SalesOrderDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: SalesOrder | null;
    customers: Customer[];
    salesmen: Salesman[];
    branches: Branch[];
}

export function SalesOrderDetailsModal({ isOpen, onClose, order, customers, salesmen, branches }: SalesOrderDetailsModalProps) {
    const [details, setDetails] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && order?.order_id) {
            loadDetails();
        } else {
            setDetails([]);
        }
    }, [isOpen, order?.order_id]);

    const loadDetails = async () => {
        if (!order?.order_id) return;
        setIsLoading(true);
        try {
            console.log(`[CLIENT] Fetching details for OrderID: ${order.order_id}`);
            const data = await salesOrderProvider.getSalesOrderDetails(order.order_id);
            console.log(`[CLIENT] Received ${data?.length || 0} items`);
            setDetails(data || []);
        } catch (error) {
            console.error("Failed to load details:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!order) return null;

    const customer = customers.find(c => c.customer_code === order.customer_code);
    const salesman = salesmen.find(s => s.id === order.salesman_id);
    const branch = branches.find(b => b.id === order.branch_id);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] lg:max-w-7xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                            <DialogTitle className="text-2xl font-black flex items-center gap-3">
                                <span className="bg-primary/10 p-2 rounded-lg">
                                    <ShoppingBag className="h-6 w-6 text-primary" />
                                </span>
                                ORDER: <span className="text-primary">{order.order_no}</span>
                            </DialogTitle>
                            <DialogDescription className="flex items-center gap-2 font-medium">
                                <Badge variant={
                                    order.order_status === "Posted" ? "secondary" :
                                        order.order_status === "Cancelled" ? "destructive" : "outline"
                                } className="px-3 py-0.5 uppercase tracking-wide">
                                    {order.order_status || "PENDING"}
                                </Badge>
                                <span>• Created on {order.created_date ? new Date(order.created_date).toLocaleDateString() : 'N/A'}</span>
                            </DialogDescription>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <div className="bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Total Allocated</p>
                                <p className="text-xl font-black text-primary">{formatCurrency(order.allocated_amount)}</p>
                            </div>
                            <div className="bg-muted/50 px-4 py-2 rounded-xl border">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gross Total</p>
                                <p className="text-xl font-bold">{formatCurrency(order.total_amount)}</p>
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-primary/10" />

                    {/* Order Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1.5">
                                <Store className="h-3 w-3" /> Customer Details
                            </Label>
                            <div className="bg-muted/30 p-2.5 rounded-lg border">
                                <p className="text-sm font-bold truncate">{customer?.store_name || "N/A"}</p>
                                <p className="text-xs text-muted-foreground font-mono">{order.customer_code}</p>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1.5">
                                <User className="h-3 w-3" /> Sales Personnel
                            </Label>
                            <div className="bg-muted/30 p-2.5 rounded-lg border">
                                <p className="text-sm font-bold">{salesman?.salesman_name || "N/A"}</p>
                                <p className="text-xs text-muted-foreground font-mono">{salesman?.salesman_code || "N/A"}</p>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1.5">
                                <Truck className="h-3 w-3" /> Branch & Logistics
                            </Label>
                            <div className="bg-muted/30 p-2.5 rounded-lg border">
                                <p className="text-sm font-bold">{branch?.branch_name || "N/A"}</p>
                                <p className="text-xs text-muted-foreground">{order.remarks || "No remarks"}</p>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1.5">
                                <Calendar className="h-3 w-3" /> Key Dates
                            </Label>
                            <div className="bg-muted/30 p-2.5 rounded-lg border flex flex-col gap-1">
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-muted-foreground">Order Date:</span>
                                    <span className="font-bold">{order.order_date || "N/A"}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-muted-foreground">Delivery Date:</span>
                                    <span className="font-bold">{order.delivery_date || "N/A"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="mt-6 flex-1 overflow-auto rounded-xl border bg-card">
                    <Table>
                        <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur-md z-10">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[300px] font-black uppercase text-[10px]">Product Description</TableHead>
                                <TableHead className="text-right font-black uppercase text-[10px]">Unit Price</TableHead>
                                <TableHead className="text-right font-black uppercase text-[10px]">Ordered</TableHead>
                                <TableHead className="text-right font-black uppercase text-[10px]">Allocated</TableHead>
                                <TableHead className="text-right font-black uppercase text-[10px]">Served</TableHead>
                                <TableHead className="text-right font-black uppercase text-[10px]">Gross</TableHead>
                                <TableHead className="text-right font-black uppercase text-[10px]">Discount</TableHead>
                                <TableHead className="text-right font-black uppercase text-[10px]">Net Amount</TableHead>
                                <TableHead className="text-right font-black uppercase text-[10px] bg-primary/5 text-primary">Allocated Amt</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={9} className="py-6"><div className="h-4 bg-muted animate-pulse rounded-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : details.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-20">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Package className="h-12 w-12 opacity-20" />
                                            <p className="text-sm font-medium">No line items found for this order.</p>
                                            <p className="text-xs">ID: {order.order_id}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                details.map((item, idx) => (
                                    <TableRow key={idx} className="hover:bg-muted/30">
                                        <TableCell className="py-3 px-4">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                                        {typeof item.product_id === 'object'
                                                            ? (item.product_id?.display_name || item.product_id?.product_name || `Product ${item.product_id?.product_id || item.product_id?.id || "Unknown"}`)
                                                            : `Product ${item.product_id}`}
                                                    </p>
                                                    {typeof item.product_id === 'object' && (item.product_id?.product_code || item.product_id?.product_id) && (
                                                        <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-muted-foreground/10">
                                                            {item.product_id.product_code || item.product_id.product_id}
                                                        </span>
                                                    )}
                                                </div>
                                                {item.remarks && (
                                                    <p className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                                                        <CornerDownRight className="h-3 w-3 inline opacity-50" />
                                                        {item.remarks}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right py-3 px-4 font-mono text-[13px]">{formatCurrency(item.unit_price)}</TableCell>
                                        <TableCell className="text-right py-3 px-4">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="font-bold text-sm">{item.ordered_quantity}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right py-3 px-4">
                                            <Badge
                                                variant={item.allocated_quantity < item.ordered_quantity ? "destructive" : "secondary"}
                                                className="h-6 px-2 font-bold tabular-nums"
                                            >
                                                {item.allocated_quantity}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right py-3 px-4 text-muted-foreground font-medium">{item.served_quantity || 0}</TableCell>
                                        <TableCell className="text-right py-3 px-4 font-mono text-[12px]">{formatCurrency(item.gross_amount)}</TableCell>
                                        <TableCell className="text-right py-3 px-4 font-mono text-[12px] text-destructive/80 font-medium">
                                            {item.discount_amount > 0 ? `-${formatCurrency(item.discount_amount)}` : "-"}
                                        </TableCell>
                                        <TableCell className="text-right py-3 px-4 font-mono text-[12px] font-medium">{formatCurrency(item.net_amount)}</TableCell>
                                        <TableCell className="text-right py-3 px-4 font-black font-mono text-sm text-primary bg-primary/5 border-l border-primary/10">
                                            {formatCurrency(item.allocated_amount)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Summary Footer */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-muted/20 p-4 rounded-xl border border-dashed border-muted-foreground/20">
                    <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-lg border shadow-sm">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider">Line Items:</span>
                            <span className="font-black text-primary">{details.length}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-lg border shadow-sm">
                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider">Total Ordered:</span>
                            <span className="font-black">{details.reduce((sum, item) => sum + (item.ordered_quantity || 0), 0)}</span>
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-3">
                        <span className="text-muted-foreground font-black uppercase text-[11px] tracking-widest bg-primary/10 px-3 py-1.5 rounded-l-lg border border-r-0 border-primary/20">Total Allocated Qty</span>
                        <div className="bg-primary text-primary-foreground px-5 py-2 rounded-r-lg font-black text-xl shadow-lg shadow-primary/20">
                            {details.reduce((sum, item) => sum + (item.allocated_quantity || 0), 0)}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
