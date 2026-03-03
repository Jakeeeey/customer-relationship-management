import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface GeneratePDFOptions {
    customer: any;
    supplier: any;
    products: any[];
}

export function generateCallSheetPDF({ customer, supplier, products }: GeneratePDFOptions) {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "A4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // Headers
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    const customerName = customer?.customer_name?.toUpperCase() || "CUSTOMER NAME";
    doc.text(customerName, 40, 40);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`CODE: ${customer?.customer_code || "N/A"}`, 40, 55);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("CALLSHEET PRINTABLE", pageWidth - 40, 40, { align: "right" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Date Printed: ${new Date().toLocaleString()}`, pageWidth - 40, 55, { align: "right" });

    // Supplier Title
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Supplier: ${supplier?.supplier_name || "Unknown"}`, 40, 85);

    // Prepare table data
    const tableHeaders: any[] = [
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
        let productName = p.product_name || p.description || "Unnamed Product";
        if (p.parent_product && p.parent_product.product_name) {
            productName += `\n(Parent: ${p.parent_product.product_name})`;
        }
        return [
            productName,
            "0.0", // MO AVG
            "", "", // Week 1
            "", "", // Week 2
            "", "", // Week 3
            "", "", // Week 4
            ""      // TOTAL
        ];
    });

    autoTable(doc, {
        startY: 95,
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
            1: { cellWidth: 40, halign: "center" as any },
            2: { halign: "center" as any },
            3: { halign: "center" as any },
            4: { halign: "center" as any },
            5: { halign: "center" as any },
            6: { halign: "center" as any },
            7: { halign: "center" as any },
            8: { halign: "center" as any },
            9: { halign: "center" as any },
            10: { cellWidth: 40, halign: "center" as any },
        },
        margin: { top: 40, right: 40, bottom: 40, left: 40 },
    });

    return doc;
}
