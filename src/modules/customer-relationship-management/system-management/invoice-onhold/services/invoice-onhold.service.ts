import { InvoiceOnholdData, InvoiceOnholdResponseSchema } from "../types/invoice-onhold.schema";

export const invoiceOnholdService = {
  /**
   * Fetches all sales orders that are currently "For Invoicing".
   */
  async fetchForInvoicingOrders(): Promise<InvoiceOnholdData[]> {
    const response = await fetch("/api/crm/system-management/invoice-onhold");

    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Validate with Zod
    const parsed = InvoiceOnholdResponseSchema.safeParse(data);
    if (!parsed.success) {
      console.error("[invoiceOnholdService] Schema validation failed:", parsed.error);
      throw new Error("Invalid data format received from server");
    }

    return parsed.data;
  },

  /**
   * Puts a specific sales order on hold by its ID.
   */
  async putOrderOnHold(id: string | number): Promise<void> {
    const response = await fetch(`/api/crm/system-management/invoice-onhold/${id}`, {
      method: "PATCH",
    });

    if (!response.ok) {
      throw new Error(`Failed to put order on hold: ${response.statusText}`);
    }
  },
};
