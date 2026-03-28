import { InvoiceReportRow } from "../../invoice-summary-report/types";
import { SalesInvoice, CancellationRequest } from "../types";


const API_BASE = (
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ""
).replace(/\/+$/, "");

const getHeaders = () => ({
  Authorization: `Bearer ${process.env.DIRECTUS_STATIC_TOKEN}`,
  "Content-Type": "application/json",
});

/**
 * RECURSIVE FETCH ALL
 * Safely fetches all items from a Directus collection by handling pagination.
 * This is preferred over limit=-1 for stability and memory safety.
 */
async function fetchAll<T>(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<T[]> {
  let allItems: T[] = [];
  const limit = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const queryObj = {
      ...params,
      limit: String(limit),
      offset: String(offset),
    };
    const query = new URLSearchParams(queryObj).toString();

    const res = await fetch(`${API_BASE}/items/${endpoint}?${query}`, {
      headers: getHeaders(),
      cache: "no-store",
    });

    if (!res.ok) break;

    const result = await res.json();
    const data = result.data || [];
    allItems = [...allItems, ...data];

    if (data.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }
  return allItems;
}

interface InvoiceRecord {
  invoice_id: number | string;
  invoice_no: string;
  customer_code: string;
  total_amount: number;
}

interface UserRecord {
  user_id: number | string;
  user_fname: string;
  user_mname: string | null;
  user_lname: string;
}

interface CustomerRecord {
  customer_code: string;
  customer_name: string;
}

interface RequestRecord {
  request_id: number;
  invoice_id: number | string;
  reason_code: string;
  remarks: string;
  sales_order_id: string;
  status: string;
  date_approved: string;
  approved_by: number | null;
  created_at: string;
}

export const InvoiceService = {
  /**
   * Discovery (CSR View)
   * Fetches invoices eligible for cancellation.
   */
  async getInvoicesForCancellation(): Promise<SalesInvoice[]> {
    return await fetchAll<SalesInvoice>("sales_invoice", {
      "filter[transaction_status][_eq]": "For Dispatch",
      "filter[sales_type][_eq]": "1",
      fields:
        "order_id,invoice_id,invoice_no,customer_code,total_amount,transaction_status,sales_type",
    });
  },

  /**
   * Submission (CSR Action)
   */
  async requestCancellation(payload: Partial<CancellationRequest>) {
    const reqRes = await fetch(
      `${API_BASE}/items/invoice_cancellation_requests`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ ...payload, status: "PENDING" }),
      },
    );

    if (!reqRes.ok) {
      const errData = await reqRes.json();
      throw new Error(
        errData.errors?.[0]?.message || "Failed to create request",
      );
    }

    const createdRequest = await reqRes.json();
    const requestId = createdRequest.data.request_id;

    const invRes = await fetch(
      `${API_BASE}/items/sales_invoice/${payload.invoice_id}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ transaction_status: "PENDING CANCEL" }),
      },
    );

    if (!invRes.ok) {
      await fetch(
        `${API_BASE}/items/invoice_cancellation_requests/${requestId}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        },
      );
      throw new Error("Could not lock invoice. Request rolled back.");
    }

    return createdRequest;
  },

  /**
   * Approval Execution
   */
  async approveRequest(
    requestId: number,
    pkInvoiceId: number | string,
    orderNo: string,
    auditorId: number,
  ) {
    const timestamp = new Date().toISOString();
    // 1. Update request status
    const reqUpdate = await fetch(
      `${API_BASE}/items/invoice_cancellation_requests/${requestId}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          status: "APPROVED",
          approved_by: auditorId, //HARDCOEDED AUDITOR ID
          action_date: new Date().toISOString(),
          date_approved: timestamp,
        }),
      },
    );
    if (!reqUpdate.ok) throw new Error("Failed to update request status");

    // 2. Update invoice status
    const invUpdate = await fetch(
      `${API_BASE}/items/sales_invoice/${pkInvoiceId}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ transaction_status: "CANCELLED" }),
      },
    );
    if (!invUpdate.ok) throw new Error("Failed to set invoice to Cancelled");

    // 3. Update related order
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orders = await fetchAll<any>("sales_order", {
      "filter[order_no][_eq]": orderNo,
      fields: "order_id",
    });

    if (orders.length > 0) {
      await fetch(`${API_BASE}/items/sales_order/${orders[0].order_id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ order_status: "For Invoicing" }),
      });
    }
  },

  /**
   * Rejection
   */
  async rejectRequest(requestId: number, pkInvoiceId: number | string) {
    await fetch(
      `${API_BASE}/items/invoice_cancellation_requests/${requestId}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          status: "REJECTED",
          action_date: new Date().toISOString(),
        }),
      },
    );

    const invRes = await fetch(
      `${API_BASE}/items/sales_invoice/${pkInvoiceId}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ transaction_status: "For Dispatch" }),
      },
    );

    if (!invRes.ok) throw new Error("Could not return invoice to CSR");
  },

  /**
   * AUDIT VIEW (Refactored for fetchAll)
   * Fetches all pending requests and merges with invoice details.
   */
  async getAllRequests(): Promise<CancellationRequest[]> {
    // 1. Fetch pending requests and all invoices in parallel
    const allRequests = await fetchAll<RequestRecord>("invoice_cancellation_requests", {
      "filter[status][_in]": "PENDING,APPROVED,REJECTED",
      fields:
        "request_id,invoice_id,reason_code,remarks,sales_order_id,status,date_approved",
      sort: "-date_approved",
    });

    if (allRequests.length === 0) return [];

    const invoiceIds = [...new Set(allRequests.map((r) => r.invoice_id))];

    const relevantInvoices = await fetchAll<InvoiceRecord>("sales_invoice", {
      "filter[invoice_id][_in]": invoiceIds.join(","),
      fields: "invoice_id,invoice_no,customer_code,total_amount",
    });

    const invoiceMap = new Map(
      relevantInvoices.map((inv) => [String(inv.invoice_id), inv]),
    );

    // 3. Merge data
    return allRequests.map((req) => {
      const inv = invoiceMap.get(String(req.invoice_id));
      return {
        ...req,
        id: req.request_id,
        invoice_no: inv?.invoice_no || "N/A",
        customer_code: inv?.customer_code || "N/A",
        total_amount: inv?.total_amount || 0,
        order_no: req.sales_order_id,
        date_approved: req.date_approved,
      } as unknown as CancellationRequest;
    });
  },
  /**
   * REPORT VIEW DATA
   * Fetches data and maps it to the InvoiceReportRow format
   */
  async getReportViewData(): Promise<InvoiceReportRow[]> {
    // 1. Fetch raw requests with necessary fields
    const requests = await fetchAll<RequestRecord>("invoice_cancellation_requests", {
      fields:
        "invoice_id,reason_code,remarks,sales_order_id,status,date_approved,approved_by,created_at",
      sort: "-created_at", // Added sorting: newest first
    });

    if (requests.length === 0) return [];

    // 2. Fetch Invoices and Custom Users in parallel
    const [invoices, users, customers] = await Promise.all([
      fetchAll<InvoiceRecord>("sales_invoice", {
        fields: "invoice_id,customer_code,total_amount",
      }),
      fetchAll<UserRecord>("user", {
        fields: "user_id,user_fname,user_mname,user_lname",
      }),
      fetchAll<CustomerRecord>("customer", {
        fields: "customer_code,customer_name",
      }),
    ]);

    // 3. Create Maps for O(1) efficiency
    const invoiceMap = new Map(
      invoices.map((inv) => [String(inv.invoice_id), inv]),
    );
    const userMap = new Map(users.map((u) => [String(u.user_id), u]));
    const customerMap = new Map(
      customers.map((c) => [String(c.customer_code), c.customer_name]),
    );

    // 4. Map to the final row format
    return requests.map((req) => {
      const inv = invoiceMap.get(String(req.invoice_id));
      const userId = req.approved_by ? String(req.approved_by) : null;

      // Get the name from our new customerMap using the code from the invoice
      const custName = inv?.customer_code
        ? customerMap.get(String(inv.customer_code))
        : "N/A";

      let fullName = null;
      if (String(req.approved_by) === "1") {
        fullName = "Andrei Jam Bacho Siapno";
      } else if (userId) {
        const user = userMap.get(userId);
        if (user) {
          fullName =
            `${user.user_fname || ""} ${user.user_mname ? user.user_mname + " " : ""}${user.user_lname || ""}`.trim();
        }
      }

      return {
        date_time: req.created_at || req.date_approved || null,
        original_invoice: Number(req.invoice_id),
        sales_order_no: req.sales_order_id || "N/A",
        customer_name: custName || inv?.customer_code || "N/A",
        amount: Number(inv?.total_amount) || 0,
        defect_reason: req.reason_code || "Uncategorized",
        csr_remarks: req.remarks || null,
        approver: fullName || (req.status === "PENDING" ? "Waiting..." : "N/A"),
        status: req.status as "PENDING" | "APPROVED" | "REJECTED",
      };
    });
  },
};
