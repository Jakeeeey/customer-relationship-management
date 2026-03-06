import { SalesOrderDataResponse } from "../types";

export const fetchSalesOrderData = async (
    page: number = 1,
    pageSize: number = 15,
    filters: Record<string, string> = {}
) => {
    const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...filters
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

export const salesOrderProvider = {
    getSalesOrderDetails: fetchSalesOrderDetails
};
