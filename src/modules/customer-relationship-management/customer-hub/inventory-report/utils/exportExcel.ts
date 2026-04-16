import * as XLSX from "xlsx";

/**
 * Export an array of records to an Excel file using a stable column order.
 * If the common inventory export columns exist they will be placed first
 * in the order: Product, Status, Available, Current, Allocated, Inbound, Projected, Category
 * Any additional keys found across rows will be appended after these.
 */
export function exportToExcel(
  rows: Array<Record<string, unknown>>,
  filename = "inventory-report.xlsx",
  opts?: { filters?: unknown },
) {
  const preferredOrder = [
    "Product",
    "Available",
    "Current",
    "Allocated",
    "Inbound",
    "Projected",
    "Unit",
    "Brand",
    "Category",
    "Branch",
    "Supplier",
  ];

  // Collect all keys present in the data
  const allKeys = new Set<string>();
  for (const r of rows) Object.keys(r || {}).forEach((k) => allKeys.add(k));

  // Build final column order: preferred keys first (if present), then remaining keys sorted
  const preferredPresent = preferredOrder.filter((k) => allKeys.has(k));
  const remaining = Array.from(allKeys).filter(
    (k) => !preferredPresent.includes(k),
  );
  // keep remaining stable by sorting alphabetically
  remaining.sort((a, b) => a.localeCompare(b));
  const finalOrder = [...preferredPresent, ...remaining];

  // Determine if a category filter is active in the provided filters. If the
  // user has filtered by category we can omit the Category column from the
  // exported sheet because every row will belong to that category.
  const filtersObj = opts?.filters as Record<string, unknown> | undefined;
  let categoryFilterActive = false;
  if (filtersObj && filtersObj.category !== undefined && filtersObj.category !== null) {
    const cf = filtersObj.category;
    if (Array.isArray(cf)) {
      categoryFilterActive = cf.length > 0 && !cf.map(String).includes("All");
    } else {
      const s = String(cf).trim().toLowerCase();
      categoryFilterActive = s !== "" && s !== "all";
    }
  }

  const finalOrderToUse = categoryFilterActive
    ? finalOrder.filter((k) => String(k).toLowerCase() !== "category")
    : finalOrder;

  // Normalize rows to objects that only contain finalOrder keys (ensures consistent columns)
  const data = rows.map((r) => {
    const out: Record<string, string | number | boolean | null> = {};
    for (const k of finalOrder) {
      const v = r ? (r as Record<string, unknown>)[k] : undefined;
      if (v === null || v === undefined) {
        out[k] = null;
      } else if (typeof v === "object") {
        try {
          out[k] = JSON.stringify(v);
        } catch {
          out[k] = String(v);
        }
      } else if (typeof v === "number" || typeof v === "boolean") {
        out[k] = v as number | boolean;
      } else {
        out[k] = String(v);
      }
    }
    return out;
  });

  // Build an array-of-arrays so we can inject metadata rows at the top of the
  // Inventory sheet (so active filters are visible when the sheet is opened).
  const rowsAoA: Array<Array<unknown>> = [];

  // If filters provided, push a vertical list of the filters so the Inventory
  // sheet will show each active filter on its own row (like the user's
  // reference screenshot). Leave a blank spacer row before the header.
  if (opts?.filters) {
    rowsAoA.push(["Filters:"]);
    for (const [k, v] of Object.entries(opts.filters)) {
      rowsAoA.push([
        `${k} = ${Array.isArray(v) ? v.join(", ") : String(v ?? "All")}`,
      ]);
    }
    // blank spacer row
    rowsAoA.push([]);
  }

  // header row
  rowsAoA.push(finalOrderToUse);

  // data rows
  for (const r of data) {
    const rowArr = finalOrderToUse.map((k) => {
      const v = (r as Record<string, unknown>)[k];
      if (v === null || v === undefined) return null;
      return typeof v === "object" ? JSON.stringify(v) : v;
    });
    rowsAoA.push(rowArr as Array<unknown>);
  }

  const ws = XLSX.utils.aoa_to_sheet(rowsAoA);
  const sheet = ws as unknown as Record<string, unknown>;

  // No merges required when filters are displayed vertically.

  // set sensible column widths: product wide, category medium, numeric columns narrower
  const colWidths = finalOrderToUse.map((k) => {
    const key = String(k).toLowerCase();
    if (key.includes("product")) return { wch: 50 };
    if (key === "status") return { wch: 20 };
    if (
      ["available", "current", "allocated", "inbound", "projected"].includes(
        String(k).toLowerCase(),
      )
    )
      return { wch: 12 };
    if (key.includes("category") || key === "brand" || key === "supplier")
      return { wch: 30 };
    if (key === "unit" || key === "branch") return { wch: 20 };
    return { wch: 15 };
  });
  sheet["!cols"] = colWidths;

  // Ensure the sheet is set to fit to page width when printing / exporting PDF
  // from Excel: set pageSetup to fitToWidth:1. This helps when users choose
  // "Fit Sheet on One Page" or print; Excel respects this value.
  sheet["!pageSetup"] = {
    fitToWidth: 1,
    fitToHeight: 1,
    orientation: "landscape",
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");

  // if filters provided, add a Filters sheet with key/value rows
  if (opts?.filters) {
    const entries = Object.entries(opts.filters).map(([k, v]) => [
      k,
      Array.isArray(v) ? v.join(", ") : String(v ?? ""),
    ]);
    const filterSheet = XLSX.utils.aoa_to_sheet([
      ["Filter", "Value"],
      ...entries,
    ]);
    const fSheet = filterSheet as unknown as Record<string, unknown>;
    fSheet["!cols"] = [{ wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, filterSheet, "Filters");
  }

  XLSX.writeFile(wb, filename);
}

export default exportToExcel;
