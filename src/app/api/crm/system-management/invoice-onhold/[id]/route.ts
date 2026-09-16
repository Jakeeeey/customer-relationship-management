import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

const fetchHeaders = {
    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    "Content-Type": "application/json",
};

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        if (!id) {
            return NextResponse.json({ ok: false, message: "Order ID is required" }, { status: 400 });
        }

        // Current ISO string to act as the timestamp
        const onHoldAt = new Date().toISOString();

        const body = await req.json().catch(() => ({}));

        const payload = {
            order_status: "On Hold",
            on_hold_at: onHoldAt,
            onhold_csr_remarks: body.onhold_csr_remarks || "",
            on_hold_by_dept: body.on_hold_by_dept || "csr",
        };

        const res = await fetch(`${DIRECTUS_URL}/items/sales_order/${id}`, {
            method: "PATCH",
            headers: fetchHeaders,
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`[Invoice Onhold] Directus PATCH Error for ${id}:`, errorText);
            return NextResponse.json({ ok: false, message: "Failed to update order status" }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json({ ok: true, data: data.data });
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("[Invoice Onhold] PATCH Exception:", errorMessage);
        return NextResponse.json({ ok: false, message: "Internal Server Error", detail: errorMessage }, { status: 500 });
    }
}
