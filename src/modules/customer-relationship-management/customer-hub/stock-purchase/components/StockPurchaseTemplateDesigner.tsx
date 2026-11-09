"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ORTemplate, ORFieldConfig } from "../types/print";
import { Upload, Move, AlertTriangle, Loader2, EyeOff, Plus, RotateCcw, X } from "lucide-react";
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
        gross_total_label: { x: 135, y: 157, fontSize: 11, fontFamily: 'courier', fontWeight: 'bold', label: 'Gross Total Label' },
        discount_total: { x: 180, y: 163, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'Discount Total' },
        discount_total_label: { x: 135, y: 163, fontSize: 10, fontFamily: 'courier', fontWeight: 'bold', label: 'Discount Total Label' },
        net_total: { x: 180, y: 175, fontSize: 12, fontFamily: 'courier', fontWeight: 'normal', label: 'Net Total' },
        net_total_label: { x: 135, y: 175, fontSize: 12, fontFamily: 'courier', fontWeight: 'bold', label: 'Net Total Label' },
        total_amount_due_label: { x: 135, y: 200, fontSize: 12, fontFamily: 'courier', fontWeight: 'bold', label: 'Total Due Label' },
        po_no: { x: 10, y: 185, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'PO Number' },
        salesman: { x: 10, y: 191, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'Salesman Name' },
        total_amount_due: { x: 180, y: 200, fontSize: 12, fontFamily: 'courier', fontWeight: 'normal', label: 'Total Amount Due' },
        barcode: { x: 170, y: 5, fontSize: 12, fontFamily: 'courier', fontWeight: 'normal', label: 'Barcode' },
    },
    tableSettings: {
        startY: 65,
        rowHeight: 12.2,
        fontSize: 10,
        product_name_width: 75,
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
    const [zoom, setZoom] = useState<number>(1);
    const [isUploading, setIsUploading] = useState<boolean>(false);
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

    const removeField = (key: string) => {
        updateField(key, { hidden: true });
        if (activeField === key) {
            setActiveField(null);
        }
        const label = template.fields[key]?.label || key;
        toast.info(`Removed "${label}". You can restore it anytime from the Removed Fields section.`);
    };

    const restoreField = (key: string) => {
        updateField(key, { hidden: false });
        setActiveField(key);
        const label = template.fields[key]?.label || key;
        toast.success(`Restored "${label}" to the canvas.`);
    };

    const restoreAllFields = () => {
        setTemplate(prev => {
            const updatedFields: Record<string, ORFieldConfig> = {};
            Object.entries(prev.fields).forEach(([k, f]) => {
                if (f) {
                    updatedFields[k] = { ...f, hidden: false };
                }
            });
            return {
                ...prev,
                fields: updatedFields
            };
        });
        toast.success("All fields restored.");
    };

    const hiddenFieldsList = useMemo(() => {
        return Object.entries(template.fields).filter(([, f]) => f && f.hidden);
    }, [template.fields]);

    const visibleFieldsList = useMemo(() => {
        return Object.entries(template.fields).filter(([, f]) => f && !f.hidden);
    }, [template.fields]);

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

    const activeFieldConfig = activeField ? template.fields[activeField] : null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="!max-w-[95vw] !w-[95vw] sm:!max-w-[95vw] h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 border-none shadow-2xl rounded-3xl">
                <DialogHeader className="px-6 py-4 bg-white border-b shadow-sm flex flex-row items-center justify-between">
                    <div>
                        <DialogTitle className="text-xl font-black tracking-tighter text-slate-900 uppercase">
                            Layout Designer
                        </DialogTitle>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                            Drag fields to reposition or remove unnecessary elements from print output.
                        </p>
                    </div>
                </DialogHeader>
                
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Pane - Canvas */}
                    <div ref={scrollRef} className="flex-1 overflow-auto p-6 bg-slate-200/50 flex justify-center items-start">
                        <div 
                            ref={canvasRef}
                            className="bg-white shadow-2xl relative select-none origin-top border border-slate-300"
                            style={{
                                width: `${template.width * zoom}mm`,
                                height: `${template.height * zoom}mm`,
                            }}
                        >
                            {/* Background Image Preview */}
                            {template.backgroundImage ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img 
                                    src={StockPurchasePrintService.getImageUrl(template.backgroundImage)} 
                                    alt="Background template"
                                    className="absolute inset-0 w-full h-full object-fill pointer-events-none opacity-50"
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center border-4 border-dashed border-slate-200 m-8 text-slate-400">
                                    <AlertTriangle className="w-12 h-12 mb-2" />
                                    <span className="text-xs font-bold uppercase">No background image uploaded</span>
                                </div>
                            )}

                            {/* Render Fields */}
                            {visibleFieldsList.map(([key, field]) => {
                                if (!field) return null;
                                const isActive = activeField === key;
                                return (
                                    <div
                                        key={key}
                                        className={`absolute cursor-move px-2 py-0.5 border text-slate-800 rounded group flex items-center gap-1.5 transition-shadow ${
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
                                        <Move className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 pointer-events-none shrink-0" />
                                        <span className="whitespace-nowrap">{field.label || key}</span>
                                        <button
                                            type="button"
                                            title={`Remove ${field.label || key}`}
                                            aria-label={`Remove ${field.label || key}`}
                                            className="opacity-0 group-hover:opacity-100 hover:bg-rose-100 text-rose-500 rounded p-0.5 transition-opacity"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeField(key);
                                            }}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Pane - Config */}
                    <div className="w-[380px] bg-white border-l shadow-xl flex flex-col overflow-hidden">
                        <ScrollArea className="flex-1 p-6 space-y-6">
                            {/* Zoom Level */}
                            <div className="space-y-2 mb-6">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Zoom Level</Label>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}>-</Button>
                                    <div className="w-20 flex items-center justify-center font-bold text-sm">{(zoom * 100).toFixed(0)}%</div>
                                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}>+</Button>
                                </div>
                            </div>

                            {/* Background Template */}
                            <div className="space-y-2 mb-6">
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

                            {/* Active Field Control */}
                            {activeField && activeFieldConfig && !activeFieldConfig.hidden && (
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 mb-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400">Selected Field</span>
                                            <h4 className="text-sm font-bold text-slate-900">{activeFieldConfig.label || activeField}</h4>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            className="h-8 rounded-xl text-xs gap-1.5"
                                            onClick={() => removeField(activeField)}
                                        >
                                            <EyeOff className="w-3.5 h-3.5" />
                                            Remove Field
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 font-mono">
                                        <div>X: {Math.round(activeFieldConfig.x)} mm</div>
                                        <div>Y: {Math.round(activeFieldConfig.y)} mm</div>
                                    </div>
                                </div>
                            )}

                            {/* Removed / Hidden Fields Section */}
                            <div className="space-y-3 mb-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">
                                            Removed / Hidden Fields
                                        </Label>
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-bold">
                                            {hiddenFieldsList.length}
                                        </Badge>
                                    </div>
                                    {hiddenFieldsList.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 px-2 gap-1"
                                            onClick={restoreAllFields}
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            Restore All
                                        </Button>
                                    )}
                                </div>

                                {hiddenFieldsList.length === 0 ? (
                                    <div className="p-4 border border-dashed rounded-xl text-center text-xs text-slate-400 font-medium">
                                        All fields are currently visible on the canvas.
                                    </div>
                                ) : (
                                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                        {hiddenFieldsList.map(([key, field]) => (
                                            <div
                                                key={key}
                                                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/70 transition-colors"
                                            >
                                                <span className="text-xs font-semibold text-slate-700 truncate mr-2">
                                                    {field?.label || key}
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-xs font-bold rounded-lg text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 gap-1 shrink-0"
                                                    onClick={() => restoreField(key)}
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    Restore
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

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
