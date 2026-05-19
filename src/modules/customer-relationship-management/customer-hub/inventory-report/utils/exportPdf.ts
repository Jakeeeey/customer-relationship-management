// src/modules/customer-relationship-management/customer-hub/inventory-report/utils/exportPdf.ts
import autoTable from "jspdf-autotable";
import type { Styles, HAlignType } from "jspdf-autotable";
import { PdfEngine } from "@/components/pdf-layout-design/PdfEngine";
import { PAPER_SIZES } from "@/components/pdf-layout-design/constants";
import {
  pdfTemplateService,
  type PdfTemplate,
} from "@/components/pdf-layout-design/services/pdf-template";
import { groupInventoryRows } from "./groupInventory";
import type { InventoryFilters, InventoryRow } from "../type";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(Number(value) || 0);
}

function formatDateTime(value: Date): string {
  return value.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type CompanyData = Record<string, unknown>;

async function fetchCompanyData(): Promise<CompanyData | null> {
  try {
    const res = await fetch("/api/pdf/company", { credentials: "include" });
    if (!res.ok) return null;
    const result = (await res.json()) as { data?: CompanyData[] | CompanyData };
    if (Array.isArray(result.data)) return result.data[0] ?? null;
    return result.data ?? null;
  } catch {
    return null;
  }
}

function normalizeFilterValue(
  value: string | string[] | undefined,
): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const normalized = value
      .map((v) => String(v).trim())
      .filter((v) => v.length > 0 && v.toLowerCase() !== "all");
    return normalized.length > 0 ? normalized.join(", ") : null;
  }
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toLowerCase() === "all") return null;
  return trimmed;
}

function buildActiveFiltersText(filters?: InventoryFilters): string {
  if (!filters) return "All";
  const entries: string[] = [];
  const branch = normalizeFilterValue(filters.branch);
  if (branch) entries.push(`Branch: ${branch}`);
  const supplier = normalizeFilterValue(filters.supplier);
  if (supplier) entries.push(`Supplier: ${supplier}`);
  const category = normalizeFilterValue(filters.category);
  if (category) entries.push(`Category: ${category}`);
  const brand = normalizeFilterValue(filters.brand);
  if (brand) entries.push(`Brand: ${brand}`);
  const product = normalizeFilterValue(filters.product);
  if (product) entries.push(`Product: ${product}`);
  const current = normalizeFilterValue(filters.current);
  if (current) entries.push(`Current: ${current}`);
  return entries.length > 0 ? entries.join("\n") : "All";
}

const TEMPLATE_NAME = "Legal - Landscape";

function resolveTemplateName(templates: PdfTemplate[]): string {
  const exact = templates.find((t) => t.name === TEMPLATE_NAME);
  if (exact) return exact.name;
  const ci = templates.find(
    (t) => t.name.toLowerCase() === TEMPLATE_NAME.toLowerCase(),
  );
  if (ci) return ci.name;
  const byConfig = templates.find(
    (t) =>
      t.config?.paperSize === "Legal" && t.config?.orientation === "landscape",
  );
  if (byConfig) return byConfig.name;
  return TEMPLATE_NAME;
}

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------

