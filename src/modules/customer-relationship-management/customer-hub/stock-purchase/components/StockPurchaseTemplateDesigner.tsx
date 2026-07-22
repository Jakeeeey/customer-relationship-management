"use client";

import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ORTemplate, ORFieldConfig } from "../types/print";
import { Upload, Move, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { StockPurchasePrintService } from "../services/StockPurchasePrintService";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (template: ORTemplate) => void;
    initialTemplate?: ORTemplate;
    isSaving?: boolean;
}

const DEFAULT_TEMPLATE: ORTemplate = {
    id: 'default-or',
    name: 'Stock Purchase Receipt',
    width: 210,
    height: 265,
    fields: {
        customer_name: { x: 33, y: 30, fontSize: 11, fontFamily: 'courier', fontWeight: 'normal', label: 'Customer Name' },
        date: { x: 180, y: 30, fontSize: 11, fontFamily: 'courier', fontWeight: 'normal', label: 'Date' },
        store_name: { x: 45, y: 38, fontSize: 11, fontFamily: 'courier', fontWeight: 'normal', label: 'Store Name' },
        payment_name: { x: 180, y: 38, fontSize: 11, fontFamily: 'courier', fontWeight: 'normal', label: 'Terms' },
        customer_tin: { x: 20, y: 46, fontSize: 11, fontFamily: 'courier', fontWeight: 'normal', label: 'TIN' },
        address: { x: 33, y: 55, fontSize: 11, fontFamily: 'courier', fontWeight: 'normal', label: 'Address' },
        vatable_sales: { x: 180, y: 145, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'Vatable Sales' },
        vat_amount: { x: 180, y: 151, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'VAT Amount' },
        gross_total: { x: 180, y: 157, fontSize: 11, fontFamily: 'courier', fontWeight: 'normal', label: 'Gross Total' },
        discount_total: { x: 180, y: 163, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'Discount Total' },
        net_total: { x: 180, y: 175, fontSize: 12, fontFamily: 'courier', fontWeight: 'normal', label: 'Net Total' },
        po_no: { x: 10, y: 185, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'PO Number' },
        salesman: { x: 10, y: 191, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'Salesman Name' },
        total_amount_due: { x: 180, y: 200, fontSize: 12, fontFamily: 'courier', fontWeight: 'normal', label: 'Total Amount Due' },
        barcode: { x: 170, y: 5, fontSize: 12, fontFamily: 'courier', fontWeight: 'normal', label: 'Barcode' },
    },
    tableSettings: {
        startY: 65,
        rowHeight: 12.2,
        fontSize: 10,
        product_name_width: 85,
        columns: {
            product_name: { x: 10 },
            quantity: { x: 105 },
            unit_price: { x: 126 },
            discount: { x: 153 },
            net_amount: { x: 184 }
        }
    }
};

