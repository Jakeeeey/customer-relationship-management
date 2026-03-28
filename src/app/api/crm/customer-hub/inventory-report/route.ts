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

        const baseUrl = process.env.SPRING_API_BASE_URL;
        if (!baseUrl) {
             throw new Error("SPRING_API_BASE_URL is not defined in the environment variables.");
        }

        // Construct external URL
        const externalApiUrl = new URL(`${baseUrl}/api/view-inventory-current-allocated/filter`);
        
        // Helper to check if value is a valid filter (not "all", "N/A", etc.)
        const isValid = (val: string) => val && val.toLowerCase() !== "all" && val.toLowerCase() !== "n/a";

        if (isValid(branch)) externalApiUrl.searchParams.append("branch", branch);
        if (isValid(supplier)) externalApiUrl.searchParams.append("supplier", supplier);
        if (isValid(category)) externalApiUrl.searchParams.append("category", category);
        if (isValid(brand)) externalApiUrl.searchParams.append("brand", brand);
        if (current) externalApiUrl.searchParams.append("current", current);

        const cookieStore = await cookies();
        const token = cookieStore.get("vos_access_token")?.value;

        const headers: HeadersInit = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
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
            throw new Error(`Springboot API error: ${res.status} ${errorText}`);
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
            { status: 200 }
        );
    }
}