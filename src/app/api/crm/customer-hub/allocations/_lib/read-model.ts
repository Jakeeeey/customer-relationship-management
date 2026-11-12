import "server-only";
import type { AllocationLine, AllocationOrder, AllocationSnapshot, LegacyAudit, ReportedInventory, Warehouse } from "@/modules/customer-relationship-management/customer-hub/sales-order-allocation/types";
import { quantity, quantityText } from "@/modules/customer-relationship-management/customer-hub/sales-order-allocation/domain/quantities";
import { canonicalUnit } from "@/modules/customer-relationship-management/customer-hub/sales-order-allocation/domain/units";
import { AllocationError, directusPage, readAll, requireWarehouse, type ReadContext, type RecordRow } from "./access";

export const READINESS_BLOCKERS = [
    "Spring running inventory does not expose authoritative active reservations, available-to-promise stock, base-UOM ownership rules or an inventory version.",
    "No audited transactional reservation/confirmation or idempotency endpoint is available. Confirmation and release are disabled.",
    "Legacy allocation quantities require reconciliation, and approval eligibility must be approved before reservations can begin.",
];

async function byValues<T>(collection: string, field: string, values: (string | number)[], fields: string, sort = "id") {
    const distinct = [...new Set(values)];
    const rows: T[] = [];
    for (let index = 0; index < distinct.length; index += 80) rows.push(...await readAll<T>(collection, { [field]: { _in: distinct.slice(index, index + 80) } }, fields, sort));
    return rows;
}

function validatedQuantity(value: unknown): string {
    if (typeof value !== "string" && typeof value !== "number") throw new AllocationError("INVALID_ORDER_QUANTITY", "Order quantities need reconciliation; no partial result was used", 503);
    try { return quantityText(quantity(value)); }
    catch { throw new AllocationError("INVALID_ORDER_QUANTITY", "Order quantities need reconciliation; no partial result was used", 503); }
}
function safeQuantity(value: unknown): string | null {
    if (typeof value !== "string" && typeof value !== "number") return null;
    try { return quantityText(quantity(value)); } catch { return null; }
}
async function reportedInventory(context: ReadContext, warehouse: Warehouse, orders: AllocationOrder[]): Promise<ReportedInventory[]> {
    const spring = process.env.SPRING_API_BASE_URL?.replace(/\/+$/, "");
    if (!spring) throw new Error("Inventory service is not configured");
    const now = new Date();
    const query = new URLSearchParams({ startDate: `${now.getUTCFullYear()}-01-01`, endDate: now.toISOString().slice(0, 10), branchName: warehouse.name });
    const response = await fetch(`${spring}/api/view-running-inventory-by-unit/all?${query}`, {
        headers: { Authorization: `Bearer ${context.sessionToken}`, Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error("Running inventory read is unavailable");
    const json = await response.json();
    const rows: RecordRow[] = Array.isArray(json) ? json : json?.data;
    if (!Array.isArray(rows) || rows.length > 50_000) throw new Error("Invalid or oversized inventory response");
    const result = new Map<string, ReportedInventory>();
    for (const row of rows) {
        // Do not trust an upstream branchName filter to enforce warehouse scope.
        if (Number(row.branchId) !== warehouse.id || !Number.isSafeInteger(row.productId) || Number(row.productId) <= 0) continue;
        const supplierId = row.supplierId == null ? null : Number(row.supplierId);
        const unit = canonicalUnit(String(row.unitName || "Unverified UOM"));
        const key = `${warehouse.id}:${row.productId}:${supplierId ?? "unknown"}:${unit}:${String(row.unitCount ?? "unknown")}`;
        if (result.has(key)) { result.get(key)!.ambiguous = true; result.get(key)!.reportedStock = null; continue; }
        let stock: string | null = null;
        try { stock = validatedQuantity(row.runningInventoryUnit); } catch { /* Unknown is not zero stock. */ }
        result.set(key, { key, productId: Number(row.productId), product: String(row.productName || `SKU ${row.productId}`), sku: String(row.productCode || row.productId),
            unit, supplierId, supplier: String(row.supplierShortcut || supplierId || "Unverified owner"), reportedStock: stock,
            reserved: null, availableToPromise: null, candidateDemand: "0", shortage: null, ambiguous: stock === null });
    }
    // Raw candidate demand is grouped by exact SKU and supplier, never summed across UOMs.
    const demand = new Map<string, { amount: bigint; line: AllocationLine; supplierId: number | null; supplier: string }>();
    for (const order of orders) for (const line of order.lines) {
        if (line.unaccountedDemand === null) continue;
        const key = `${line.productId}:${order.supplierId ?? "unknown"}`;
        const previous = demand.get(key);
        demand.set(key, { amount: (previous?.amount || 0n) + quantity(line.unaccountedDemand), line, supplierId: order.supplierId, supplier: order.supplier });
    }
    for (const [key, candidate] of demand) {
        const matches = [...result.values()].filter(row => `${row.productId}:${row.supplierId ?? "unknown"}` === key);
        if (matches.length === 1) matches[0].candidateDemand = quantityText(candidate.amount);
        else {
            const diagnosticKey = `demand:${warehouse.id}:${key}`;
            result.set(diagnosticKey, { key: diagnosticKey, productId: candidate.line.productId, product: candidate.line.product, sku: candidate.line.sku, unit: candidate.line.unit,
                supplierId: candidate.supplierId, supplier: candidate.supplier, reportedStock: null, reserved: null, availableToPromise: null,
                candidateDemand: quantityText(candidate.amount), shortage: null, ambiguous: true });
        }
    }
    // Keep the browser payload limited to products actually present on Draft
    // orders; the running-inventory endpoint can return thousands of unrelated SKUs.
    return [...result.values()].filter(row => orders.some(order => order.lines.some(line => line.productId === row.productId && canonicalUnit(line.unit) === row.unit)))
        .sort((a, b) => a.product.localeCompare(b.product) || a.key.localeCompare(b.key));
}

async function legacyHistory(lines: Map<number, string>, page: number): Promise<AllocationSnapshot["history"]> {
    const ids = [...lines.keys()];
    const rows: RecordRow[] = [];
    for (let index = 0; index < ids.length; index += 80) rows.push(...await directusPage<RecordRow>("audit_trail_table", {
        table_name: { _eq: "sales_order_details" }, field_name: { _in: ["allocated_quantity", "allocated_amount"] }, record_id: { _in: ids.slice(index, index + 80) },
    }, "id,timestamp,record_id,field_name,old_value,new_value,user_id", page * 25 + 1, 0, "-timestamp,-id"));
    rows.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)) || Number(b.id) - Number(a.id));
    const sliced = rows.slice((page - 1) * 25, page * 25);
    const mapped: LegacyAudit[] = sliced.map(row => ({ id: Number(row.id), timestamp: String(row.timestamp), lineId: Number(row.record_id), orderNumber: lines.get(Number(row.record_id)) || "Unknown",
        field: String(row.field_name), before: String(row.old_value ?? ""), after: String(row.new_value ?? ""), actorId: row.user_id == null ? null : Number(row.user_id) }));
    return { source: "legacy-field-audit", rows: mapped, page, hasMore: rows.length > page * 25, error: null };
}

