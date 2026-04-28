export type InventoryReportMode = "Breakdown" | "Box" | "Piece";

export interface InventoryItem {
    supplier: string;
    branch: string;
    brand: string;
    category: string;
    products: string;
    unit: string;
    runningInventory: number;
    unitCount: number;
    productId: string | number;
    barcode?: string;
}

export interface InventoryUnit {
    unit: string;
    runningInventory: number;
    unitCount: number;
    barcode?: string;
}

export interface GroupedInventoryItem {
    supplier: string;
    branch: string;
    brand: string;
    category: string;
    products: string;
    productId: string | number;
    units: InventoryUnit[];
    box: number;
    piece: number;
}
