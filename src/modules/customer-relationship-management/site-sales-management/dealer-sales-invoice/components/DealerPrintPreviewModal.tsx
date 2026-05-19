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
import { DealerInvoiceHeader, DealerInvoiceDetail, InvoiceType } from '../types';
import { DiscountType, ORTemplate } from '../types/print';
import { mapDealerInvoiceToReceiptData } from '../utils/mapping';
import { generateDealerPrintPDF } from '../utils/dealerPrintPDF';
import { DealerPrintService } from '../services/DealerPrintService';
import { dealerInvoiceProvider } from '../providers/fetchProvider';
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DealerTemplateDesigner } from "./DealerTemplateDesigner";

interface DealerPrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    header: DealerInvoiceHeader;
    details: DealerInvoiceDetail[];
}

export const DealerPrintPreviewModal: React.FC<DealerPrintPreviewModalProps> = ({
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
        // Fallback to true if not clearly specified or if it's the old numeric format
        return typeData === 1 || typeData === null || typeData === undefined;
    });
    const [discountTypes, setDiscountTypes] = useState<DiscountType[]>([]);
    const [template, setTemplate] = useState<ORTemplate | null>(null);
    const [isDesignerOpen, setIsDesignerOpen] = useState(false);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const dt = await DealerPrintService.getDiscountTypes();
            setDiscountTypes(dt);
            
            // Extract numeric ID from invoice_type object if joined by Directus
            const invoiceTypeId = typeof header.invoice_type === 'object' 
                ? (header.invoice_type as { id?: number })?.id 
                : header.invoice_type;

            const templateId = invoiceTypeId || (isOfficial ? 1 : 2);
            const tpl = await DealerPrintService.getTemplate(templateId);
            setTemplate(tpl || null);
        } catch (error) {
            console.error("Failed to load print data:", error);
            // Don't toast error if it's just a missing thermal template (common)
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
            const receiptData = mapDealerInvoiceToReceiptData(header, details, discountTypes, isOfficial);
            if (template) receiptData.template = template;

            const doc = await generateDealerPrintPDF(receiptData);
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
    }, [header, details, discountTypes, isOfficial, template]); // Removed pdfUrl

    useEffect(() => {
        if (!isLoading && isOpen && discountTypes.length > 0) {
            // Only generate if we don't have a URL or if dependencies changed
            // The useCallback already handles the dependency check
            generatePdf();
        }
    }, [isLoading, isOpen, generatePdf, discountTypes.length]); // Added missing dependency

    // Cleanup PDF URL on close or unmount
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
            // 1. Generate and save PDF
            const receiptData = mapDealerInvoiceToReceiptData(header, details, discountTypes, isOfficial);
            if (template) receiptData.template = template;

            const doc = await generateDealerPrintPDF(receiptData, undefined, true);
            const filename = `Invoice-${header.invoice_no || 'Draft'}.pdf`;
            
            doc.save(filename);
            
            // 2. Update Database (User Requirement: Mark as Dispatched on Print Now)
            if (header.invoice_id) {
                await dealerInvoiceProvider.finalizeSettlement([header.invoice_id]);
                toast.success("Invoice status updated to Dispatched");
                
                // Perform full reload to ensure all statuses and badges are updated
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
            // Extract numeric ID from invoice_type object if joined by Directus
            const invoiceTypeId = typeof header.invoice_type === 'object' 
                ? (header.invoice_type as { id?: number })?.id 
                : header.invoice_type;

            const targetTypeId = invoiceTypeId || (isOfficial ? 1 : 2);
            
            await DealerPrintService.saveTemplate(targetTypeId, newTemplate);
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
                {/* Custom Header */}
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
                        {/* Status indicator removed to clean up UI as requested */}
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

                {/* Preview Area */}
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

                {/* Footer Actions */}
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
                                className="rounded-2xl h-12 px-6 border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-black tracking-tighter active:scale-95 transition-all flex items-center gap-2"
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
                <DealerTemplateDesigner 
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
