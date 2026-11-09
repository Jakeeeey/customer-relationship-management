"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Search,
    RefreshCw,
    Eye,
    Pencil,
    CheckCircle2,
    Printer,
    Loader2,
    FileText,
    Plus,
} from "lucide-react";
import { ServiceInvoiceHeaderRecord } from "../types";

interface ServiceInvoicesHistoryTableProps {
    invoices: ServiceInvoiceHeaderRecord[];
    loading: boolean;
    search: string;
    onSearchChange: (val: string) => void;
    onRefresh: () => void;
    onAddInvoice: () => void;
    onEditInvoice: (record: ServiceInvoiceHeaderRecord) => void;
    onPostInvoice: (invoiceId: number) => void;
}

export function ServiceInvoicesHistoryTable({
    invoices,
    loading,
    search,
    onSearchChange,
    onRefresh,
    onAddInvoice,
    onEditInvoice,
    onPostInvoice,
}: ServiceInvoicesHistoryTableProps) {
    const [selectedRecord, setSelectedRecord] = useState<ServiceInvoiceHeaderRecord | null>(null);

    const formatPHP = (val: number | null | undefined) =>
        new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number(val) || 0);

    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr.split("T")[0];
        return d.toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "2-digit",
        });
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            <Card className="shadow-sm border-muted-foreground/10 overflow-hidden">
                <CardHeader className="py-4 px-6 border-b bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-foreground">
                            Service Invoices Worklist
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                            Records stored in <code>sales_invoice</code> with dynamic lines in{" "}
                            <code>sales_invoice_details_other</code>
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search Invoice#, Order#, Customer..."
                                value={search}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="pl-8 h-8 text-xs"
                            />
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={onRefresh}
                            disabled={loading}
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {loading ? (
                        <div className="py-12 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span>Loading service invoices...</span>
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                            <FileText className="h-10 w-10 opacity-30" />
                            <p className="text-xs font-medium">No service invoices found.</p>
                            <Button
                                type="button"
                                size="sm"
                                onClick={onAddInvoice}
                                className="h-8 gap-1.5 text-xs font-bold mt-1"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Service Invoice
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="border-b bg-muted/50 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                        <th className="py-3 px-4 text-left">Invoice No.</th>
                                        <th className="py-3 px-4 text-left">Order / Ref ID</th>
                                        <th className="py-3 px-4 text-left">Customer</th>
                                        <th className="py-3 px-4 text-left">Salesman / Branch</th>
                                        <th className="py-3 px-4 text-left">Invoice Date</th>
                                        <th className="py-3 px-4 text-left">Due Date</th>
                                        <th className="py-3 px-4 text-center">Lines</th>
                                        <th className="py-3 px-4 text-right">Total Amount</th>
                                        <th className="py-3 px-4 text-center">Status</th>
                                        <th className="py-3 px-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {invoices.map((inv) => {
                                        const smName =
                                            typeof inv.salesman_id === "object" && inv.salesman_id !== null
                                                ? `${inv.salesman_id.salesman_name} (${inv.salesman_id.salesman_code || ""})`
                                                : inv.salesman_id || "—";
                                        const branchName =
                                            typeof inv.branch_id === "object" && inv.branch_id !== null
                                                ? inv.branch_id.branch_name
                                                : inv.branch_id || "—";
                                        const isPosted = Boolean(Number(inv.isPosted) === 1 || inv.transaction_status === "Posted");

                                        return (
                                            <tr
                                                key={inv.invoice_id}
                                                className="hover:bg-muted/40 transition-colors"
                                            >
                                                <td className="py-3 px-4 font-mono font-bold text-primary">
                                                    {inv.invoice_no || `#${inv.invoice_id}`}
                                                </td>
                                                <td className="py-3 px-4 font-mono text-muted-foreground">
                                                    {inv.order_id || "—"}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="font-semibold text-foreground">
                                                        {inv.customer_name || inv.customer_code}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        {inv.customer_code}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="font-medium text-foreground/90">{smName}</div>
                                                    <div className="text-[10px] text-muted-foreground">{branchName}</div>
                                                </td>
                                                <td className="py-3 px-4 text-foreground/80">
                                                    {formatDate(inv.invoice_date)}
                                                </td>
                                                <td className="py-3 px-4 text-foreground/80">
                                                    {formatDate(inv.due_date)}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <Badge variant="outline" className="text-[10px] font-bold">
                                                        {inv.details_other?.length || 0} item(s)
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4 text-right font-black text-foreground">
                                                    {formatPHP(inv.total_amount)}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <Badge
                                                        variant={isPosted ? "default" : "secondary"}
                                                        className="text-[10px] font-bold uppercase"
                                                    >
                                                        {inv.transaction_status || "New Invoice"}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            title="View Details / Print"
                                                            onClick={() => setSelectedRecord(inv)}
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-sky-600 dark:text-sky-400"
                                                            title="Edit Invoice"
                                                            onClick={() => onEditInvoice(inv)}
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        {!isPosted && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-emerald-600 dark:text-emerald-400"
                                                                title="Post Invoice"
                                                                onClick={() => onPostInvoice(inv.invoice_id)}
                                                            >
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* VIEW / PRINT MODAL */}
            <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>Service Invoice — {selectedRecord?.invoice_no}</span>
                            <Badge variant="outline" className="text-xs">
                                {selectedRecord?.transaction_status || "New Invoice"}
                            </Badge>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedRecord && (
                        <div className="space-y-5 text-xs">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/40 border">
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                                        Customer
                                    </span>
                                    <span className="font-bold text-foreground">
                                        {selectedRecord.customer_name || selectedRecord.customer_code}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground block">
                                        {selectedRecord.customer_code}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                                        Order / Reference No.
                                    </span>
                                    <span className="font-mono font-semibold text-foreground">
                                        {selectedRecord.order_id || "—"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                                        Invoice / Due Date
                                    </span>
                                    <span className="font-semibold text-foreground">
                                        {formatDate(selectedRecord.invoice_date)} → {formatDate(selectedRecord.due_date)}
                                    </span>
                                </div>
                            </div>

                            <div className="border rounded-xl overflow-hidden">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-muted/50 border-b text-[10px] font-black uppercase text-muted-foreground">
                                            <th className="py-2.5 px-3 text-left">#</th>
                                            <th className="py-2.5 px-3 text-left">Description / Particulars</th>
                                            <th className="py-2.5 px-3 text-center">Unit</th>
                                            <th className="py-2.5 px-3 text-right">Qty</th>
                                            <th className="py-2.5 px-3 text-right">Unit Price</th>
                                            <th className="py-2.5 px-3 text-right">Discount</th>
                                            <th className="py-2.5 px-3 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {(selectedRecord.details_other || []).map((item, i) => (
                                            <tr key={item.detail_id || i}>
                                                <td className="py-2.5 px-3 text-muted-foreground">{i + 1}</td>
                                                <td className="py-2.5 px-3">
                                                    <div className="font-semibold text-foreground">
                                                        {item.item_description}
                                                    </div>
                                                    {item.remarks && (
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {item.remarks}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-3 text-center font-bold uppercase">
                                                    {item.unit || "LOT"}
                                                </td>
                                                <td className="py-2.5 px-3 text-right">{item.quantity}</td>
                                                <td className="py-2.5 px-3 text-right">
                                                    {formatPHP(item.unit_price)}
                                                </td>
                                                <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">
                                                    {formatPHP(item.discount_amount)}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-bold">
                                                    {formatPHP(item.total_amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-2">
                                <div className="text-xs text-muted-foreground max-w-sm">
                                    <span className="font-bold uppercase text-[10px] block text-muted-foreground">
                                        Remarks:
                                    </span>
                                    {selectedRecord.remarks || "No remarks provided."}
                                </div>

                                <div className="w-full sm:w-64 space-y-1.5 text-xs border rounded-xl p-3 bg-muted/30">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Gross Amount:</span>
                                        <span className="font-semibold">{formatPHP(selectedRecord.gross_amount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Discount:</span>
                                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                                            - {formatPHP(selectedRecord.discount_amount)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">VAT Amount:</span>
                                        <span className="font-semibold">{formatPHP(selectedRecord.vat_amount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">EWT Amount:</span>
                                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                                            - {formatPHP(selectedRecord.ewt_amount)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-t pt-1.5 font-black text-sm text-primary">
                                        <span>Total Amount:</span>
                                        <span>{formatPHP(selectedRecord.total_amount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                            <Printer className="h-3.5 w-3.5" />
                            Print
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => setSelectedRecord(null)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

