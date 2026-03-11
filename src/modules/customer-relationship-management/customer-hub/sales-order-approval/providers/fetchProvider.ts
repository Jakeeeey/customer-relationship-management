export async function getPendingOrders(status: string = "For Approval", search: string = "", page: number = 1, limit: number = 50, startDate: string = "", endDate: string = "") {
    const params = new URLSearchParams({
        type: "orders",
        status,
        search,
        page: page.toString(),
        limit: limit.toString()
    });

    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const res = await fetch(`/api/crm/customer-hub/sales-order-approval?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch pending orders");
    const json = await res.json();
    return json; // Returns { data, metadata: { page, limit, totalCount, hasMore } }
}

export async function getOrderDetails(orderId: number) {
    const res = await fetch(`/api/crm/customer-hub/sales-order-approval?type=order-details&orderId=${orderId}`);
    if (!res.ok) throw new Error("Failed to fetch order details");
    const json = await res.json();
    return json.data || [];
}

export async function getPaymentSummary(orderIds: (string | number)[], orderNos: string[] = []) {
    if (!orderIds || orderIds.length === 0) return { invoiceTotal: 0, paidTotal: 0, unpaidTotal: 0 };

    const idsStr = orderIds.join(',');
    let url = `/api/crm/customer-hub/sales-order-approval?type=payment-summary&orderIds=${encodeURIComponent(idsStr)}`;
    if (orderNos && orderNos.length > 0) {
        url += `&orderNos=${encodeURIComponent(orderNos.join(','))}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch payment summary");
    const json = await res.json();
    return json.data || { invoiceTotal: 0, paidTotal: 0, unpaidTotal: 0 };
}

export async function updateOrders(
    orderIds: (string | number)[],
    action: "approve" | "hold" | "cancel"
) {
    const res = await fetch(`/api/crm/customer-hub/sales-order-approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds, action }),
    });
    if (!res.ok) throw new Error(`Failed to ${action} orders`);
    return await res.json();
}

export async function updateOrderDetails(
    orderId: number,
    headerUpdates: Record<string, any>,
    lineItems: any[]
) {
    const res = await fetch(`/api/crm/customer-hub/sales-order-approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            orderId,
            header: headerUpdates,
            lineItems,
            type: "order-update"
        }),
    });
    if (!res.ok) throw new Error("Failed to update order details");
    return await res.json();
}
