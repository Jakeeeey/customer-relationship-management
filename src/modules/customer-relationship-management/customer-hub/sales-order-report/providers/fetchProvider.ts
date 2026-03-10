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

export const deleteSalesOrder = async (orderId: number) => {
    const response = await fetch(`/api/crm/customer-hub/sales-order-report?orderId=${orderId}`, {
        method: "DELETE",
    });
    if (!response.ok) {
        let errText = "Failed to delete sales order";
        try {
            const errJson = await response.json();
            errText = errJson.error || errJson.message || JSON.stringify(errJson);
        } catch {
            errText = await response.text() || response.statusText;
        }
        throw new Error(errText);
    }
    return response.json();
};

export const salesOrderProvider = {
    getSalesOrderDetails: fetchSalesOrderDetails,
    getMonthlyAverage: fetchMonthlyAverage,
    deleteSalesOrder
};
