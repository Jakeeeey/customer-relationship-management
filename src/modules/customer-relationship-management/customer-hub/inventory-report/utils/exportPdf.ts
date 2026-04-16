import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { InventoryRow, InventoryFilters } from "../type";

function getString(r: InventoryRow, keys: string[]) {
  for (const k of keys) {
    const v = (r as Record<string, unknown>)[k];
    if (v == null) continue;
    return String(v);
  }
  return "";
}

function getNumber(r: InventoryRow, keys: string[]) {
  for (const k of keys) {
    const v = (r as Record<string, unknown>)[k];
    if (v == null) continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

function normalizeUnit(u?: unknown) {
  if (!u) return "other";
  const s = String(u).toLowerCase();
  if (s.includes("box")) return "box";
  if (s.includes("pack")) return "pack";
  if (s.includes("pcs") || s.includes("piece") || s === "pc") return "pcs";
  return "other";
}

function formatBoxes(v: number) {
  const fixed = Number.isFinite(v) ? v.toFixed(4) : "0.0000";
  let s = fixed.replace(/\.0+$|(?<=\.\d*?)0+$/g, (m) => (m === ".0" ? "" : ""));
  if (s === "") s = "0";
  return s;
}

function formatMoney(v: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(v));
  } catch {
    return Number(v).toFixed(2);
  }
}

function analyzeGroup(items: InventoryRow[]) {
  let totalPiecesCurrent = 0;
  let totalPiecesAllocated = 0;
  let totalPiecesInbound = 0;

  const unitInfo: {
    unit: string;
    unitType: string;
    unitCount: number;
    rawCurrent: number;
    rawAllocated: number;
    rawInbound: number;
    costPerUnit: number;
  }[] = [];

  for (const r of items) {
    const unit = getString(r, ["unit", "uom", "unit_of_measurement"]).trim();
    const unitType = normalizeUnit(unit || (r as Record<string, unknown>).unit);
    const unitCount =
      getNumber(r, ["unitCount", "unit_count", "unitcount"]) || 1;

    const rawCurrent =
      getNumber(r, [
        "current",
        "onhand",
        "on_hand",
        "onHand",
        "quantity",
        "qty",
      ]) || 0;
    const rawAllocated =
      getNumber(r, [
        "allocated",
        "allocated_qty",
        "allocatedQuantity",
        "current_allocated",
      ]) || 0;
    const rawInbound =
      getNumber(r, [
        "projected",
        "inboxProjected",
        "inbox_projected",
        "inbox",
        "inbound",
      ]) || 0;

    const costPerUnit =
      getNumber(r as InventoryRow, ["costPerUnit", "cost_per_unit", "price"]) ||
      0;

    unitInfo.push({
      unit,
      unitType,
      unitCount,
      rawCurrent,
      rawAllocated,
      rawInbound,
      costPerUnit,
    });

    totalPiecesCurrent += rawCurrent * unitCount;
    totalPiecesAllocated += rawAllocated * unitCount;
    totalPiecesInbound += rawInbound * unitCount;
  }

  const boxRow = unitInfo.find((u) => u.unitType === "box" && u.unitCount > 0);
  const boxUnitCount = boxRow
    ? boxRow.unitCount
    : unitInfo.reduce((acc, it) => Math.max(acc, it.unitCount), 1);

  let costPerBox = 0;
  if (boxRow && boxRow.costPerUnit > 0) costPerBox = boxRow.costPerUnit;
  else {
    const anyCost = unitInfo.find((u) => u.costPerUnit > 0);
    if (anyCost) costPerBox = anyCost.costPerUnit * boxUnitCount;
  }

  const boxesCurrent = totalPiecesCurrent / boxUnitCount;
  const boxesAllocated = totalPiecesAllocated / boxUnitCount;
  const boxesInbound = totalPiecesInbound / boxUnitCount;
  const availableBoxes = boxesCurrent - boxesAllocated;
  const projectedBoxes = boxesCurrent - boxesAllocated + boxesInbound;

  return {
    totalPiecesCurrent,
    totalPiecesAllocated,
    totalPiecesInbound,
    boxUnitCount,
    costPerBox,
    boxesCurrent,
    boxesAllocated,
    boxesInbound,
    availableBoxes,
    projectedBoxes,
    unitInfo,
  };
}

