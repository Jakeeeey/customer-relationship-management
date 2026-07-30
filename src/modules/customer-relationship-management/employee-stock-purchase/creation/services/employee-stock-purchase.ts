import { EmployeeStockPurchase } from "../types";
import { fetchWithRetry } from "@/modules/customer-relationship-management/customer-management/customer/fetch-with-retry";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const COLLECTIONS = {
    EMPLOYEE_STOCK_PURCHASE: "employee_stock_purchase",
    DR_PAYMENT: "dr_payment",
};

const getToken = () => {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    if (!token) throw new Error("DIRECTUS_STATIC_TOKEN is missing");
    return token;
};

export async function fetchAllEmployeeStockPurchases(
    page: number = 1,
    pageSize: number = 10,
    searchQuery: string = "",
    company: string = "",
    employee: string = "",
    date: string = ""
): Promise<{ data: EmployeeStockPurchase[]; meta: Record<string, unknown> }> {
    const token = getToken();
    const offset = (page - 1) * pageSize;
    
    const params = new URLSearchParams();
    params.append("limit", pageSize.toString());
    params.append("offset", offset.toString());
    params.append("meta", "*");
    params.append("sort", "-purchase_id");
    
    if (searchQuery) {
        params.append("filter[_or][0][employee_name][_icontains]", searchQuery);
        params.append("filter[_or][1][company_name][_icontains]", searchQuery);
        params.append("filter[_or][2][manual_invoice_no][_icontains]", searchQuery);
    }
    
    if (company) {
        params.append("filter[company_name][_icontains]", company);
    }
    if (employee) {
        params.append("filter[employee_name][_icontains]", employee);
    }
    if (date) {
        params.append("filter[created_at][_starts_with]", date);
    }
    
    const url = `${DIRECTUS_URL}/items/${COLLECTIONS.EMPLOYEE_STOCK_PURCHASE}?${params.toString()}`;
    const res = await fetchWithRetry(url, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error(`Error fetching employee stock purchases: ${res.statusText}`);
    
    const json = await res.json();
    return {
        data: json.data || [],
        meta: json.meta || {}
    };
}

export async function createEmployeeStockPurchase(payload: Record<string, unknown>, userId?: number): Promise<EmployeeStockPurchase> {
    const token = getToken();
    
    // 1. Fetch company config for cross-directus communication
    const companyRes = await fetchWithRetry(`${DIRECTUS_URL}/items/company_list/${payload.company_id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
    });
    if (!companyRes.ok) {
        throw new Error("Failed to fetch company details for cross-directus communication.");
    }
    const companyData = await companyRes.json();
    const company = companyData.data;

    if (!company || !company.directus || !company.directus_token) {
        throw new Error("Selected company is missing specific Directus URL or token in company_list.");
    }

    const targetDirectusUrl = company.directus.replace(/\/+$/, "");
    const targetDirectusToken = company.directus_token;
    
    // 2. Create dr_payment entry in the company database
    const currentDate = new Date().toISOString().split('T')[0];
    const drPaymentPayload = {
        delivery_receipt_number: payload.manual_invoice_no || String(payload.invoice_id) || "N/A",
        employee_id: payload.user_id,
        cutoff_from: currentDate,
        cutoff_to: currentDate,
        payment_date: currentDate,
        amount_paid: payload.amount,
        payment_method: "PAYROLL_DEDUCTION",
        remarks: payload.remarks || "Employee Stock Purchase",
        created_by: userId || null
    };

    const drRes = await fetchWithRetry(`${targetDirectusUrl}/items/${COLLECTIONS.DR_PAYMENT}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${targetDirectusToken}`
        },
        body: JSON.stringify(drPaymentPayload)
    });

    if (!drRes.ok) {
        const errorText = await drRes.text();
        throw new Error(`Failed to create dr_payment in company database: ${errorText}`);
    }

    const drJson = await drRes.json();
    const drPaymentId = drJson.data.dr_payment_id || drJson.data.id;

    // 2. Create employee_stock_purchase entry
    const espPayload = {
        company_id: payload.company_id,
        company_name: payload.company_name, // Optional, could be joined later
        user_id: payload.user_id,
        employee_name: payload.employee_name, // Optional
        invoice_id: payload.invoice_id || null,
        manual_invoice_no: payload.manual_invoice_no || null,
        customer_code: payload.customer_code || null,
        dr_payment_id: drPaymentId,
        amount: payload.amount,
        status: payload.status || "PENDING",
        remarks: payload.remarks || null,
        created_by: userId || null
    };

    const espRes = await fetchWithRetry(`${DIRECTUS_URL}/items/${COLLECTIONS.EMPLOYEE_STOCK_PURCHASE}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(espPayload)
    });

    if (!espRes.ok) {
        const errorText = await espRes.text();
        throw new Error(`Failed to create employee_stock_purchase: ${errorText}`);
    }

    const espJson = await espRes.json();
    return espJson.data;
}
