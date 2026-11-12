export type PriceOverrideRow = {
  id?: number | string | null;
  product_id?: number | string | { id?: number | string | null; product_id?: number | string | null } | null;
  price?: number | string | null;
  updated_at?: string | null;
};

function productIdOf(row: PriceOverrideRow): number | null {
  const value = row.product_id;
  const raw = value && typeof value === "object" ? value.id ?? value.product_id : value;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * Directus can contain more than one product_per_price_type row for the same
 * product and price type. Readers must resolve that deterministically instead
 * of letting response order decide which price wins.
 */
export function latestPriceOverrides(rows: PriceOverrideRow[]): Record<number, number> {
  const latest = new Map<number, { price: number; updatedAt: string; id: number }>();

  for (const row of rows) {
    const productId = productIdOf(row);
    if (row.price === null || row.price === undefined || row.price === "") continue;
    const price = Number(row.price);
    if (!productId || !Number.isFinite(price)) continue;

    const updatedAt = String(row.updated_at ?? "");
    const rawId = Number(row.id);
    const id = Number.isFinite(rawId) ? rawId : 0;
    const current = latest.get(productId);

    if (!current || updatedAt > current.updatedAt || (updatedAt === current.updatedAt && id > current.id)) {
      latest.set(productId, { price, updatedAt, id });
    }
  }

  const out: Record<number, number> = {};
  for (const [productId, entry] of latest) out[productId] = entry.price;
  return out;
}
