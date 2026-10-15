import { SolarQuotation, SolarFormInput, SolarCalculationResult } from "../types/solar.schema";

const API_BASE = "/api/crm/solar";

export interface CreateQuotationPayload {
  input: SolarFormInput;
  calculation: SolarCalculationResult;
  customer?: {
    customer_name?: string;
    customer_code?: string;
    store_name?: string;
    city?: string;
    province?: string;
    contact_number?: string;
  };
}

export const solarService = {
  async getAll(): Promise<SolarQuotation[]> {
    const res = await fetch(API_BASE, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch solar quotations: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data || [];
  },

  async getById(id: string | number): Promise<SolarQuotation> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch quotation ${id}`);
    }
    const json = await res.json();
    return json.data;
  },

  async create(payload: CreateQuotationPayload): Promise<SolarQuotation> {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to create solar quotation");
    }
    const json = await res.json();
    return json.data;
  },

  async delete(id: string | number): Promise<boolean> {
    const res = await fetch(`${API_BASE}?id=${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error(`Failed to delete quotation ${id}`);
    }
    return true;
  },
};
