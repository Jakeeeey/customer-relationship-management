import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        
        // Extract filters
        const branch = searchParams.get("branch") || "";
        const supplier = searchParams.get("supplier") || "";
        const category = searchParams.get("category") || "";
        const brand = searchParams.get("brand") || "";
        const current = searchParams.get("current");
        const page = searchParams.get("page") || "0";
        const size = searchParams.get("size") || "20";

        const baseUrl = process.env.SPRING_API_BASE_URL;
        if (!baseUrl) {
             throw new Error("SPRING_API_BASE_URL is not defined in the environment variables.");
        }

        // Construct external URL
        // Ensure SPRING_API_BASE_URL doesn't double up on /api if the user included it
        const cleanBaseUrl = baseUrl.replace(/\/$/, "");
        const path = process.env.SPRING_API_INVENTORY_PATH || "/api/view-inventory-current-allocated/filter";
        const externalApiUrl = new URL(`${cleanBaseUrl}${path}`);
        
        // Helper to check if value is a valid filter (not "all", "N/A", etc.)
        const isValid = (val: string) => val && val.toLowerCase() !== "all" && val.toLowerCase() !== "n/a";

        if (isValid(branch)) externalApiUrl.searchParams.append("branch", branch);
        if (isValid(supplier)) externalApiUrl.searchParams.append("supplier", supplier);
        if (isValid(category)) externalApiUrl.searchParams.append("category", category);
        if (isValid(brand)) externalApiUrl.searchParams.append("brand", brand);
        if (current) externalApiUrl.searchParams.append("current", current);
        if (page) externalApiUrl.searchParams.append("page", page);
        if (size) externalApiUrl.searchParams.append("size", size);

        const cookieStore = await cookies();
        const token = cookieStore.get("vos_access_token")?.value;

        // --- DEBUG LOGGING ---
        console.log(`[InventoryReport Debug] Token present: ${!!token}`);
        if (token) {
            console.log(`[InventoryReport Debug] Token Length: ${token.length}`);
            console.log(`[InventoryReport Debug] Token Start: ${token.substring(0, 10)}...`);
            console.log(`[InventoryReport Debug] Token End: ...${token.substring(token.length - 10)}`);
        } else {
            console.warn(`[InventoryReport Debug] NO TOKEN FOUND in "vos_access_token" cookie.`);
        }
        // ---------------------

        const headers: HeadersInit = {
            "Accept": "application/json",
        };

        if (token) {
            const sanitizedToken = token.trim();
            headers["Authorization"] = `Bearer ${sanitizedToken}`;
            console.log(`[InventoryReport Debug] Auth Header set: Bearer ${sanitizedToken.substring(0, 10)}...`);
        } else {
            console.warn("[InventoryReport Debug] Attaching NO Authorization header!");
        }

        // Bypassing Next.js payload limits by streaming directly to the client
        // 10-minute timeout for massive datasets (110MB+)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600000); 

        console.log(`[InventoryReport] Proxying to: ${externalApiUrl.toString()}`);

        const res = await fetch(externalApiUrl.toString(), { 
            cache: "no-store",
            headers,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`[InventoryReport Backend Error] Status: ${res.status}, Body: ${errorText}`);
            throw new Error(`Springboot API error: ${res.status} ${errorText} (URL: ${externalApiUrl.toString()}, TokenPresent: ${!!token})`);
        }

        // Return a response that streams directly from the source to the client
        return new NextResponse(res.body, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store, no-cache, must-revalidate",
            }
        });

    } catch (e: any) {
        console.error("[InventoryReport Route Error]:", e.message);
        
        const isTimeout = e?.name === "AbortError" || e?.message?.includes("timeout") || e?.message?.includes("fetch failed");
        
        return NextResponse.json(
            { 
               error: "Failed to fetch inventory report", 
               message: isTimeout 
                    ? "Connection to SpringBoot API timed out. The dataset may be too large or the server is unreachable." 
                    : (e?.message || "Unknown error"),
               data: [], 
               isTimeout: isTimeout
            },
            { status: e?.message?.includes("Springboot API error: 401") ? 401 : (isTimeout ? 504 : 500) }
        );
    }
}