export default async function exportInventoryReportPdf(
  rows: InventoryRow[],
  filename = "inventory-report.pdf",
  filters?: InventoryFilters,
) {
  // group by product key
  const m = new Map<string, InventoryRow[]>();
  for (const r of rows) {
    const skuKey = (
      getString(r, ["productDescription", "product_description"]) ||
      getString(r, ["product_name", "productName", "name", "item"]) ||
      getString(r, ["productCode", "product_code", "code", "sku"]) ||
      String(getNumber(r as InventoryRow, ["productId", "id"])) ||
      JSON.stringify(r).slice(0, 64)
    ).trim();
    const arr = m.get(skuKey) ?? [];
    arr.push(r);
    m.set(skuKey, arr);
  }

  const groups = Array.from(m.entries()).map(([key, items]) => ({
    key,
    items,
  }));

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFontSize(14);
  doc.text("Inventory Report", 14, 14);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20);

  // Print active filters header (Branch, Supplier, Brand)
  const branchVal = filters?.branch
    ? Array.isArray(filters.branch)
      ? filters.branch.join(", ")
      : String(filters.branch)
    : "";
  const supplierVal = filters?.supplier
    ? Array.isArray(filters.supplier)
      ? filters.supplier.join(", ")
      : String(filters.supplier)
    : "";
  const brandVal = filters?.brand
    ? Array.isArray(filters.brand)
      ? filters.brand.join(", ")
      : String(filters.brand)
    : "";
  const category = filters?.category
    ? Array.isArray(filters.category)
      ? filters.category.join(", ")
      : String(filters.category)
    : "";

  const filterStartY = 26;
  doc.setFontSize(9);
  doc.text(`Branch: ${branchVal}`, 14, filterStartY);
  doc.text(`Supplier: ${supplierVal}`, 14, filterStartY + 6);
  doc.text(`Brand: ${brandVal}`, 14, filterStartY + 12);
  doc.text(`Category: ${category}`, 14, filterStartY + 18);

  // Determine whether the category filter is active. If so we omit the
  // Category column since every row will belong to the selected category.
  const categoryFilterActive = (() => {
    if (!filters?.category) return false;
    const c = filters.category;
    if (Array.isArray(c)) return c.length > 0 && !c.map(String).includes("All2");
    const s = String(c).trim().toLowerCase();
    return s !== "" && s !== "all1";
  })();

  const headCols = [
    "Product",
    "Available (Boxes)",
    "Current (Boxes)",
    "Allocated (Boxes)",
    "Inbound (Boxes)",
    "Projected (Boxes)",
  ];
  if (!categoryFilterActive) headCols.push("Category");
  headCols.push("Value");

  const head = [headCols];

  const body = groups.map((g) => {
    const items = g.items;
    const productName =
      getString(items[0], [
        "productDescription",
        "product_description",
        "product_name",
        "productName",
        "name",
        "item",
      ]) || g.key;
    const category = getString(items[0], ["category", "category_name"]) || "";
    const a = analyzeGroup(items);
    const value = (a.boxesCurrent / 1) * (a.costPerBox || 0);
    const row: Array<string | number> = [
      productName,
      formatBoxes(a.availableBoxes),
      formatBoxes(a.boxesCurrent),
      formatBoxes(a.boxesAllocated),
      formatBoxes(a.boxesInbound),
      formatBoxes(a.projectedBoxes),
    ];
    if (!categoryFilterActive) row.push(category);
    row.push(a.costPerBox ? formatMoney(value) : "None");
    return row;
  });

  // use autotable to render; shift startY down to make room for the filter header
  const startY = 30 + 20; // space for 4 filter lines
  const autoTableFn = autoTable as unknown as (
    d: jsPDF,
    opts: Record<string, unknown>,
  ) => void;
  autoTableFn(doc, {
    head,
    body,
    startY,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [245, 245, 245], textColor: [34, 34, 34] },

    theme: "grid",
  });

  doc.save(filename);
}
