"use client"

import React, { useState, useEffect } from "react"
import { 
    Dialog, DialogContent, DialogHeader, 
    DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PdfEngine } from "@/components/pdf-layout-design/PdfEngine"
import { pdfTemplateService, PdfTemplate } from "@/components/pdf-layout-design/services/pdf-template"
import { CompanyData } from "@/components/pdf-layout-design/types"
import { Input } from "@/components/ui/input"
import { RefreshCcw, Download, FileText } from "lucide-react"
import autoTable from "jspdf-autotable"
import { toast } from "sonner"
import { InventoryReportMode, GroupedInventoryItem, InventoryUnit } from "../types"
import { cn } from "@/lib/utils"

interface InventoryReportPrintModalProps {
    isOpen: boolean
    mode: 'preview' | 'print'
    onClose: () => void
    data: GroupedInventoryItem[]
    filters: {
        branch: string
        supplier: string
        mode: InventoryReportMode
    }
    userName?: string
}

export const InventoryReportPrintModal = ({ 
    isOpen, 
    mode,
    onClose, 
    data,
    filters,
    userName 
}: InventoryReportPrintModalProps) => {
    const [templates, setTemplates] = useState<PdfTemplate[]>([])
    const [selectedTemplateName, setSelectedTemplateName] = useState<string>("")
    const [companyData, setCompanyData] = useState<CompanyData | null>(null)
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [customFilename, setCustomFilename] = useState<string>("")

    useEffect(() => {
        if (isOpen) {
            setCustomFilename(`InventoryReport-${filters.mode}`);
            const init = async () => {
                try {
                    const [compRes, tpls] = await Promise.all([
                        fetch("/api/pdf/company"),
                        pdfTemplateService.fetchTemplates()
                    ]);

                    if (compRes.ok) {
                        const result = await compRes.json();
                        const company = result.data?.[0] || (Array.isArray(result.data) ? null : result.data);
                        setCompanyData(company);
                    }

                    setTemplates(tpls);
                    if (tpls.length > 0 && !selectedTemplateName) {
                        setSelectedTemplateName(tpls[0].name);
                    }
                } catch (error) {
                    console.error("Error fetching PDF data:", error);
                }
            };
            init();
        }
    }, [isOpen, filters.mode, selectedTemplateName]);

    const handleGeneratePreview = React.useCallback(async () => {
        setIsGenerating(true);
        try {
            const doc = await PdfEngine.generateWithFrame(selectedTemplateName, companyData, (doc, startY, config) => {
                const margins = config.margins || { top: 10, bottom: 20, left: 10, right: 10 };
                const pageWidth = doc.internal.pageSize.getWidth();
                
                doc.setProperties({
                    title: customFilename || `InventoryReport-${filters.mode}`,
                    subject: 'Inventory Report',
                    author: 'VOS CRM System'
                });

                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.text("INVENTORY REPORT", margins.left, startY + 5);

                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                const metadataY = startY + 12;
                
                doc.text(`Branch: ${filters.branch || 'ALL BRANCHES'}`, margins.left, metadataY);
                doc.text(`Supplier: ${filters.supplier || 'ALL SUPPLIERS'}`, margins.left, metadataY + 5);
                const activeData = data.filter(item => {
                    if (filters.mode === 'Box') {
                        const boxUnit = item.units.find(u => u.unit.toUpperCase().includes('BOX') || u.unit.toUpperCase().includes('CASE'));
                        return boxUnit && Number(boxUnit.runningInventory) !== 0;
                    }
                    if (filters.mode === 'Piece') {
                        const pieceUnit = item.units.find(u => u.unit.toUpperCase().includes('PIECE') || u.unit.toUpperCase().includes('PCS') || u.unitCount === 1);
                        return pieceUnit && Number(pieceUnit.runningInventory) !== 0;
                    }
                    return (Number(item.piece) || 0) !== 0;
                }).sort((a, b) => a.products.localeCompare(b.products));

                doc.text(`Total Products: ${activeData.length}`, margins.left, metadataY + 10);
                
                const generatedBy = userName || (typeof window !== 'undefined' ? localStorage.getItem('fullName') || localStorage.getItem('user_fullname') || 'ADMIN' : 'ADMIN');
                const generatedAt = new Date().toLocaleString('en-US', { 
                    dateStyle: 'medium', 
                    timeStyle: 'short' 
                });

                doc.text(`Generated By: ${generatedBy}`, pageWidth - margins.right, metadataY, { align: 'right' });
                doc.text(`Generated At: ${generatedAt}`, pageWidth - margins.right, metadataY + 5, { align: 'right' });

                const tableStartY = metadataY + 17;
                const head: string[][] = [];
                const body: (string | number | Record<string, unknown>)[][] = [];
                const foot: string[][] = [];

                head.push(['BARCODE', 'BRAND', 'CATEGORY', 'PRODUCT', 'BOX', 'PACK', 'PIECES', 'TOTAL PIECES', 'TOTAL AMOUNT']);
                let totalAmount = 0;
                
                activeData.forEach(item => {
                    const barcode = item.units.find(u => u.barcode)?.barcode || '';
                    
                    const isBox = (u: InventoryUnit) => u.unit.toUpperCase().includes('BOX') || u.unit.toUpperCase().includes('CASE');
                    const isPiece = (u: InventoryUnit) => u.unit.toUpperCase().includes('PIECE') || u.unit.toUpperCase().includes('PCS') || u.unitCount === 1;
                    const isPack = (u: InventoryUnit) => !isBox(u) && !isPiece(u);

                    const boxUnit = item.units.find(isBox);
                    let boxStock = boxUnit ? Number(boxUnit.runningInventory) : 0;
                    
                    const packUnit = item.units.find(isPack);
                    let packStock = packUnit ? Number(packUnit.runningInventory) : 0;
                    
                    const pieceUnit = item.units.find(isPiece);
                    let pieceStock = pieceUnit ? Number(pieceUnit.runningInventory) : 0;
                    
                    if (filters.mode === 'Box') {
                        packStock = 0;
                        pieceStock = 0;
                    } else if (filters.mode === 'Piece') {
                        boxStock = 0;
                        packStock = 0;
                    }
                    
                    const totalPieces = Number(item.piece) || 0;
                    
                    let itemTotalAmount = 0;
                    item.units.forEach((u: InventoryUnit) => {
                        const unitPrice = Number(u.price) || 0;
                        const runningInv = Number(u.runningInventory) || 0;
                        
                        if (filters.mode === 'Box' && u !== boxUnit) return;
                        if (filters.mode === 'Piece' && u !== pieceUnit) return;
                        
                        itemTotalAmount += runningInv * unitPrice;
                    });
                    totalAmount += itemTotalAmount;

                    const formatStock = (stock: number, isPiece: boolean = false) => {
                        const str = stock.toLocaleString(undefined, isPiece ? undefined : { minimumFractionDigits: 2 });
                        return stock > 0 ? { content: str, styles: { fontStyle: 'bold' } } : str;
                    };

                    body.push([
                        barcode,
                        item.brand,
                        item.category,
                        item.products,
                        formatStock(boxStock),
                        formatStock(packStock),
                        formatStock(pieceStock, true),
                        formatStock(totalPieces, true),
                        itemTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })
                    ]);
                });

                foot.push(['', '', '', '', '', '', '', 'TOTAL AMOUNT:', Number(totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })]);

                autoTable(doc, {
                    startY: tableStartY,
                    margin: margins,
                    head: head,
                    body: body,
                    foot: foot,
                    theme: 'striped',
                    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 7 },
                    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7 },
                    styles: { 
                        fontSize: 6, 
                        cellPadding: 1,
                        valign: 'middle'
                    },
                    columnStyles: {
                        0: { cellWidth: 20 }, // BARCODE
                        1: { cellWidth: 15 }, // BRAND
                        2: { cellWidth: 20 }, // CATEGORY
                        3: { cellWidth: 'auto' }, // PRODUCT
                        4: { cellWidth: 15, halign: 'center' }, // BOX
                        5: { cellWidth: 15, halign: 'center' }, // PACK
                        6: { cellWidth: 15, halign: 'center' }, // PIECES
                        7: { cellWidth: 20, halign: 'center' }, // TOTAL PIECES
                        8: { cellWidth: 20, halign: 'right' }, // TOTAL AMOUNT
                    }
                });

                if (config) {
                    config.pageNumber = {
                        show: true,
                        format: 'Page {pageNumber} of {totalPages}',
                        position: 'bottom-right',
                        fontSize: 9,
                        fontFamily: 'helvetica',
                        color: '#64748b',
                        marginY: 8,
                        marginX: 10,
                        ...(config.pageNumber || {})
                    };
                }
            });

            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Failed to generate PDF preview.");
        } finally {
            setIsGenerating(false);
        }
    }, [selectedTemplateName, companyData, customFilename, filters.mode, filters.branch, filters.supplier, userName, data]);

    useEffect(() => {
        if (isOpen && selectedTemplateName && companyData) {
            handleGeneratePreview();
        }
    }, [isOpen, selectedTemplateName, companyData, handleGeneratePreview]);

    const handleDownload = () => {
        if (pdfUrl) {
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `${customFilename || 'InventoryReport'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("PDF Downloaded successfully");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent 
                style={{ maxWidth: '95vw', width: '95vw' }}
                className="h-[92vh] flex flex-col p-0 rounded-[2.5rem] overflow-hidden border-none shadow-2xl ring-1 ring-black/5 transition-all duration-500 [&>button]:hidden"
            >
                <DialogHeader className="p-8 bg-white border-b shrink-0">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className="bg-primary/10 p-4 rounded-3xl border border-primary/20 shadow-inner">
                                <Download className="text-primary h-8 w-8" />
                            </div>
                            <div>
                                <DialogTitle className="text-3xl font-black uppercase italic tracking-tight text-foreground/90">
                                    {mode === 'preview' ? 'Document Preview' : 'Download Document'}
                                </DialogTitle>
                                <DialogDescription className="text-base font-medium text-muted-foreground/70">
                                    {mode === 'preview' ? 'Inspect your document structure before finalizing.' : 'Set your filename and save your finalized inventory report.'}
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-6 bg-muted/40 p-3 px-6 rounded-[2rem] border shadow-sm flex-1 lg:max-w-fit">
                            <div className="flex flex-col gap-1.5 px-2">
                                <label className="text-xs font-black text-muted-foreground/60 tracking-[0.2em] uppercase">Document Filename</label>
                                <Input 
                                    value={customFilename}
                                    onChange={(e) => setCustomFilename(e.target.value)}
                                    placeholder="Enter filename..."
                                    className="h-8 bg-transparent border-none text-base font-black focus:ring-0 ring-0 outline-none min-w-[300px] cursor-pointer text-foreground/80 p-0 shadow-none border-0"
                                />
                            </div>
                            <div className="hidden lg:block h-10 w-px bg-border/60" />
                            <div className="flex flex-col gap-1.5 px-2">
                                <label className="text-xs font-black text-muted-foreground/60 tracking-[0.2em] uppercase">Layout Template</label>
                                <select 
                                    className="bg-transparent border-none text-base font-black focus:ring-0 outline-none min-w-[280px] cursor-pointer text-foreground/80"
                                    value={selectedTemplateName}
                                    onChange={(e) => setSelectedTemplateName(e.target.value)}
                                >
                                    {templates.length === 0 && <option>Loading templates...</option>}
                                    {templates.map(t => (
                                        <option key={t.id} value={t.name}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="hidden lg:block h-10 w-px bg-border/60" />
                            <div className="flex gap-4">
                                <Button 
                                    variant={mode === 'preview' ? 'default' : 'outline'}
                                    onClick={handleGeneratePreview}
                                    disabled={isGenerating}
                                    className={cn(
                                        "rounded-2xl px-6 h-12 font-black uppercase text-xs tracking-widest transition-all",
                                        mode === 'preview' ? "shadow-lg shadow-primary/20" : "border-2 border-primary/20 hover:bg-primary/5"
                                    )}
                                >
                                    <RefreshCcw size={16} className={cn("mr-2", isGenerating && "animate-spin")} />
                                    {mode === 'preview' ? 'Regenerate Preview' : 'Regenerate'}
                                </Button>
                                {mode === 'print' && (
                                    <Button 
                                        onClick={handleDownload}
                                        disabled={isGenerating || !pdfUrl}
                                        className="rounded-2xl px-8 h-12 font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all duration-300 active:scale-95"
                                    >
                                        <Download size={18} className="mr-2" />
                                        Download PDF
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 bg-[#F1F5F9] p-6 flex items-center justify-center relative overflow-hidden">
                    {isGenerating ? (
                        <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-500">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/30 blur-[100px] rounded-full animate-pulse" />
                                <RefreshCcw className="h-24 w-24 animate-spin text-primary relative z-10" />
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="font-black text-2xl uppercase tracking-[0.4em] text-foreground/80">Compiling Report</span>
                                <span className="text-xs text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60">Leveraging PDF Engine v2...</span>
                            </div>
                        </div>
                    ) : pdfUrl ? (
                        <div className="w-full h-full animate-in slide-in-from-bottom-12 fade-in-0 duration-1000 ease-out">
                            <iframe 
                                src={pdfUrl} 
                                className="w-full h-full rounded-[2rem] border-none shadow-[0_40px_100px_rgba(0,0,0,0.15)] bg-white ring-1 ring-black/5"
                                title="PDF Preview"
                            />
                        </div>
                    ) : (
                        <div className="text-center space-y-6 opacity-20 group">
                            <FileText size={120} className="mx-auto text-muted-foreground group-hover:scale-110 transition-transform duration-700" />
                            <p className="font-black uppercase text-lg tracking-[0.5em]">System Idle</p>
                        </div>
                    )}
                </div>
                
                <DialogFooter className="p-6 bg-white border-t shrink-0">
                    <div className="flex justify-between items-center w-full px-2">
                        <div className="flex items-center gap-8">
                             <div className="flex flex-col items-start gap-0.5">
                                <span className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest flex items-center gap-1.5">
                                    <div className="h-1 w-1 rounded-full bg-primary/40" /> PDF Summary
                                </span>
                                <span className="text-base font-black italic text-foreground/80">{data.length} Total Inventory Records</span>
                             </div>
                             <div className="h-10 w-px bg-border/40" />
                             <div className="flex flex-col items-start gap-0.5">
                                <span className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest flex items-center gap-1.5">
                                    <div className="h-1 w-1 rounded-full bg-primary/40" /> Generation Mode
                                </span>
                                <span className="text-base font-black italic text-primary uppercase">{filters.mode} View</span>
                             </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button 
                                variant="ghost" 
                                onClick={onClose} 
                                className="rounded-xl px-6 font-black uppercase text-[11px] tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                            >
                                Dismiss
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}