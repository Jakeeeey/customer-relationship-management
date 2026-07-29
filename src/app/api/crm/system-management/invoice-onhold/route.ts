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
        const filter = encodeURIComponent(JSON.stringify({
            order_status: { _eq: "For Invoicing" }
        }));
        
        // Fetch all fields we need for the table
        const fields = "order_id,order_no,po_no,customer_code,total_amount,order_status,order_date,created_date";
        
        const res = await fetch(`${DIRECTUS_URL}/items/sales_order?filter=${filter}&fields=${fields}&limit=-1`, {
            headers: fetchHeaders,
            cache: "no-store",
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error("[Invoice Onhold] Directus GET Error:", errorText);
            return NextResponse.json({ ok: false, message: "Failed to fetch sales orders" }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data.data || []);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("[Invoice Onhold] GET Exception:", errorMessage);
        return NextResponse.json({ ok: false, message: "Internal Server Error", detail: errorMessage }, { status: 500 });
    }
}
