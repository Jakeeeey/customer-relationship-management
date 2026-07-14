"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Printer,
    X,
    Loader2,
    FileText,
    Layout,
} from "lucide-react";
import { format } from 'date-fns';

import {
    Customer,
    Salesman,
    InvoiceType,
    PriceType,
    Branch,
    CartItem,
    StockPurchaseHeader,
    StockPurchaseDetail,
} from '../types';
import { DiscountType, ORTemplate } from '../types/print';
import { mapStockPurchaseToReceiptData } from '../utils/mapping';
import { generateStockPurchasePrintPDF } from '../utils/stockPurchasePrintPDF';
import { StockPurchasePrintService } from '../services/StockPurchasePrintService';
import { stockPurchaseProvider } from '../providers/fetchProvider';
import { calculateChainNetPrice } from '../utils';
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { StockPurchaseTemplateDesigner } from "./StockPurchaseTemplateDesigner";

interface StockPurchaseCreatePrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;

    selectedCustomer: Customer;
    selectedAccount: Salesman;
    selectedBranch: string;
    branches: Branch[];

    invoiceTypes: InvoiceType[];
    selectedInvoiceType: string;
    selectedSalesType: string;
    priceTypes: PriceType[];
    selectedPriceType: string;

    cart: CartItem[];
    dueDate: string;
    previewInvoiceNo: string;

    totalGross: number;
    totalDiscount: number;
    totalVat: number;
    totalNet: number;
    isVatApplicable: boolean;

    onCreateAndPrint: (payload: Record<string, unknown>) => Promise<{ success: boolean; invoiceId: number }>;

    preFetchedDiscountTypes: DiscountType[];
    preFetchedTemplate: ORTemplate | null;
    preFetchedBackgroundImageDataUrl?: string;
}

