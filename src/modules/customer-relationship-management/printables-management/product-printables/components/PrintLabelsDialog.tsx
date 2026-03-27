// src/modules/financial-management/printables-management/product-printables/components/PrintLabelsDialog.tsx
"use client";

import * as React from "react";
import type { MatrixRow, PriceType, Unit, Supplier } from "../types";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { generateProductMatrixPdf } from "../utils/printPdf";
import { Printer, Loader2 } from "lucide-react";
import { PdfTemplate, pdfTemplateService } from "@/components/pdf-layout-design/services/pdf-template";
import { CompanyData } from "@/components/pdf-layout-design/types";
import { toast } from "sonner";

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    rows: MatrixRow[];
    priceTypes: PriceType[];
    units: Unit[];
    usedUnitIds: Set<number>;
    supplier?: Supplier | null;
    selectedPriceTypeIds?: string[];
};

export default function PrintLabelsDialog({ open, onOpenChange, rows, priceTypes, units, usedUnitIds, supplier, selectedPriceTypeIds = [] }: Props) {
    const [templates, setTemplates] = React.useState<PdfTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>("none");
    const [companyData, setCompanyData] = React.useState<CompanyData | null>(null);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            const init = async () => {
                setLoading(true);
                try {
                    const [tpls, compRes] = await Promise.all([
                        pdfTemplateService.fetchTemplates(),
                        fetch("/api/pdf/company")
                    ]);
                    setTemplates(tpls);
                    
                    if (compRes.ok) {
                        const result = await compRes.json();
                        const company = result.data?.[0] || (Array.isArray(result.data) ? null : result.data);
                        setCompanyData(company);
                    }
                } catch (error) {
                    console.error("Error fetching print data:", error);
                    toast.error("Failed to load PDF templates or company data");
                } finally {
                    setLoading(false);
                }
            };
            init();
        }
    }, [open]);

    const handlePrint = async () => {
        const selectedTemplate = templates.find(t => String(t.id) === selectedTemplateId);
        
        await generateProductMatrixPdf(rows, { 
            priceTypes,
            units,
            usedUnitIds,
            supplier,
            selectedTemplate,
            companyData,
            selectedPriceTypeIds
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Printer className="w-5 h-5 text-primary" />
                        Print Settings
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label>Header Template</Label>
                        <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Standard Header</SelectItem>
                                {templates.map(tpl => (
                                    <SelectItem key={tpl.id} value={String(tpl.id)}>{tpl.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedTemplateId !== "none" && (() => {
                        const tpl = templates.find(t => String(t.id) === selectedTemplateId);
                        const cfg = tpl?.config;
                        if (!cfg) return null;
                        const rows2: { label: string; value: string }[] = [
                            { label: "Paper Size", value: cfg.paperSize },
                            { label: "Orientation", value: cfg.orientation.charAt(0).toUpperCase() + cfg.orientation.slice(1) },
                            { label: "Margins", value: `T:${cfg.margins.top} R:${cfg.margins.right} B:${cfg.margins.bottom} L:${cfg.margins.left} mm` },
                            { label: "Body Start", value: `${cfg.bodyStart ?? "—"} mm` },
                            { label: "Body End", value: `${cfg.bodyEnd ?? "—"} mm` },
                        ];
                        return (
                            <div className="rounded-xl border border-border/50 overflow-hidden text-[11px]">
                                <div className="px-3 py-2 bg-muted/40 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                                    Template Configuration
                                </div>
                                <div className="divide-y divide-border/40">
                                    {rows2.map(r => (
                                        <div key={r.label} className="flex items-center justify-between px-3 py-1.5">
                                            <span className="text-muted-foreground">{r.label}</span>
                                            <span className="font-medium text-foreground">{r.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                    
                    <div className="p-3 bg-muted/30 rounded-xl text-xs text-muted-foreground">
                        Ready to print matrix for {rows.length} products.
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                        Cancel
                    </Button>
                    <Button onClick={handlePrint} className="rounded-xl px-8" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate PDF"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
