import { Salesman, Supplier, PriceListItem } from "../types";

const BASE_URL = "/api/crm/printables/price-list-printables";

export const fetchProvider = {
    async getSalesmen(): Promise<Salesman[]> {
        const res = await fetch("/api/crm/invoicing/salesman");
        if (!res.ok) throw new Error("Failed to fetch salesmen");
        return await res.json();
    },

    async getSuppliers(): Promise<Supplier[]> {
        const res = await fetch("/api/crm/invoicing/suppliers");
        if (!res.ok) throw new Error("Failed to fetch suppliers");
        return await res.json();
    },

    async getPriceList(salesmanId: number, supplierId: number): Promise<PriceListItem[]> {
        const res = await fetch(`${BASE_URL}?salesmanId=${salesmanId}&supplierId=${supplierId}`);
        if (!res.ok) throw new Error("Failed to fetch price list");
        return await res.json();
    }
};
