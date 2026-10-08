export interface Salesman {
    id: number;
    salesman_code: string;
    salesman_name: string;
    price_type: string | null;
    division_id: number | null;
}

export interface Branch {
    id: number;
    branch_name: string;
}

export interface Supplier {
    id: number;
    supplier_shortcut: string | null;
    supplier_name: string | null;
}

export interface DiscountType {
    id: number;
    discount_type: string;
    total_percent: number;
}

export interface Customer {
    id: number;
    customer_code: string;
    customer_name: string;
}

export interface ReceiptType {
    id: number;
    type: string;
    isOfficial?: number | string | null;
    is_thermal?: boolean | null;
}

export interface PaymentTerm {
    id: number;
    payment_days: number;
    payment_terms: string;
}

export interface SalesOrder {
    order_id: number;
    order_no: string;
    po_no: string;
    order_date: string;
    created_date: string | null;
    total_amount: number | null;
    allocated_amount: number | null;
    order_status: string;
    
    // New fields for Modal
    receipt_type: {
        id: number;
        type: string;
        isOfficial?: number | string | null;
        is_thermal?: boolean | null;
    } | null;
    net_amount: number | null;
    discount_amount: number | null;
    remarks: string | null;
    
    for_approval_at: string | null;
    for_consolidation_at: string | null;
    for_picking_at: string | null;
    for_invoicing_at: string | null;
    for_loading_at: string | null;
    for_shipping_at: string | null;
    delivered_at: string | null;
    not_fulfilled_at: string | null;

    // Recycled order — pre-existing invoice data
    existing_invoice_no: number | null;           // invoice_id (integer FK for details)
    existing_invoice_display_no: string | null;   // invoice_no string shown in UI
    existing_invoices?: { id: number; display_no: string }[]; // Full list of linked invoices

    // Void re-invoicing — voided invoice that needs replacement
    void_invoices?: { id: number; display_no: string }[];

    // Relationships (nested from Directus)
    supplier_id: Supplier | null;
    customer_code: Customer | null;
    salesman_id: Salesman | null;
    branch_id: Branch | null;
    payment_terms: PaymentTerm | null;
    sales_type: string | null;
}

export interface InvoicingFilters {
    orderNo?: string;
    poNo?: string;
    customer?: string;
    salesman?: string;
    supplier?: string;
    branch?: string;
    fromDate?: string;
    toDate?: string;
    status?: 'All' | 'Normal' | 'Recycled' | 'Void';
}

export interface ComboboxOption {
    value: string;
    label: string;
}

export interface LogisticsData {
    pdp_no: string;
    consolidation_no: string;
    dispatch_no: string;
    dispatch_date?: string; // Added for sorting and identification
}

export interface CustomerGroup {
    customer_code: string;
    customer_name: string;
    orders: SalesOrder[];
    total_amount: number;
    order_count: number;
}

export interface ConversionItem {
    product_id: number;
    product_name: string;
    consolidator_no: string;
    order_no: string;
    ordered_quantity: number;
    allocated_quantity: number;
    total_allocated_quantity: number;
    picked_quantity: number;
    applied_quantity: number;
    remaining_quantity: number;
    unit_price: number;
    discount_type: number | null;
    discount_amount: number;
    net_amount: number;
    unit_shortcut: string;
    barcode?: string;
    price_changeable?: boolean;
}

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

export interface ConversionData {
    items: ConversionItem[];
    max_receipt_length: number;
    is_official?: number | string | null;
    discount_types: DiscountType[];
    customer?: CustomerAddressData;
    payment_name?: string;
    total_allocated_quantity?: number;
    total_picked_quantity?: number;
}

export interface ORFieldConfig {
    x: number;
    y: number;
    fontSize: number;
    fontFamily: 'courier' | 'helvetica' | 'times';
    fontWeight: 'normal' | 'bold';
    label: string;
    charSpacing?: number; // spacing in points (jsPDF unit)
    scaleX?: number;      // horizontal scaling (1.0 = 100%)
    
    // Multi-line and Wrapping settings
    maxWidth?: number;    // in mm
    lineHeight?: number;  // multiplier e.g. 1.2
    hidden?: boolean;     // visibility toggle

    // Barcode settings
    barcodeHeight?: number;
    barcodeModuleWidth?: number;
    hideBarcodeText?: boolean;

    // Custom Text Field settings
    isCustom?: boolean;
    value?: string;

    // Address Sub-components & Ordering Config
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

export interface ORTemplate {
    id: string;
    name: string;
    width: number;
    height: number;
    backgroundImage?: string; // base64
    printBackground?: boolean; // include in printed PDF
    fields: Record<string, ORFieldConfig>;
    tableSettings: {
        startY: number;
        rowHeight: number;
        fontSize: number;
        product_name_width?: number; // width in mm
        columns?: {
            barcode?: { x: number };
            product_name?: { x: number };
            quantity?: { x: number };
            unit_price?: { x: number };
            discount_amount?: { x: number };
            discount?: { x: number };
            net_amount?: { x: number };
        };
    };
}
