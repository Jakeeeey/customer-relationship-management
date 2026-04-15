import { NextRequest, NextResponse } from "next/server";
// 🚀 THIS IS THE IMPORT YOU WERE MISSING!
import { cookies } from "next/headers";

export const runtime = "nodejs";

// Define interfaces for better type safety
interface Customer {
    customerCode?: string;
    customerName?: string; // 🚀 NEW
}
interface SalesOrder {
    orderNo?: string;
    orderId?: string;
}

interface Invoice {
    invoiceId?: number;
    invoiceNo?: string;
    totalAmount?: number;
    salesOrder?: SalesOrder;
    customer?: Customer;
}

interface RawReport {
    requestId?: number;
    id?: number;
    invoiceId?: number;
    invoice_id?: number;
    salesOrderId?: string;
    sales_order_id?: string;
    reasonCode?: string;
    reason_code?: string;
    reason?: string;
    remarks?: string;
    status?: string;
    dateApproved?: string | null;
    date_approved?: string | null;
    invoiceNo?: string;
    invoice_no?: string;
    customerCode?: string;
    customer_code?: string;
    customerName?: string; // 🚀 NEW
    customer_name?: string; // 🚀 NEW
    totalAmount?: number;
    total_amount?: number;
    salesInvoice?: Invoice;
    invoice?: Invoice;
    salesOrder?: SalesOrder;
    order?: SalesOrder;
    customer?: Customer;
}

interface FormattedReport {
    id: number;
    invoice_id: number;
    sales_order_id: string;
    reason_code: string;
    remarks: string;
    status: string;
    date_approved: string | null;
    invoice_no: string;
    customer_code: string;
    customer_name: string; // 🚀 NEW
    total_amount: number;
}

const getSpringBaseUrl = () => {
    const url = process.env.SPRING_API_BASE_URL;
    return (url || "http://localhost:8080").replace(/\/$/, "");
};

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const targetUrl = `${getSpringBaseUrl()}/api/defective-invoicing/reports?page=0&size=1000`;

    try {
        const springRes = await fetch(targetUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            cache: "no-store",
        });

        if (!springRes.ok) {
            const errText = await springRes.text();
            console.error("🔥 Spring Boot Error (Reports):", errText);
            return NextResponse.json(
                { ok: false, message: "Failed to fetch approvals from server", detail: errText },
                { status: springRes.status }
            );
        }

        const data = await springRes.json();
        const rawReports: RawReport[] = data.content || data || [];

        // 🚀 DEBUGGING: If you still see N/A, check your Next.js terminal for this log!
        if (rawReports.length > 0) {
            console.log("🔍 RAW SPRING BOOT DATA [0]:", JSON.stringify(rawReports[0], null, 2));
        }

        // 🚀 THE FIX: Aggressive Deep-Mapping for nested objects
        const formattedReports: FormattedReport[] = rawReports.map((req) => {
            const invoiceObj: Partial<Invoice> = req.salesInvoice || req.invoice || {};
            const orderObj: Partial<SalesOrder> = req.salesOrder || req.order || invoiceObj.salesOrder || {};
            const customerObj: Partial<Customer> = invoiceObj.customer || req.customer || {};

            return {
                id: req.requestId || req.id || 0,
                invoice_id: req.invoiceId || req.invoice_id || invoiceObj.invoiceId || 0,
                sales_order_id: req.salesOrderId || req.sales_order_id || orderObj.orderNo || orderObj.orderId || "N/A",
                reason_code: req.reasonCode || req.reason_code || req.reason || "N/A",
                remarks: req.remarks || "",
                status: req.status || "PENDING",
                date_approved: req.dateApproved || req.date_approved || null,
                invoice_no: req.invoiceNo || req.invoice_no || invoiceObj.invoiceNo || "N/A",
                customer_code: req.customerCode || req.customer_code || customerObj.customerCode || "N/A",
                // 🚀 Extract Customer Name Safely
                customer_name: req.customerName || req.customer_name || customerObj.customerName || "Unknown Customer",
                total_amount: req.totalAmount || req.total_amount || invoiceObj.totalAmount || 0,
            };
        });

        const pendingCount = formattedReports.filter((r) => r.status === "PENDING").length;

        return NextResponse.json({ data: formattedReports, count: pendingCount });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("🔥 BFF Network Error (Reports):", errorMessage);
        return NextResponse.json({ ok: false, message: "BFF Network Error", detail: errorMessage }, { status: 502 });
    }
}

export async function PATCH(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { action, updates } = body;

        if (!action || !updates || !Array.isArray(updates)) {
            return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 });
        }

        const results = [];

        // Process batch sequentially
        for (const update of updates) {
            let endpoint: "approve" | "reject" | undefined;
            const requestId = update.requestId || update.id;
            try {
                endpoint = action === "APPROVE" ? "approve" : "reject";

                const targetUrl = `${getSpringBaseUrl()}/api/defective-invoicing/${requestId}/${endpoint}`;

                const springPayload = {
                    actionedBy: update.auditorId || 1,
                    rejectionReason: action === "REJECT" ? "Rejected via Audit UI" : null
                };

                const springRes = await fetch(targetUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(springPayload),
                });

                if (!springRes.ok) {
                    const errorText = await springRes.text();
                    console.error(`🔥 Spring Boot Error Action (${endpoint}) on ID ${requestId}:`, errorText);
                    results.push({ id: requestId, status: "failed", error: errorText });
                } else {
                    results.push({ id: requestId, status: "success" });
                }

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                console.error(`🔥 Spring Boot Error Action (${endpoint || 'unknown'}) on ID ${requestId}:`, errorMessage);
                results.push({ id: requestId, status: "failed", error: errorMessage });
            }
        }

        const hasFailures = results.some(r => r.status === "failed");
        if (hasFailures) {
            return NextResponse.json({ ok: false, message: "Some requests failed", results }, { status: 207 });
        }

        return NextResponse.json({ ok: true, message: "Batch processed successfully" });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("🔥 BFF Network Error (Action):", errorMessage);
        return NextResponse.json({ ok: false, message: "BFF Network Error", detail: errorMessage }, { status: 502 });
    }
}
