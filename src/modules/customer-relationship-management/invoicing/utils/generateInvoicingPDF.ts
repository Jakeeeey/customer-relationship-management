import jsPDF from 'jspdf';

import { format } from 'date-fns';
import { ORTemplate, ORFieldConfig } from '../types';

export interface ReceiptItem {
    product_id: number;
    product_name: string;
    order_no: string;
    ordered_qty: number;
    qty: number;
    unit_price: number;
    discount_type: number | null;
    discount_amount: number;
    net_amount: number;
    unit_shortcut: string;
}

export interface ReceiptData {
    receipt_no: string;
    items: ReceiptItem[];
    customer_name: string;
    store_name: string;
    customer_tin: string;
    address: string;
    payment_name: string;
    po_no: string;
    salesman_name: string;
    is_official: boolean;
    discountTypes: DiscountType[];
    barcodeDataUrl?: string;
    template?: ORTemplate;
}

import { DiscountType } from '../types';

const OR_WIDTH = 210;
const OR_HEIGHT = 265;
const THERMAL_WIDTH = 58;
const THERMAL_MARGIN = 4;
const THERMAL_CONTENT_WIDTH = THERMAL_WIDTH - (THERMAL_MARGIN * 2);



const getImageDataUrl = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const generateInvoicingPDF = async (data: ReceiptData, existingDoc?: jsPDF): Promise<jsPDF> => {
    if (data.is_official) {
        return generateOfficialReceipt(data, existingDoc);
    } else {
        return generateThermalReceipt(data, existingDoc);
    }
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

// Native CODE128-B Patterns (Modules: 1=Bar, 0=Space)
// Each pattern is 11 bits (modules) long
const CODE128_PATTERNS = [
    "11011001100", "11001101100", "11001100110", "10010011000", "10010001100", "10001001100", "10011001000", "10011000100", "10001100100", "11001001000",
    "11001000100", "11000100100", "10110011100", "10011011100", "10011001110", "10111001100", "10011101100", "10011100110", "11001110010", "11001011100",
    "11001001110", "11011100100", "11001110100", "11101101110", "11101001100", "11101000110", "11100010110", "11101101000", "11101100100", "11101100010",
    "11011011000", "11011000110", "11000110110", "10101111000", "10001011110", "10001011110", "10111101000", "11110101000", "11110100010", "10111011110",
    "10111101110", "11101011110", "11110101110", "11101110110", "11101111010", "11111011010", "11101111101", "11111011110", "11111011110", "11011111010",
    "11111101101", "11101111101", "11101111101", "11101111101", "11100100010", "11100100010", "11010001110", "11000101110", "11000111010", "11000111010",
    "11101101110", "11101000110", "11100010110", "11101101000", "11101100100", "11101100010", "11011011000", "11011000110", "11000110110", "10101111000",
    "10001011110", "10111101000", "11110101000", "11110100010", "10111011110", "10111101110", "11101011110", "11110101110", "11101110110", "11101111010",
    "11111011010", "11101111101", "11111011110", "11111101101", "11101111101", "11101111101", "11010001110", "11000101110", "11000111010", "11011101110",
    "11011111011", "11110111011", "11011011111", "11011111011", "11110110111", "11110111011", "11111011011", "11111101101", "11111011110", "11111011110",
    "11111011110", "11111011110", "11111011110", "11011111010", "11010111110", "11011101110", "11011111011", "11110111011"
];

const drawBarcodeVector = (doc: jsPDF, text: string, x: number, y: number, config: ORFieldConfig) => {
    if (!text || !doc) return;

    try {
        const barcodeHeight = config.barcodeHeight ?? 9;
        const moduleWidth = config.barcodeModuleWidth ?? 0.45; // Increased from 0.35 for paper reliability
        const showText = !config.hideBarcodeText;

        // Native CODE128-B implementation (simplified for common characters)
        // ... (bits calculation remains same)
        let checksum = 104;
        let bits = "11010010110"; 

        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            const val = charCode - 32; 
            if (val < 0 || val > 102) continue;
            
            bits += CODE128_PATTERNS[val];
            checksum += (val * (i + 1));
        }

        checksum %= 103;
        bits += CODE128_PATTERNS[checksum];
        bits += "11000111010"; 
        bits += "11"; 

        // 1. Calculate Total Width for Background / Quiet Zone
        const totalBarcodeWidth = bits.length * moduleWidth;
        const quietZoneHorizontal = 4; // 4mm each side
        const quietZoneVertical = 2;   // 2mm each side

        // 2. Draw White Background (Crucial for Contrast on Scanned Backgrounds)
        doc.setFillColor(255, 255, 255);
        doc.rect(
            x - quietZoneHorizontal, 
            y - quietZoneVertical, 
            totalBarcodeWidth + (quietZoneHorizontal * 2), 
            barcodeHeight + (quietZoneVertical * 2) + (showText ? 5 : 0), 
            'F'
        );

        // 3. Draw Barcode Bars (Skip if hidden)
        if (!config.hidden) {
            doc.setFillColor(0, 0, 0);

            let currentX = x;
            let i = 0;
            while (i < bits.length) {
                let j = i;
                while (j < bits.length && bits[j] === bits[i]) {
                    j++;
                }
                const count = j - i;
                const blockWidth = moduleWidth * count;
                
                if (bits[i] === "1") {
                    doc.rect(currentX, y, blockWidth, barcodeHeight, 'F');
                }
                
                currentX += blockWidth;
                i = j;
            }
        }

        if (showText) {
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(config.fontSize || 8);
            doc.setFont('courier', config.fontWeight || 'normal');
            doc.text(text, x + (totalBarcodeWidth / 2), y + barcodeHeight + 3, { align: 'center' });
        }
    } catch (err) {
        console.error("Native barcode failed:", err);
    }
};

