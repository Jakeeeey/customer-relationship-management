"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SalesInvoiceHeader, SalesInvoiceDetail, LinkedDocument } from "../types";
import { Trash2, Plus, Info, FileText, Save, X } from "lucide-react";
import { useSiteSalesPosting } from "../hooks/useSiteSalesPosting";
import { format, isValid, parseISO } from "date-fns";
import { toast } from "sonner";

interface SiteSalesEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: SalesInvoiceHeader | null;
}

export const SiteSalesEditModal: React.FC<SiteSalesEditModalProps> = ({ isOpen, onClose, invoice }) => {
    const formatDate = (dateString?: string | null) => {
        if (!dateString) return "--";
        const cleanString = dateString.replace('T', ' ').replace(/Z$/, '').split('.')[0];
        const date = parseISO(cleanString);
        return isValid(date) ? format(date, "MMM dd, yyyy hh:mm a") : dateString;
    };

    const router = useRouter();
    const { fetchDetails, saveAdjustments } = useSiteSalesPosting();
    const [details, setDetails] = useState<SalesInvoiceDetail[]>([]);
    const [linkedDocs, setLinkedDocs] = useState<LinkedDocument[]>([]);
    const [deletedIds, setDeletedIds] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [customerCode, setCustomerCode] = useState("");

    useEffect(() => {
        if (invoice && isOpen) {
            const targetCode = invoice.customer_code || "";
            // Use a check to avoid unnecessary re-renders
            setCustomerCode(prev => prev !== targetCode ? targetCode : prev);
            
            setIsLoading(true);
            fetchDetails(invoice.invoice_id)
                .then(data => {
                    setDetails(data.details);
                    setLinkedDocs(data.linkedDocs);
                })
                .finally(() => setIsLoading(false));
        }
    }, [invoice, isOpen, fetchDetails]);

    const handleSave = async () => {
        if (!invoice) return;
        setIsSaving(true);
        try {
            await saveAdjustments(invoice.invoice_id, {
                customer_code: customerCode,
                details,
                deletedDetailIds: deletedIds
            });
            toast.success("Invoice finalized successfully!");
            router.push('/crm/site-sales-management/site-sales-posting');
            onClose();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to finalize invoice";
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    };

    const updateDetail = (index: number, field: keyof SalesInvoiceDetail, value: string | number) => {
        const newDetails = [...details];
        newDetails[index] = { ...newDetails[index], [field]: value };
        setDetails(newDetails);
    };

    const removeDetail = (index: number) => {
        const item = details[index];
        if (item.detail_id) {
            setDeletedIds([...deletedIds, Number(item.detail_id)]);
        }
        setDetails(details.filter((_, i) => i !== index));
    };

    const calculateTotals = () => {
        let gross = 0;
        let discount = 0;
        details.forEach(d => {
            gross += (Number(d.quantity) || 0) * (Number(d.unit_price) || 0);
            discount += Number(d.discount_amount) || 0;
        });
        const net = gross - discount;
        const vat = net * 0.12; // Standard 12%
        return { gross, discount, net, vat, total: net + vat };
    };

    const totals = calculateTotals();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none bg-slate-50">
                <DialogHeader className="p-6 bg-white border-b sticky top-0 z-20">
                    <div className="flex justify-between items-center">
                        <div>
                            <DialogTitle className="text-xl font-bold text-slate-800">
                                Edit Transaction: {invoice?.invoice_no}
                            </DialogTitle>
                            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                                Settlement Audit & Adjustments
                            </p>
                        </div>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1">
                            {invoice?.transaction_status || 'PENDING SETTLEMENT'}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Customer Code</label>
                            <Input 
                                value={customerCode} 
                                onChange={(e) => setCustomerCode(e.target.value)}
                                className="h-10 border-slate-200 focus:border-primary focus:ring-primary"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Dispatch Date (Immutable)</label>
                            <div className="h-10 px-3 flex items-center bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-500 font-medium italic">
                                {formatDate(invoice?.dispatch_date)}
                                <Info className="w-3.5 h-3.5 ml-auto text-slate-300" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Invoice Date</label>
                            <Input disabled value={formatDate(invoice?.invoice_date)} className="h-10 bg-slate-50 text-slate-500 border-slate-200" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Salesman</label>
                            <Input disabled value={invoice?.salesman_name || ""} className="h-10 bg-slate-50 text-slate-500 border-slate-200" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" /> Line Items
                            </h3>
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-slate-200 bg-white hover:bg-slate-50">
                                <Plus className="w-3.5 h-3.5" /> Add Product
                            </Button>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                            <Table>
                                <TableHeader className="bg-white sticky top-0 z-10 border-b">
                                    <TableRow>
                                        <TableHead className="text-[10px] font-bold uppercase text-slate-400">Product ID</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-slate-400">Unit</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-slate-400 w-24">Qty</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-slate-400 w-32">Price</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-slate-400 w-32">Disc. Amt</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-right">Total</TableHead>
                                        <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400 italic">Loading details...</TableCell></TableRow>
                                    ) : details.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400 italic">No items found</TableCell></TableRow>
                                    ) : (
                                        details.map((d, index) => (
                                            <TableRow key={index} className="hover:bg-slate-50/50">
                                                <TableCell className="text-sm font-medium text-slate-700">
                                                    {typeof d.product_id === 'object' && d.product_id ? d.product_id.product_id : d.product_id}
                                                </TableCell>
                                                <TableCell>
                                                    <Input 
                                                        value={d.unit || ""} 
                                                        onChange={(e) => updateDetail(index, "unit", e.target.value)}
                                                        className="h-8 text-xs border-transparent hover:border-slate-200 focus:border-primary bg-transparent"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input 
                                                        type="number" 
                                                        value={d.quantity} 
                                                        onChange={(e) => updateDetail(index, "quantity", Number(e.target.value))}
                                                        className="h-8 text-xs font-bold text-primary border-transparent hover:border-slate-200 focus:border-primary bg-transparent text-center"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input 
                                                        type="number" 
                                                        value={d.unit_price} 
                                                        onChange={(e) => updateDetail(index, "unit_price", Number(e.target.value))}
                                                        className="h-8 text-xs border-transparent hover:border-slate-200 focus:border-primary bg-transparent"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input 
                                                        type="number" 
                                                        value={d.discount_amount} 
                                                        onChange={(e) => updateDetail(index, "discount_amount", Number(e.target.value))}
                                                        className="h-8 text-xs border-transparent hover:border-slate-200 focus:border-primary bg-transparent text-rose-500"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-sm font-bold text-slate-800 text-right">
                                                    {((d.quantity * d.unit_price) - d.discount_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                                                        onClick={() => removeDetail(index)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Linked Documents & Totals */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Linked Docs */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
                            <div className="p-4 border-b bg-slate-50/50">
                                <h3 className="text-sm font-bold text-slate-700">Linked Documents</h3>
                            </div>
                            <div className="p-4 flex-1">
                                <div className="space-y-3">
                                    {linkedDocs.length === 0 ? (
                                        <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-lg text-slate-300 text-xs italic">
                                            No linked returns or payments
                                        </div>
                                    ) : (
                                        linkedDocs.map((doc: LinkedDocument, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div>
                                                    <p className="text-[10px] font-bold text-primary uppercase">{doc.type}</p>
                                                    <p className="text-xs font-bold text-slate-700">{doc.reference_no}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-slate-800">₱{doc.amount.toLocaleString()}</p>
                                                    <p className="text-[10px] text-slate-400">{formatDate(doc.date)}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Totals Breakdown */}
                        <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xl space-y-4">
                            <div className="flex justify-between items-center text-slate-400 text-sm">
                                <span>Gross Amount</span>
                                <span className="font-mono">₱{totals.gross.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400 text-sm">
                                <span>Total Discount</span>
                                <span className="text-rose-400 font-mono">-₱{totals.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400 text-sm border-t border-slate-800 pt-4">
                                <span>Net Amount (Before VAT)</span>
                                <span className="font-mono">₱{totals.net.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400 text-sm">
                                <span>VAT (12%)</span>
                                <span className="font-mono">₱{totals.vat.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t-2 border-indigo-500">
                                <span className="text-lg font-bold">Total Amount Due</span>
                                <span className="text-2xl font-black text-indigo-400 font-mono">
                                    ₱{totals.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-white border-t sticky bottom-0 z-20">
                    <div className="flex w-full justify-between items-center">
                        <p className="text-[10px] text-slate-400 max-w-md">
                            All adjustments made here will be logged and attributed to your user account. 
                            Double check quantities before saving.
                        </p>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={onClose} className="rounded-full px-6 border-slate-200">
                                <X className="w-4 h-4 mr-2" /> Cancel
                            </Button>
                            <Button 
                                onClick={handleSave} 
                                disabled={isSaving}
                                className="rounded-full px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                            >
                                <Save className="w-4 h-4 mr-2" /> 
                                {isSaving ? "Saving..." : "Save Adjustments"}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
