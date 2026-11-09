import { InvoiceType } from "../types";
import { DiscountType, ORTemplate } from "../types/print";

export interface TemplateRecord {
    id: number;
    sales_invoice_type_id: number;
    name: string;
    is_default: boolean;
    template_config: ORTemplate;
}

export const StockPurchasePrintService = {
    async getDiscountTypes(): Promise<DiscountType[]> {
        const response = await fetch(`/api/crm/customer-hub/stock-purchase?type=discount_types`);
        if (!response.ok) throw new Error("Failed to fetch discount types");
        return response.json();
    },

    async getReceiptTypes(): Promise<InvoiceType[]> {
        const response = await fetch(`/api/crm/customer-hub/stock-purchase?type=receipt_types`);
        if (!response.ok) throw new Error("Failed to fetch receipt types");
        return response.json();
    },

    async getTemplate(typeId: number): Promise<ORTemplate | null> {
        const response = await fetch(`/api/crm/customer-hub/stock-purchase/templates/${typeId}`);
        if (!response.ok) {
            // fallback to older query
            const fallback = await fetch(`/api/crm/customer-hub/stock-purchase?type=template&id=${typeId}`);
            if (!fallback.ok) return null;
            const data = await fallback.json();
            return data.template_config;
        }
        const data = await response.json();
        return data.template_config;
    },

    async getTemplates(typeId?: number): Promise<TemplateRecord[]> {
        const url = typeId 
            ? `/api/crm/customer-hub/stock-purchase/templates?typeId=${typeId}`
            : `/api/crm/customer-hub/stock-purchase/templates`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch template list");
        const data = await response.json();
        return data.data || [];
    },

    async createTemplate(payload: { sales_invoice_type_id: number; name: string; is_default?: boolean; template_config: ORTemplate }): Promise<{ success: boolean; data: TemplateRecord }> {
        const response = await fetch(`/api/crm/customer-hub/stock-purchase/templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || errData.details || "Failed to create template");
        }
        return response.json();
    },

    async updateTemplate(id: number, payload: { name?: string; is_default?: boolean; template_config?: ORTemplate; sales_invoice_type_id?: number }): Promise<{ success: boolean; data: unknown }> {
        const response = await fetch(`/api/crm/customer-hub/stock-purchase/templates/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || errData.details || "Failed to update template");
        }
        return response.json();
    },

    async deleteTemplate(id: number): Promise<{ success: boolean }> {
        const response = await fetch(`/api/crm/customer-hub/stock-purchase/templates/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || errData.details || "Failed to delete template");
        }
        return response.json();
    },

    async saveTemplate(typeId: number, templateConfig: ORTemplate): Promise<{ success: boolean; data: unknown }> {
        const response = await fetch(`/api/crm/customer-hub/stock-purchase/templates/${typeId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ template_config: templateConfig })
        });
        
        if (!response.ok) {
            // fallback to older query
            const fallback = await fetch(`/api/crm/customer-hub/stock-purchase?type=template&id=${typeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ template_config: templateConfig })
            });
            if (!fallback.ok) throw new Error("Failed to save template");
            return fallback.json();
        }
        return response.json();
    },

    async uploadFile(file: File): Promise<string> {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/crm/customer-hub/stock-purchase?type=upload", {
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
        return `/api/crm/customer-hub/stock-purchase?type=asset&id=${val}`;
    },
};
