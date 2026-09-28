"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ORTemplate, ORFieldConfig, formatAddress } from "../types";
import { Upload, Move, Type, Trash2, Maximize2, AlertTriangle, Loader2, Plus, Star, Check } from "lucide-react";
import { toast } from "sonner";
import Barcode from "react-barcode";
import { Switch } from "@/components/ui/switch";
import { InvoicingService } from "../services/InvoicingService";

export interface TemplateRecord {
    id: number;
    sales_invoice_type_id: number;
    name: string;
    is_default: boolean;
    template_config: ORTemplate;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (template: ORTemplate, isDefault?: boolean, recordId?: number) => void;
    initialTemplate?: ORTemplate;
    typeId?: number;
}

export const DEFAULT_TEMPLATE: ORTemplate = {
    id: 'default-or',
    name: 'Default Official Receipt',
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
        zero_rated: { x: 180, y: 157, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'Zero-Rated Sales', hidden: true },
        exempt: { x: 180, y: 163, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'VAT-Exempt Sales', hidden: true },
        gross_total: { x: 180, y: 169, fontSize: 11, fontFamily: 'courier', fontWeight: 'normal', label: 'Gross Total' },
        discount_total: { x: 180, y: 175, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'Discount Total' },
        net_total: { x: 180, y: 181, fontSize: 12, fontFamily: 'courier', fontWeight: 'normal', label: 'Net Total' },
        net_total_footer: { x: 180, y: 187, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'Net Total Footer', hidden: true },
        po_no: { x: 10, y: 193, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'PO Number' },
        salesman: { x: 10, y: 199, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'Salesman Name' },
        withholding_tax: { x: 180, y: 205, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'Withholding Tax', hidden: true },
        total_amount_due: { x: 180, y: 211, fontSize: 12, fontFamily: 'courier', fontWeight: 'normal', label: 'Total Amount Due' },
        barcode: { x: 170, y: 5, fontSize: 12, fontFamily: 'courier', fontWeight: 'normal', label: 'Barcode' },
    },
    tableSettings: {
        startY: 65,
        rowHeight: 12.2,
        fontSize: 10,
        product_name_width: 85,
        columns: {
            barcode: { x: 10 },
            product_name: { x: 35 },
            quantity: { x: 105 },
            unit_price: { x: 126 },
            discount: { x: 153 },
            net_amount: { x: 184 }
        }
    }
};

export const MARIKINA_TEMPLATE: ORTemplate = {
    id: 'marikina-or',
    name: 'Marikina Official Receipt',
    width: 205,
    height: 258,
    fields: {
        customer_name: { x: 40, y: 35, fontSize: 11, fontFamily: 'courier', fontWeight: 'bold', label: 'Customer Name' },
        date: { x: 170, y: 35, fontSize: 11, fontFamily: 'courier', fontWeight: 'bold', label: 'Date' },
        store_name: { x: 50, y: 43, fontSize: 11, fontFamily: 'courier', fontWeight: 'bold', label: 'Store Name' },
        payment_name: { x: 170, y: 43, fontSize: 11, fontFamily: 'courier', fontWeight: 'bold', label: 'Terms' },
        customer_tin: { x: 25, y: 52, fontSize: 11, fontFamily: 'courier', fontWeight: 'bold', label: 'TIN' },
        address: { x: 45, y: 60, fontSize: 11, fontFamily: 'courier', fontWeight: 'bold', label: 'Address' },
        vatable_sales: { x: 160, y: 220, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'Vatable Sales' },
        vat_amount: { x: 160, y: 226, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'VAT Amount' },
        zero_rated: { x: 160, y: 232, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'Zero-Rated Sales', hidden: true },
        exempt: { x: 160, y: 238, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'VAT-Exempt Sales', hidden: true },
        gross_total: { x: 160, y: 244, fontSize: 11, fontFamily: 'courier', fontWeight: 'normal', label: 'Gross Total' },
        discount_total: { x: 160, y: 250, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'Discount Total' },
        net_total: { x: 160, y: 256, fontSize: 12, fontFamily: 'courier', fontWeight: 'bold', label: 'Net Total' },
        net_total_footer: { x: 160, y: 262, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'Net Total Footer', hidden: true },
        po_no: { x: 10, y: 220, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'PO Number', hidden: true },
        salesman: { x: 10, y: 226, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'Salesman Name', hidden: true },
        withholding_tax: { x: 160, y: 268, fontSize: 10, fontFamily: 'courier', fontWeight: 'normal', label: 'Withholding Tax', hidden: true },
        total_amount_due: { x: 160, y: 274, fontSize: 12, fontFamily: 'courier', fontWeight: 'bold', label: 'Total Amount Due', hidden: true },
        barcode: { x: 160, y: 5, fontSize: 12, fontFamily: 'courier', fontWeight: 'normal', label: 'Barcode', hidden: true },
    },
    tableSettings: {
        startY: 75,
        rowHeight: 12.2,
        fontSize: 10,
        product_name_width: 60,
        columns: {
            barcode: { x: 10 },
            product_name: { x: 45 },
            quantity: { x: 110 },
            unit_price: { x: 135 },
            discount: { x: 160 },
            net_amount: { x: 185 }
        }
    }
};

