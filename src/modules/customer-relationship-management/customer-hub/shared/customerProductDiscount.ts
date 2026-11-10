interface ProductDiscountRow {
    id?: unknown;
    product_id?: unknown;
    discount_type?: unknown;
    unit_price?: unknown;
    deleted_at?: unknown;
}

interface ProductDiscount {
    id: number;
    product_id: number;
    discount_type?: number;
    unit_price: number | null;
}

function relationId(value: unknown): number | null {
    if (value && typeof value === "object") {
        const row = value as Record<string, unknown>;
        value = row.id ?? row.product_id;
    }
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

export function indexCustomerProductDiscounts(rows: ProductDiscountRow[]) {
    const rules = new Map<number, ProductDiscount>();
    for (const row of rows) {
        const productId = relationId(row.product_id);
        if (!productId || row.deleted_at) continue;
        const id = relationId(row.id) ?? 0;
        const previous = rules.get(productId);
        if (!previous || id > previous.id) {
            rules.set(productId, {
                id,
                product_id: productId,
                discount_type: relationId(row.discount_type) ?? undefined,
                unit_price: row.unit_price == null ? null : Number(row.unit_price)
            });
        }
    }
    return rules;
}

export function resolveCustomerProductDiscount(
    rules: Map<number, ProductDiscount>,
    productId: unknown,
    parentId: unknown,
    basePrice: number
) {
    const exact = rules.get(relationId(productId) ?? 0);
    const parent = rules.get(relationId(parentId) ?? 0);
    return {
        discountTypeId: exact?.discount_type ?? parent?.discount_type ?? null,
        price: Number(exact?.unit_price) || basePrice
    };
}

export async function loadCustomerProductDiscounts(
    directusUrl: string | undefined,
    headers: HeadersInit,
    customerCode: string,
    productIds: number[]
) {
    const rows: ProductDiscountRow[] = [];
    const fields = "id,product_id,unit_price,discount_type";
    let supportsDeletedAt = true;
    for (let offset = 0; offset < productIds.length; offset += 80) {
        const url = new URL(`${directusUrl}/items/product_per_customer`);
        url.searchParams.set("filter[customer_code][_eq]", customerCode);
        url.searchParams.set("filter[product_id][_in]", productIds.slice(offset, offset + 80).join(","));
        url.searchParams.set("fields", supportsDeletedAt ? `${fields},deleted_at` : fields);
        url.searchParams.set("sort", "-id");
        url.searchParams.set("limit", "-1");
        if (supportsDeletedAt) url.searchParams.set("filter[deleted_at][_null]", "true");

        let response = await fetch(url, { headers, cache: "no-store" });
        if (!response.ok) {
            const body = await response.text();
            if ((response.status === 400 || response.status === 403) && body.toLowerCase().includes("deleted_at")) {
                // Match FM's compatibility path for Directus roles without this field.
                supportsDeletedAt = false;
                url.searchParams.delete("filter[deleted_at][_null]");
                url.searchParams.set("fields", fields);
                response = await fetch(url, { headers, cache: "no-store" });
            }
        }
        if (!response.ok) throw new Error(`Unable to load customer product discounts (${response.status})`);
        const payload = await response.json() as { data?: ProductDiscountRow[] };
        rows.push(...(payload.data ?? []));
    }
    return indexCustomerProductDiscounts(rows);
}
