export async function getPendingOrders(status: string = "For Approval") {
    const res = await fetch(`/api/crm/customer-hub/sales-order-approval?type=orders&status=${encodeURIComponent(status)}`);
    if (!res.ok) throw new Error("Failed to fetch pending orders");
    const json = await res.json();
    return json.data || [];
}

export async function getPaymentSummary(orderIds: (string | number)[]) {
    if (!orderIds || orderIds.length === 0) return { invoiceTotal: 0, paidTotal: 0, unpaidTotal: 0 };

    const idsStr = orderIds.join(',');
    const res = await fetch(`/api/crm/customer-hub/sales-order-approval?type=payment-summary&orderIds=${encodeURIComponent(idsStr)}`);
    if (!res.ok) throw new Error("Failed to fetch payment summary");
    const json = await res.json();
    return json.data || { invoiceTotal: 0, paidTotal: 0, unpaidTotal: 0 };
}

export async function approveOrders(orderIds: (string | number)[]) {
    const res = await fetch(`/api/crm/customer-hub/sales-order-approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // User spec mentioned "Approve Selected" sets it to "For Consolidation"
        body: JSON.stringify({ orderIds, action: "approve" })
    });

    if (!res.ok) throw new Error("Failed to approve orders");
    return await res.json();
}
