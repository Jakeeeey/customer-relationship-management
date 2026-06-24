import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import autoTable from 'jspdf-autotable';
import { format, isValid, parseISO } from 'date-fns';
import { SalesInvoiceHeader, WorklistFilters, SiteSalesSummaryStats } from '../types';
import { jsPDF } from 'jspdf';
import { PdfEngine } from '@/components/pdf-layout-design/PdfEngine';
import { pdfTemplateService } from '@/components/pdf-layout-design/services/pdf-template';
import { drawPageNumbers } from '@/components/pdf-layout-design/PdfGenerator';
import { PdfConfig, PdfData } from '@/components/pdf-layout-design/types';

const formatDate = (dateString?: string | null) => {
    if (!dateString) return "--";
    const date = parseISO(dateString);
    return isValid(date) ? format(date, "MM/dd/yyyy") : String(dateString);
};

const formatCurrency = (amount: number) => {
    return 'P' + new Intl.NumberFormat('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

export const exportToExcel = async (
    data: SalesInvoiceHeader[], 
    fileName: string, 
    filters: WorklistFilters,
    stats: SiteSalesSummaryStats
) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Site Sales Summary', {
        properties: { tabColor: { argb: 'FF1E88E5' } },
        views: [{ state: 'frozen', ySplit: 5 }]
    });

    // 1. Column Definitions & Widths
    worksheet.columns = [
        { header: 'Receipt No.', key: 'invoice_no', width: 18 },
        { header: 'Posted', key: 'posted', width: 10 },
        { header: 'Salesman', key: 'salesman', width: 22 },
        { header: 'Customer', key: 'customer', width: 24 },
        { header: 'Receipt Date', key: 'date', width: 15 },
        { header: 'Dispatch Date', key: 'dispatch', width: 15 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Payment', key: 'payment', width: 12 },
        { header: 'Gross Amount', key: 'gross', width: 16 },
        { header: 'Credits', key: 'credits', width: 14 },
        { header: 'Returns', key: 'returns', width: 12 },
        { header: 'Debits', key: 'debits', width: 12 },
        { header: 'Balance', key: 'balance', width: 16 },
    ];

    // Row 1: Title Banner
    worksheet.mergeCells('A1:M1');
    const titleRow = worksheet.getRow(1);
    titleRow.height = 48;
    titleRow.getCell(1).value = '📊  SITE SALES SUMMARY REPORT';
    titleRow.getCell(1).font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1B2A' } };
    titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    // Row 2: Subtitle Bar
    worksheet.mergeCells('A2:H2');
    worksheet.mergeCells('I2:M2');
    const subtitleRow = worksheet.getRow(2);
    subtitleRow.height = 25;
    
    // Left: Generated Date
    const dateCell = subtitleRow.getCell(1);
    dateCell.value = `Generated on: ${format(new Date(), "MM/dd/yyyy hh:mm a")}`;
    dateCell.font = { name: 'Calibri', italic: true, color: { argb: 'FFCCCCCC' } };
    dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF162032' } };
    dateCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    // Right: (Slogan removed as requested)
    const sloganCell = subtitleRow.getCell(9);
    sloganCell.value = '';
    sloganCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF162032' } };

    // Row 3: KPI Summary Bar
    const kpiRow = worksheet.getRow(3);
    kpiRow.height = 36;
    
    const kpis = [
        { label: 'TOTAL RECORDS', value: data.length, color: 'FF0D1B2A' },
        { label: 'TOTAL GROSS', value: stats.totalGross, color: 'FF1565C0', isCurrency: true },
        { label: 'TOTAL CREDITS', value: stats.totalCredits, color: 'FFEF6C00', isCurrency: true }, // Orange
        { label: 'TOTAL RETURNS', value: stats.totalReturns, color: 'FFC62828', isCurrency: true }, // Red
        { label: 'TOTAL DEBITS', value: stats.totalDebits, color: 'FF6A1B9A', isCurrency: true },  // Purple
        { label: 'TOTAL BALANCE', value: stats.totalBalance, color: 'FF00695C', isCurrency: true }  // Teal
    ];

    kpis.forEach((kpi, idx) => {
        const startCol = (idx * 2) + 1;
        const endCol = startCol + 1;
        if (endCol <= 13) {
            worksheet.mergeCells(3, startCol, 3, endCol);
            const cell = kpiRow.getCell(startCol);
            cell.value = `${kpi.label}\n${kpi.isCurrency ? '₱' + kpi.value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : kpi.value}`;
            cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpi.color } };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = { right: { style: 'thin', color: { argb: 'FF333333' } } };
        }
    });
    // Fill the last empty column in KPI row if any
    kpiRow.getCell(13).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF162032' } };

    // Row 4: Accent Divider
    const dividerRow = worksheet.getRow(4);
    dividerRow.height = 6;
    for (let i = 1; i <= 13; i++) {
        dividerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E88E5' } };
    }

    // Row 5: Headers
    const headerRow = worksheet.getRow(5);
    headerRow.height = 36;
    headerRow.values = [
        'Receipt No.', 'Posted', 'Salesman', 'Customer', 'Receipt Date', 
        'Dispatch Date', 'Status', 'Payment', 'Gross Amount', 
        'Credits', 'Returns', 'Debits', 'Balance'
    ];
    headerRow.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A4A' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FF0D1B2A' } },
            left: { style: 'thin', color: { argb: 'FF0D1B2A' } },
            bottom: { style: 'thin', color: { argb: 'FF0D1B2A' } },
            right: { style: 'thin', color: { argb: 'FF0D1B2A' } }
        };
    });

    // Row 6+: Data Rows
    data.forEach((item, index) => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const isPosted = ((item.isPosted as any) === true || (item.isPosted as any) === 1 || (item.isPosted as any) === "1" || 
                        ((item as any).is_posted === true || (item as any).is_posted === 1 || (item as any).is_posted === "1") ||
                        (item.isPosted && typeof item.isPosted === 'object' && 'data' in (item.isPosted as any) && (item.isPosted as any).data[0] === 1));
        /* eslint-enable @typescript-eslint/no-explicit-any */

        const row = worksheet.addRow({
            invoice_no: item.invoice_no,
            posted: isPosted ? 'YES' : 'NO',
            salesman: item.salesman_name || 'N/A',
            customer: item.customer_name || 'N/A',
            date: formatDate(item.invoice_date),
            dispatch: formatDate(item.dispatch_date),
            status: item.transaction_status?.toUpperCase() || 'PREPARED',
            payment: item.payment_status?.toUpperCase() || 'UNPAID',
            gross: Number(item.net_amount || 0),
            credits: Number(item.credits || 0),
            returns: Number(item.returns || 0),
            debits: Number(item.debits || 0),
            balance: Number(item.balance || 0),
        });

        row.height = 22;
        const rowColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFE3F2FD';
        
        row.eachCell((cell, colNumber) => {
            cell.font = { name: 'Calibri', size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } };
            cell.border = { bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } } };
            
            // Default Alignments
            if (colNumber === 3 || colNumber === 4) cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
            else if (colNumber >= 9) cell.alignment = { horizontal: 'right', vertical: 'middle' };
            else cell.alignment = { horizontal: 'center', vertical: 'middle' };

            // Number Formatting
            if (colNumber >= 9) {
                cell.numFmt = '₱#,##0.00';
            }
        });

        // Badge-Style Conditional Formatting
        // Posted
        const postedCell = row.getCell(2);
        if (postedCell.value === 'YES') {
            postedCell.font = { color: { argb: 'FF1B5E20' }, bold: true };
            postedCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
        } else {
            postedCell.font = { color: { argb: 'FFB71C1C' }, bold: true };
            postedCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } };
        }

        // Status
        const statusCell = row.getCell(7);
        const statusVal = String(statusCell.value);
        if (statusVal === 'DELIVERED') {
            statusCell.font = { color: { argb: 'FF1B5E20' }, bold: true };
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
        } else if (statusVal === 'DISPATCHED') {
            statusCell.font = { color: { argb: 'FF006064' }, bold: true };
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2F1' } };
        } else if (statusVal === 'CANCELLED') {
            statusCell.font = { color: { argb: 'FFB71C1C' }, bold: true };
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } };
        } else if (statusVal === 'PREPARED') {
            statusCell.font = { color: { argb: 'FFE65100' }, bold: true };
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
        }

        // Payment
        const paymentCell = row.getCell(8);
        if (paymentCell.value === 'PAID') {
            paymentCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            paymentCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };
        } else {
            paymentCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            paymentCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC62828' } };
        }

        // Balance high-value alert
        const balanceCell = row.getCell(13);
        if (Number(item.balance || 0) > 50000) {
            balanceCell.font = { color: { argb: 'FF4A148C' }, bold: true };
            balanceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E5F5' } };
        }
    });

    // Grand Totals Row
    const totalRow = worksheet.addRow({
        invoice_no: '▶  GRAND TOTALS',
        gross: { formula: `SUM(I6:I${worksheet.lastRow?.number})` },
        credits: { formula: `SUM(J6:J${worksheet.lastRow?.number})` },
        returns: { formula: `SUM(K6:K${worksheet.lastRow?.number})` },
        debits: { formula: `SUM(L6:L${worksheet.lastRow?.number})` },
        balance: { formula: `SUM(M6:M${worksheet.lastRow?.number})` },
    });
    worksheet.mergeCells(`A${totalRow.number}:H${totalRow.number}`);
    
    totalRow.height = 28;
    totalRow.eachCell((cell) => {
        cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFD700' } }; // Gold
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1B2A' } };
        cell.border = { top: { style: 'medium', color: { argb: 'FF1E88E5' } } };
        if (cell.type === 6 /* ExcelJS.ValueType.Formula */) {
            cell.numFmt = '₱#,##0.00';
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        }
    });

    // Finalize
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${fileName}.xlsx`);
};

export const exportToPDF = async (
    data: SalesInvoiceHeader[], 
    fileName: string, 
    filters: WorklistFilters, 
    stats: SiteSalesSummaryStats,
    companyData: Record<string, unknown> | null,
    templateName: string = "Standard Layout",
    orientation: "landscape" | "portrait" = "landscape"
) => {
    // 1. Fetch template config to get paper size (but we use our own orientation)
    const templates = await pdfTemplateService.fetchTemplates();
    const template = templates.find(t => t.name === templateName);
    const config = (template?.config || {}) as PdfConfig;

    // 2. Initialize jsPDF with linked orientation and paper size
    const unit = 'mm';
    let pdfFormat: string | [number, number] = orientation === 'landscape' ? 'legal' : 'a4';
    
    // Override if template has a custom size
    if (config?.paperSize?.toLowerCase() === 'custom' && config?.customSize) {
        pdfFormat = [config.customSize.width, config.customSize.height];
    }
    
    const doc = new jsPDF({ orientation, unit, format: pdfFormat });

    // 3. Apply the Template Frame (Header/Footer)
    const startY = await PdfEngine.applyTemplate(doc, templateName, companyData as PdfData);

    // 4. Render Body
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margins = config.margins || { top: 10, bottom: 10, left: 10, right: 10 };

    // Subtitle / Filters (Just below the template header)
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    const dateRange = (filters.startDate && filters.endDate) 
        ? `${formatDate(filters.startDate)} to ${formatDate(filters.endDate)}`
        : 'All Dates';
    
    doc.text(`REPORT: SITE SALES SUMMARY`, margins.left, startY);
    doc.text(`Date Range: ${dateRange}`, margins.left, startY + 5);
    doc.text(`Generated on: ${format(new Date(), "MM/dd/yyyy hh:mm a")}`, pageWidth - margins.right, startY + 5, { align: 'right' });

    // Table
    const tableColumn = [
        "Receipt No.", 
        "Salesman", 
        "Customer", 
        "Date", 
        "Status", 
        "Gross", 
        "Credits", 
        "Returns", 
        "Debits", 
        "Balance"
    ];
    
    const tableRows = data.map(item => [
        String(item.invoice_no || ""),
        String(item.salesman_name || 'N/A'),
        String(item.customer_name || 'N/A'),
        formatDate(item.invoice_date),
        String(item.transaction_status?.toUpperCase() || 'PREPARED'),
        formatCurrency(Number(item.net_amount || 0)),
        formatCurrency(Number(item.credits || 0)),
        formatCurrency(Number(item.returns || 0)),
        formatCurrency(Number(item.debits || 0)),
        formatCurrency(Number(item.balance || 0)),
    ]);

    const isLandscape = orientation === 'landscape';
    
    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: startY + 10,
        theme: 'grid',
        headStyles: { 
            fillColor: [30, 41, 59], 
            textColor: 255, 
            fontSize: isLandscape ? 8.5 : 7.5, 
            fontStyle: 'bold', 
            halign: 'center',
            lineColor: [226, 232, 240],
            lineWidth: 0.1
        },
        bodyStyles: { 
            fontSize: isLandscape ? 7.5 : 7, 
            textColor: 50,
            lineColor: [226, 232, 240], // Slate 200
            lineWidth: 0.1
        },
        columnStyles: {
            0: { cellWidth: isLandscape ? 40 : 22 }, // Receipt No.
            1: { cellWidth: isLandscape ? 40 : 25 }, // Salesman
            2: { cellWidth: 'auto' }, // Customer (Flexible)
            3: { cellWidth: isLandscape ? 25 : 16, halign: 'center' }, // Date
            4: { cellWidth: isLandscape ? 30 : 18, halign: 'center' }, // Status
            5: { cellWidth: isLandscape ? 22 : 16, halign: 'right' }, // Gross
            6: { cellWidth: isLandscape ? 22 : 16, halign: 'right' }, // Credits
            7: { cellWidth: isLandscape ? 22 : 16, halign: 'right' }, // Returns
            8: { cellWidth: isLandscape ? 22 : 16, halign: 'right' }, // Debits
            9: { cellWidth: isLandscape ? 28 : 20, halign: 'right', fontStyle: 'bold' }, // Balance
        },
        // Use small top margin for subsequent pages (header only on first page)
        margin: { ...margins, top: 15 }, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        didDrawPage: (_data) => {
            // Add page number at the bottom of every page
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const totalPages = (doc as any).internal.getNumberOfPages();
            const str = "Page " + totalPages;
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(str, pageWidth - margins.right, pageHeight - 10, { align: 'right' });
        }
    });

    // Summary Section at the end
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finalY = (doc as any).lastAutoTable.finalY + 15;
    
    // Check for page overflow
    if (finalY + 60 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        finalY = margins.top + 10;
    }

    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text('REMITTANCE SUMMARY', margins.left, finalY);

    const summaryData = [
        ['Total Gross Amount', formatCurrency(stats.totalGross)],
        ['Total Credits Applied', formatCurrency(stats.totalCredits)],
        ['Total Returns Applied', formatCurrency(stats.totalReturns)],
        ['Total Debits Applied', formatCurrency(stats.totalDebits)],
        ['TOTAL REMITTANCE BALANCE', formatCurrency(stats.totalBalance)],
    ];

    autoTable(doc, {
        body: summaryData,
        startY: finalY + 5,
        theme: 'grid',
        styles: { 
            fontSize: 11, 
            cellPadding: 5, 
            textColor: 30,
            lineColor: [203, 213, 225], 
            lineWidth: 0.1,
        },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 80 },
            1: { halign: 'right', fontStyle: 'bold', cellWidth: 60 },
        },
        margin: { left: margins.left },
        tableWidth: 140
    });

    // 5. Draw page numbers over all pages (using the global helper)
    if (config?.pageNumber?.show) {
        drawPageNumbers(doc, config);
    }

    return doc;
};
