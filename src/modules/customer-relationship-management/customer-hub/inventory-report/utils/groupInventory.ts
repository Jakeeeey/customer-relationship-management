// src/modules/customer-relationship-management/customer-hub/inventory-report/utils/groupInventory.ts
//
// Shared grouping + analysis logic used by both InventoryReportTable (display)
// and the export utilities (Excel / PDF). Keeping it here ensures the numbers
// shown in the table always match what gets exported.

import type { InventoryRow } from "../type";

// ---------------------------------------------------------------------------
// Primitive helpers
// ---------------------------------------------------------------------------

export function getString(r: InventoryRow, keys: string[]): string {
  for (const k of keys) {
    const v = (r as Record<string, unknown>)[k];
    if (v == null) continue;
    if (typeof v === "string" || typeof v === "number") return String(v).trim();
    // shallow nested object – try common label keys
    if (typeof v === "object") {
      const obj = v as Record<string, unknown>;
      for (const lk of [
        "product_description",
        "productDescription",
        "name",
        "label",
        "value",
        "text",
        "description",
      ]) {
        const cand = obj[lk];
        if (cand != null && (typeof cand === "string" || typeof cand === "number")) {
          const s = String(cand).trim();
          if (s) return s;
        }
      }
    }
  }
  return "";
}