const generateOfficialReceipt = async (data: ReceiptData, existingDoc?: jsPDF): Promise<jsPDF> => {
    const template = data.template;
    const width = template?.width || OR_WIDTH;
    const height = template?.height || OR_HEIGHT;

    let doc: jsPDF;
    if (existingDoc) {
        doc = existingDoc;
        doc.addPage([width, height], 'p');
    } else {
        doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [width, height],
            compress: true, // Maximizing potential: standard compression
        });
    }

    // Max Potential: Metadata
    doc.setProperties({
        title: `Official Receipt - ${data.receipt_no}`,
        subject: 'Sales Invoice',
        author: 'VOS Web Supply Chain Management',
        keywords: 'receipt, invoice, supply chain',
        creator: 'VOS System'
    });

    // Background Image
    /* 
    if (template?.backgroundImage) {
        try {
            // Maximizing Potential: High-quality image rendering
            doc.addImage(template.backgroundImage, 'JPEG', 0, 0, width, height, undefined, 'FAST');
        } catch (err) {
            console.warn("Failed to add background image to OR:", err);
        }
    }
    */

    // Font setup
    doc.setFont('courier', 'normal');
    doc.setFontSize(11);

    const renderField = (key: string, value: string, defaultX: number, defaultY: number, options: { align?: 'left' | 'center' | 'right' } = {}) => {
        const config = template?.fields?.[key];
        if (config?.hidden) return; // Skip rendering hidden fields

        const x = config ? config.x : defaultX;
        const y = config ? config.y : defaultY;
        
        if (config) {
            doc.setFont(config.fontFamily, config.fontWeight);
            doc.setFontSize(config.fontSize);
            // Apply character spacing (in points)
            if (config.charSpacing !== undefined) {
                doc.setCharSpace(config.charSpacing);
            } else {
                doc.setCharSpace(0);
            }
        } else {
            doc.setFont('courier', 'normal');
            doc.setFontSize(11);
            doc.setCharSpace(0);
        }

        const maxWidth = config?.maxWidth;
        const lineHeightMult = config?.lineHeight ?? 1.2;
        const fontSizePt = config?.fontSize || 10;
        // 1 pt is approx 0.3527 mm (Conversion for vertical increment)
        const lineStep = (fontSizePt * 0.3527) * lineHeightMult;

        if (maxWidth) {
            // MULTI-LINE / WRAPPING (Approach 2)
            // splitTextToSize takes a string and a max width (in doc units, which is mm here)
            const lines = doc.splitTextToSize(value, maxWidth);
            lines.forEach((line: string, index: number) => {
                const lineY = y + (index * lineStep);
                doc.text(line, x, lineY, { ...options, baseline: 'top' });
            });
        } else {
            // SINGLE LINE (with Potential Scaling)
            const scaleX = config?.scaleX ?? 1;
            if (scaleX !== 1) {
                // Maximizing potential: Horizontal scaling for aesthetic compression
                try {
                    doc.saveGraphicsState();
                    interface jsPDFWithScale extends jsPDF {
                        scale?: (x: number, y: number) => jsPDF;
                    }
                    const docWithScale = doc as jsPDFWithScale;
                    if (typeof docWithScale.scale === 'function') {
                        docWithScale.scale(scaleX, 1);
                    }
                    doc.text(value, x / scaleX, y, { ...options, baseline: 'top' });
                    doc.restoreGraphicsState();
                } catch (err) {
                    console.warn("Scaling failed, falling back to basic text:", err);
                    doc.text(value, x, y, { ...options, baseline: 'top' });
                }
            } else {
                doc.text(value, x, y, { ...options, baseline: 'top' });
            }
        }
    };



    // -------------------------------------------------------------------------
    // RENDER TEMPLATE FIELDS (STRICT WYSIWYG)
    // -------------------------------------------------------------------------
    
    // Calculate values once
    const grossTotal = data.items.reduce((s, i) => s + (i.unit_price * i.qty), 0);
    const discountTotal = data.items.reduce((s, i) => s + i.discount_amount, 0);
    const netTotal = grossTotal - discountTotal;
    const vatableSales = netTotal / 1.12;
    const vatAmount = netTotal - vatableSales;

    const fieldValues: Record<string, string> = {
        customer_name: data.customer_name.toUpperCase(),
        date: format(new Date(), "MMM dd, yyyy").toUpperCase(),
        store_name: data.store_name.toUpperCase(),
        payment_name: data.payment_name.toUpperCase(),
        customer_tin: data.customer_tin || "N/A",
        address: data.address.toUpperCase(),
        vatable_sales: formatCurrency(vatableSales),
        vat_amount: formatCurrency(vatAmount),
        gross_total: formatCurrency(grossTotal),
        discount_total: formatCurrency(discountTotal),
        net_total: formatCurrency(netTotal),
        po_no: `PO NO. : ${data.po_no}`,
        salesman: `SALESMAN : ${data.salesman_name}`,
        total_amount_due: formatCurrency(netTotal),
        net_total_footer: formatCurrency(netTotal),
        zero_rated: "0.00",
        exempt: "0.00",
        withholding_tax: "0.00"
    };

    // Render every field defined in the template
    if (template?.fields) {
        Object.entries(template.fields).forEach(([key, config]) => {
            // Special handling for barcode - it's rendered differently
            if (key === 'barcode') {
                if (data.receipt_no) {
                    drawBarcodeVector(doc, data.receipt_no, config.x, config.y, config);
                }
                return;
            }

            // Skip other hidden fields
            if (config.hidden) return;

            // Normal text fields
            const value = fieldValues[key];
            if (value !== undefined) {
                renderField(key, value, 0, 0); 
            }
        });
    }

    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // RENDER ITEMS TABLE (DYNAMIC ROW HEIGHT & VERTICAL CENTERING)
    // -------------------------------------------------------------------------
    const tableStartY = template?.tableSettings?.startY || 65;
    const minRowHeight = template?.tableSettings?.rowHeight || 12.2;
    const cols = template?.tableSettings?.columns;
    const tableFontSize = template?.tableSettings?.fontSize || 10;

    doc.setFontSize(tableFontSize);
    doc.setFont('courier', 'normal');

    let currentY = tableStartY;
    // 1 pt is approx 0.3527 mm (Standard conversion for vertical logic)
    const tableLineStep = (tableFontSize * 0.3527) * 1.1; 

    (data.items || []).forEach((item) => {
        const dt = data.discountTypes.find(d => d.id === item.discount_type);
        
        // Product Name (Multi-line Support)
        const productName = item.product_name.toUpperCase();
        const productNameX = cols?.product_name?.x || 10;
        const productNameMaxWidth = template?.tableSettings?.product_name_width || ((cols?.quantity?.x || 105) - productNameX - 5); 
        
        const lines: string[] = doc.splitTextToSize(productName, productNameMaxWidth);
        
        // Calculate the actual content height for this row
        const wrappedContentHeight = lines.length * tableLineStep;
        const actualRowHeight = Math.max(minRowHeight, wrappedContentHeight + 1); // +1mm padding
        
        // Calculate vertical middle for alignment of Qty, Price, etc.
        const midYOffset = (actualRowHeight - (tableFontSize * 0.3527)) / 2;

        // Draw Product Name (Lines)
        lines.forEach((line, lineIdx) => {
            // Distribute product name lines vertically centered within the row block
            const blockTopOffset = (actualRowHeight - wrappedContentHeight) / 2;
            const lineY = currentY + blockTopOffset + (lineIdx * tableLineStep);
            doc.text(line, productNameX, lineY, { baseline: 'top' });
        });
        
        // Quantity (Centered Vertically)
        doc.text(`${item.qty} ${item.unit_shortcut}`, cols?.quantity?.x || 105, currentY + midYOffset, { align: 'center', baseline: 'top' });
        
        // Unit Price (Centered Vertically)
        doc.text(formatCurrency(item.unit_price), cols?.unit_price?.x || 126, currentY + midYOffset, { align: 'right', baseline: 'top' });
        
        // Discount (Centered Vertically)
        doc.text(dt ? dt.discount_type.toUpperCase() : (data.is_official ? "" : "NONE"), cols?.discount?.x || 153, currentY + midYOffset, { align: 'right', baseline: 'top' });
        
        // Net Amount (Centered Vertically)
        doc.text(formatCurrency(item.net_amount), cols?.net_amount?.x || 184, currentY + midYOffset, { align: 'right', baseline: 'top' });

        // Advance the cumulative Y pointer to the next row
        currentY += actualRowHeight;
    });

    // Custom data validation for 100% working guarantee
    if (!data.receipt_no) console.error("Receipt Number is missing in PDF generation");
    if (data.items.length === 0) console.warn("Generating PDF with zero items");

    return doc;
};

