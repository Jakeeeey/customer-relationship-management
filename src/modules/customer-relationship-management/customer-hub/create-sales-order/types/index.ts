export interface LineItem {
    id: string;
    product: any;
    quantity: number;
    uom: string;
    unitPrice: number;
    discountType: string | null;
    discounts: number[];
    netAmount: number;
    totalAmount: number;
    discountAmount: number;
    availableQty?: number;
}
