export interface Warehouse { id: number; name: string }
export interface AllocationContext {
    user: { id: number; name: string };
    warehouses: Warehouse[];
    capabilities: { read: boolean; preview: boolean; confirm: false; release: false; history: boolean; inventory: boolean };
}
export interface AllocationLine {
    id: number; productId: number; product: string; sku: string; unit: string;
    ordered: string; legacyAllocated: string; served: string;
    unaccountedDemand: string | null; unitPrice: string; orderedNet: string;
    quantityIssue?: boolean;
}
export interface AllocationOrder {
    id: number; number: string; customer: string; customerCode: string; salesman: string;
    supplierId: number | null; supplier: string; warehouseId: number; orderDate: string;
    workflow: string; destination: string;
    allocationState: "Blocked" | "Legacy full" | "Legacy partial" | "Unallocated";
    blockers: string[]; lines: AllocationLine[];
}
export interface ReportedInventory {
    key: string; productId: number; product: string; sku: string; unit: string;
    supplierId: number | null; supplier: string; reportedStock: string | null;
    reserved: null; availableToPromise: null; candidateDemand: string;
    shortage: null; ambiguous: boolean;
}
export interface LegacyAudit {
    id: number; timestamp: string; lineId: number; orderNumber: string;
    field: string; before: string; after: string; actorId: number | null;
}
export interface AllocationSnapshot {
    warehouse: Warehouse; readAt: string; mode: "shadow-read-only";
    blockers: string[]; orders: AllocationOrder[]; inventory: ReportedInventory[];
    inventoryError: string | null;
    history: { source: "legacy-field-audit"; rows: LegacyAudit[]; page: number; hasMore: boolean; error: string | null };
    summary: { orders: number; fullLegacy: number; partialLegacy: number; unallocated: number; excludedDrafts: number; excludedClosed: number; allocatedByUnit: Record<string, string> };
}
