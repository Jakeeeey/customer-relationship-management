import { NextRequest, NextResponse } from "next/server";
import { fetchWithRetry } from "@/modules/customer-relationship-management/customer-management/customer/fetch-with-retry";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function GET(req: NextRequest) {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    if (!token) return NextResponse.json({ error: "Server Error: DIRECTUS_STATIC_TOKEN is missing" }, { status: 500 });

    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type");
        const companyId = searchParams.get("companyId");

        const headers = { Authorization: `Bearer ${token}` };

        if (type === "companies") {
            const res = await fetchWithRetry(`${DIRECTUS_URL}/items/company_list?limit=-1`, { headers, cache: 'no-store' });
            if (!res.ok) throw new Error("Failed to fetch companies");
            const data = await res.json();
            return NextResponse.json(data.data || []);
        }

        if (type === "users") {
            if (!companyId) {
                return NextResponse.json([]);
            }

            // Fetch the company details to get directus URL and token
            const companyRes = await fetchWithRetry(`${DIRECTUS_URL}/items/company_list/${companyId}`, { headers, cache: 'no-store' });
            if (!companyRes.ok) throw new Error("Failed to fetch company details");
            const companyData = await companyRes.json();
            const company = companyData.data;

            if (!company || !company.directus || !company.directus_token) {
                console.warn(`Company ${companyId} is missing directus URL or token. Returning empty users list.`);
                return NextResponse.json([]);
            }
            
            const params = new URLSearchParams();
            params.append("limit", "-1");
            params.append("filter[is_deleted][_neq]", "1");
            params.append("filter[isDeleted][_neq]", "1");
            params.append("filter[is_blocked][_neq]", "1");
            
            const companyHeaders = { Authorization: `Bearer ${company.directus_token}` };
            const directusUrl = company.directus.replace(/\/+$/, "");
            const res = await fetchWithRetry(`${directusUrl}/items/user?${params.toString()}`, { headers: companyHeaders, cache: 'no-store' });
            
            if (!res.ok) throw new Error("Failed to fetch users from company Directus");
            const data = await res.json();
            return NextResponse.json(data.data || []);
        }

        if (type === "invoices") {
            // Fetch unpaid invoices
            const params = new URLSearchParams();
            params.append("limit", "100");
            params.append("filter[transaction_status][_neq]", "Paid");
            // Optional: filter by customer
            const customerCode = searchParams.get("customerCode");
            if (customerCode) {
                params.append("filter[customer_code][_eq]", customerCode);
            }
            
            const res = await fetchWithRetry(`${DIRECTUS_URL}/items/sales_invoice?${params.toString()}`, { headers, cache: 'no-store' });
            if (!res.ok) throw new Error("Failed to fetch invoices");
            const data = await res.json();
            return NextResponse.json(data.data || []);
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    } catch (e) {
        console.error("Options GET error:", e);
        return NextResponse.json(
            { error: "Failed to fetch options", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}
