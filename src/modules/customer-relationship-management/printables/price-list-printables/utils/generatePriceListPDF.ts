import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PriceListItem } from "../types";
import { PdfEngine } from "@/components/pdf-layout-design/PdfEngine";

interface GenerateParams {
    items: PriceListItem[];
    priceType: string;
    templateName: string; // Dynamic template selection
}

export async function generatePriceListPDF({ 
    items, 
    priceType,
    templateName 
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

    // 2. Generate with PdfEngine
    return await PdfEngine.generateWithFrame(templateName, companyData, (doc, startY, config) => {
        const margins = config.margins || { top: 10, bottom: 10, left: 10, right: 10 };
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
        doc.text("OFFICIAL PRICELIST FOR BOOKING", pageWidth / 2, boxY + 11, { align: 'center' });

        // --- SECTION: TABLE DATA PREPARATION ---
        let lastCategory = "";
        const tableBody = items.map(item => {
            const isFirstInGroup = item.categoryCode !== lastCategory;
            lastCategory = item.categoryCode;

            // Calculations based on Case Price
            const casePrice = item.price;
            const pckg = item.pckg || 1;
            const piecePrice = casePrice / pckg;
            
            return [
                isFirstInGroup ? item.categoryCode : "", // Only show for first in group
                item.productName,
                item.productCode || "", // FG CODE
                item.pckg,
                casePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                piecePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                piecePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            ];
        });

        // --- SECTION: AUTO-TABLE WITH COMPLEX HEADERS ---
        autoTable(doc, {
            startY: boxY + boxHeight + 5,
            margin: { ...margins, top: 10 },
            
            // Nested Headers to match the image
            head: [
                [
                    { content: 'CATEGORY CODE', rowSpan: 2, styles: { valign: 'middle' } },
                    { content: 'PRODUCT DESCRIPTION', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
                    { content: 'FG CODE', rowSpan: 2, styles: { valign: 'middle' } },
                    { content: 'PCKG', rowSpan: 2, styles: { valign: 'middle' } },
                    { content: `PRICE TYPE ${priceType}`, colSpan: 3, styles: { halign: 'center' } }
                ],
                [
                    { content: `Case ${priceType}`, styles: { halign: 'center' } },
                    { content: `Bag ${priceType}`, styles: { halign: 'center' } },
                    { content: `Piece ${priceType}`, styles: { halign: 'center' } }
                ]
            ],
            
            body: tableBody,
            
            theme: 'plain',
            
            headStyles: {
                fillColor: [10, 48, 93], // Dark Blue from image
                textColor: 255,
                fontSize: 8,
                fontStyle: 'bold',
                lineWidth: 0.1,
                lineColor: [255, 255, 255]
            },
            
            columnStyles: {
                0: { cellWidth: 25, fontSize: 7 }, // Category Code
                1: { fontSize: 8 },                 // Description
                2: { cellWidth: 20, halign: 'center', fontSize: 8 }, // FG Code
                3: { cellWidth: 15, halign: 'center', fontSize: 8 }, // PCKG
                4: { cellWidth: 22, halign: 'right', fontSize: 8 },  // Case
                5: { cellWidth: 22, halign: 'right', fontSize: 8 },  // Bag
                6: { cellWidth: 22, halign: 'right', fontSize: 8 }   // Piece
            },
            
            styles: {
                lineColor: [220, 220, 220],
                lineWidth: 0,
                valign: 'middle'
            },

            // Custom Drawing for the Price Boxes (the grid look in the image)
            didDrawCell: (data) => {
                // If it's one of the pricing columns in the body
                if (data.section === 'body' && data.column.index >= 4) {
                    const doc = data.doc;
                    doc.setDrawColor(0, 0, 0);
                    doc.setLineWidth(0.1);
                    
                    // Draw the box around the price value
                    doc.rect(
                        data.cell.x + 1, 
                        data.cell.y + 1, 
                        data.cell.width - 2, 
                        data.cell.height - 2
                    );
                }
                
                // Draw vertical separator before the pricing section
                if (data.section === 'body' && data.column.index === 4) {
                    const doc = data.doc;
                    doc.setDrawColor(10, 48, 93);
                    doc.setLineWidth(1);
                    doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
                }
            }
        });
    });
}
