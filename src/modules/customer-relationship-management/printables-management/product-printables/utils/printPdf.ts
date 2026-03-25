// src/modules/financial-management/printables-management/product-printables/utils/printPdf.ts

import type { MatrixRow, PriceType, Unit, Supplier } from "../types";

type MatrixOptions = {
    paper?: "a4" | "legal" | "a3";
    orientation?: "landscape" | "portrait";
    fontSize?: number;
    title?: string;
    priceTypes?: PriceType[];
    units?: Unit[];
    usedUnitIds?: Set<number>;
    supplier?: Supplier | null;
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
    const {
        paper = "a3",
        orientation = "landscape",
        fontSize = 7,
        title = "Product Matrix Report",
        units = [],
        usedUnitIds = new Set(),
        supplier = null
    } = options;

    const doc = new jsPDF({ orientation, unit: "pt", format: paper });

    const usedUnits = units
        .filter(u => usedUnitIds.has(Number(u.unit_id)))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const uomCount = Math.max(usedUnits.length, 1);
    const now = new Date();

    // --- Header Construction ---
    const headRow1: PdfCell[] = [
        { content: "Product Details", colSpan: 3, styles: { halign: "center", fontStyle: "bold" } },
    ];

    for (const tier of TIERS) {
        headRow1.push({
            content: `PRICE TYPE ${tier}`,
            colSpan: uomCount,
            styles: {
                halign: "center",
                fillColor: groupColors[tier],
                textColor: groupTextColors[tier],
                fontStyle: "bold"
            },
        });
    }

    const headRow2: PdfCell[] = [
        { content: "Product Name", rowSpan: 2, styles: { valign: "middle", fontStyle: "bold" } },
        { content: "Category", rowSpan: 2, styles: { valign: "middle" } },
        { content: "Brand", rowSpan: 2, styles: { valign: "middle" } },
    ];

    for (const tier of TIERS) {
        headRow2.push({
            content: `Tier ${tier}`,
            colSpan: uomCount,
            styles: {
                halign: "center",
                fillColor: groupColors[tier],
                textColor: groupTextColors[tier]
            },
        });
    }

    const headRow3: PdfCell[] = [];
    for (const tier of TIERS) {
        if (usedUnits.length === 0) {
            headRow3.push({ content: "Price", styles: { halign: "center", fillColor: groupColors[tier] } });
        } else {
            for (const unit of usedUnits) {
                headRow3.push({
                    content: unit.unit_shortcut || unit.unit_name || "—",
                    styles: {
                        halign: "center",
                        fontSize: 6,
                        fillColor: groupColors[tier]
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

        for (const tier of TIERS) {
            if (usedUnits.length === 0) {
                cells.push("—");
            } else {
                for (const unit of usedUnits) {
                    const variant = row.variantsByUnitId[Number(unit.unit_id)];
                    const price = variant?.tiers?.[tier];
                    cells.push(price != null ? money(price) : "—");
                }
            }
        }
        return cells;
    });

    const generated = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(title, 40, 40);

    let y = 55;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated: ${generated} | Total Products: ${rows.length}`, 40, y);
    y += 15;

    if (supplier) {
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(supplier.supplier_name, 40, y);
        y += 12;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(80);

        const details: string[] = [];
        if (supplier.address) details.push(`Address: ${supplier.address}`);
        if (supplier.tin_number) details.push(`TIN: ${supplier.tin_number}`);
        if (supplier.contact_person) details.push(`Contact: ${supplier.contact_person}`);
        if (supplier.phone_number) details.push(`Phone: ${supplier.phone_number}`);

        if (details.length > 0) {
            doc.text(details.join("  |  "), 40, y);
            y += 12;
        }
    }

    autoTable(doc, {
        startY: y + 5,
        head: [headRow1, headRow2, headRow3],
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
            0: { cellWidth: 160 },
            1: { cellWidth: 80 },
            2: { cellWidth: 80 }
        },
        margin: { left: 40, right: 40 },
        didParseCell: (data) => {
            if (data.section === "body" && data.column.index >= 3) {
                const tierIdx = Math.floor((data.column.index - 3) / uomCount);
                const tier = TIERS[tierIdx];
                if (tier) {
                    data.cell.styles.fillColor = groupColors[tier];
                    data.cell.styles.halign = "right";
                }
            }
        },
        didDrawPage: (data) => {
            const str = "Page " + doc.getCurrentPageInfo().pageNumber;
            doc.setFontSize(8);
            doc.text(str, data.settings.margin.left, doc.internal.pageSize.getHeight() - 10);
        }
    });

    doc.save(`Product_Printables_Matrix_${now.getTime()}.pdf`);
}
