// (** NOTE **) This module contains lightweight, stable TypeScript types used by
// the Inventory Report feature. Avoid using `any` in the surrounding files -
// prefer these types or `unknown` / `Record<string, unknown>` when the shape is
// dynamic.

// Filters that the UI exposes to the user. Upstream API expects simple
// string values; the UI uses "all" to represent an unfiltered value.
export interface InventoryFilters {
  // Allow either a single string or multiple selections for each filter.
  branch?: string | string[];
  supplier?: string | string[];
  category?: string | string[];
  brand?: string | string[];
  product?: string | string[];
  // Optional flag used by the upstream API to request "current" allocation
  current?: string;
}

// Lookup option shapes returned by Directus / backend proxy. Different
// collections use different field names (id, branch_id, branch_name, etc.) so
// we allow the common variants as optional properties. Consumers should use
// helper accessors to read the most appropriate property.
export interface BranchOption {
  id?: string | number;
  branch_id?: string | number;
  branch_name?: string;
  branch?: string;
  branchName?: string;
  [key: string]: unknown;
}

export interface SupplierOption {
  id?: string | number;
  supplier_shortcut?: string;
  supplier_name?: string;
  supplierName?: string;
  [key: string]: unknown;
}

export interface CategoryOption {
  id?: string | number;
  category_id?: string | number;
  category_name?: string;
  categoryName?: string;
  [key: string]: unknown;
}

export interface BrandOption {
  id?: string | number;
  brand_id?: string | number;
  brand_name?: string;
  brandName?: string;
  [key: string]: unknown;
}

export interface ProductOption {
  id?: string | number;
  product_id?: string | number;
  product_name?: string;
  productName?: string;
  [key: string]: unknown;
}

export type LookupOptions = {
  branches: BranchOption[];
  suppliers: SupplierOption[];
  categories: CategoryOption[];
  brands: BrandOption[];
  products?: ProductOption[];
};

// Inventory row - backend systems use slightly different field names depending
// on which service returns the payload. We include the common variants as
// optional properties so the UI can normalize at render time without using
// `any`.
export interface InventoryRow {
  // identifiers / codes
  product_code?: string;
  productCode?: string;
  code?: string;
  sku?: string;

  // product / item names
  product_name?: string;
  productName?: string;
  productDescription?: string;
  product_description?: string;
  name?: string;
  item?: string;

  // brand / category / supplier / branch
  brand?: string;
  brand_name?: string;
  brandName?: string;

  category?: string;
  category_name?: string;
  categoryName?: string;

  supplier?: string;
  supplier_name?: string;
  supplier_shortcut?: string;

  branch?: string;
  branch_name?: string;
  branchName?: string;

  // numeric quantities - sometimes strings depending on source, so accept both
  // some backends use `current` as the field name for available on-hand
  current?: number | string;
  onhand?: number | string;
  on_hand?: number | string;
  onHand?: number | string;
  quantity?: number | string;
  qty?: number | string;

  // inbound / pipeline quantities (some backends provide these fields)
  inboxCurrent?: number | string;
  inbox_current?: number | string;
  inboxAllocated?: number | string;
  inbox_allocated?: number | string;
  inboxProjected?: number | string;
  inbox_projected?: number | string;

  allocated?: number | string;
  allocated_qty?: number | string;
  allocatedQuantity?: number | string;
  current_allocated?: number | string;

  // unit of measure
  uom?: string;
  unit?: string;
  unit_of_measurement?: string;

  // allow other fields (timestamps, nested objects) but typed as unknown
  [key: string]: unknown;
}

// API response can be either a raw array or an object with common pagination
// shapes used by different backends. Keep it permissive but typed.
export type InventoryApiResponse =
  | InventoryRow[]
  | {
      data?: InventoryRow[];
      items?: InventoryRow[];
      content?: InventoryRow[];
      meta?: Record<string, unknown>;
      total?: number;
      totalElements?: number;
      total_count?: number;
      [key: string]: unknown;
    }
  | null;

// Normalized parse result used within the UI hook
export interface NormalizedInventoryResult {
  data: InventoryRow[];
  total: number;
}
