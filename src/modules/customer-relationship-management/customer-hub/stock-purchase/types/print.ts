import { z } from 'zod';

export type AddressComponentKey = 
    | 'unit_building'
    | 'house_no'
    | 'block'
    | 'lot'
    | 'phase'
    | 'street'
    | 'subdivision'
    | 'purok_sitio'
    | 'brgy'
    | 'city'
    | 'province'
    | 'region'
    | 'zip_code'
    | 'country';

export interface CustomerAddressData {
    customer_name?: string;
    store_name?: string;
    customer_tin?: string;
    isEWT?: number;
    unit_building?: string | null;
    house_no?: string | null;
    block?: string | null;
    lot?: string | null;
    phase?: string | null;
    street?: string | null;
    subdivision?: string | null;
    purok_sitio?: string | null;
    brgy?: string | null;
    city?: string | null;
    province?: string | null;
    region?: string | null;
    zip_code?: string | null;
    country?: string | null;
}

export interface ORFieldConfig {
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    fontWeight: 'normal' | 'bold' | 'italic' | 'bolditalic';
    label?: string;
    alignment?: 'left' | 'center' | 'right';
    hidden?: boolean;
    maxWidth?: number;
    scaleX?: number;
    lineHeight?: number;
    charSpacing?: number;
    barcodeHeight?: number;
    barcodeModuleWidth?: number;
    hideBarcodeText?: boolean;
    isCustom?: boolean;
    value?: string;
    sourceField?: string;
    addressConfig?: {
        showUnitBuilding?: boolean;
        showHouseNo?: boolean;
        showBlock?: boolean;
        showLot?: boolean;
        showPhase?: boolean;
        showStreet?: boolean;
        showSubdivision?: boolean;
        showPurokSitio?: boolean;
        showBrgy?: boolean;
        showCity?: boolean;
        showProvince?: boolean;
        showRegion?: boolean;
        showZipCode?: boolean;
        showCountry?: boolean;
        order?: (AddressComponentKey | string)[];
    };
}

export interface ORTableColumns {
    barcode?: { x: number; width?: number };
    product_name?: { x: number; width?: number };
    quantity?: { x: number; width?: number };
    unit_price?: { x: number; width?: number };
    discount_amount?: { x: number; width?: number };
    discount?: { x: number; width?: number };
    net_amount?: { x: number; width?: number };
    [key: string]: { x: number; width?: number } | undefined;
}

export interface ORTableSettings {
    startY: number;
    rowHeight: number;
    fontSize: number;
    product_name_width?: number;
    columns: ORTableColumns;
}

export interface ORTemplate {
    id: string | number;
    template_name?: string;
    name: string;
    width: number;
    height: number;
    backgroundImage?: string | null;
    printBackground?: boolean;
    fields: Record<string, ORFieldConfig>;
    tableSettings: ORTableSettings;
}

export const ORFieldConfigSchema = z.object({
    x: z.number(),
    y: z.number(),
    fontSize: z.number(),
    fontFamily: z.string(),
    fontWeight: z.enum(['normal', 'bold', 'italic', 'bolditalic']),
    label: z.string().optional(),
    alignment: z.enum(['left', 'center', 'right']).optional(),
    hidden: z.boolean().optional(),
    maxWidth: z.number().optional(),
    scaleX: z.number().optional(),
    lineHeight: z.number().optional(),
    charSpacing: z.number().optional(),
    barcodeHeight: z.number().optional(),
    barcodeModuleWidth: z.number().optional(),
    hideBarcodeText: z.boolean().optional(),
    isCustom: z.boolean().optional(),
    value: z.string().optional(),
    sourceField: z.string().optional(),
    addressConfig: z.object({
        showUnitBuilding: z.boolean().optional(),
        showHouseNo: z.boolean().optional(),
        showBlock: z.boolean().optional(),
        showLot: z.boolean().optional(),
        showPhase: z.boolean().optional(),
        showStreet: z.boolean().optional(),
        showSubdivision: z.boolean().optional(),
        showPurokSitio: z.boolean().optional(),
        showBrgy: z.boolean().optional(),
        showCity: z.boolean().optional(),
        showProvince: z.boolean().optional(),
        showRegion: z.boolean().optional(),
        showZipCode: z.boolean().optional(),
        showCountry: z.boolean().optional(),
        order: z.array(z.string()).optional(),
    }).optional(),
});