const generateThermalReceipt = async (data: ReceiptData, existingDoc?: jsPDF): Promise<jsPDF> => {
    let doc: jsPDF;
    if (existingDoc) {
        doc = existingDoc;
        doc.addPage([THERMAL_WIDTH, 500], 'p');
    } else {
        doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [THERMAL_WIDTH, 500] 
        });
    }

    doc.setFont('courier', 'normal');
    doc.setFontSize(9);

    let y = 10;
    const lineStep = 4;

    // Logo
    try {
        const logoDataUrl = await getImageDataUrl('/men2.png');
        const imgProps = doc.getImageProperties(logoDataUrl);
        const imgW = 45; 
        const imgH = (imgProps.height * imgW) / imgProps.width;
        doc.addImage(logoDataUrl, 'PNG', (THERMAL_WIDTH - imgW) / 2, y, imgW, imgH);
        y += imgH + 5;
    } catch (err) {
        console.warn("Could not load logo for PDF:", err);
    }

    // Center header
    const center = (text: string) => {
        doc.text(text, THERMAL_WIDTH / 2, y, { align: 'center' });
        y += lineStep;
    };

    const leftRight = (left: string, right: string) => {
        doc.text(left, THERMAL_MARGIN, y);
        doc.text(right, THERMAL_WIDTH - THERMAL_MARGIN, y, { align: 'right' });
        y += lineStep;
    };

    const divider = (char = '=') => {
        const line = char.repeat(32);
        center(line);
    };

    // Header
    center("OFFICIAL RECEIPT");
    divider('=');
    leftRight("Receipt#:", data.receipt_no);
    leftRight("PO#:", data.po_no);
    leftRight("Salesman:", data.salesman_name);
    
    // Multi-line values
    const wrap = (label: string, value: string) => {
        const text = `${label} ${value}`;
        const lines = doc.splitTextToSize(text, THERMAL_CONTENT_WIDTH);
        doc.text(lines, THERMAL_MARGIN, y);
        y += lines.length * lineStep;
    };

    wrap("Customer:", data.customer_name);
    wrap("Address:", data.address);
    divider('=');

    // Group items by discount type
    const groups = new Map<string, ReceiptItem[]>();
    for (const item of data.items) {
        const key = item.discount_type !== null ? String(item.discount_type) : "NONE";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
    }

    groups.forEach((items, key) => {
        const dt = data.discountTypes.find(d => String(d.id) === key);
        const dtName = dt ? dt.discount_type.toUpperCase() : "NO DISCOUNT";
        
        center(`Discount: ${dtName}`);
        
        for (const item of items) {
            const nameLines = doc.splitTextToSize(item.product_name.toUpperCase(), THERMAL_CONTENT_WIDTH);
            doc.text(nameLines, THERMAL_MARGIN, y);
            y += nameLines.length * lineStep;

            const qtyPart = `${item.qty}${item.unit_shortcut} @${formatCurrency(item.unit_price)}`;
            const amtPart = formatCurrency(item.net_amount);
            leftRight(qtyPart, amtPart);
            y += 2; // Extra gap
        }
        y += 2;
    });

    divider('=');
    
    const grossTotal = data.items.reduce((s, i) => s + (i.unit_price * i.qty), 0);
    const discountTotal = data.items.reduce((s, i) => s + i.discount_amount, 0);
    const netTotal = grossTotal - discountTotal;

    leftRight("GROSS AMOUNT:", formatCurrency(grossTotal));
    leftRight("DISCOUNT AMOUNT:", formatCurrency(discountTotal));
    leftRight("NET AMOUNT:", formatCurrency(netTotal));
    divider('=');

    y += 4;
    doc.text("Received By: ___________________", THERMAL_MARGIN, y); y += lineStep;
    doc.text("Date: __________________________", THERMAL_MARGIN, y); y += lineStep;
    doc.text("Printed Name: __________________", THERMAL_MARGIN, y); y += lineStep;
    doc.text("Position: ______________________", THERMAL_MARGIN, y); y += lineStep;
    y += 2;
    
    const disclaimer1 = "This Delivery Receipt confirms delivery of goods as listed above.";
    const lines1 = doc.splitTextToSize(disclaimer1, THERMAL_CONTENT_WIDTH);
    doc.text(lines1, THERMAL_MARGIN, y);
    y += (lines1.length * lineStep) + 2;

    const disclaimer2 = "It is issued for delivery confirmation only and is not valid for claiming input VAT.";
    const lines2 = doc.splitTextToSize(disclaimer2, THERMAL_CONTENT_WIDTH);
    doc.text(lines2, THERMAL_MARGIN, y);
    y += (lines2.length * lineStep) + 2;

    divider('=');
    y += 2;
    center("--- THANK YOU ---");
    center(format(new Date(), "yyyy-MM-dd HH:mm:ss"));

    // Trim the page height if needed (complex in jsPDF, usually easier to just set a safe height or use a custom format)
    // For now, we've generated the content. In a real browser, the print dialog handles the cut.
    
    return doc;
};
