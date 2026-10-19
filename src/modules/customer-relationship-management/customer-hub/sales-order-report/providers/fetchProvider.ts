import { SalesOrderDataResponse, SalesOrderAttachment } from "../types";

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

/**
 * Fetches callsheet attachments for a specific sales order.
 * Uses both orderId and orderNo for maximum matching coverage.
 */
export const fetchCallsheetAttachments = async (
    orderId: number,
    orderNo: string
): Promise<SalesOrderAttachment[]> => {
    const params = new URLSearchParams({
        type: "callsheet-attachments",
        orderId: orderId.toString(),
        orderNo: orderNo,
    });
    const response = await fetch(`/api/crm/customer-hub/sales-order-report?${params.toString()}`);
    if (!response.ok) {
        throw new Error("Failed to fetch callsheet attachments");
    }
    const json = await response.json();
    return json.data || [];
};

/**
 * Fetches ALL matching Sales Orders (no pagination) for print/PDF generation.
 * Uses the same filters as the main list but with limit=-1 to get every record.
 */
export const fetchAllSalesOrdersForPrint = async (
    filters: Record<string, string | number | undefined> = {}
) => {
    const cleanedFilters: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            cleanedFilters[key] = String(value);
        }
    });

    // Add a special flag so the API knows to return all records
    const queryParams = new URLSearchParams({
        ...cleanedFilters,
        printAll: "true",
    });

    const response = await fetch(`/api/crm/customer-hub/sales-order-report?${queryParams.toString()}`);
    if (!response.ok) {
        let errText = "Failed to fetch sales orders for print";
        try {
            const errJson = await response.json();
            errText = errJson.error || errJson.message || JSON.stringify(errJson);
        } catch {
            errText = await response.text() || response.statusText;
        }
        throw new Error(errText);
    }
    const data = await response.json();
    return data as { salesOrders: import("../types").SalesOrder[]; customers: import("../types").Customer[]; salesmen: import("../types").Salesman[]; branches: import("../types").Branch[]; suppliers: import("../types").Supplier[] };
};

/**
 * Fetches order line-item details for a list of order IDs (batch, for print report).
 * Returns a flat array of details keyed by order_id.
 */
export const fetchBatchOrderDetails = async (orderIds: number[]): Promise<import("../types").SalesOrderDetail[]> => {
    if (orderIds.length === 0) return [];

    const results = await Promise.all(
        orderIds.map(id =>
            fetch(`/api/crm/customer-hub/sales-order-report?orderId=${id}`)
                .then(r => r.ok ? r.json() : { data: [] })
                .then(j => (j.data || []) as import("../types").SalesOrderDetail[])
                .catch(() => [] as import("../types").SalesOrderDetail[])
        )
    );
    return results.flat();
};

export const salesOrderProvider = {
    getSalesOrderDetails: fetchSalesOrderDetails,
    getInvoiceDetails: fetchInvoiceDetails,
    getMonthlyAverage: fetchMonthlyAverage,
    getOrderPdf: fetchOrderPdf,
    getOrderAttachments: fetchOrderAttachments,
    getCallsheetAttachments: fetchCallsheetAttachments,
    getAllSalesOrdersForPrint: fetchAllSalesOrdersForPrint,
    getBatchOrderDetails: fetchBatchOrderDetails,
};
