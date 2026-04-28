import { InventoryItem } from "../types";

interface RawInventoryItem {
    supplierShortcut?: string;
    supplier_shortcut?: string;
    supplierName?: string;
    branchName?: string;
    branch_name?: string;
    branchId?: string;
    productBrand?: string;
    product_brand?: string;
    brandName?: string;
    productCategory?: string;
    product_category?: string;
    categoryName?: string;
    productName?: string;
    product_name?: string;
    products?: string;
    unitName?: string;
    unit_name?: string;
    unit?: string;
    runningInventoryUnit?: number | string;
    running_inventory_unit?: number | string;
    runningInventory?: number | string;
    unitCount?: number | string;
    unit_count?: number | string;
    productId?: string | number;
    product_id?: string | number;
    productBarcode?: string;
    product_barcode?: string;
}

export const fetchInventoryData = async (): Promise<InventoryItem[]> => {
    const response = await fetch("/api/crm/printables/inventory-report-printables");
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Failed to fetch inventory data");
    }
    const data = await response.json();

    // Map the Spring Boot response to our InventoryItem type
    // The Spring Boot response might have different field names (camelCase vs snake_case)
    return data.map((item: RawInventoryItem) => ({
        supplier: item.supplierShortcut || item.supplier_shortcut || item.supplierName || "N/A",
        branch: item.branchName || item.branch_name || item.branchId || "N/A",
        brand: item.productBrand || item.product_brand || item.brandName || "N/A",
        category: item.productCategory || item.product_category || item.categoryName || "N/A",
        products: item.productName || item.product_name || item.products || "N/A",
        unit: item.unitName || item.unit_name || item.unit || "N/A",
        runningInventory: Number(item.runningInventoryUnit || item.running_inventory_unit || item.runningInventory || 0),
        unitCount: Number(item.unitCount || item.unit_count || 1),
        productId: item.productId || item.product_id || 0,
        barcode: item.productBarcode || item.product_barcode || ""
    }));
};
