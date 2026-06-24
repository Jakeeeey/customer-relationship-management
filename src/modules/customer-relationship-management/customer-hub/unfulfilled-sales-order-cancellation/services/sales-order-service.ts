export const SalesOrderService = {
  // CSR: Get orders eligible for cancellation
  async getUnfulfilledOrders() {
    const res = await fetch("/api/crm/customer-hub/unfulfilled-sales-order-cancellation");
    if (!res.ok) throw new Error("Failed to fetch unfulfilled orders");
    return await res.json();
  },

  // CSR: Submit a new cancellation request (status update)
  async cancelOrder(orderId: number, cancelDate: string, remarks: string) {
    const res = await fetch(`/api/crm/customer-hub/unfulfilled-sales-order-cancellation?id=${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancelled_at: cancelDate, remarks }),
    });
    if (!res.ok) throw new Error("Failed to cancel order");
    return await res.json();
  },
};
