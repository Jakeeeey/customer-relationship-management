export interface Salesman {
    id: number;
    salesman_code: string;
    salesman_name: string;
    price_type?: string;
}

export interface Supplier {
    id: number;
    supplier_name: string;
    supplier_shortcut?: string;
}

export interface Category {
    id: number;
    category_name: string;
}

export interface Segment {
    id: number;
    segment_name: string;
}

export interface PriceListItem {
    categoryCode: string;
    productName: string;
    pckg: number;
    unit: string;
    price: number | null;
    priceType: string;
    barcode?: string;
    barcodeNo?: string;
}

export interface PricePrintablesState {
    salesmanId: string | null;
    supplierInput: string;
    segmentInput: string;
    categoryInput: string;
    isGenerating: boolean;
    data: PriceListItem[];
}
