// src/modules/financial-management/printables-management/product-printables/utils/printPdf.ts

import type { MatrixRow, PriceType, Unit, Supplier } from "../types";
import { PdfEngine } from "@/components/pdf-layout-design/PdfEngine";
import { PdfTemplate } from "@/components/pdf-layout-design/services/pdf-template";
import { PdfData } from "@/components/pdf-layout-design/types";

type MatrixOptions = {
    paper?: string;
    orientation?: "landscape" | "portrait";
    fontSize?: number;
    title?: string;
    priceTypes?: PriceType[];
    units?: Unit[];
    usedUnitIds?: Set<number>;
    supplier?: Supplier | null;
    selectedTemplate?: PdfTemplate;
    companyData?: PdfData | null;
    selectedPriceTypeIds?: string[];
};

type PdfCell = {
    content: string;
    rowSpan?: number;
    colSpan?: number;
    styles?: {
        halign?: "left" | "center" | "right" | "justify";
        valign?: "top" | "middle" | "bottom";
        fillColor?: [number, number, number];
        textColor?: [number, number, number];
        fontStyle?: "normal" | "bold" | "italic" | "bolditalic";
        fontSize?: number;
    };
};

const TIERS = ["A", "B", "C", "D", "E"] as const;

const groupColors: Record<string, [number, number, number]> = {
    A: [240, 249, 255], // sky-50
    B: [236, 253, 245], // emerald-50
    C: [245, 243, 255], // violet-50
    D: [255, 251, 235], // amber-50
    E: [255, 241, 242], // rose-50
};

const groupTextColors: Record<string, [number, number, number]> = {
    A: [3, 105, 161],  // sky-700
    B: [4, 120, 87],   // emerald-700
    C: [109, 40, 217], // violet-700
    D: [180, 83, 9],   // amber-800
    E: [190, 18, 60],  // rose-700
};