export default async function exportInventoryReportPdf(
  rows: InventoryRow[],
  fileNameIn?: string,
  filters?: InventoryFilters,
  generatedBy?: string,
): Promise<void> {
  const now = new Date();
  const generatedDate = formatDateTime(now);
  const activeFiltersText = buildActiveFiltersText(filters);
  const fileName = fileNameIn?.endsWith(".pdf")
    ? fileNameIn
    : `${fileNameIn || `inventory-report-${now.toISOString().slice(0, 10)}`}.pdf`;

  // -------------------------------------------------------------------------
  // Group rows the same way the table does
  // -------------------------------------------------------------------------
  const groups = groupInventoryRows(rows);

  // -------------------------------------------------------------------------
  // Determine which columns to show (same filter-hide logic as before)
  // -------------------------------------------------------------------------
  const hasBranchFilter = normalizeFilterValue(filters?.branch) !== null;
  const hasSupplierFilter = normalizeFilterValue(filters?.supplier) !== null;
  const hasCategoryFilter = normalizeFilterValue(filters?.category) !== null;
  const hasBrandFilter = normalizeFilterValue(filters?.brand) !== null;

  const showBranch = !hasBranchFilter;
  const showSupplier = !hasSupplierFilter;
  const showCategory = !hasCategoryFilter;
  const showUnit = !hasBrandFilter;

  const columns: string[] = ["product"];
  if (showUnit) columns.push("unit");
  if (showBranch) columns.push("branch");
  if (showSupplier) columns.push("supplier");
  if (showCategory) columns.push("category");
  columns.push("available", "current", "allocated", "projected", "inbound");

  // -------------------------------------------------------------------------
  // Build table body from grouped+converted values
  // -------------------------------------------------------------------------
  let totalCurrent = 0;
  let totalAllocated = 0;
  let totalInbound = 0;
  let totalProjected = 0;

  const tableBody: string[][] = groups.map((g) => {
    const a = g.analysis;

    // Accumulate totals using the same box-converted values
    totalCurrent += a.boxesCurrent;
    totalAllocated += a.boxesAllocated;
    totalInbound += a.boxesInbound;
    totalProjected += a.projectedBoxes;

    const rowCells: string[] = [];
    rowCells.push(g.productName || "-");
    if (showUnit) rowCells.push(g.unit || "-");
    if (showBranch) rowCells.push(g.branch || "-");
    if (showSupplier) rowCells.push(g.supplier || "-");
    if (showCategory) rowCells.push(g.category || "-");

    // Numeric columns — box-converted, formatted to 4dp
    rowCells.push(
      formatNumber(a.availableBoxes), // available
      formatNumber(a.boxesCurrent), // current
      formatNumber(a.boxesAllocated), // allocated
      formatNumber(a.projectedBoxes), // projected
      formatNumber(a.boxesInbound), // inbound
    );

    return rowCells;
  });

  if (tableBody.length === 0) {
    tableBody.push(
      columns.map((c) =>
        ["available", "current", "allocated", "projected", "inbound"].includes(
          c,
        )
          ? "0"
          : "-",
      ),
    );
  }

  const totalAvailable = totalCurrent - totalAllocated;

  // -------------------------------------------------------------------------
  // Fetch company data + template, then render PDF
  // -------------------------------------------------------------------------
  const [companyData, templates] = await Promise.all([
    fetchCompanyData(),
    pdfTemplateService.fetchTemplates(),
  ]);

  const templateName = resolveTemplateName(templates);

  const doc = await PdfEngine.generateWithFrame(
    templateName,
    companyData,
    (pdf, startY, config) => {
      const margins = config.margins || {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10,
      };
      const pageWidth = pdf.internal.pageSize.getWidth();
      const usableWidth = pageWidth - margins.left - margins.right;

      const baseSize =
        config.paperSize === "Custom"
          ? config.customSize
          : PAPER_SIZES[config.paperSize] || PAPER_SIZES.Legal;

      const paperHeight =
        config.orientation === "landscape" ? baseSize.width : baseSize.height;
      const bottomMargin = config.bodyEnd
        ? paperHeight - config.bodyEnd
        : margins.bottom;

      let y = startY;

      // Title
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(20, 20, 20);
      pdf.text("Inventory Report", pageWidth / 2, y, {
        align: "center",
        baseline: "top",
      });

      y += 7;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(80, 80, 80);

      const leftX = margins.left;
      const rightX = margins.left + usableWidth;
      const lineH = 5;

      const filterLines = pdf.splitTextToSize(
        activeFiltersText,
        usableWidth * 0.6,
      );
      pdf.text(filterLines, leftX, y, { baseline: "top" });

      const generatedLines = [
        `Generated By: ${generatedBy}`,
        `Date: ${generatedDate}`,
      ];
      pdf.text(generatedLines, rightX, y, { align: "right", baseline: "top" });

      y +=
        lineH *
        Math.max(1, Math.max(filterLines.length, generatedLines.length));

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.4);
      pdf.setTextColor(20, 20, 20);
      // Row count = number of unique products after grouping
      pdf.text(`Total Products: ${groups.length}`, leftX, y, {
        baseline: "top",
      });

      y += 5;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.1);
      pdf.setTextColor(60, 60, 60);
      pdf.text(
        `Available: ${formatNumber(totalAvailable)}   Current: ${formatNumber(totalCurrent)}   Allocated: ${formatNumber(totalAllocated)}   Inbound: ${formatNumber(totalInbound)}   Projected: ${formatNumber(totalProjected)}`,
        leftX,
        y,
        { baseline: "top" },
      );

      const tableStartY = y + 10;

      // Column widths scaled to usable width
      const baseColWidths: Record<string, number> = {
        product: 80,
        unit: 20,
        branch: 35,
        supplier: 35,
        category: 30,
        available: 22,
        current: 22,
        allocated: 22,
        inbound: 22,
        projected: 22,
      };

      const baseSum = columns.reduce((s, c) => s + (baseColWidths[c] || 22), 0);
      const scale = usableWidth / baseSum;
      const scaledWidths = columns.map((c) =>
        Math.max(12, (baseColWidths[c] || 22) * scale),
      );

      // NOTE: "Inbound" and "Projected" header labels are intentionally swapped
      // here to match the UI column labelling convention.
      const headerLabelMap: Record<string, string> = {
        product: "Product",
        unit: "Unit",
        branch: "Branch",
        supplier: "Supplier",
        category: "Category",
        available: "Available",
        current: "Current",
        allocated: "Allocated",
        inbound: "Projected", // intentional label swap (matches UI)
        projected: "Unbound", // intentional label swap (matches UI)
      };

      const headRow = columns.map((c) => headerLabelMap[c] || c);

      const RIGHT_ALIGNED = new Set<string>([
        "available",
        "current",
        "allocated",
        "projected",
        "inbound",
      ]);

      const columnStyles: Record<number, Partial<Styles>> = {};

      columns.forEach((c, i) => {
        const align: HAlignType = RIGHT_ALIGNED.has(c) ? "right" : "left";

        columnStyles[i] = {
          cellWidth: scaledWidths[i],
          halign: align,
        };
      });
      autoTable(pdf, {
        startY: tableStartY,
        margin: { ...margins, bottom: bottomMargin },
        tableWidth: usableWidth,
        tableLineWidth: 0.2,
        tableLineColor: [0, 0, 0],
        head: [headRow],
        body: tableBody,
        theme: "striped",
        styles: {
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
          fontSize: 7.2,
          cellPadding: 1.5,
          valign: "top",
        },
        headStyles: {
          fillColor: [90, 90, 90],
          textColor: 255,
          fontSize: 7.6,
          fontStyle: "bold",
          halign: "left",
          valign: "middle",
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles,
      });
    },
  );

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
