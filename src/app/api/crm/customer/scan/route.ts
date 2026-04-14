import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const COLLECTION = "customer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET - Specialized endpoint for duplicate scanning.
 * Fetches raw customer data without the heavy overhead of relations (like bank accounts).
 */
export async function GET(req: NextRequest) {
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    
    try {
        const { searchParams } = new URL(req.url);
        const limit = searchParams.get("limit") || "1000";
        
        const params = new URLSearchParams({
            limit: limit,
            fields: "*", // Get all customer fields for auditing
            t: Date.now().toString()
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
        const rawCustomers = data.data || [];

        // 🚀 Fetch Users to map encoder_id to names
        const usersRes = await fetch(`${DIRECTUS_URL}/items/user?fields=user_id,user_fname,user_mname,user_lname&limit=1000`, {
            cache: "no-store",
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        const userMap: Record<number, string> = {};
        if (usersRes.ok) {
            const usersData = await usersRes.json();
            (usersData.data || []).forEach((u: { user_id: number; user_fname?: string; user_mname?: string; user_lname?: string }) => {
                const parts = [u.user_fname, u.user_mname, u.user_lname].filter(p => p && p.trim() !== "");
                userMap[u.user_id] = parts.join(" ");
            });
        }

        const enrichedCustomers = rawCustomers.map((c: { 
            encoder_id: number; 
            [key: string]: unknown 
        }) => ({
            ...c,
            encoder_name: userMap[c.encoder_id] || "Unknown User"
        }));
        
        return NextResponse.json({
            customers: enrichedCustomers,
            count: enrichedCustomers.length
        });
        
    } catch (e) {
        console.error("Scan API Error:", e);
        return NextResponse.json(
            { error: "Failed to fetch scan data", message: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}
