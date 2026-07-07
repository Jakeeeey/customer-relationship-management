import { Salesman, Supplier, PriceListItem, Category, Segment } from "../types";

const BASE_URL = "/api/crm/printables/price-printables";

export const fetchProvider = {
    async getSalesmen(): Promise<Salesman[]> {
        const res = await fetch(`${BASE_URL}?action=salesmen`);
        if (!res.ok) throw new Error("Failed to fetch salesmen");
        return await res.json();
    },

    async getSuppliers(): Promise<Supplier[]> {
        const res = await fetch(`${BASE_URL}?action=suppliers`);
        if (!res.ok) throw new Error("Failed to fetch suppliers");
        return await res.json();
    },

    async getCategories(): Promise<Category[]> {
        const res = await fetch(`${BASE_URL}?action=categories`);
        if (!res.ok) throw new Error("Failed to fetch categories");
        return await res.json();
    },

    async getSegments(): Promise<Segment[]> {
        const res = await fetch(`${BASE_URL}?action=segments`);
        if (!res.ok) throw new Error("Failed to fetch segments");
        return await res.json();
    },

    async getPriceList(
        salesmanId: number, 
        supplierInput: string, 
        segmentInput: string, 
        categoryInput: number | "All"
    ): Promise<PriceListItem[]> {
        const params = new URLSearchParams({
            salesmanId: String(salesmanId),
            supplierInput,
            segmentInput,
            categoryInput: String(categoryInput)
        });
        const res = await fetch(`${BASE_URL}?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch price list");
        return await res.json();
    }
};
