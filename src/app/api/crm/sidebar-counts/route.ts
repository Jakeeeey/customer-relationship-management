import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

const fetchHeaders = {
    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    "Content-Type": "application/json",
};

export async function GET() {
    try {
        const [draftRes, forApprovalRes, callsheetRes] = await Promise.all([
            fetch(`${DIRECTUS_URL}/items/sales_order?aggregate[count]=*&filter[order_status][_eq]=Draft`, { headers: fetchHeaders, cache: 'no-store' }),
            fetch(`${DIRECTUS_URL}/items/sales_order?aggregate[count]=*&filter[order_status][_eq]=For Approval`, { headers: fetchHeaders, cache: 'no-store' }),
            fetch(`${DIRECTUS_URL}/items/sales_order_attachment?aggregate[count]=*&filter[status][_eq]=pending`, { headers: fetchHeaders, cache: 'no-store' }),
        ]);

        const draftCountJson = await draftRes.json();
        const approvalCountJson = await forApprovalRes.json();
        const callsheetCountJson = await callsheetRes.json();

        const draftCount = draftCountJson.data?.[0]?.count || 0;
        const approvalCount = approvalCountJson.data?.[0]?.count || 0;
        const callsheetCount = callsheetCountJson.data?.[0]?.count || 0;

        return NextResponse.json({
            draft: parseInt(draftCount, 10),
            approval: parseInt(approvalCount, 10),
            callsheet: parseInt(callsheetCount, 10),
        });
    } catch (e) {
        console.error("Sidebar Counts Error:", e);
        return NextResponse.json({ draft: 0, approval: 0, callsheet: 0 });
    }
}
