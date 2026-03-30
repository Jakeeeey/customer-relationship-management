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

export async function getOrderHeader(orderId: number) {
    const res = await fetch(`/api/crm/customer-hub/sales-order-approval?type=order-header&orderId=${orderId}&_t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch order header");
    const json = await res.json();
    return json.data;
}

export async function getOrderDetails(orderId: number, branchId?: number | string) {
    let url = `/api/crm/customer-hub/sales-order-approval?type=order-details&orderId=${orderId}`;
    if (branchId) url += `&branchId=${branchId}`;
    // Cache-bust para laging fresh data ang makuha
    url += `&_t=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch order details");
    const json = await res.json();
    return json.data || [];
}

export async function getOrderAttachments(orderId: number, orderNo: string) {
    const res = await fetch(`/api/crm/customer-hub/sales-order-approval?type=attachments&orderId=${orderId}&orderNo=${encodeURIComponent(orderNo)}`);
    if (!res.ok) throw new Error("Failed to fetch order attachments");
    const json = await res.json();
    return json.data || [];
}

export async function getInvoiceDetails(orderId: number, orderNo: string) {
    const res = await fetch(`/api/crm/customer-hub/sales-order-approval?type=invoice-details&orderId=${orderId}&orderNo=${encodeURIComponent(orderNo)}`);
    if (!res.ok) throw new Error("Failed to fetch invoice details");
    const json = await res.json();
    return json.data; // Returns { invoice, details } or null
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
    action: "approve" | "hold" | "cancel" | "submit_for_approval"
) {
    const res = await fetch(`/api/crm/customer-hub/sales-order-approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds, action }),
    });
    if (!res.ok) throw new Error(`Failed to ${action} orders`);
    return await res.json();
}

export async function approveOrders(orderIds: (string | number)[]) {
    return updateOrders(orderIds, "approve");
}

export async function updateOrderDetails(
    orderId: number,
    headerUpdates: Record<string, string | number | boolean | null | undefined>,
    lineItems: { detail_id: number; order_detail_id: number; allocated_quantity: number; net_amount: number; discount_amount: number; gross_amount: number }[]
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
