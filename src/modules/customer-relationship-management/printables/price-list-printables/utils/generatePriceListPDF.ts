import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PriceListItem } from "../types";
import { PdfEngine } from "@/components/pdf-layout-design/PdfEngine";

interface GenerateParams {
    items: PriceListItem[];
    templateName: string; // Dynamic template selection
    salesmanName: string;
    salesmanCode: string;
    supplierName: string;
    showBarcode?: boolean;
}

export async function generatePriceListPDF({
    items,
    templateName,
    salesmanName,
    salesmanCode,
    supplierName,
    showBarcode = false
}: GenerateParams): Promise<jsPDF> {
    // 1. Fetch Company Data
    let companyData = null;
    try {
        const compRes = await fetch("/api/pdf/company");
        if (compRes.ok) {
            const result = await compRes.json();
            companyData = result.data?.[0] || (Array.isArray(result.data) ? null : result.data);
        }
    } catch (error) {
        console.error("Error fetching company data:", error);
    }

    // 1.5 Fetch Category Names
    const uniqueCategories = Array.from(new Set(items.map(i => i.categoryCode)));
    const categoryMap = new Map<string, string>();

    await Promise.all(uniqueCategories.map(async (catCode) => {
        if (!catCode) return;
        try {
            const res = await fetch(`/api/crm/printables/price-list-printables?action=category&categoryCode=${catCode}`);
            if (res.ok) {
                const data = await res.json();
                categoryMap.set(catCode, data.category_name || catCode);
            } else {
                categoryMap.set(catCode, catCode);
            }
        } catch {
            categoryMap.set(catCode, catCode);
        }
    }));

    // 2. Generate with PdfEngine
    return await PdfEngine.generateWithFrame(templateName, companyData, (doc, startY, config) => {
        // Ensure Page Numbers are shown
        if (!config.pageNumber) {
            config.pageNumber = {
                show: true,
                position: 'bottom-right',
                fontSize: 8,
                fontFamily: 'helvetica',
                color: '#64748b',
                format: 'Page {pageNumber} of {totalPages}',
                marginY: 12, // Move slightly higher from the absolute bottom
                marginX: 10
            };
        } else {
            config.pageNumber.show = true;
            config.pageNumber.marginY = 12;
            if (!config.pageNumber.fontFamily) {
                config.pageNumber.fontFamily = 'helvetica';
            }
        }

        const margins = config.margins || { top: 10, bottom: 25, left: 10, right: 10 };
        const pageWidth = doc.internal.pageSize.getWidth();
        const contentWidth = pageWidth - margins.left - margins.right;

        // --- SECTION: ORANGE HEADER BOX ---
        const boxHeight = 15;
        const boxY = startY + 5;

        // Draw the Peach/Orange background box
        doc.setFillColor(255, 230, 200); // Peach/light orange
        doc.rect(margins.left, boxY, contentWidth, boxHeight, 'F');

        // Title 1: Subtitle or Group (e.g., GROCERY PRODUCTS (GP))
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text("GROCERY PRODUCTS (GP)", pageWidth / 2, boxY + 6, { align: 'center' });

        // Title 2: Official Header
        doc.setFontSize(10);
        doc.text("OFFICIAL PRICELIST", pageWidth / 2, boxY + 11, { align: 'center' });

        // --- SECTION: METADATA ---
        const metaY = boxY + boxHeight + 5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);

        // Left side: Supplier, Salesman, Salesman Code
        doc.text(`Supplier: ${supplierName}`, margins.left, metaY);
        doc.text(`Salesman: ${salesmanName}`, margins.left, metaY + 4);
        doc.text(`Salesman Code: ${salesmanCode}`, margins.left, metaY + 8);

        // Right side: Date and time Generated
        const now = new Date();
        const formattedDate = now.toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
        doc.text(`Generated at: ${formattedDate}`, pageWidth - margins.right, metaY, { align: 'right' });

        // --- SECTION: TABLE DATA PREPARATION ---
        let lastCategory = "";

        // Group items by productName
        interface GroupedItem {
            categoryCode: string;
            productCode?: string;
            productName: string;
            pckg: number;
            casePrice: number | null;
            bagPrice: number | null;
            piecePrice: number | null;
            barcode: string;
        }

        const groupedItemsMap = new Map<string, GroupedItem>();

        items.forEach(item => {
            const key = item.productName;
            if (!groupedItemsMap.has(key)) {
                groupedItemsMap.set(key, {
                    categoryCode: item.categoryCode,
                    productName: item.productName,
                    productCode: item.productCode || "",
                    pckg: item.pckg || 1,
                    casePrice: null,
                    bagPrice: null,
                    piecePrice: null,
                    barcode: item.barcode || item.barcodeNo || "",
                });
            }

            const grouped = groupedItemsMap.get(key)!;
            const unit = (item.unit || "").toLowerCase();

            if (unit === 'box' || unit === 'case' || unit === 'cases') {
                grouped.casePrice = item.price;
            } else if (unit === 'piece' || unit === 'pcs' || unit === 'pieces' || unit === 'pc') {
                grouped.piecePrice = item.price;
            } else {
                grouped.bagPrice = item.price;
            }
        });

        const groupedItems = Array.from(groupedItemsMap.values());

        const tableBody = groupedItems.map(item => {
            const isFirstInGroup = item.categoryCode !== lastCategory;
            lastCategory = item.categoryCode;
            const categoryName = categoryMap.get(item.categoryCode) || item.categoryCode;

            const formatCurrency = (val: number | null) => {
                if (val === null || val === undefined) return "-";
                return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            };

            const row = [];
            if (showBarcode) {
                row.push(item.barcode || ""); // the barcode string
            }

            row.push(
                isFirstInGroup ? categoryName : "", // Only show for first in group
                item.productName,
                item.productCode || "", // FG CODE
            );

            row.push(
                item.pckg,
                formatCurrency(item.casePrice),
                formatCurrency(item.bagPrice),
                formatCurrency(item.piecePrice)
            );

            return row;
        });

        // --- SECTION: AUTO-TABLE WITH COMPLEX HEADERS ---
        const head1: Record<string, unknown>[] = [];
        
        if (showBarcode) {
            head1.push({ content: 'BARCODE', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } });
        }

        head1.push(
            { content: 'CATEGORY', rowSpan: 2, styles: { valign: 'middle' } },
            { content: 'PRODUCT DESCRIPTION', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
            { content: 'FG CODE', rowSpan: 2, styles: { valign: 'middle' } },
            { content: 'PCKG', rowSpan: 2, styles: { valign: 'middle' } },
            { content: 'PRICE', colSpan: 3, styles: { halign: 'center' } }
        );

        const head2 = [
            { content: 'Cases', styles: { halign: 'center' as const } },
            { content: 'Bag', styles: { halign: 'center' as const } },
            { content: 'Piece', styles: { halign: 'center' as const } }
        ];

        const colStyles: Record<number, Record<string, unknown>> = {};

        if (showBarcode) {
            colStyles[0] = { cellWidth: 18, halign: 'center', fontSize: 7 }; // Barcode
            colStyles[1] = { cellWidth: 25, fontSize: 6 }; // Category Code
            colStyles[2] = { fontSize: 7 };                 // Description
            colStyles[3] = { cellWidth: 15, halign: 'center', fontSize: 7 }; // FG Code
            colStyles[4] = { cellWidth: 10, halign: 'center', fontSize: 7 }; // PCKG
            colStyles[5] = { cellWidth: 18, halign: 'right', fontSize: 7 };  // Case
            colStyles[6] = { cellWidth: 18, halign: 'right', fontSize: 7 };  // Bag
            colStyles[7] = { cellWidth: 18, halign: 'right', fontSize: 7 };  // Piece
        } else {
            colStyles[0] = { cellWidth: 25, fontSize: 6 }; // Category Code
            colStyles[1] = { fontSize: 7 };                 // Description
            colStyles[2] = { cellWidth: 15, halign: 'center', fontSize: 7 }; // FG Code
            colStyles[3] = { cellWidth: 15, halign: 'center', fontSize: 7 }; // PCKG
            colStyles[4] = { cellWidth: 22, halign: 'right', fontSize: 7 };  // Case
            colStyles[5] = { cellWidth: 22, halign: 'right', fontSize: 7 };  // Bag
            colStyles[6] = { cellWidth: 22, halign: 'right', fontSize: 7 };  // Piece
        }

        const priceColStartIndex = showBarcode ? 5 : 4;
        autoTable(doc, {
            startY: metaY + 15,
            margin: { ...margins, top: 10, bottom: 25 }, // Explicit bottom margin for safety

            // Nested Headers to match the image
            head: [head1, head2],

            body: tableBody,

            theme: 'grid', // Use grid for continuous lines

            headStyles: {
                fillColor: [10, 48, 93], // Dark Blue from image
                textColor: 255,
                fontSize: 8,
                fontStyle: 'bold',
                lineWidth: 0.1,
                lineColor: [0, 0, 0] // Black borders for header
            },

            columnStyles: colStyles,

            styles: {
                lineColor: [0, 0, 0], // Black grid lines
                lineWidth: 0.1,
                valign: 'middle',
                textColor: [0, 0, 0],
                cellPadding: { top: 0.2, bottom: 0.2, left: 0.5, right: 0.5 },
                minCellHeight: 3
            },

            // Customize specific parts of the table
            didParseCell: (data) => {
                // Style the second header row (Sub-headers)
                if (data.section === 'head' && data.row.index === 1) {
                    data.cell.styles.fillColor = [230, 235, 245]; // Light Gray/Blue
                    data.cell.styles.textColor = [0, 0, 0];       // Black text
                }
            },

            // Custom Drawing for the special grid look if needed
            didDrawCell: (data) => {
                // Draw a thicker vertical separator before the pricing section
                if (data.section === 'body' && data.column.index === priceColStartIndex) {
                    const doc = data.doc;
                    doc.setDrawColor(0, 0, 0); // Still black, but could be thicker
                    doc.setLineWidth(0.3);
                    doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
                }
            }
        });

        // --- SECTION: FOOTER ADDITIONS ---
        // Add {Supplier Name} - Price List on the left side of the footer for every page
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            const pageHeight = doc.internal.pageSize.getHeight();
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            // Convert '#64748b' to rgb for jspdf
            doc.setTextColor(100, 116, 139);
            doc.text(`${supplierName} - Price List`, margins.left, pageHeight - 12, { baseline: 'middle' });
        }
    });
}
