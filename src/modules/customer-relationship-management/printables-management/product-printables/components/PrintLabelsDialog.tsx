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
import { Printer } from "lucide-react";

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    rows: MatrixRow[];
    priceTypes: PriceType[];
    units: Unit[];
    usedUnitIds: Set<number>;
    supplier?: Supplier | null;
};

export default function PrintLabelsDialog({ open, onOpenChange, rows, priceTypes, units, usedUnitIds, supplier }: Props) {
    const [paper, setPaper] = React.useState<"a4" | "legal" | "a3">("a4");
    const [orientation, setOrientation] = React.useState<"landscape" | "portrait">("landscape");

    const handlePrint = async () => {
        await generateProductMatrixPdf(rows, { 
            paper, 
            orientation, 
            priceTypes,
            units,
            usedUnitIds,
            supplier
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
                        <Label>Paper Size</Label>
                        <Select value={paper} onValueChange={(v: string) => setPaper(v as "a4" | "legal" | "a3")}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="a4">A4</SelectItem>
                                <SelectItem value="legal">Legal</SelectItem>
                                <SelectItem value="a3">A3</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Orientation</Label>
                        <Select value={orientation} onValueChange={(v: string) => setOrientation(v as "portrait" | "landscape")}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="portrait">Portrait</SelectItem>
                                <SelectItem value="landscape">Landscape</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-xl text-xs text-muted-foreground">
                        Ready to print matrix for {rows.length} products.
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                        Cancel
                    </Button>
                    <Button onClick={handlePrint} className="rounded-xl px-8">
                        Generate PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