export function getNumber(r: InventoryRow, keys: string[]): number {
  for (const k of keys) {
    const v = (r as Record<string, unknown>)[k];
    if (v == null) continue;
    const n = Number(v);
    if (!Number.isNaN(n) && Number.isFinite(n)) return n;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Unit helpers
// ---------------------------------------------------------------------------

export function getUnitLabel(r: InventoryRow): string {
  const row = r as Record<string, unknown>;
  const directKeys = [
    "unit",
    "uom",
    "unit_of_measurement",
    "unitOfMeasurement",
    "uom_name",
    "unit_name",
    "unitName",
  ];

  for (const k of directKeys) {
    const v = row[k];
    if (v == null) continue;
    if (typeof v === "string" || typeof v === "number") {
      const s = String(v).trim();
      if (s) return s;
    }
  }

  // nested object fallback
  for (const k of directKeys) {
    const v = row[k];
    if (v == null || typeof v !== "object") continue;
    const obj = v as Record<string, unknown>;
    for (const lk of [
      "unit_name",
      "unitName",
      "uom_name",
      "uom",
      "name",
      "label",
      "abbreviation",
      "short_name",
      "shortName",
      "description",
      "unit_of_measurement",
      "unitOfMeasurement",
      "value",
    ]) {
      const cand = obj[lk];
      if (cand != null && (typeof cand === "string" || typeof cand === "number")) {
        const s = String(cand).trim();
        if (s) return s;
      }
    }
  }

  return "";
}

export function normalizeUnitType(u?: unknown): "box" | "pack" | "pcs" | "other" {
  if (!u) return "other";
  const s = String(u).toLowerCase();
  if (s.includes("box")) return "box";
  if (s.includes("pack")) return "pack";
  if (s.includes("pcs") || s.includes("piece") || s === "pc") return "pcs";
  return "other";
}

// ---------------------------------------------------------------------------
// Per-product analysis  (mirrors analyzeGroup in InventoryReportTable)
// ---------------------------------------------------------------------------

export interface UnitInfo {
  unit: string;
  unitType: "box" | "pack" | "pcs" | "other";
  unitCount: number;
  rawCurrent: number;
  rawAllocated: number;
  rawInbound: number;
  costPerUnit: number;
}

export interface GroupAnalysis {
  totalPiecesCurrent: number;
  totalPiecesAllocated: number;
  totalPiecesInbound: number;
  boxUnitCount: number;
  costPerBox: number;
  boxesCurrent: number;
  boxesAllocated: number;
  boxesInbound: number;
  availableBoxes: number;
  projectedBoxes: number;
  unitInfo: UnitInfo[];
}

export function analyzeGroup(items: InventoryRow[]): GroupAnalysis {
  let totalPiecesCurrent = 0;
  let totalPiecesAllocated = 0;
  let totalPiecesInbound = 0;

  const unitInfoRaw: UnitInfo[] = [];

  for (const r of items) {
    const unit = getUnitLabel(r).trim();
    const unitType = normalizeUnitType(unit);
    const unitCount = getNumber(r, ["unitCount", "unit_count", "unitcount"]) || 1;

    const rawCurrent = getNumber(r, ["current", "onhand", "on_hand", "onHand", "quantity", "qty"]);
    const rawAllocated = getNumber(r, ["allocated", "allocated_qty", "allocatedQuantity", "current_allocated"]);
    // NOTE: "inbound" quantity lives under inboxProjected/inbox_projected keys from the API.
    // The table uses "projected" key for what is labelled "INBOUND" in the UI.
    const rawInbound = getNumber(r, ["projected", "inboxProjected", "inbox_projected", "inbox", "inbound"]);
    const costPerUnit = getNumber(r, ["costPerUnit", "cost_per_unit", "price"]);

    unitInfoRaw.push({ unit, unitType, unitCount, rawCurrent, rawAllocated, rawInbound, costPerUnit });

    totalPiecesCurrent += rawCurrent * unitCount;
    totalPiecesAllocated += rawAllocated * unitCount;
    totalPiecesInbound += rawInbound * unitCount;
  }

  // Aggregate by unit label + unitCount to avoid duplicate unit rows
  const agg = new Map<string, UnitInfo>();

  for (const u of unitInfoRaw) {
    const key = `${(u.unit || "unit").toLowerCase().trim()}::${Math.max(1, u.unitCount)}`;
    const existing = agg.get(key);

    if (!existing) {
      agg.set(key, { ...u });
      continue;
    }

    const existingPieces = existing.rawCurrent * existing.unitCount;
    const newPieces = u.rawCurrent * u.unitCount;
    let mergedCost = existing.costPerUnit || u.costPerUnit || 0;
    if (existing.costPerUnit > 0 && u.costPerUnit > 0) {
      const totalWeight = existingPieces + newPieces;
      mergedCost =
        totalWeight > 0
          ? (existing.costPerUnit * existingPieces + u.costPerUnit * newPieces) / totalWeight
          : existing.costPerUnit;
    }

    agg.set(key, {
      unit: existing.unit || u.unit,
      unitType: existing.unitType || u.unitType,
      unitCount: Math.max(existing.unitCount, u.unitCount),
      rawCurrent: existing.rawCurrent + u.rawCurrent,
      rawAllocated: existing.rawAllocated + u.rawAllocated,
      rawInbound: existing.rawInbound + u.rawInbound,
      costPerUnit: mergedCost,
    });
  }

  const unitInfo = Array.from(agg.values());

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

// ---------------------------------------------------------------------------
// Product grouping  (mirrors the `groups` memo in InventoryReportTable)
// ---------------------------------------------------------------------------

export interface ProductGroup {
  key: string;
  items: InventoryRow[];
  analysis: GroupAnalysis;
  productName: string;
  brand: string;
  category: string;
  branch: string;
  supplier: string;
  unit: string;
}

function canonical(s: string): string {
  return s
    ? s
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
    : "";
}

export function groupInventoryRows(rows: InventoryRow[]): ProductGroup[] {
  const m = new Map<string, InventoryRow[]>();

  for (const r of rows) {
    const name =
      getString(r, ["productDescription", "product_description"]) ||
      getString(r, ["product_name", "productName", "name", "item"]);
    const code = getString(r, ["productCode", "product_code", "code", "sku"]);
    const id = getString(r, ["productId", "product_id", "id"]);

    let skuKeySource = name || code || id || JSON.stringify(r).slice(0, 64);
    skuKeySource = String(skuKeySource).trim();
    const skuKey = canonical(skuKeySource) || skuKeySource;

    const arr = m.get(skuKey) ?? [];
    arr.push(r);
    m.set(skuKey, arr);
  }

  return Array.from(m.entries()).map(([key, items]) => {
    const first = items[0];
    const analysis = analyzeGroup(items);
    return {
      key,
      items,
      analysis,
      productName:
        getString(first, [
          "productDescription",
          "product_description",
          "product_name",
          "productName",
          "name",
          "item",
        ]),
      brand: getString(first, ["brand", "brand_name", "brandName"]),
      category: getString(first, ["category", "category_name"]),
      branch: getString(first, ["branch", "branch_name"]),
      supplier: getString(first, ["supplier", "supplier_name", "supplier_shortcut"]),
      unit: getUnitLabel(first),
    };
  });
}

// ---------------------------------------------------------------------------
// Formatting helpers shared by table + exporters
// ---------------------------------------------------------------------------

/** Render a box/pack quantity: up to 4 decimal places, trailing zeros stripped */
export function formatBoxQty(v: number): string {
  if (!Number.isFinite(v)) return "0";
  const fixed = v.toFixed(4);
  const n = parseFloat(fixed);
  return Number.isNaN(n) ? "0" : n.toString();
}