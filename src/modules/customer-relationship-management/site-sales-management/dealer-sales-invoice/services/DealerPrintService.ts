import { InvoiceType } from "../types";
import { DiscountType, ORTemplate } from "../types/print";

export const DealerPrintService = {
    async getDiscountTypes(): Promise<DiscountType[]> {
        const response = await fetch(`/api/crm/site-sales-management/dealer-sales-invoice?type=discount_types`);
        if (!response.ok) throw new Error("Failed to fetch discount types");
        return response.json();
    },

    async getReceiptTypes(): Promise<InvoiceType[]> {
        const response = await fetch(`/api/crm/site-sales-management/dealer-sales-invoice?type=receipt_types`);
        if (!response.ok) throw new Error("Failed to fetch receipt types");
        return response.json();
    },

    async getTemplate(typeId: number): Promise<ORTemplate | null> {
        const response = await fetch(`/api/crm/site-sales-management/dealer-sales-invoice?type=template&id=${typeId}`);
        if (response.status === 404) return null;
        if (!response.ok) throw new Error("Failed to fetch template");
        const data = await response.json();
        return data.template_config ?? null;
    },

    async saveTemplate(typeId: number, templateConfig: ORTemplate): Promise<{ success: boolean; data: unknown }> {
        const response = await fetch(`/api/crm/site-sales-management/dealer-sales-invoice?type=template&id=${typeId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ template_config: templateConfig })
        });
        
        if (!response.ok) throw new Error("Failed to save template");
        return response.json();
    },

    async uploadFile(file: File): Promise<string> {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/crm/site-sales-management/dealer-sales-invoice?type=upload", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) throw new Error("Failed to upload file");
        const data = await response.json();
        return data.id;
    },

    getImageUrl(val?: string): string {
        if (!val) return "";
        if (val.startsWith("data:") || val.startsWith("http")) return val;
        return `/api/crm/site-sales-management/dealer-sales-invoice?type=asset&id=${val}`;
    },
};
