"use client";

import React, { useEffect, useState, useCallback } from 'react';
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
    CheckCircle2
} from "lucide-react";
import { StockPurchaseHeader, StockPurchaseDetail, InvoiceType } from '../types';
import { DiscountType, ORTemplate } from '../types/print';
import { mapStockPurchaseToReceiptData } from '../utils/mapping';
import { generateStockPurchasePrintPDF } from '../utils/stockPurchasePrintPDF';
import { StockPurchasePrintService } from '../services/StockPurchasePrintService';
import { stockPurchaseProvider } from '../providers/fetchProvider';
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { StockPurchaseTemplateDesigner } from "./StockPurchaseTemplateDesigner";

interface StockPurchasePrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    header: StockPurchaseHeader;
    details: StockPurchaseDetail[];
}

export const StockPurchasePrintPreviewModal: React.FC<StockPurchasePrintPreviewModalProps> = ({
    isOpen,
    onClose,
    header,
    details,
}) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isOfficial] = useState(() => {
        const typeData = header.invoice_type as (InvoiceType | number | null | undefined);
        if (typeData && typeof typeData === 'object' && 'isOfficial' in typeData) {
            return Number(typeData.isOfficial) === 1;
        }
        return typeData === 1 || typeData === null || typeData === undefined;
    });
    const [discountTypes, setDiscountTypes] = useState<DiscountType[]>([]);
    const [template, setTemplate] = useState<ORTemplate | null>(null);
    const [isDesignerOpen, setIsDesignerOpen] = useState(false);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const dt = await StockPurchasePrintService.getDiscountTypes();
            setDiscountTypes(dt);
            
            const invoiceTypeId = typeof header.invoice_type === 'object' 
                ? (header.invoice_type as { id?: number })?.id 
                : header.invoice_type;

            const templateId = invoiceTypeId || (isOfficial ? 1 : 2);
            const tpl = await StockPurchasePrintService.getTemplate(templateId);
            setTemplate(tpl || null);
        } catch (error) {
            console.error("Failed to load print data:", error);
            if (isOfficial) toast.error("Failed to load print templates");
        } finally {
            setIsLoading(false);
        }
    }, [isOfficial, header.invoice_type]);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, loadData]);

    const generatePdf = useCallback(async () => {
        if (!template && isOfficial) return; 
        
        setIsGenerating(true);
        try {
            const receiptData = mapStockPurchaseToReceiptData(header, details, discountTypes, isOfficial);
            if (template) receiptData.template = template;

            const doc = await generateStockPurchasePrintPDF(receiptData);
            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);
            
            setPdfUrl(prev => {
                if (prev) URL.revokeObjectURL(prev);
                return url;
            });
        } catch (error) {
            console.error("Failed to generate PDF:", error);
            toast.error("Failed to generate PDF preview");
        } finally {
            setIsGenerating(false);
        }
    }, [header, details, discountTypes, isOfficial, template]);

    useEffect(() => {
        if (!isLoading && isOpen && discountTypes.length > 0) {
            generatePdf();
        }
    }, [isLoading, isOpen, generatePdf, discountTypes.length]);

    useEffect(() => {
        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [pdfUrl]);

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            const receiptData = mapStockPurchaseToReceiptData(header, details, discountTypes, isOfficial);
            if (template) receiptData.template = template;

            const doc = await generateStockPurchasePrintPDF(receiptData, undefined, true);
            const filename = `StockPurchase-${header.invoice_no || 'Draft'}.pdf`;
            
            doc.save(filename);
            
            if (header.invoice_id) {
                await stockPurchaseProvider.finalizeSettlement([header.invoice_id]);
                toast.success("Transaction status updated to Dispatched");
                window.location.reload();
            }

            toast.success("Downloading clean document...");
        } catch (err) {
            console.error("Failed to generate download or update status:", err);
            toast.error("Process failed");
        } finally {
            setIsPrinting(false);
        }
    };

    const handleTemplateSave = async (newTemplate: ORTemplate) => {
        setIsSavingTemplate(true);
        try {
            const invoiceTypeId = typeof header.invoice_type === 'object' 
                ? (header.invoice_type as { id?: number })?.id 
                : header.invoice_type;

            const targetTypeId = invoiceTypeId || (isOfficial ? 1 : 2);
            
            await StockPurchasePrintService.saveTemplate(targetTypeId, newTemplate);
            setTemplate(newTemplate);
            generatePdf();
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
                                {header.invoice_no || 'Draft Invoice'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={onClose}
                            className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative flex bg-slate-200/50 p-6 justify-center">
                    {isGenerating || isLoading ? (
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
                    ) : null}

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
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-black tracking-widest uppercase">Document Ready for Printing</span>
                    </div>

                    <div className="flex items-center gap-3">
                        {isOfficial && (
                            <Button
                                variant="outline"
                                onClick={() => setIsDesignerOpen(true)}
                                className="rounded-2xl h-12 px-6 border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-black tracking-tighter active:scale-95 transition-all flex items-center gap-2 bg-white"
                            >
                                <Layout className="w-4 h-4" />
                                CONFIGURE LAYOUT
                            </Button>
                        )}
                        <Button
                            onClick={handlePrint}
                            disabled={isPrinting}
                            className="rounded-2xl h-12 px-8 bg-indigo-600 hover:bg-indigo-700 font-black tracking-tighter text-white shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center gap-2"
                        >
                            {isPrinting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Printer className="w-4 h-4" />
                            )}
                            {isPrinting ? "PROCESSING..." : "PRINT NOW"}
                        </Button>
                    </div>
                </div>
            </DialogContent>

            {isOfficial && (
                <StockPurchaseTemplateDesigner 
                    isOpen={isDesignerOpen}
                    onClose={() => setIsDesignerOpen(false)}
                    onSave={handleTemplateSave}
                    initialTemplate={template || undefined}
                    isSaving={isSavingTemplate}
                />
            )}
        </Dialog>
    );
};
