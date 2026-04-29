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

export interface PriceListItem {
    categoryCode: string;
    productCode?: string; // Mapped to FG CODE in PDF
    productName: string;
    pckg: number;
    unit: string;
    price: number | null;
    priceType: string;
}

export interface PriceListPrintablesState {
    salesmanId: string | null;
    supplierId: string | null;
    isGenerating: boolean;
    data: PriceListItem[];
}