function money(v: unknown): string {
    const n = Number(v);
    if (!Number.isFinite(n)) return "";
    return n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export async function generateProductMatrixPdf(rows: MatrixRow[], options: MatrixOptions = {}) {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const { drawPageNumbers } = await import("@/components/pdf-layout-design/PdfGenerator");
    const {
        fontSize = 7,
        title = "Product Matrix Report",
        units = [],
        usedUnitIds = new Set(),
        supplier = null,
        selectedTemplate,
        companyData,
        selectedPriceTypeIds = [],
        priceTypes = []
    } = options;
    
    // --- Extract config from template ---
    const tplConfig = selectedTemplate?.config;

    // Paper size: template uses e.g. "Letter", jsPDF also accepts these strings
    const finalPaper = tplConfig?.paperSize.toLowerCase() || options.paper || "a4";
    const finalOrientation = tplConfig?.orientation || options.orientation || "landscape";

    // Margins: prefer template config, fallback to default
    const finalMargins = tplConfig?.margins || { top: 10, left: 10, right: 10, bottom: 10 };

    // Body start Y (below header elements) — PdfEngine.applyTemplate returns this
    // bodyEnd is the lowest allowed Y before footer — we use it for the bottom margin
    const bodyEnd = tplConfig?.bodyEnd;

    const doc = new jsPDF({ orientation: finalOrientation, unit: "mm", format: finalPaper });
    
    // Determine active tiers based on selection
    const activeTiers = priceTypes && selectedPriceTypeIds.length > 0 
        ? priceTypes
            .filter(pt => selectedPriceTypeIds.includes(String(pt.price_type_id)))
            .map(pt => {
                const fullIdx = priceTypes.findIndex(p => p.price_type_id === pt.price_type_id);
                return {
                    key: TIERS[fullIdx] as typeof TIERS[number],
                    label: pt.price_type_name
                };
            })
            .filter(t => t.key !== undefined)
        : TIERS.map((key, i) => ({ 
            key, 
            label: priceTypes?.[i]?.price_type_name || `PRICE TYPE ${key}` 
        })).slice(0, 5); // Default to first 5 if none selected or no priceTypes info

    const usedUnits = units
        .filter(u => usedUnitIds.has(Number(u.unit_id)))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const uomCount = Math.max(usedUnits.length, 1);
    const now = new Date();

    // --- Header Construction (2 rows) ---
    // Row 1: Product columns + Price Type name per tier
    const headRow1: PdfCell[] = [
        { content: "Product Name", rowSpan: 2, styles: { valign: "middle", fontStyle: "bold", halign: "center" } },
        { content: "Category",     rowSpan: 2, styles: { valign: "middle", halign: "center" } },
        { content: "Brand",        rowSpan: 2, styles: { valign: "middle", halign: "center" } },
    ];

    for (const tier of activeTiers) {
        headRow1.push({
            content: tier.label,
            colSpan: uomCount,
            styles: {
                halign: "center",
                fillColor: groupColors[tier.key],
                textColor: groupTextColors[tier.key],
                fontStyle: "bold"
            },
        });
    }

    // Row 2: UOM names per tier
    const headRow2: PdfCell[] = [];
    for (const tier of activeTiers) {
        if (usedUnits.length === 0) {
            headRow2.push({ content: "Price", styles: { halign: "center", fillColor: groupColors[tier.key] } });
        } else {
            for (const unit of usedUnits) {
                headRow2.push({
                    content: unit.unit_shortcut || unit.unit_name || "—",
                    styles: {
                        halign: "center",
                        fontSize: 6,
                        fillColor: groupColors[tier.key]
                    },
                });
            }
        }
    }

    // --- Body Construction ---
    const body = rows.map((row) => {
        const cells: (string | PdfCell)[] = [
            { content: row.display.product_name || "—", styles: { fontStyle: "bold" } },
            row.category_name || "—",
            row.brand_name || "—"
        ];

        for (const tier of activeTiers) {
            if (usedUnits.length === 0) {
                cells.push("—");
            } else {
                for (const unit of usedUnits) {
                    const variant = row.variantsByUnitId[Number(unit.unit_id)];
                    const price = variant?.tiers?.[tier.key];
                    cells.push(price != null ? money(price) : "—");
                }
            }
        }
        return cells;
    });

    const generated = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    
    let y = 40;

    if (selectedTemplate) {
        // Use PdfEngine to apply the template header — returns the Y where body content should start
        y = await PdfEngine.applyTemplate(doc, selectedTemplate.name, companyData || null);
        // Use bodyStart from config if explicitly defined (overrides calculated value)
        if (tplConfig?.bodyStart != null) {
            y = tplConfig.bodyStart;
        }
    } else {
        // Fallback to legacy hardcoded header
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text(title, finalMargins.left, finalMargins.top);

        y = finalMargins.top + 5;
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Generated: ${generated} | Total Products: ${rows.length}`, finalMargins.left, y);
        y += 5;

        if (supplier) {
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text(supplier.supplier_name, finalMargins.left, y);
            y += 4;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(80);

            const details: string[] = [];
            if (supplier.address) details.push(`Address: ${supplier.address}`);
            if (supplier.tin_number) details.push(`TIN: ${supplier.tin_number}`);
            if (supplier.contact_person) details.push(`Contact: ${supplier.contact_person}`);
            if (supplier.phone_number) details.push(`Phone: ${supplier.phone_number}`);

            if (details.length > 0) {
                doc.text(details.join("  |  "), finalMargins.left, y);
                y += 4;
            }
        }
    }

    autoTable(doc, {
        startY: y + 5,
        head: [headRow1, headRow2],
        body,
        theme: "grid",
        styles: {
            fontSize,
            cellPadding: 4,
            valign: "middle",
            lineWidth: 0.5,
            lineColor: [200, 200, 200],
        },
        headStyles: {
            fillColor: [245, 245, 245],
            textColor: [50, 50, 50],
            fontStyle: "bold",
        },
        columnStyles: {
            0: { cellWidth: 56 },
            1: { cellWidth: 28 },
            2: { cellWidth: 28 }
        },
        margin: { 
            left: finalMargins.left, 
            right: finalMargins.right,
            top: finalMargins.top,
            bottom: bodyEnd != null
                ? (doc.internal.pageSize.getHeight() - bodyEnd)
                : finalMargins.bottom
        },
        didParseCell: (data) => {
            if (data.section === "body" && data.column.index >= 3) {
                const tierIdx = Math.floor((data.column.index - 3) / uomCount);
                const tier = activeTiers[tierIdx];
                if (tier) {
                    data.cell.styles.fillColor = groupColors[tier.key];
                    data.cell.styles.halign = "right";
                }
            }
        },
        didDrawPage: (data) => {
            // Draw page numbers from template if available
            if (selectedTemplate?.config?.pageNumber?.show) {
                drawPageNumbers(doc, selectedTemplate.config);
            } else {
                const str = "Page " + doc.getCurrentPageInfo().pageNumber;
                doc.setFontSize(8);
                doc.text(str, data.settings.margin.left, doc.internal.pageSize.getHeight() - 4);
            }
        }
    });

    doc.save(`Product_Printables_Matrix_${now.getTime()}.pdf`);
}
