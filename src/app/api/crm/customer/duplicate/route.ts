import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const COLLECTION = "customer_duplicate";

export const dynamic = "force-dynamic";

/**
 * GET - Fetch dismissed customer records to filter them out of the scan.
 */
export async function GET() {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    
    try {
        const params = new URLSearchParams({
            filter: JSON.stringify({
                status: { _eq: "dismissed" }
            }),
            fields: "customer_id,group_id,status",
            limit: "-1" // Get all resolved records
        });

        const url = `${DIRECTUS_URL}/items/${COLLECTION}?${params.toString()}`;
        
        const res = await fetch(url, {
            cache: "no-store",
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!res.ok) {
            throw new Error(`Directus error: ${res.statusText}`);
        }

        const data = await res.json();
        return NextResponse.json(data.data || []);
        
    } catch (e) {
        console.error("Duplicate API GET Error:", e);
        return NextResponse.json([], { status: 500 });
    }
}

/**
 * POST - Save a group resolution (Dismiss).
 * Expects: { customerIds: number[], reasons: string[], status: 'dismissed' | 'merged' }
 */
export async function POST(req: NextRequest) {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    
    try {
        const body = await req.json();
        const { customerIds, reasons, status = "dismissed" } = body;

        if (!customerIds || !Array.isArray(customerIds)) {
            return NextResponse.json({ error: "Missing customerIds" }, { status: 400 });
        }

        // Create a unique group ID for this specific resolution instance
        // Format: res_[timestamp]_[firstTwoIds]
        const groupId = `res_${Date.now()}_${customerIds.slice(0, 2).join("_")}`;
        const matchReason = Array.isArray(reasons) ? reasons.join(", ") : "Manual resolution";

        // Prepare records for bulk insert
        const records = customerIds.map(id => ({
            customer_id: id,
            group_id: groupId,
            match_reason: matchReason,
            status: status,
            detected_at: new Date().toISOString()
        }));

        const url = `${DIRECTUS_URL}/items/${COLLECTION}`;
        
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify(records)
        });

        if (!res.ok) {
            const errBody = await res.json();
            throw new Error(errBody.errors?.[0]?.message || `Directus error: ${res.statusText}`);
        }

        return NextResponse.json({ success: true, groupId });
        
    } catch (e) {
        console.error("Duplicate API POST Error:", e);
        return NextResponse.json(
            { error: "Failed to save resolution", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}
