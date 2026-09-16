import { Product } from "../types";

/**
 * Decomposes a total quantity in pieces into multiple line items based on available UOM variants.
 * (e.g., 1000 pieces -> 2 Boxes, 6 Ties, 10 Pieces)
 */
export function decomposeQuantity(
    totalPcs: number,
    selectedProduct: Product,
    allSupplierProducts: Product[]
): { product: Product; quantity: number }[] {
    // 1. Find the "Family Anchor" (the parent ID)
    const anchorId = selectedProduct.parent_id || selectedProduct.product_id;

    // 2. Find all siblings (all products belonging to the same family)
    const familyMembers = allSupplierProducts.filter(p =>
        (p.parent_id === anchorId) || (p.product_id === anchorId)
    );

    // 3. Sort variants by conversion factor (unit_of_measurement_count) descending
    // This ensures we satisfy the largest units (Boxes) first.
    const sortedVariants = [...familyMembers].sort((a, b) => {
        const countA = Number(a.unit_of_measurement_count) || 1;
        const countB = Number(b.unit_of_measurement_count) || 1;
        return countB - countA;
    });

    const results: { product: Product; quantity: number }[] = [];
    let remaining = totalPcs;

    for (const variant of sortedVariants) {
        if (remaining <= 0) break;

        const uomCount = Number(variant.unit_of_measurement_count) || 1;
        const qty = Math.floor(remaining / uomCount);

        if (qty > 0) {
            results.push({
                product: variant,
                quantity: qty
            });
            remaining = remaining % uomCount;
        }
    }

    return results;
}
