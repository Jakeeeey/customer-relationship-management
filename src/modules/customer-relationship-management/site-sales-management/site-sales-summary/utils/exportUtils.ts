import * as XLSX from 'xlsx';
import autoTable from 'jspdf-autotable';
import { format, isValid, parseISO } from 'date-fns';
import { SalesInvoiceHeader, WorklistFilters, SiteSalesSummaryStats } from '../types';
import { PdfEngine } from '@/components/pdf-layout-design/PdfEngine';

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const exportToExcel = (data: SalesInvoiceHeader[], fileName: string, _filters: WorklistFilters) => {
    const worksheetData = data.map(item => ({
        'Receipt No.': item.invoice_no,
        'Salesman': item.salesman_name || 'N/A',
        'Customer': item.customer_name || 'N/A',
        'Receipt Date': formatDate(item.invoice_date),
        'Dispatch Date': formatDate(item.dispatch_date),
        'Status': item.transaction_status?.toUpperCase() || 'PREPARED',
        'Payment': item.payment_status?.toUpperCase() || 'UNPAID',
        'Gross Amount': Number(item.net_amount || 0),
        'Credits': Number(item.credits || 0),
        'Returns': Number(item.returns || 0),
        'Debits': Number(item.debits || 0),
        'Balance': Number(item.balance || 0),
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);

    // Add filter info as a separate sheet or at the top if needed
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Site Sales Summary');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
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
    // We pass the orientation to PdfEngine.generateWithFrame
    const doc = await PdfEngine.generateWithFrame(templateName, companyData, async (doc, startY, config) => {
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
    }, orientation);

    return doc;
};
