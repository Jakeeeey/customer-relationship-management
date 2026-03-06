import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Customer, Supplier, Product, Salesman, Account } from "../hooks/useCallSheetForm";

interface GeneratePDFOptions {
    customer: Customer | null;
    supplier: Supplier | null;
    products: Product[];
    moAvgData?: Record<number, number>;
    salesman?: Salesman | null;
    account?: Account | null;
}

export function generateCallSheetPDF({ customer, supplier, products, salesman, account, moAvgData = {} }: GeneratePDFOptions) {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "A4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 40;

    // Headers
    doc.setFont("helvetica", "bold");

    // Right side: CALLSHEET PRINTABLE and Date
    doc.setFontSize(14);
    doc.text("CALLSHEET PRINTABLE", pageWidth - 40, currentY, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Date Printed: ${new Date().toLocaleString()}`, pageWidth - 40, currentY + 15, { align: "right" });

    doc.setTextColor(0);

    // Left side: CUSTOMER NAME (wrap text)
    doc.setFontSize(12); // smaller font size for customer
    doc.setFont("helvetica", "bold");
    const customerName = customer?.customer_name?.toUpperCase() || "CUSTOMER NAME";

    // Limit width so it doesn't overlap with the right side text (approx 200pt reserved for right side)
    const maxCustomerWidth = pageWidth - 40 - 200 - 40;
    const splitCustomerName = doc.splitTextToSize(customerName, maxCustomerWidth);
    doc.text(splitCustomerName, 40, currentY);

    // Adjust currentY based on how many lines the customer name took
    currentY += (splitCustomerName.length * 14) + 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`CODE: ${customer?.customer_code || "N/A"}`, 40, currentY);

    currentY += 15;

    // If we have Salesman / Account info, put it here
    if (salesman) {
        doc.setFontSize(9);
        doc.text(`Salesman: ${salesman.user_fname} ${salesman.user_lname}`, 40, currentY);
        currentY += 12;
    }

    if (account) {
        doc.setFontSize(9);
        doc.text(`Account: ${account.salesman_name} (${account.salesman_code})`, 40, currentY);
        currentY += 15;
    } else {
        currentY += 10;
    }

    // Supplier Title
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Supplier: ${supplier?.supplier_name || "Unknown"}`, 40, currentY);

    currentY += 10;

    // Prepare table data
    const tableHeaders: (string | Record<string, unknown>)[][] = [
        [{ content: "PRODUCTS", rowSpan: 2, styles: { halign: "left", valign: "middle" } },
        { content: "MO AVG", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "", colSpan: 2, styles: { halign: "center", minCellHeight: 15 } },
        { content: "", colSpan: 2, styles: { halign: "center" } },
        { content: "", colSpan: 2, styles: { halign: "center" } },
        { content: "", colSpan: 2, styles: { halign: "center" } },
        { content: "TOTAL", rowSpan: 2, styles: { halign: "center", valign: "middle" } }],
        [{ content: "Qty", styles: { halign: "center" } }, { content: "Inv", styles: { halign: "center" } },
        { content: "Qty", styles: { halign: "center" } }, { content: "Inv", styles: { halign: "center" } },
        { content: "Qty", styles: { halign: "center" } }, { content: "Inv", styles: { halign: "center" } },
        { content: "Qty", styles: { halign: "center" } }, { content: "Inv", styles: { halign: "center" } }]
    ];

    const tableBody = products.map((p) => {
        const productName = p.display_name || "Unnamed Product";
        const moAvg = (moAvgData[p.product_id] || 0.0).toFixed(2);
        return [
            productName,
            moAvg,
            "", "", // Week 1
            "", "", // Week 2
            "", "", // Week 3
            "", "", // Week 4
            ""      // TOTAL
        ];
    });

    autoTable(doc, {
        startY: currentY,
        head: tableHeaders,
        body: tableBody,
        theme: "grid",
        styles: {
            fontSize: 7,
            cellPadding: 3,
            textColor: [0, 0, 0],
            lineColor: [200, 200, 200],
            lineWidth: 0.5,
        },
        headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: "bold",
            lineWidth: 0.5,
            lineColor: [150, 150, 150]
        },
        columnStyles: {
            0: { cellWidth: 150 },
            1: { cellWidth: 40, halign: "center" as const },
            2: { halign: "center" as const },
            3: { halign: "center" as const },
            4: { halign: "center" as const },
            5: { halign: "center" as const },
            6: { halign: "center" as const },
            7: { halign: "center" as const },
            8: { halign: "center" as const },
            9: { halign: "center" as const },
            10: { cellWidth: 40, halign: "center" as const },
        },
        margin: { top: 40, right: 40, bottom: 40, left: 40 },
        didDrawPage: (data) => {
            // Render Page Numbers at the bottom
            const str = `Page ${(doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()}`;
            doc.setFontSize(8);
            doc.setTextColor(100);
            const pageSize = doc.internal.pageSize;
            const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
            doc.text(str, data.settings.margin.left, pageHeight - 20);
        }
    });

    return doc;
}
