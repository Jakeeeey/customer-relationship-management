export type RequestStatus = "Pending" | "Approved" | "Rejected";

export interface SalesInvoiceDetail {
    product_id: string | number;
    product_name?: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
}

export interface NormalizeRequest {
    id: number;
    invoice_id: number;
    invoice_no: string;
    order_id: number;
    requested_by: number;
    requested_by_name?: string;
    requested_date: string;
    status: RequestStatus;
    remarks: string | null;
    invoice_details?: SalesInvoiceDetail[];
}