export const StockPurchaseCreatePrintPreviewModal: React.FC<StockPurchaseCreatePrintPreviewModalProps> = ({
    isOpen,
    onClose,
    selectedCustomer,
    selectedAccount,
    selectedBranch,
    branches,
    invoiceTypes,
    selectedInvoiceType,
    selectedSalesType,
    priceTypes,
    selectedPriceType,
    cart,
    dueDate,
    previewInvoiceNo,
    totalGross,
    totalDiscount,
    totalVat,
    totalNet,
    isVatApplicable,
    onCreateAndPrint,
    preFetchedDiscountTypes,
    preFetchedTemplate,
    preFetchedBackgroundImageDataUrl,
}) => {
    const router = useRouter();

    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDesignerOpen, setIsDesignerOpen] = useState(false);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);

    const [discountTypes, setDiscountTypes] = useState<DiscountType[]>(preFetchedDiscountTypes);
    const [template, setTemplate] = useState<ORTemplate | null>(preFetchedTemplate);

    useEffect(() => {
        setDiscountTypes(preFetchedDiscountTypes);
    }, [preFetchedDiscountTypes]);

    useEffect(() => {
        setTemplate(preFetchedTemplate);
    }, [preFetchedTemplate]);

    const invoiceTypeObj = invoiceTypes.find(t => t.id.toString() === selectedInvoiceType) ?? null;
    const isOfficial = invoiceTypeObj ? Number(invoiceTypeObj.isOfficial) === 1 : true;
    const invoiceTypeId = invoiceTypeObj?.id ?? (isOfficial ? 1 : 2);

    const buildDraftHeader = useCallback((): StockPurchaseHeader => {
        const branchObj = branches.find(b => b.id.toString() === selectedBranch) ?? null;
        const priceTypeName = priceTypes.find(p => p.price_type_id.toString() === selectedPriceType)?.price_type_name ?? '';

        return {
            invoice_id: 0,
            invoice_no: previewInvoiceNo,
            order_id: previewInvoiceNo,
            customer_code: selectedCustomer.customer_code,
            customer_name: selectedCustomer.customer_name ?? selectedCustomer.store_name,
            customer_address: [selectedCustomer.city, selectedCustomer.province].filter(Boolean).join(', '),
            salesman_id: {
                id: selectedAccount.id,
                salesman_name: selectedAccount.salesman_name,
                salesman_code: selectedAccount.salesman_code,
            },
            branch_id: branchObj,
            invoice_type: invoiceTypeObj,
            invoice_date: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
            due_date: dueDate,
            gross_amount: totalGross,
            discount_amount: totalDiscount,
            vat_amount: isVatApplicable ? totalVat : 0,
            net_amount: totalNet,
            total_amount: totalNet,
            price_type: priceTypeName,
            isDispatched: false,
            isPosted: false,
            transaction_status: 'New',
        } as unknown as StockPurchaseHeader;
    }, [
        branches, selectedBranch, priceTypes, selectedPriceType,
        previewInvoiceNo, selectedCustomer, selectedAccount, invoiceTypeObj,
        dueDate, totalGross, totalDiscount, totalVat, totalNet, isVatApplicable,
    ]);

    const buildDraftDetails = useCallback((): StockPurchaseDetail[] => {
        return cart.map(item => ({
            detail_id: 0,
            invoice_id: 0,
            product_id: {
                product_id: item.product_id,
                product_name: item.product_name,
                description: item.description,
                product_code: item.product_code,
            },
            quantity: item.quantity,
            unit_price: item.unit_price,
            unit_name: item.unit,
            unit: item.unit,
            unit_count: item.unit_count,
            brand_name: item.brand_name,
            category_name: item.category_name,
            discount_amount: item.discount_amount,
            discount_type_name: item.discount_type_name,
            total_amount: item.total_amount,
            gross_amount: item.unit_price * item.quantity,
            discounts: item.discounts,
        }));
    }, [cart]);

    const generatePreview = useCallback(async () => {
        if (!template && isOfficial) return;

        setIsGenerating(true);
        try {
            const draftHeader = buildDraftHeader();
            const draftDetails = buildDraftDetails();
            const receiptData = mapStockPurchaseToReceiptData(draftHeader, draftDetails, discountTypes, isOfficial);
            if (template) {
                receiptData.template = template;
                receiptData.backgroundImageDataUrl = preFetchedBackgroundImageDataUrl;
            }

            const doc = await generateStockPurchasePrintPDF(receiptData);
            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);

            setPdfUrl(prev => {
                if (prev) URL.revokeObjectURL(prev);
                return url;
            });
        } catch (error) {
            console.error("Failed to generate PDF preview:", error);
            toast.error("Failed to generate PDF preview");
        } finally {
            setIsGenerating(false);
        }
    }, [buildDraftHeader, buildDraftDetails, discountTypes, isOfficial, template, preFetchedBackgroundImageDataUrl]);

    useEffect(() => {
        if (isOpen && discountTypes.length > 0) {
            generatePreview();
        }
    }, [isOpen, generatePreview, discountTypes.length]);

    useEffect(() => {
        return () => {
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        };
    }, [pdfUrl]);

    const handlePrintAndSave = async () => {
        setIsSaving(true);
        try {
            const now = new Date();
            const priceTypeName = priceTypes.find(p => p.price_type_id.toString() === selectedPriceType)?.price_type_name ?? '';

            const payload: Record<string, unknown> = {
                order_id: previewInvoiceNo,
                invoice_no: previewInvoiceNo,
                customer_code: selectedCustomer.customer_code,
                salesman_id: selectedAccount.id,
                branch_id: Number(selectedBranch) || null,
                invoice_date: format(now, 'yyyy-MM-dd HH:mm:ss'),
                due_date: dueDate,
                payment_terms: (selectedCustomer.payment_term && selectedCustomer.payment_term > 0)
                    ? Number(selectedCustomer.payment_term)
                    : null,
                sales_type: Number(selectedSalesType) || null,
                invoice_type: Number(selectedInvoiceType) || null,
                price_type: priceTypeName,
                gross_amount: totalGross,
                discount_amount: totalDiscount,
                vat_amount: isVatApplicable ? totalVat : 0,
                net_amount: totalNet,
                total_amount: totalNet,
                remarks: 'Auto-generated transaction',
                items: cart.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    discount_amount: (item.unit_price - calculateChainNetPrice(item.unit_price, item.discounts ?? [])) * item.quantity,
                    total_amount: item.total_amount,
                    unit_id: item.unit_id,
                    discount_type: item.discount_type,
                })),
            };

            const { invoiceId } = await onCreateAndPrint(payload);

            await stockPurchaseProvider.finalizeSettlement([invoiceId]);

            const draftHeader = buildDraftHeader();
            draftHeader.invoice_id = invoiceId;

            const draftDetails = buildDraftDetails();
            const receiptData = mapStockPurchaseToReceiptData(draftHeader, draftDetails, discountTypes, isOfficial);
            if (template) receiptData.template = template;

            const doc = await generateStockPurchasePrintPDF(receiptData, undefined, true);

            try {
                const pdfBlob = doc.output('blob');
                const archiveFormData = new FormData();
                archiveFormData.append('file', new File([pdfBlob], `StockPurchase-${previewInvoiceNo}.pdf`, { type: 'application/pdf' }));
                archiveFormData.append('invoice_ids', JSON.stringify([invoiceId]));
                archiveFormData.append('receipt_numbers', previewInvoiceNo);
                archiveFormData.append('width_mm', isOfficial ? '210' : '80');
                if (isOfficial) {
                    archiveFormData.append('height_mm', '297');
                }

                await fetch('/api/crm/customer-hub/stock-purchase/save-pdf', {
                    method: 'POST',
                    body: archiveFormData,
                });
            } catch (archiveErr) {
                console.warn('[StockPurchaseCreatePrintPreviewModal] PDF archival failed (non-fatal):', archiveErr);
            }

            doc.save(`StockPurchase-${previewInvoiceNo}.pdf`);

            toast.success(`Stock Purchase ${previewInvoiceNo} created and dispatched!`);
            router.push('/crm/customer-hub/stock-purchase');
        } catch (err) {
            console.error("Failed to create and print transaction:", err);
            toast.error(err instanceof Error ? err.message : "Failed to process transaction");
        } finally {
            setIsSaving(false);
        }
    };

    const handleTemplateSave = async (newTemplate: ORTemplate) => {
        setIsSavingTemplate(true);
        try {
            await StockPurchasePrintService.saveTemplate(invoiceTypeId, newTemplate);
            setTemplate(newTemplate);
            generatePreview();
            toast.success("Template saved successfully");
            setIsDesignerOpen(false);
        } catch (error) {
            console.error("Failed to save template:", error);
            toast.error("Failed to save template changes");
        } finally {
            setIsSavingTemplate(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className={cn(
                "h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 border-none shadow-2xl rounded-3xl transition-all duration-500 ease-in-out",
                isOfficial
                    ? "!w-[min(calc(210mm+3rem),calc(100vw-1rem))] !max-w-[min(calc(210mm+3rem),calc(100vw-1rem))]"
                    : "!w-[min(450px,calc(100vw-1rem))] !max-w-[min(450px,calc(100vw-1rem))]"
            )}>
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600 rounded-xl shadow-indigo-100 shadow-lg">
                            <Printer className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black tracking-tighter text-slate-900 uppercase">
                                Print Preview
                            </DialogTitle>
                            <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">
                                {previewInvoiceNo} · Draft
                            </p>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={onClose}
                        disabled={isSaving}
                        className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-hidden relative flex bg-slate-200/50 p-6 justify-center">
                    {isGenerating && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm z-20">
                            <div className="relative">
                                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-indigo-400" />
                                </div>
                            </div>
                            <p className="mt-4 text-sm font-black text-slate-900 tracking-tighter uppercase">
                                Preparing Document...
                            </p>
                        </div>
                    )}

                    <div className={cn(
                        "w-full h-full bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-200 transition-all duration-500",
                        isOfficial ? "max-w-[210mm]" : "max-w-[80mm]"
                    )}>
                        {pdfUrl ? (
                            <iframe
                                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                className="w-full h-full border-none"
                                title="Print Preview"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 uppercase font-black tracking-widest text-xs">
                                No Preview Available
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 bg-white border-t flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center gap-2 text-slate-400">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            <span className="text-[10px] font-black tracking-widest uppercase text-amber-600">
                                Draft · Not yet saved
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isOfficial && (
                            <Button
                                variant="outline"
                                onClick={() => setIsDesignerOpen(true)}
                                disabled={isSaving}
                                className="rounded-2xl h-12 px-6 border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-black tracking-tighter active:scale-95 transition-all flex items-center gap-2 bg-white"
                            >
                                <Layout className="w-4 h-4" />
                                CONFIGURE LAYOUT
                            </Button>
                        )}
                        <Button
                            onClick={handlePrintAndSave}
                            disabled={isSaving || isGenerating}
                            className="rounded-2xl h-12 px-8 bg-indigo-600 hover:bg-indigo-700 font-black tracking-tighter text-white shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Printer className="w-4 h-4" />
                            )}
                            {isSaving ? "SAVING..." : "PRINT NOW"}
                        </Button>
                    </div>
                </div>
            </DialogContent>

            {isOfficial && (
                <StockPurchaseTemplateDesigner
                    isOpen={isDesignerOpen}
                    onClose={() => setIsDesignerOpen(false)}
                    onSave={handleTemplateSave}
                    initialTemplate={template ?? undefined}
                    isSaving={isSavingTemplate}
                />
            )}
        </Dialog>
    );
};
