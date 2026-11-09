"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Trash2,
    Copy,
    Save,
    RotateCcw,
    Loader2,
    Calculator,
    FileSpreadsheet,
} from "lucide-react";
import { ServiceInvoiceDetailOther, ServiceInvoiceSummary } from "../types";
import { VatMode } from "../hooks/useServiceInvoicing";

interface ServiceInvoicingLineItemsProps {
    lineItems: ServiceInvoiceDetailOther[];
    onAddLine: () => void;
    onRemoveLine: (id: string) => void;
    onDuplicateLine: (id: string) => void;
    onUpdateLine: (id: string, field: keyof ServiceInvoiceDetailOther, value: string | number) => void;
    summary: ServiceInvoiceSummary;
    vatMode: VatMode;
    onVatModeChange: (mode: VatMode) => void;
    ewtRate: number;
    onEwtRateChange: (rate: number) => void;
    invoiceRemarks: string;
    onInvoiceRemarksChange: (val: string) => void;
    onSubmit: () => void;
    onReset: () => void;
    submitting: boolean;
    editingInvoiceId: number | null;
}

const COMMON_UNITS = ["LOT", "JOB", "HRS", "DAYS", "MOS", "UNIT", "SET", "PCS", "TRIP", "VISIT"];

export function ServiceInvoicingLineItems({
    lineItems,
    onAddLine,
    onRemoveLine,
    onDuplicateLine,
    onUpdateLine,
    summary,
    vatMode,
    onVatModeChange,
    ewtRate,
    onEwtRateChange,
    invoiceRemarks,
    onInvoiceRemarksChange,
    onSubmit,
    onReset,
    submitting,
    editingInvoiceId,
}: ServiceInvoicingLineItemsProps) {
    const formatPHP = (val: number) =>
        new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(val || 0);

    return (
        <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* LEFT / MAIN: DYNAMIC LINE ITEMS TABLE (sales_invoice_details_other) */}
            <Card className="lg:col-span-8 xl:col-span-9 shadow-sm border-muted-foreground/10 overflow-hidden">
                <CardHeader className="py-4 px-6 flex flex-wrap items-center justify-between gap-4 border-b bg-muted/30">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <FileSpreadsheet className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-black uppercase tracking-tight text-foreground">
                                    Dynamic Service Items
                                </h2>
                                <Badge variant="secondary" className="text-[10px] font-bold">
                                    sales_invoice_details_other
                                </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Enter any custom description, service charge, labor, installation, or miscellaneous billing item
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* VAT Mode Selector */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase text-muted-foreground">VAT:</span>
                            <Select value={vatMode} onValueChange={(v) => onVatModeChange(v as VatMode)}>
                                <SelectTrigger className="h-8 w-[145px] text-xs font-semibold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="inclusive">VAT Inclusive (12%)</SelectItem>
                                    <SelectItem value="exclusive">VAT Exclusive (+12%)</SelectItem>
                                    <SelectItem value="exempt">Non-VAT / Exempt (0%)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* EWT Selector */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase text-muted-foreground">EWT:</span>
                            <Select value={ewtRate.toString()} onValueChange={(v) => onEwtRateChange(Number(v))}>
                                <SelectTrigger className="h-8 w-[110px] text-xs font-semibold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">None (0%)</SelectItem>
                                    <SelectItem value="1">1% EWT</SelectItem>
                                    <SelectItem value="2">2% EWT (Service)</SelectItem>
                                    <SelectItem value="5">5% EWT</SelectItem>
                                    <SelectItem value="10">10% EWT</SelectItem>
                                    <SelectItem value="15">15% EWT</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            type="button"
                            size="sm"
                            onClick={onAddLine}
                            className="h-8 gap-1.5 text-xs font-bold shadow-sm"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add Line Item
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="border-b bg-muted/50 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                    <th className="py-3 px-3 text-center w-10 whitespace-nowrap">#</th>
                                    <th className="py-3 px-3 text-left min-w-[240px] whitespace-nowrap">
                                        Description / Particulars <span className="text-red-500">*</span>
                                    </th>
                                    <th className="py-3 px-2 text-left w-[110px] whitespace-nowrap">Unit</th>
                                    <th className="py-3 px-2 text-right w-[90px] whitespace-nowrap">Qty</th>
                                    <th className="py-3 px-2 text-right w-[135px] whitespace-nowrap">Unit Price</th>
                                    <th className="py-3 px-2 text-right w-[115px] whitespace-nowrap">Discount</th>
                                    <th className="py-3 px-2 text-right w-[135px] whitespace-nowrap">Total Amount</th>
                                    <th className="py-3 px-2 text-left min-w-[150px] whitespace-nowrap">Line Remarks</th>
                                    <th className="py-3 px-3 text-center w-[84px] whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {lineItems.map((line, index) => (
                                    <tr
                                        key={line.id}
                                        className="group hover:bg-muted/40 transition-colors align-middle"
                                    >
                                        <td className="py-2.5 px-3 text-center font-bold text-muted-foreground">
                                            {index + 1}
                                        </td>

                                        {/* Description / Particulars */}
                                        <td className="py-2.5 px-3">
                                            <Input
                                                placeholder="Enter service description, scope of work, or item particulars..."
                                                value={line.item_description}
                                                onChange={(e) =>
                                                    onUpdateLine(line.id, "item_description", e.target.value)
                                                }
                                                className="h-9 text-xs font-medium"
                                            />
                                        </td>

                                        {/* Unit */}
                                        <td className="py-2.5 px-2">
                                            <Select
                                                value={line.unit || "LOT"}
                                                onValueChange={(val) => onUpdateLine(line.id, "unit", val)}
                                            >
                                                <SelectTrigger className="h-9 w-[100px] text-xs font-bold uppercase">
                                                    <SelectValue placeholder="LOT" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {COMMON_UNITS.map((u) => (
                                                        <SelectItem
                                                            key={u}
                                                            value={u}
                                                            className="text-xs font-bold uppercase"
                                                        >
                                                            {u}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </td>

                                        {/* Quantity */}
                                        <td className="py-2.5 px-2">
                                            <Input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={line.quantity}
                                                onChange={(e) =>
                                                    onUpdateLine(line.id, "quantity", parseFloat(e.target.value) || 0)
                                                }
                                                className="h-9 w-[80px] ml-auto text-xs text-right font-semibold"
                                            />
                                        </td>

                                        {/* Unit Price */}
                                        <td className="py-2.5 px-2">
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={line.unit_price || ""}
                                                onChange={(e) =>
                                                    onUpdateLine(
                                                        line.id,
                                                        "unit_price",
                                                        parseFloat(e.target.value) || 0
                                                    )
                                                }
                                                className="h-9 w-[125px] ml-auto text-xs text-right font-semibold"
                                            />
                                        </td>

                                        {/* Discount Amount */}
                                        <td className="py-2.5 px-2">
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={line.discount_amount || ""}
                                                onChange={(e) =>
                                                    onUpdateLine(
                                                        line.id,
                                                        "discount_amount",
                                                        parseFloat(e.target.value) || 0
                                                    )
                                                }
                                                className="h-9 w-[105px] ml-auto text-xs text-right text-amber-600 dark:text-amber-400 font-medium"
                                            />
                                        </td>

                                        {/* Line Total */}
                                        <td className="py-2.5 px-2">
                                            <div className="h-9 min-w-[120px] px-3 rounded-md border bg-muted/30 flex flex-col justify-center items-end">
                                                <span className="font-black text-foreground text-xs whitespace-nowrap">
                                                    {formatPHP(line.total_amount)}
                                                </span>
                                                {line.vat_amount > 0 && (
                                                    <span className="text-[9px] text-muted-foreground whitespace-nowrap leading-none">
                                                        VAT: {formatPHP(line.vat_amount)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Line Remarks */}
                                        <td className="py-2.5 px-2">
                                            <Input
                                                placeholder="Optional note..."
                                                value={line.remarks || ""}
                                                onChange={(e) => onUpdateLine(line.id, "remarks", e.target.value)}
                                                className="h-9 text-xs"
                                            />
                                        </td>

                                        {/* Row Actions */}
                                        <td className="py-2.5 px-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    title="Duplicate Line"
                                                    onClick={() => onDuplicateLine(line.id)}
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                                                    title="Remove Line"
                                                    onClick={() => onRemoveLine(line.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 border-t bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onAddLine}
                            className="h-8 gap-1.5 text-xs font-bold border-dashed"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add Another Row
                        </Button>

                        <div className="text-[11px] text-muted-foreground font-medium">
                            Total Rows: <span className="font-bold text-foreground">{lineItems.length}</span> • Active
                            Items: <span className="font-bold text-foreground">{summary.itemCount}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* RIGHT: SUMMARY & REMARKS CARD */}
            <Card className="lg:col-span-4 xl:col-span-3 shadow-sm border-muted-foreground/10 sticky top-4">
                <CardHeader className="py-4 px-5 border-b bg-muted/30 flex flex-row items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                        Invoice Summary
                    </h3>
                </CardHeader>

                <CardContent className="p-5 space-y-5">
                    <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span>Gross Amount</span>
                            <span className="font-semibold text-foreground">{formatPHP(summary.grossAmount)}</span>
                        </div>

                        <div className="flex items-center justify-between text-muted-foreground">
                            <span>Total Discount</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                                - {formatPHP(summary.discountAmount)}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-muted-foreground">
                            <span>
                                VAT Amount (
                                {vatMode === "inclusive"
                                    ? "12% Incl."
                                    : vatMode === "exclusive"
                                    ? "12% Excl."
                                    : "Exempt"}
                                )
                            </span>
                            <span className="font-semibold text-foreground">{formatPHP(summary.vatAmount)}</span>
                        </div>

                        {summary.ewtAmount > 0 && (
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span>Withholding Tax (EWT {ewtRate}%)</span>
                                <span className="font-semibold text-rose-600 dark:text-rose-400">
                                    - {formatPHP(summary.ewtAmount)}
                                </span>
                            </div>
                        )}

                        <div className="border-t pt-3 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-muted-foreground">Total Invoice Amount</span>
                            <span className="text-base font-black text-foreground">
                                {formatPHP(summary.totalAmount)}
                            </span>
                        </div>

                        <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                                    Net Amount Collectible
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {summary.ewtAmount > 0 ? "After EWT deduction" : "Final net receivable"}
                                </span>
                            </div>
                            <span className="text-lg font-black text-primary tracking-tight">
                                {formatPHP(summary.netAmount)}
                            </span>
                        </div>
                    </div>

                    {/* Remarks Input */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase text-muted-foreground">
                            Invoice Remarks / Notes
                        </label>
                        <Textarea
                            placeholder="Add overall remarks, billing period, or service reference notes..."
                            value={invoiceRemarks}
                            onChange={(e) => onInvoiceRemarksChange(e.target.value)}
                            rows={3}
                            className="text-xs resize-none"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 pt-1">
                        <Button
                            type="button"
                            onClick={onSubmit}
                            disabled={submitting}
                            className="w-full h-10 font-bold gap-2 shadow-md"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Saving Service Invoice...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    <span>
                                        {editingInvoiceId ? "Update Service Invoice" : "Save Service Invoice"}
                                    </span>
                                </>
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={onReset}
                            disabled={submitting}
                            className="w-full h-9 text-xs font-semibold gap-1.5"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>{editingInvoiceId ? "Cancel Edit / New Invoice" : "Reset Form"}</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