export const ReceiptTemplateEditor: React.FC<Props> = ({ isOpen, onClose, onSave, initialTemplate, typeId }) => {
    const [template, setTemplate] = useState<ORTemplate>(DEFAULT_TEMPLATE);
    const [templateList, setTemplateList] = useState<TemplateRecord[]>([]);
    const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
    const [templateName, setTemplateName] = useState<string>("");
    const [isDefault, setIsDefault] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const [activeField, setActiveField] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [isUploading, setIsUploading] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Apply template config to editor state with columns merging
    const loadTemplateConfig = useCallback((cfg: ORTemplate, recId?: number, recName?: string, recDefault?: boolean) => {
        const fallbackTemplate = cfg.id === 'marikina-or' ? MARIKINA_TEMPLATE : DEFAULT_TEMPLATE;
        const initialColumnsExist = !!cfg.tableSettings?.columns;
        const initialHasBarcode = initialColumnsExist && 'barcode' in (cfg.tableSettings!.columns!);

        const mergedColumns = {
            ...fallbackTemplate.tableSettings.columns,
            ...(cfg.tableSettings?.columns || {})
        };

        if (initialColumnsExist && !initialHasBarcode) {
            delete mergedColumns.barcode;
        } else if (!mergedColumns.barcode) {
            mergedColumns.barcode = { x: 10 };
        }

        const merged: ORTemplate = {
            ...cfg,
            name: recName || cfg.name || 'Official Receipt Template',
            fields: {
                ...fallbackTemplate.fields,
                ...(cfg.fields || {})
            },
            tableSettings: {
                ...fallbackTemplate.tableSettings,
                ...(cfg.tableSettings || {}),
                columns: mergedColumns
            }
        };

        setTemplate(merged);
        setSelectedRecordId(recId ?? null);
        setTemplateName(recName || cfg.name || 'Official Receipt Template');
        setIsDefault(recDefault ?? false);
    }, []);

    // Load templates for current typeId
    const fetchTemplates = useCallback(async () => {
        if (!isOpen) return;
        try {
            const list = await InvoicingService.getTemplates(typeId);
            setTemplateList(list);

            if (list.length > 0) {
                // Find default template or fallback to first
                const defaultRec = list.find(t => t.is_default) || list[0];
                loadTemplateConfig(defaultRec.template_config, defaultRec.id, defaultRec.name, defaultRec.is_default);
            } else if (initialTemplate) {
                loadTemplateConfig(initialTemplate, undefined, initialTemplate.name || "Default Template", true);
            } else {
                loadTemplateConfig(DEFAULT_TEMPLATE, undefined, "Default Official Receipt", true);
            }
        } catch (err) {
            console.error("Failed to fetch templates:", err);
            if (initialTemplate) {
                loadTemplateConfig(initialTemplate, undefined, initialTemplate.name || "Default Template", true);
            }
        }
    }, [isOpen, typeId, initialTemplate, loadTemplateConfig]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    // Switch active template in dropdown
    const handleSelectTemplateRecord = (recordIdStr: string) => {
        const recordId = parseInt(recordIdStr);
        const found = templateList.find(t => t.id === recordId);
        if (found) {
            loadTemplateConfig(found.template_config, found.id, found.name, found.is_default);
        }
    };

    // Create New Template (Reset state to new template draft)
    const handleNewTemplateClick = () => {
        const newName = `Template ${templateList.length + 1}`;
        setSelectedRecordId(null);
        setTemplateName(newName);
        setIsDefault(templateList.length === 0);
        setTemplate({
            ...DEFAULT_TEMPLATE,
            id: `template-${Date.now()}`,
            name: newName
        });
        toast.info(`Created new template draft: "${newName}". Modify layout and click Save.`);
    };

    // Save Template (Create or Update PK record)
    const handleSave = async () => {
        const cleanName = templateName.trim();
        if (!cleanName) {
            toast.error("Template name is required.");
            return;
        }

        setIsSaving(true);
        try {
            const finalConfig: ORTemplate = {
                ...template,
                name: cleanName
            };

            let savedRecordId = selectedRecordId;

            if (selectedRecordId) {
                // Update existing template by PK ID
                await InvoicingService.updateTemplate(selectedRecordId, {
                    name: cleanName,
                    is_default: isDefault,
                    template_config: finalConfig,
                    sales_invoice_type_id: typeId
                });
                toast.success(`Template "${cleanName}" updated successfully.`);
            } else {
                // Create new template record
                const targetTypeId = typeId || 1;
                const res = await InvoicingService.createTemplate({
                    sales_invoice_type_id: targetTypeId,
                    name: cleanName,
                    is_default: isDefault,
                    template_config: finalConfig
                });
                savedRecordId = res.data?.id || null;
                toast.success(`New template "${cleanName}" created successfully.`);
            }

            // Reload template list
            await fetchTemplates();

            if (onSave) {
                onSave(finalConfig, isDefault, savedRecordId || undefined);
            }
        } catch (err: unknown) {
            console.error("Save template error:", err);
            toast.error(err instanceof Error ? err.message : "Failed to save template.");
        } finally {
            setIsSaving(false);
        }
    };

    // Delete Template
    const handleDeleteTemplate = async () => {
        if (!selectedRecordId) return;
        if (isDefault) {
            toast.error("Cannot delete default template. Set another template as default first.");
            return;
        }
        if (!confirm(`Are you sure you want to delete template "${templateName}"?`)) return;

        try {
            await InvoicingService.deleteTemplate(selectedRecordId);
            toast.success(`Template "${templateName}" deleted.`);
            await fetchTemplates();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to delete template");
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileId = await InvoicingService.uploadFile(file);
            setTemplate(prev => ({ ...prev, backgroundImage: fileId, printBackground: false }));
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
                [key]: { ...prev.fields[key], ...updates }
            }
        }));
    };

    const handleDrag = (key: string, e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        
        const rect = canvasRef.current.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const initialX = template.fields[key].x;
        const initialY = template.fields[key].y;

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

    const handleTableDrag = (e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const startY = e.clientY;
        const initialStartY = template.tableSettings.startY;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const dy = (moveEvent.clientY - startY) * (template.height / rect.height);
            setTemplate(prev => ({
                ...prev,
                tableSettings: {
                    ...prev.tableSettings,
                    startY: Math.max(0, Math.min(template.height, initialStartY + dy))
                }
            }));
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const handleRowHeightDrag = (e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const startY = e.clientY;
        const initialRowHeight = template.tableSettings.rowHeight;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const dy = (moveEvent.clientY - startY) * (template.height / rect.height);
            setTemplate(prev => ({
                ...prev,
                tableSettings: {
                    ...prev.tableSettings,
                    rowHeight: Math.max(1, Math.min(50, Number((initialRowHeight + dy).toFixed(2))))
                }
            }));
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const handleColumnDrag = (colKey: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const startX = e.clientX;
        const initialX = template.tableSettings.columns?.[colKey as keyof typeof template.tableSettings.columns]?.x || 10;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const dx = (moveEvent.clientX - startX) * (template.width / rect.width);
            const newX = Math.max(0, Math.min(template.width, initialX + dx));
            
            setTemplate(prev => ({
                ...prev,
                tableSettings: {
                    ...prev.tableSettings,
                    columns: {
                        ...prev.tableSettings.columns,
                        [colKey]: { x: newX }
                    }
                }
            }));
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    // Auto-fit zooming helpers
    const fitToWidth = () => {
        if (!scrollRef.current) return;
        const containerWidth = scrollRef.current.clientWidth - 96; // 96px padding
        // Convert mm to px at 96 DPI (1mm = 3.78px)
        const canvasPxWidth = template.width * 3.7795275591;
        const newZoom = containerWidth / canvasPxWidth;
        setZoom(Math.min(Math.max(newZoom, 0.2), 2.5));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent showCloseButton={false} className="!fixed !inset-0 !z-50 !w-screen !h-screen !max-w-none !translate-x-0 !translate-y-0 !m-0 !rounded-none !flex !flex-col p-0 overflow-hidden border-none shadow-none bg-background !top-0 !left-0">
                <DialogHeader className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shrink-0">
                    <DialogTitle className="flex items-center justify-between text-zinc-900 dark:text-zinc-100 w-full gap-3 text-xs">
                        {/* Left Group: Title, Template Dropdown, New, Save */}
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="p-1 bg-primary/10 rounded-md">
                                <Type className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-bold text-xs md:text-sm whitespace-nowrap">Receipt Designer</span>

                            {/* Template Selector Dropdown */}
                            {templateList.length > 0 && (
                                <div className="flex items-center gap-1.5 bg-background border rounded-lg px-2 py-0.5 shadow-xs">
                                    <Label className="text-[10px] text-muted-foreground uppercase font-bold whitespace-nowrap">Template:</Label>
                                    <Select 
                                        value={selectedRecordId ? selectedRecordId.toString() : ""} 
                                        onValueChange={handleSelectTemplateRecord}
                                    >
                                        <SelectTrigger className="h-6 text-xs font-semibold min-w-[140px] border-none focus:ring-0 p-0">
                                            <SelectValue placeholder="Select Template..." />
                                        </SelectTrigger>
                                        <SelectContent position="popper">
                                            {templateList.map(t => (
                                                <SelectItem key={t.id} value={t.id.toString()}>
                                                    <span className="flex items-center gap-2">
                                                        {t.name}
                                                        {t.is_default && <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-primary/10 text-primary">DEFAULT</Badge>}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* New Template Button */}
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-[11px] font-bold gap-1 border-primary/30 text-primary hover:bg-primary/10 px-2"
                                onClick={handleNewTemplateClick}
                            >
                                <Plus className="w-3 h-3" />
                                New Template
                            </Button>

                            {/* Save Template Button */}
                            <Button 
                                size="sm"
                                className="h-7 text-[11px] font-bold gap-1 bg-primary text-primary-foreground shadow-xs px-3"
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                Save Template
                            </Button>
                        </div>

                        {/* Middle Group: Template Name Input & Default Toggle */}
                        <div className="flex items-center gap-2 bg-muted/60 px-2 py-0.5 rounded-lg border border-border/50 shrink-0">
                            <div className="flex items-center gap-1.5">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap">Name:</Label>
                                <Input 
                                    value={templateName}
                                    onChange={e => setTemplateName(e.target.value)}
                                    placeholder="Template Name..."
                                    className="h-6 text-xs font-bold w-[140px] bg-background px-2"
                                />
                            </div>

                            <Button 
                                variant={isDefault ? "default" : "outline"} 
                                size="sm" 
                                className={`h-6 text-[10px] font-bold uppercase tracking-wider gap-1 transition-all px-2 ${isDefault ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
                                onClick={() => setIsDefault(!isDefault)}
                                title="Toggle default template"
                            >
                                <Star className={`w-3 h-3 ${isDefault ? 'fill-white' : ''}`} />
                                {isDefault ? "Default" : "Set Default"}
                            </Button>

                            {selectedRecordId && !isDefault && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={handleDeleteTemplate}
                                    title="Delete Template"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            )}
                        </div>

                        {/* Right Group: Zoom & Dimensions */}
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}>
                                    <span className="text-sm font-bold">-</span>
                                </Button>
                                <span 
                                    className="text-[11px] font-mono min-w-[2.5rem] text-center cursor-pointer hover:bg-background rounded px-1"
                                    onClick={fitToWidth}
                                    title="Click to Fit to Width"
                                >
                                    {Math.round(zoom * 100)}%
                                </span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(z => Math.min(3, z + 0.1))}>
                                    <span className="text-sm font-bold">+</span>
                                </Button>
                            </div>
                            <Button variant="outline" size="sm" onClick={fitToWidth} className="h-6 text-[10px] uppercase font-bold px-2">
                                <Maximize2 className="w-3 h-3 mr-1" />
                                Fit to Screen
                            </Button>
                            <div className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                {template.width}mm × {template.height}mm
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex min-h-0 overflow-hidden bg-zinc-100 dark:bg-zinc-950">
                    {/* Sidebar / Tools */}
                    <div className="w-96 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 space-y-6 overflow-y-auto">
                        <section className="space-y-3">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Page Setup</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label>Width (mm)</Label>
                                    <Input 
                                        type="number" 
                                        value={template.width} 
                                        onChange={e => setTemplate(prev => ({ ...prev, width: Number(e.target.value) }))} 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Height (mm)</Label>
                                    <Input 
                                        type="number" 
                                        value={template.height} 
                                        onChange={e => setTemplate(prev => ({ ...prev, height: Number(e.target.value) }))} 
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" size="sm" className="w-full text-xs truncate" onClick={() => setTemplate(prev => ({ ...prev, width: 215.9, height: 279.4 }))}>
                                    Letter (8.5x11)
                                </Button>
                                <Button variant="outline" size="sm" className="w-full text-xs truncate" onClick={() => setTemplate(prev => ({ ...prev, width: 210, height: 297 }))}>
                                    A4 Size
                                </Button>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Background Image (Form Scan)</Label>
                            <div className="space-y-2">
                                <Input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleImageUpload} 
                                    className="hidden" 
                                    id="bg-upload" 
                                    disabled={isUploading}
                                />
                                <Label htmlFor="bg-upload" className="w-full">
                                    <div className="flex items-center justify-center gap-2 p-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer text-xs">
                                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4" />}
                                        {isUploading ? "Uploading..." : "Upload Image"}
                                    </div>
                                </Label>
                                {template.backgroundImage && (
                                    <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-semibold cursor-pointer" htmlFor="print-bg-toggle">Print Background Image in PDF</Label>
                                            <Switch 
                                                id="print-bg-toggle"
                                                checked={template.printBackground ?? false}
                                                onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, printBackground: checked }))}
                                            />
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="w-full text-destructive text-xs h-7"
                                            onClick={() => setTemplate(prev => ({ ...prev, backgroundImage: undefined, printBackground: undefined }))}
                                        >
                                            <Trash2 className="w-3 h-3 mr-1" /> Remove Image
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </section>

                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg p-2.5 text-[10px] text-amber-800 dark:text-amber-400 space-y-1">
                            <div className="font-bold flex items-center gap-1 uppercase">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Printing Tip
                            </div>
                            <p className="leading-tight">
                                Para sa 100% alignment, siguraduhin na ang <b>Scale</b> sa Print Dialog ay naka-set sa <b>&quot;100%&quot;</b> o <b>&quot;Actual Size&quot;</b> (hindi Default).
                            </p>
                        </div>

                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Fields Configuration</Label>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-6 text-[10px] font-bold uppercase tracking-wider text-primary border-primary/30 hover:bg-primary/5 gap-1"
                                    onClick={() => {
                                        const customKey = `custom_${Date.now()}`;
                                        const count = Object.keys(template.fields).filter(k => k.startsWith('custom_')).length + 1;
                                        setTemplate(prev => ({
                                            ...prev,
                                            fields: {
                                                ...prev.fields,
                                                [customKey]: {
                                                    x: 20,
                                                    y: 20,
                                                    fontSize: 10,
                                                    fontFamily: 'courier',
                                                    fontWeight: 'normal',
                                                    label: `Custom Text ${count}`,
                                                    isCustom: true,
                                                    value: `Sample Text ${count}`
                                                }
                                            }
                                        }));
                                        setActiveField(customKey);
                                        toast.success(`Added Custom Text ${count}`);
                                    }}
                                >
                                    <Plus className="w-3 h-3" /> Custom Text
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {Object.entries(template.fields).map(([key, config]) => (
                                    <div key={key} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 space-y-2 bg-white dark:bg-zinc-900">
                                        <div 
                                            className="flex items-center justify-between cursor-pointer"
                                            onClick={() => setActiveField(activeField === key ? null : key)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold uppercase">{config.label}</span>
                                                {config.isCustom && (
                                                    <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">Custom</span>
                                                )}
                                                {config.hidden && (
                                                    <span className="text-[9px] bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded">Hidden</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono text-muted-foreground">
                                                    X:{Math.round(config.x)} Y:{Math.round(config.y)}
                                                </span>
                                                {config.isCustom && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-5 w-5 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setTemplate(prev => {
                                                                const next = { ...prev.fields };
                                                                delete next[key];
                                                                return { ...prev, fields: next };
                                                            });
                                                            if (activeField === key) setActiveField(null);
                                                        }}
                                                        title="Delete Custom Text"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {activeField === key && (
                                            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[10px]">Visibility</Label>
                                                    <Button 
                                                        variant={config.hidden ? "outline" : "default"} 
                                                        size="sm" 
                                                        className="h-6 text-[10px]"
                                                        onClick={() => updateField(key, { hidden: !config.hidden })}
                                                    >
                                                        {config.hidden ? "Show Field" : "Hide Field"}
                                                    </Button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px]">X Position (mm)</Label>
                                                        <Input 
                                                            type="number" 
                                                            value={Math.round(config.x * 10) / 10} 
                                                            onChange={e => updateField(key, { x: Number(e.target.value) })} 
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px]">Y Position (mm)</Label>
                                                        <Input 
                                                            type="number" 
                                                            value={Math.round(config.y * 10) / 10} 
                                                            onChange={e => updateField(key, { y: Number(e.target.value) })} 
                                                        />
                                                    </div>
                                                </div>

                                                {/* BARCODE SPECIAL FIELD CONTROLS */}
                                                {key === 'barcode' ? (
                                                    <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 bg-muted/40 p-2 rounded-lg">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-[10px] font-bold">Hide Text (Numbers)</Label>
                                                            <Button 
                                                                variant={config.hideBarcodeText ? "default" : "outline"} 
                                                                size="sm" 
                                                                className="h-6 text-[10px]"
                                                                onClick={() => updateField(key, { hideBarcodeText: !config.hideBarcodeText })}
                                                            >
                                                                {config.hideBarcodeText ? "Text Hidden" : "Text Visible"}
                                                            </Button>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="space-y-1">
                                                                <Label className="text-[10px]">Height (mm)</Label>
                                                                <Input 
                                                                    type="number" 
                                                                    step="0.5"
                                                                    value={config.barcodeHeight ?? 9} 
                                                                    onChange={e => updateField(key, { barcodeHeight: Number(e.target.value) })} 
                                                                    className="h-8 text-xs font-mono"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-[10px]">Thickness (Module)</Label>
                                                                <Input 
                                                                    type="number" 
                                                                    step="0.05"
                                                                    value={config.barcodeModuleWidth ?? 0.35} 
                                                                    onChange={e => updateField(key, { barcodeModuleWidth: Number(e.target.value) })} 
                                                                    className="h-8 text-xs font-mono"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* NORMAL FIELD SETTINGS */
                                                    <>
                                                        {config.isCustom && (
                                                            <div className="space-y-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                                                                <div className="space-y-1">
                                                                    <Label className="text-[10px] font-bold">Field Label (Admin Name)</Label>
                                                                    <Input 
                                                                        type="text" 
                                                                        value={config.label} 
                                                                        onChange={e => updateField(key, { label: e.target.value })} 
                                                                        className="h-8 text-xs font-semibold"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label className="text-[10px] font-bold text-primary">Text Content (Printed Value)</Label>
                                                                    <Input 
                                                                        type="text" 
                                                                        value={config.value ?? ""} 
                                                                        onChange={e => updateField(key, { value: e.target.value })} 
                                                                        className="h-8 text-xs font-bold border-primary/40 focus-visible:ring-primary"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px]">Font Size</Label>
                                                            <Input 
                                                                type="number" 
                                                                value={config.fontSize} 
                                                                onChange={e => updateField(key, { fontSize: Number(e.target.value) })} 
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px]">Weight</Label>
                                                            <Select 
                                                                value={config.fontWeight} 
                                                                onValueChange={v => updateField(key, { fontWeight: v as "normal" | "bold" })}
                                                            >
                                                                <SelectTrigger className="h-8">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="normal">Normal</SelectItem>
                                                                    <SelectItem value="bold">Bold</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px]">Max Width (mm)</Label>
                                                            <Input 
                                                                type="number" 
                                                                value={config.maxWidth ?? ""} 
                                                                placeholder="Auto"
                                                                onChange={e => updateField(key, { maxWidth: e.target.value === "" ? undefined : Number(e.target.value) })} 
                                                                className="h-8 text-xs font-mono"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px]">Line Height</Label>
                                                            <Input 
                                                                type="number" 
                                                                step="0.1"
                                                                value={config.lineHeight ?? 1.2} 
                                                                onChange={e => updateField(key, { lineHeight: Number(e.target.value) })} 
                                                                className="h-8 text-xs font-mono"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px]">Spacing</Label>
                                                            <Input 
                                                                type="number" 
                                                                step="0.1"
                                                                value={config.charSpacing ?? 0} 
                                                                onChange={e => updateField(key, { charSpacing: Number(e.target.value) })} 
                                                                className="h-8 text-xs"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-[10px]">ScaleX</Label>
                                                            <Input 
                                                                type="number" 
                                                                step="0.05"
                                                                value={config.scaleX ?? 1} 
                                                                onChange={e => updateField(key, { scaleX: Number(e.target.value) })} 
                                                                className="h-8 text-xs"
                                                            />
                                                        </div>

                                                        {key === 'address' && (
                                                            <div className="col-span-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                                                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Address Components</Label>
                                                                
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <Label className="text-[10px]">Show Province</Label>
                                                                        <Switch 
                                                                            checked={config.addressConfig?.showProvince ?? true}
                                                                            onCheckedChange={v => updateField('address', {
                                                                                addressConfig: {
                                                                                    ...config.addressConfig,
                                                                                    showProvince: v
                                                                                }
                                                                            })}
                                                                        />
                                                                    </div>
                                                                    <div className="flex items-center justify-between">
                                                                        <Label className="text-[10px]">Show City</Label>
                                                                        <Switch 
                                                                            checked={config.addressConfig?.showCity ?? true}
                                                                            onCheckedChange={v => updateField('address', {
                                                                                addressConfig: {
                                                                                    ...config.addressConfig,
                                                                                    showCity: v
                                                                                }
                                                                            })}
                                                                        />
                                                                    </div>
                                                                    <div className="flex items-center justify-between">
                                                                        <Label className="text-[10px]">Show Barangay</Label>
                                                                        <Switch 
                                                                            checked={config.addressConfig?.showBrgy ?? true}
                                                                            onCheckedChange={v => updateField('address', {
                                                                                addressConfig: {
                                                                                    ...config.addressConfig,
                                                                                    showBrgy: v
                                                                                }
                                                                            })}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <Label className="text-[10px]">Sequence Order</Label>
                                                                    <Select
                                                                        value={(config.addressConfig?.order || ['province', 'city', 'brgy']).join(',')}
                                                                        onValueChange={v => updateField('address', {
                                                                            addressConfig: {
                                                                                ...config.addressConfig,
                                                                                order: v.split(',') as ('brgy' | 'city' | 'province')[]
                                                                            }
                                                                        })}
                                                                    >
                                                                        <SelectTrigger className="h-8 text-xs">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="province,city,brgy">Province → City → Barangay</SelectItem>
                                                                            <SelectItem value="brgy,city,province">Barangay → City → Province</SelectItem>
                                                                            <SelectItem value="city,province,brgy">City → Province → Barangay</SelectItem>
                                                                            <SelectItem value="brgy,province,city">Barangay → Province → City</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-3">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Table Settings</Label>
                            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-[10px]">Table Font Size (pt)</Label>
                                    <Input 
                                        type="number" 
                                        value={template.tableSettings.fontSize} 
                                        onChange={e => setTemplate(prev => ({
                                            ...prev,
                                            tableSettings: { ...prev.tableSettings, fontSize: Number(e.target.value) }
                                        }))}
                                        className="h-8 text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px]">Row Height (mm)</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            type="number" 
                                            step="0.1"
                                            value={template.tableSettings.rowHeight} 
                                            onChange={e => setTemplate(prev => ({
                                                ...prev,
                                                tableSettings: { ...prev.tableSettings, rowHeight: Number(e.target.value) }
                                            }))}
                                            className="h-8 text-xs font-mono"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px]">Product Name Max Width (mm)</Label>
                                    <Input 
                                        type="number" 
                                        value={template.tableSettings.product_name_width || 85} 
                                        onChange={e => setTemplate(prev => ({
                                            ...prev,
                                            tableSettings: { ...prev.tableSettings, product_name_width: Number(e.target.value) }
                                        }))}
                                        className="h-8 text-xs font-mono"
                                    />
                                </div>
                                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                                    <Label className="text-xs font-semibold cursor-pointer" htmlFor="barcode-toggle">Include Barcode Column</Label>
                                    <Switch 
                                        id="barcode-toggle"
                                        checked={!!(template.tableSettings.columns && 'barcode' in template.tableSettings.columns)}
                                        onCheckedChange={(checked) => {
                                            setTemplate(prev => {
                                                const currentCols = { ...(prev.tableSettings.columns || {}) };
                                                if (checked) {
                                                    currentCols.barcode = currentCols.barcode || { x: 10 };
                                                } else {
                                                    delete currentCols.barcode;
                                                }
                                                return {
                                                    ...prev,
                                                    tableSettings: {
                                                        ...prev.tableSettings,
                                                        columns: currentCols
                                                    }
                                                };
                                            });
                                        }}
                                    />
                                </div>
                                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                                    <Label className="text-xs font-semibold cursor-pointer" htmlFor="discount-amount-toggle">Include Discount Amount Column</Label>
                                    <Switch 
                                        id="discount-amount-toggle"
                                        checked={!!(template.tableSettings.columns && 'discount_amount' in template.tableSettings.columns)}
                                        onCheckedChange={(checked) => {
                                            setTemplate(prev => {
                                                const currentCols = { ...(prev.tableSettings.columns || {}) };
                                                if (checked) {
                                                    currentCols.discount_amount = currentCols.discount_amount || { x: 140 };
                                                } else {
                                                    delete currentCols.discount_amount;
                                                }
                                                return {
                                                    ...prev,
                                                    tableSettings: {
                                                        ...prev.tableSettings,
                                                        columns: currentCols
                                                    }
                                                };
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Canvas Area */}
                    <div className="flex-1 overflow-auto p-12 flex justify-center items-start select-none relative" ref={scrollRef}>
                        <div 
                            ref={canvasRef}
                            className="bg-white shadow-2xl relative border border-zinc-300 dark:border-zinc-800 transition-all duration-75"
                            style={{
                                width: `${template.width}mm`,
                                height: `${template.height}mm`,
                                transform: `scale(${zoom})`,
                                transformOrigin: 'top center'
                            }}
                        >
                            {/* Background Image */}
                            {template.backgroundImage && (
                                <Image 
                                    src={InvoicingService.getImageUrl(template.backgroundImage)} 
                                    className="absolute inset-0 w-full h-full object-fill opacity-50 pointer-events-none" 
                                    alt="Form Scan" 
                                    fill
                                    unoptimized
                                />
                            )}

                            {/* Table Start Guide Line */}
                            <div 
                                className="absolute -left-6 right-0 border-b border-red-500/50 border-dashed z-20 flex items-center cursor-row-resize hover:border-red-500 group"
                                style={{ top: `${template.tableSettings.startY}mm` }}
                                onMouseDown={handleTableDrag}
                                title="TABLE START: Drag line to set table start Y position"
                            >
                                <span className="bg-red-600 text-white text-[8px] font-bold px-1 py-0.5 rounded-l shadow-xs flex items-center gap-0.5 select-none transition-transform group-hover:scale-105">
                                    <Move className="w-2.5 h-2.5" />
                                    T-START
                                </span>
                            </div>

                            {/* Row 2 / Row Height Guide Line */}
                            <div 
                                className="absolute -left-6 right-0 border-b border-amber-500/50 border-dashed z-20 flex items-center cursor-row-resize hover:border-amber-500 group"
                                style={{ top: `${template.tableSettings.startY + template.tableSettings.rowHeight}mm` }}
                                onMouseDown={handleRowHeightDrag}
                                title={`ROW 2 / ROW HEIGHT: Drag to adjust gap (${Math.round(template.tableSettings.rowHeight * 10) / 10}mm)`}
                            >
                                <span className="bg-amber-600 text-white text-[8px] font-bold px-1 py-0.5 rounded-l shadow-xs flex items-center gap-0.5 select-none transition-transform group-hover:scale-105">
                                    <Move className="w-2.5 h-2.5" />
                                    R-GAP
                                </span>
                            </div>

                            {/* Render Fields */}
                            {Object.entries(template.fields).map(([key, config]) => {
                                if (config.hidden && key !== 'barcode') return null;
                                if (key === 'barcode' && config.hidden && config.hideBarcodeText) return null;

                                return (
                                    <div
                                        key={key}
                                        className={`absolute cursor-move border border-dashed p-1 rounded z-10 flex items-center group transition-colors ${
                                            activeField === key 
                                                ? 'border-primary bg-primary/10 shadow-lg' 
                                                : 'border-blue-400/40 hover:border-blue-500 hover:bg-blue-50/20'
                                        }`}
                                        style={{
                                            left: `${config.x}mm`,
                                            top: `${config.y}mm`,
                                            maxWidth: config.maxWidth ? `${config.maxWidth}mm` : undefined,
                                            fontSize: `${config.fontSize}pt`,
                                            fontFamily: config.fontFamily === 'courier' ? 'monospace' : config.fontFamily,
                                            fontWeight: config.fontWeight || 'normal',
                                            lineHeight: config.lineHeight ?? 1.2,
                                            letterSpacing: `${config.charSpacing ?? 0}pt`,
                                            transform: `scaleX(${config.scaleX ?? 1})`,
                                            transformOrigin: 'left center',
                                            whiteSpace: config.maxWidth ? 'pre-wrap' : 'nowrap'
                                        }}
                                        onMouseDown={(e) => handleDrag(key, e)}
                                        onClick={() => setActiveField(key)}
                                    >
                                        <div className="opacity-0 group-hover:opacity-100 absolute -top-3 -left-3 bg-blue-600 text-white p-0.5 rounded shadow">
                                            <Move className="w-2.5 h-2.5" />
                                        </div>

                                        {key === 'barcode' ? (
                                            <div className="inline-block text-center">
                                                {!config.hidden ? (
                                                    <Barcode 
                                                        value="12345678" 
                                                        height={(config.barcodeHeight ?? 9) * 3.78} 
                                                        width={(config.barcodeModuleWidth ?? 0.35) * 3.78} 
                                                        fontSize={config.fontSize}
                                                        displayValue={!config.hideBarcodeText}
                                                        fontOptions={config.fontWeight || 'normal'}
                                                        margin={0}
                                                        background="transparent"
                                                        renderer="canvas"
                                                    />
                                                ) : (
                                                    <div style={{ fontSize: `${config.fontSize}pt`, fontFamily: 'monospace', fontWeight: config.fontWeight || 'normal' }}>
                                                        {!config.hideBarcodeText && "12345678"}
                                                    </div>
                                                )}
                                            </div>
                                        ) : key === 'address' ? (
                                            formatAddress(
                                                { province: 'BENGUET', city: 'BAGUIO CITY', brgy: 'HARRISON-CLAUDIO CARANTES' },
                                                config.addressConfig
                                            )
                                        ) : config.isCustom ? (
                                            config.value || config.label
                                        ) : (
                                            config.label
                                        )}
                                    </div>
                                );
                            })}

                            {/* Sample Table Rows Preview (Realistic Dynamic Multi-Line Height) */}
                            {(() => {
                                const sampleItems = [
                                    { barcode: '4800012345', product_name: 'PROMO-DEOPLUS TAWAS LICORICE 50G 24+6 KERATIN GOLD X 6 PACKS', quantity: '3 BOX', unit_price: 'P1,908.00', discount_amount: 'P200.00', discount: 'L3', net_amount: 'P5,552.28' },
                                    { barcode: '4800067890', product_name: 'KERATINPLUS GOLD 20G X 24 PACKS 11 + 1 PROMO', quantity: '40 BOX', unit_price: 'P1,518.00', discount_amount: 'P1,200.00', discount: 'L3', net_amount: 'P58,898.40' },
                                    { barcode: '4800099999', product_name: 'SAMPLE ITEM SINGLE LINE 50X100G', quantity: '5 BOX', unit_price: 'P500.00', discount_amount: 'P50.00', discount: 'L1', net_amount: 'P2,500.00' }
                                ];
                                const cols = template.tableSettings.columns || {};
                                const w = {
                                    barcode: 30,
                                    product_name: 85,
                                    quantity: 22,
                                    unit_price: 28,
                                    discount_amount: 25,
                                    discount: 25,
                                    net_amount: 30
                                };
                                const minRowHeight = template.tableSettings.rowHeight || 12.2;
                                const fontSize = template.tableSettings.fontSize || 10;

                                let cumulativeY = template.tableSettings.startY;

                                return sampleItems.map((item, idx) => {
                                    const productNameMaxWidth = template.tableSettings.product_name_width || w.product_name;
                                    const approxCharsPerLine = Math.max(10, Math.floor(productNameMaxWidth / 2.2));
                                    const estimatedLines = Math.ceil(item.product_name.length / approxCharsPerLine);
                                    const neededSlots = Math.max(1, estimatedLines);
                                    const actualRowHeight = neededSlots * minRowHeight;

                                    const rowTop = cumulativeY;
                                    cumulativeY += actualRowHeight;

                                    return (
                                        <div 
                                            key={`sample-row-${idx}`}
                                            className="absolute w-full flex items-center pointer-events-none opacity-40 select-none grayscale text-zinc-900"
                                            style={{ 
                                                top: `${rowTop}mm`,
                                                minHeight: `${actualRowHeight}mm`,
                                                fontFamily: 'monospace',
                                                fontSize: `${fontSize}pt`,
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {cols.barcode && (
                                                <div className="absolute font-normal uppercase whitespace-normal leading-[1.1]" style={{ left: `${cols.barcode.x}mm`, width: `${w.barcode}mm` }}>{item.barcode}</div>
                                            )}
                                            <div className="absolute font-normal uppercase whitespace-normal leading-[1.1]" style={{ left: `${cols.product_name?.x || 10}mm`, width: `${productNameMaxWidth}mm` }}>{item.product_name}</div>
                                            <div className="absolute text-center" style={{ left: `${(cols.quantity?.x || 105) - (w.quantity / 2)}mm`, width: `${w.quantity}mm` }}>{item.quantity}</div>
                                            <div className="absolute text-right" style={{ left: `${(cols.unit_price?.x || 126) - w.unit_price}mm`, width: `${w.unit_price}mm` }}>{item.unit_price}</div>
                                            {cols.discount_amount && (
                                                <div className="absolute text-right" style={{ left: `${(cols.discount_amount?.x || 140) - w.discount_amount}mm`, width: `${w.discount_amount}mm` }}>{item.discount_amount}</div>
                                            )}
                                            <div className="absolute text-right" style={{ left: `${(cols.discount?.x || 153) - w.discount}mm`, width: `${w.discount}mm` }}>{item.discount}</div>
                                            <div className="absolute text-right" style={{ left: `${(cols.net_amount?.x || 184) - w.net_amount}mm`, width: `${w.net_amount}mm` }}>{item.net_amount}</div>
                                        </div>
                                    );
                                });
                            })()}

                            {/* Table Columns Visualization (Draggable) */}
                            {template.tableSettings.columns && Object.entries(template.tableSettings.columns).map(([colKey, colConfig]) => (
                                <div
                                    key={`col-${colKey}`}
                                    className="absolute border-l border-blue-500/40 border-dashed z-30 flex flex-col items-start cursor-ew-resize hover:bg-blue-500/10 group"
                                    style={{ 
                                        left: `${colConfig.x}mm`, 
                                        top: `${template.tableSettings.startY}mm`,
                                        height: `${template.tableSettings.rowHeight * 4}mm`,
                                        width: '6mm',
                                        marginLeft: '-3mm'
                                    }}
                                    onMouseDown={(e) => handleColumnDrag(colKey, e)}
                                >
                                    <span className="bg-blue-600/15 text-blue-900 dark:text-blue-200 border border-blue-500/30 text-[9px] px-1 py-0.5 rounded-sm whitespace-nowrap select-none opacity-40 group-hover:opacity-100 group-hover:bg-blue-600 group-hover:text-white transition-all transform -rotate-90 origin-left mt-6 font-bold">
                                        {colKey.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center shrink-0 text-[10px] text-muted-foreground font-medium">
                    <span>* Drag items to align. Coordinates are in Millimeters (mm).</span>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onClose}>Close Editor</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
