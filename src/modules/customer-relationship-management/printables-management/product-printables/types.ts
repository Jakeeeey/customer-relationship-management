// src/modules/financial-management/printables-management/product-printables/types.ts

export type ProductRow = {
    product_id: number;
    parent_id: number | null;
    product_code: string | null;
    barcode: string | null;
    product_name: string | null;
    isActive: number | string | null;
    product_category: number | string | null;
    product_brand: number | string | null;
    unit_of_measurement: number | string | null;
    price_per_unit?: number | string | null;
    priceA?: number | string | null;
    priceB?: number | string | null;
    priceC?: number | string | null;
    priceD?: number | string | null;
    priceE?: number | string | null;
    cost_per_unit?: number | string | null;
};

export type VariantCell = {
    product: ProductRow;
    tiers: Record<string, number | null>;
};

export type MatrixRow = {
    group_id: number;
    display: ProductRow;
    variantsByUnitId: Record<number, VariantCell>;
    category_name?: string | null;
    brand_name?: string | null;
};

export type PriceType = {
    price_type_id: number;
    price_type_name: string;
    sort: number | null;
};

export type Category = {
    category_id: number;
    category_name: string;
};

export type Brand = {
    brand_id: number;
    brand_name: string;
};

export type Unit = {
    unit_id: number;
    unit_name: string;
    unit_shortcut: string;
    order?: number | null;
};

export type Supplier = {
    id: number;
    supplier_name: string;
    supplier_shortcut: string;
    address?: string;
    tin_number?: string;
    contact_person?: string;
    phone_number?: string;
    email_address?: string;
    city?: string;
    state_province?: string;
};

export type FilterState = {
    q: string;
    category_ids: string[];
    brand_ids: string[];
    unit_ids: string[];
    supplier_ids: string[];
    price_type_ids: string[];
    supplier_scope: "ALL" | "LINKED_ONLY";
    active_only: boolean;
    page: number;
    total_pages: number;
};

export type ProductTierKey = "A" | "B" | "C" | "D" | "E" | "ListPrice";
