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
        throw new Error("Failed to fetch sales order data");
    }
    return response.json() as Promise<SalesOrderDataResponse>;
};
