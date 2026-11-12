"use client";

import SalesOrderWorkspace from "./SalesOrderWorkspace";
import { createSalesOrderProvider } from "./providers/fetchProvider";

const base = "/api/crm/customer-hub/salesman-sales-order";
const shared = createSalesOrderProvider(base);
const provider = {
    ...shared,
    searchProducts: async (...args: Parameters<typeof shared.searchProducts>) => {
        const [search, code, supplier, priceType, customer, priceTypeId, account, branch] = args;
        const query = new URLSearchParams({ action: "products", search, customer_code: code,
            supplier_id: String(supplier), customer_id: String(customer), price_type: priceType,
            price_type_id: String(priceTypeId || ""), salesman_id: account || "", branch_id: branch || "" });
        const response = await fetch(`${base}?${query}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Product access denied");
        return data;
    },
    getSalesmen: async () => {
        const response = await fetch(`${base}?action=salesmen`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Salesman access denied");
        return data;
    },
    // Deletions are deferred to authorized order synchronization, never a GET mutation.
    getCartInventory: async (...args: Parameters<typeof shared.getCartInventory>) => {
        const [branch, supplier, account] = args;
        const query = new URLSearchParams({ action: "cart_inventory", branch_id: String(branch), supplier_id: String(supplier), salesman_id: String(account || "") });
        const response = await fetch(`${base}?${query}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Inventory verification failed");
        return data;
    },
    deleteOrderItem: async () => ({ success: true }),
};

export default function SalesmanSalesOrderModule() {
    return <><p className="mb-4 text-sm text-muted-foreground">Allocation is calculated from available stock and is not editable here. Checkout net amounts reflect allocated quantities; zero-stock orders remain Draft.</p><SalesOrderWorkspace provider={provider} /></>;
}