export const StockPurchaseTemplateDesigner: React.FC<Props> = ({ isOpen, onClose, onSave, initialTemplate, isSaving }) => {
    const [template, setTemplate] = useState<ORTemplate>(DEFAULT_TEMPLATE);
    const [activeField, setActiveField] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [isUploading, setIsUploading] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && initialTemplate) {
            setTemplate({
                ...initialTemplate,
                fields: {
                    ...DEFAULT_TEMPLATE.fields,
                    ...(initialTemplate.fields || {})
                },
                tableSettings: initialTemplate.tableSettings ? {
                    ...DEFAULT_TEMPLATE.tableSettings,
                    ...initialTemplate.tableSettings
                } : DEFAULT_TEMPLATE.tableSettings
            });
        } else if (isOpen && !initialTemplate) {
            setTemplate(DEFAULT_TEMPLATE);
        }
    }, [isOpen, initialTemplate]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileId = await StockPurchasePrintService.uploadFile(file);
            setTemplate(prev => ({ ...prev, backgroundImage: fileId }));
            toast.success("Background image uploaded successfully");
        } catch (err) {
            console.error("Upload failed:", err);
            const errorMsg = err instanceof Error ? err.message : "Failed to upload image";
            toast.error(errorMsg);
        } finally {
            setIsUploading(false);
        }
    };

    const updateField = (key: string, updates: Partial<ORFieldConfig>) => {
        setTemplate(prev => ({
            ...prev,
            fields: {
                ...prev.fields,
                [key]: { ...(prev.fields[key] as ORFieldConfig), ...updates }
            }
        }));
    };

    const handleDrag = (key: string, e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        
        const rect = canvasRef.current.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const field = template.fields[key] as ORFieldConfig;
        const initialX = field.x;
        const initialY = field.y;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const dx = (moveEvent.clientX - startX) * (template.width / rect.width);
            const dy = (moveEvent.clientY - startY) * (template.height / rect.height);
            
            updateField(key, {
                x: Math.max(0, Math.min(template.width, initialX + dx)),
                y: Math.max(0, Math.min(template.height, initialY + dy))
            });
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const handleSave = () => {
        onSave(template);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 border-none shadow-2xl rounded-3xl">
                <DialogHeader className="px-6 py-4 bg-white border-b shadow-sm">
                    <DialogTitle className="text-xl font-black tracking-tighter text-slate-900 uppercase">
                        Layout Designer
                    </DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Pane - Canvas */}
                    <div ref={scrollRef} className="flex-1 overflow-auto p-6 bg-slate-200/50 flex justify-center items-start">
                        <div 
                            ref={canvasRef}
                            className="bg-white shadow-2xl relative select-none border border-slate-300"
                            style={{
                                width: `${template.width * zoom}mm`,
                                height: `${template.height * zoom}mm`,
                                minWidth: `${template.width * zoom}mm`,
                                minHeight: `${template.height * zoom}mm`,
                                transition: "all 0.1s ease-out"
                            }}
                        >
                            {/* Background Image */}
                            {template.backgroundImage ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    src={`/assets/${template.backgroundImage}`}
                                    alt="Background template"
                                    className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-50"
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center border-4 border-dashed border-slate-200 m-8 text-slate-400">
                                    <AlertTriangle className="w-12 h-12 mb-2" />
                                    <span className="text-xs font-bold uppercase">No background image uploaded</span>
                                </div>
                            )}

                            {/* Render Fields */}
                            {Object.entries(template.fields).map(([key, field]) => {
                                if (!field) return null;
                                const isActive = activeField === key;
                                return (
                                    <div
                                        key={key}
                                        className={`absolute cursor-move px-2 py-0.5 border text-slate-800 rounded group flex items-center gap-1 ${
                                            isActive 
                                                ? "border-primary bg-primary/10 shadow-lg z-30" 
                                                : "border-transparent hover:border-slate-300 hover:bg-slate-50/50 z-20"
                                        }`}
                                        style={{
                                            left: `${field.x * zoom}mm`,
                                            top: `${field.y * zoom}mm`,
                                            fontSize: `${field.fontSize * zoom}pt`,
                                            fontFamily: field.fontFamily || 'courier',
                                            fontWeight: field.fontWeight || 'normal',
                                            transform: "translate(-50%, -50%)"
                                        }}
                                        onMouseDown={(e) => {
                                            setActiveField(key);
                                            handleDrag(key, e);
                                        }}
                                    >
                                        <Move className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 pointer-events-none" />
                                        <span>{field.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Pane - Config */}
                    <div className="w-[380px] bg-white border-l shadow-xl flex flex-col overflow-hidden">
                        <div className="p-6 border-b flex-1 overflow-y-auto space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Zoom Level</Label>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}>-</Button>
                                    <div className="w-20 flex items-center justify-center font-bold text-sm">{(zoom * 100).toFixed(0)}%</div>
                                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}>+</Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Background Template</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        id="bg-upload"
                                    />
                                    <Label
                                        htmlFor="bg-upload"
                                        className="flex items-center justify-center gap-2 w-full h-12 border-2 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 transition-colors font-bold text-xs"
                                    >
                                        {isUploading ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                        ) : (
                                            <Upload className="w-4 h-4" />
                                        )}
                                        {isUploading ? "Uploading..." : "Upload Template Image"}
                                    </Label>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="p-6 bg-slate-50 border-t">
                            <Button variant="ghost" className="rounded-xl px-6" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button className="rounded-xl px-8 text-white bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? "Saving..." : "Save Configuration"}
                            </Button>
                        </DialogFooter>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
