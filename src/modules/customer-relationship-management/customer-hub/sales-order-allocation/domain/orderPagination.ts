export interface CustomerOrderIdentity {
    id: number;
    customer: string;
    customerCode: string;
    orderDate?: string;
    salesman?: string;
    warehouseId?: number;
    destination?: string;
}

export type OrderSort = "latest" | "earliest" | "salesman" | "warehouse" | "destination" | "customer";

export function sortAllocationOrders<T extends CustomerOrderIdentity>(orders: readonly T[], sortBy: OrderSort, warehouseNames: ReadonlyMap<number, string> = new Map()): T[] {
    return [...orders].sort((a, b) => {
        const dateOrder = (b.orderDate || "").localeCompare(a.orderDate || "") || b.id - a.id;
        if (sortBy === "latest") return dateOrder;
        if (sortBy === "earliest") return -dateOrder;
        const value = (order: T) => sortBy === "salesman" ? order.salesman || ""
            : sortBy === "warehouse" ? warehouseNames.get(order.warehouseId || 0) || (order.warehouseId === 0 ? "Warehouse not assigned" : `Warehouse ${order.warehouseId || "unknown"}`)
                : sortBy === "destination" ? order.destination || ""
                    : `${order.customer} ${order.customerCode}`;
        return value(a).localeCompare(value(b), undefined, { sensitivity: "base" }) || dateOrder;
    });
}

export interface OrderColumnPage<T> {
    items: T[];
    pageIndex: number;
    pageCount: number;
    startIndex: number;
}

export function paginateOrderColumns<T>(orders: readonly T[], requestedPage: number, pageSize: number): OrderColumnPage<T> {
    if (![5, 10, 15].includes(pageSize)) throw new Error("Order page size must be 5, 10 or 15");
    if (!Number.isSafeInteger(requestedPage) || requestedPage < 0) throw new Error("Invalid order page");
    const pageCount = Math.max(1, Math.ceil(orders.length / pageSize));
    const pageIndex = Math.min(requestedPage, pageCount - 1);
    const startIndex = pageIndex * pageSize;
    return { items: orders.slice(startIndex, startIndex + pageSize), pageIndex, pageCount, startIndex };
}

export function groupCustomerColumns<T extends CustomerOrderIdentity>(orders: readonly T[], startIndex: number, previousOrder?: CustomerOrderIdentity) {
    const groups: { customer: string; count: number; continued: boolean }[] = [];
    for (const [index, order] of orders.entries()) {
        const customer = `${order.customer} (${order.customerCode})`;
        const previous = groups[groups.length - 1];
        if (previous?.customer === customer) previous.count += 1;
        else groups.push({ customer, count: 1, continued: index === 0 && startIndex > 0 && previousOrder?.customer === order.customer && previousOrder.customerCode === order.customerCode });
    }
    return groups;
}