export const ORTemplateSchema = z.object({
    id: z.union([z.number(), z.string()]),
    template_name: z.string().optional(),
    name: z.string(),
    width: z.number(),
    height: z.number(),
    backgroundImage: z.string().nullable().optional(),
    printBackground: z.boolean().optional(),
    fields: z.record(z.string(), ORFieldConfigSchema),
    tableSettings: z.object({
        startY: z.number(),
        rowHeight: z.number(),
        fontSize: z.number(),
        product_name_width: z.number().optional(),
        columns: z.record(z.string(), z.object({
            x: z.number(),
            width: z.number().optional()
        }))
    })
});

export interface ReceiptItem {
    product_id: number;
    product_name: string;
    order_no: string;
    ordered_qty: number;
    qty: number;
    unit_price: number;
    discount_type: number | string | null;
    discount_type_name?: string | null;
    unit_discount?: number;
    discount_amount: number;
    net_amount: number;
    gross_amount: number;
    unit_shortcut: string;
    brand_name?: string;
    category_name?: string;
}

export interface DiscountType {
    id: number;
    discount_type: string;
    total_percent: number;
}

export interface ReceiptData {
    receipt_no: string;
    items: ReceiptItem[];
    customer_name: string;
    store_name: string;
    customer_tin: string;
    address: string;
    payment_name: string;
    po_no: string;
    salesman_name: string;
    is_official: boolean;
    discountTypes: DiscountType[];
    barcodeDataUrl?: string;
    template?: ORTemplate;
    vat_amount?: number;
    gross_amount?: number;
    discount_amount?: number;
    net_amount?: number;
    backgroundImageDataUrl?: string;
}

export const DEFAULT_ADDRESS_ORDER: AddressComponentKey[] = [
    'unit_building',
    'house_no',
    'block',
    'lot',
    'phase',
    'street',
    'subdivision',
    'purok_sitio',
    'brgy',
    'city',
    'province',
    'region',
    'zip_code',
    'country',
];

export const formatAddress = (
    customer?: CustomerAddressData,
    config?: ORFieldConfig['addressConfig']
): string => {
    if (!customer) return 'N/A';
    const showUnitBuilding = config?.showUnitBuilding ?? false;
    const showHouseNo = config?.showHouseNo ?? false;
    const showBlock = config?.showBlock ?? false;
    const showLot = config?.showLot ?? false;
    const showPhase = config?.showPhase ?? false;
    const showStreet = config?.showStreet ?? false;
    const showSubdivision = config?.showSubdivision ?? false;
    const showPurokSitio = config?.showPurokSitio ?? false;
    const showBrgy = config?.showBrgy ?? true;
    const showCity = config?.showCity ?? true;
    const showProvince = config?.showProvince ?? true;
    const showRegion = config?.showRegion ?? false;
    const showZipCode = config?.showZipCode ?? false;
    const showCountry = config?.showCountry ?? false;

    const partsMap: Record<string, string | undefined | null> = {
        unit_building: showUnitBuilding ? customer.unit_building : undefined,
        house_no: showHouseNo ? customer.house_no : undefined,
        block: showBlock ? customer.block : undefined,
        lot: showLot ? customer.lot : undefined,
        phase: showPhase ? customer.phase : undefined,
        street: showStreet ? customer.street : undefined,
        subdivision: showSubdivision ? customer.subdivision : undefined,
        purok_sitio: showPurokSitio ? customer.purok_sitio : undefined,
        brgy: showBrgy ? customer.brgy : undefined,
        city: showCity ? customer.city : undefined,
        province: showProvince ? customer.province : undefined,
        region: showRegion ? customer.region : undefined,
        zip_code: showZipCode ? customer.zip_code : undefined,
        country: showCountry ? customer.country : undefined,
    };

    const order = (config?.order && config.order.length > 0) ? config.order : DEFAULT_ADDRESS_ORDER;

    const result = order
        .map(key => partsMap[key])
        .filter((val): val is string => Boolean(val && typeof val === 'string' && val.trim() !== ''))
        .join(', ');

    return result ? result.toUpperCase() : 'N/A';
};