export async function allocationSnapshot(context: ReadContext, warehouse: Warehouse, historyPage = 1): Promise<AllocationSnapshot> {
    // id=0 is an internal display-only bucket for Draft orders missing branch_id.
    // It is never accepted from a browser as an authorized warehouse selection.
    if (warehouse.id !== 0) warehouse = requireWarehouse(context, warehouse.id);
    if (!Number.isSafeInteger(historyPage) || historyPage < 1 || historyPage > 100) throw new AllocationError("INVALID_PAGE", "Invalid history page", 400);
    // Match Sales Order Draft's source filter exactly: all sales_order records
    // with order_status=Draft for this warehouse. No signed-in salesman filter.
    const headerFilter = { branch_id: warehouse.id === 0 ? { _null: true } : { _eq: warehouse.id }, order_status: { _eq: "Draft" } };
    const headerFields = "order_id,order_no,customer_code,salesman_id,supplier_id,branch_id,order_status,order_date,isCancelled,isDelivered";
    let headers: RecordRow[];
    try { headers = await readAll<RecordRow>("sales_order", headerFilter, `${headerFields},destination`, "order_id"); }
    catch { headers = await readAll<RecordRow>("sales_order", headerFilter, headerFields, "order_id"); }
    const excludedDrafts = 0;
    const excludedClosed = 0;
    const candidates = headers;
    const details = await byValues<RecordRow>("sales_order_details", "order_id", candidates.map(row => Number(row.order_id)), "detail_id,order_id,product_id,ordered_quantity,allocated_quantity,served_quantity,unit_price,net_amount", "detail_id");
    const [products, customers, salesmen, suppliers] = await Promise.all([
        byValues<RecordRow>("products", "product_id", details.map(row => Number(row.product_id)), "product_id,product_name,product_code,unit_of_measurement.unit_shortcut,unit_of_measurement.unit_name", "product_id"),
        byValues<RecordRow>("customer", "customer_code", candidates.map(row => String(row.customer_code)), "customer_code,customer_name"),
        byValues<RecordRow>("salesman", "id", candidates.map(row => Number(row.salesman_id)).filter(id => id > 0), "id,salesman_name"),
        byValues<RecordRow>("suppliers", "id", candidates.map(row => Number(row.supplier_id)).filter(id => id > 0), "id,supplier_name"),
    ]);
    const productMap = new Map(products.map(row => [Number(row.product_id), row]));
    const customerMap = new Map(customers.map(row => [String(row.customer_code), String(row.customer_name)]));
    const salesmanMap = new Map(salesmen.map(row => [Number(row.id), String(row.salesman_name)]));
    const supplierMap = new Map(suppliers.map(row => [Number(row.id), String(row.supplier_name)]));
    const grouped = new Map<number, AllocationLine[]>();
    for (const detail of details) {
        const product = productMap.get(Number(detail.product_id));
        const uom = product?.unit_of_measurement as RecordRow | undefined;
        const ordered = safeQuantity(detail.ordered_quantity), legacyAllocated = safeQuantity(detail.allocated_quantity), served = safeQuantity(detail.served_quantity);
        const quantityIssue = ordered === null || legacyAllocated === null || served === null;
        const line: AllocationLine = { id: Number(detail.detail_id), productId: Number(detail.product_id), product: String(product?.product_name || `SKU ${detail.product_id}`), sku: String(product?.product_code || detail.product_id),
            unit: String(uom?.unit_shortcut || uom?.unit_name || "Unverified UOM"), ordered: ordered ?? "Unverified", legacyAllocated: legacyAllocated ?? "Unverified", served: served ?? "Unverified",
            // Legacy allocated and served may overlap. Do not subtract them twice.
            unaccountedDemand: !quantityIssue && quantity(legacyAllocated!) === 0n && quantity(served!) === 0n ? ordered : null,
            unitPrice: String(detail.unit_price ?? "Unknown"), orderedNet: String(detail.net_amount ?? "Unknown"), quantityIssue };
        const id = Number(detail.order_id);
        grouped.set(id, [...(grouped.get(id) || []), line]);
    }
    const open = candidates;
    const orders: AllocationOrder[] = open.map(row => {
        const lines = grouped.get(Number(row.order_id)) || [];
        const quantityIssue = lines.some(line => line.quantityIssue);
        const allFull = !quantityIssue && lines.length > 0 && lines.every(line => quantity(line.legacyAllocated) >= quantity(line.ordered));
        const anyAllocated = lines.some(line => !line.quantityIssue && quantity(line.legacyAllocated) > 0n);
        return { id: Number(row.order_id), number: String(row.order_no), customer: customerMap.get(String(row.customer_code)) || String(row.customer_code), customerCode: String(row.customer_code),
            salesman: salesmanMap.get(Number(row.salesman_id)) || `Account ${row.salesman_id ?? "unknown"}`, supplierId: row.supplier_id == null ? null : Number(row.supplier_id), supplier: supplierMap.get(Number(row.supplier_id)) || "Unverified supplier",
            warehouseId: warehouse.id, orderDate: String(row.order_date || ""), workflow: String(row.order_status), destination: String(row.destination || "Not specified"),
            allocationState: quantityIssue ? "Blocked" : allFull ? "Legacy full" : anyAllocated ? "Legacy partial" : "Unallocated", blockers: [...READINESS_BLOCKERS,
                "Order is shown because its status is Draft, matching Sales Order Draft.",
                ...(quantityIssue ? ["One or more order quantities are invalid or unreconciled. Affected lines are shown as Unverified and cannot be planned."] : []),
                ...(lines.length ? [] : ["Order has no detail rows"])], lines };
    });
    // Stable order for display only; managers enter plans manually.
    orders.sort((a, b) => a.id - b.id);
    const allocated = new Map<string, bigint>();
    for (const order of orders) for (const line of order.lines) {
        if (line.quantityIssue) continue;
        const unit = line.unit === "Unverified UOM" ? `Unverified UOM / SKU ${line.sku}` : line.unit;
        allocated.set(unit, (allocated.get(unit) || 0n) + quantity(line.legacyAllocated));
    }
    let inventory: ReportedInventory[] = [], inventoryError: string | null = null;
    try { inventory = await reportedInventory(context, warehouse, orders); }
    catch { inventoryError = "Running inventory is unavailable. Unknown stock is not treated as zero; no proposal is calculated."; }
    const lineOrders = new Map<number, string>();
    for (const order of orders) for (const line of order.lines) lineOrders.set(line.id, order.number);
    let history: AllocationSnapshot["history"];
    try { history = await legacyHistory(lineOrders, historyPage); }
    catch { history = { source: "legacy-field-audit", rows: [], page: historyPage, hasMore: false, error: "Legacy allocation-field audit is unavailable. This is not a reservation event ledger." }; }
    return { warehouse, readAt: new Date().toISOString(), mode: "shadow-read-only", blockers: READINESS_BLOCKERS, orders, inventory, inventoryError, history,
        summary: { orders: orders.length, fullLegacy: orders.filter(row => row.allocationState === "Legacy full").length, partialLegacy: orders.filter(row => row.allocationState === "Legacy partial").length,
            unallocated: orders.filter(row => row.allocationState === "Unallocated").length, excludedDrafts, excludedClosed, allocatedByUnit: Object.fromEntries([...allocated].map(([key, value]) => [key, quantityText(value)])) } };
}
