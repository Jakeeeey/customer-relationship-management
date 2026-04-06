import { SalesInvoice, CancellationRequest, ApprovalParams, CancellationReportDto } from "../types";

export const InvoiceService = {
  // CSR: Get invoices eligible for cancellation
  async getInvoicesForCancellation(): Promise<SalesInvoice[]> {
    const res = await fetch("/api/crm/invoice-cancellation");
    if (!res.ok) throw new Error("Failed to fetch invoices");
    return await res.json();
  },

  // CSR: Submit a new cancellation request
  async requestCancellation(payload: Partial<CancellationRequest>) {
    const res = await fetch("/api/crm/invoice-cancellation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to submit request");
    return await res.json();
  },

  // Audit: Fetch all requests for approval queue
  async getAllRequests(): Promise<{ data: CancellationRequest[], count: number }> {
    const res = await fetch("/api/crm/invoice-cancellation-approval");
    if (!res.ok) throw new Error("Failed to fetch queue");
    return await res.json();
  },

  // Audit: Approve/Reject action
  async processAction(action: "APPROVE" | "REJECT", updates: ApprovalParams[]) {
    const res = await fetch("/api/crm/invoice-cancellation-approval", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, updates }),
    });
    if (!res.ok) throw new Error("Action failed");
    return await res.json();
  },

  // Report: Fetch cancellation report data
  async getReportData(page = 0, size = 10): Promise<{ content: CancellationReportDto[], totalElements: number }> {
    const res = await fetch(`/api/crm/invoice-summary-report?page=${page}&size=${size}`);
    if (!res.ok) throw new Error("Failed to fetch report data");
    return await res.json();
  }
};