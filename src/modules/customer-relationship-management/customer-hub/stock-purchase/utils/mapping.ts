import { StockPurchaseHeader, StockPurchaseDetail, Product, Salesman, PaymentTerm } from '../types';
import { ReceiptData, ReceiptItem, DiscountType } from '../types/print';

export const mapStockPurchaseToReceiptData = (
    header: StockPurchaseHeader,
    details: StockPurchaseDetail[],
    discountTypes: DiscountType[],
    isOfficial: boolean = true
): ReceiptData => {
    const items: ReceiptItem[] = details.map(detail => ({
        product_id: typeof detail.product_id === 'number' ? detail.product_id : (detail.product_id as { product_id?: number })?.product_id || 0,
        product_name: (typeof detail.product_id === 'object' ? (detail.product_id as Product)?.product_name : "") || "Unknown Product",
        order_no: header.invoice_no || "",
        ordered_qty: Number(detail.quantity || 0),
        qty: Number(detail.quantity || 0),
        unit_price: Number(detail.unit_price || 0),
        discount_type: (detail.discount_type as { id?: number })?.id || (typeof detail.discount_type === 'number' ? detail.discount_type : null),
        discount_amount: Number(detail.discount_amount || 0),
        gross_amount: Number(detail.gross_amount || 0),
        net_amount: Number(detail.total_amount || detail.net_amount || 0),
        unit_shortcut: detail.unit_name || "PCS",
        brand_name: detail.brand_name || undefined,
        category_name: detail.category_name || undefined
    }));

    return {
        receipt_no: header.invoice_no || "DRAFT",
        items,
        customer_name: header.customer_name || "Walk-in Customer",
        store_name: header.store_name || "N/A",
        customer_tin: header.customer_tin || "",
        address: header.customer_address || "",
        payment_name: (header.payment_terms && typeof header.payment_terms === 'object' ? (header.payment_terms as PaymentTerm)?.payment_name : "CASH") || "CASH",
        po_no: header.order_id || "N/A",
        salesman_name: (header.salesman_id && typeof header.salesman_id === 'object' ? (header.salesman_id as Salesman)?.salesman_name : header.salesman_name) || "N/A",
        is_official: isOfficial,
        discountTypes: discountTypes,
        vat_amount: Number(header.vat_amount || 0),
        gross_amount: Number(header.gross_amount || 0),
        discount_amount: Number(header.discount_amount || 0),
        net_amount: Number(header.net_amount || 0),
    };
};
