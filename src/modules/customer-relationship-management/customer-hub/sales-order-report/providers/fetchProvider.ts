import { SalesOrderDataResponse } from "../types";

export const fetchSalesOrderData = async (
    page: number = 1,
    pageSize: number = 15,
    filters: Record<string, string | number | undefined> = {}
) => {
    const cleanedFilters: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            cleanedFilters[key] = String(value);
        }
    });

    const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...cleanedFilters
    });

    const response = await fetch(`/api/crm/customer-hub/sales-order-report?${queryParams.toString()}`);
    if (!response.ok) {
        let errText = "Failed to fetch sales order data";
        try {
            const errJson = await response.json();
            errText = errJson.error || errJson.message || JSON.stringify(errJson);
        } catch {
            errText = await response.text() || response.statusText;
        }
        throw new Error(errText);
    }
    return response.json() as Promise<SalesOrderDataResponse>;
};

export const fetchSalesOrderDetails = async (orderId: number) => {
    const response = await fetch(`/api/crm/customer-hub/sales-order-report?orderId=${orderId}`);
    if (!response.ok) {
        throw new Error("Failed to fetch order details");
    }
    const json = await response.json();
    return json.data || [];
};

export const fetchMonthlyAverage = async (customerCode: string) => {
    const response = await fetch(`/api/crm/customer-hub/sales-order-report?type=mo-avg&customerCode=${customerCode}`);
    if (!response.ok) {
        throw new Error("Failed to fetch monthly average");
    }
    const json = await response.json();
    return json.data || {};
};


export const fetchInvoiceDetails = async (orderId: number, orderNo?: string) => {
    const params = new URLSearchParams({ type: "invoice-details", orderId: orderId.toString() });
    if (orderNo) params.append("orderNo", orderNo);
    const response = await fetch(`/api/crm/customer-hub/sales-order-report?${params.toString()}`);
    if (!response.ok) {
        throw new Error("Failed to fetch invoice details");
    }
    const json = await response.json();
    return json.data;
};
 
export const fetchOrderPdf = async (salesOrderId: number, orderNo?: string) => {
    const params = new URLSearchParams({ type: "order-pdf", salesOrderId: salesOrderId.toString() });
    if (orderNo) params.append("orderNo", orderNo);
    const response = await fetch(`/api/crm/customer-hub/sales-order-report?${params.toString()}`);
    if (!response.ok) {
        throw new Error("Failed to fetch order PDF");
    }
    const json = await response.json();
    return json.data;
};

export const fetchOrderAttachments = async (orderNo: string) => {
    const response = await fetch(`/api/crm/customer-hub/sales-order-report?type=order-attachments&orderNo=${orderNo}`);
    if (!response.ok) {
        throw new Error("Failed to fetch order attachments");
    }
    const json = await response.json();
    return json.data || [];
};

export const salesOrderProvider = {
    getSalesOrderDetails: fetchSalesOrderDetails,
    getInvoiceDetails: fetchInvoiceDetails,
    getMonthlyAverage: fetchMonthlyAverage,
    getOrderPdf: fetchOrderPdf,
    getOrderAttachments: fetchOrderAttachments,
};
