import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CustomerMapService } from "@/modules/customer-relationship-management/customer-hub/customer-map/services/customer-map";
import { customerMapFilterSchema } from "@/modules/customer-relationship-management/customer-hub/customer-map/types/customer-map.schema";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    const field = searchParams.get("field");
    
    // Get token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (field) {
      // Handle options request
      const options = await CustomerMapService.fetchFilterOptions(field, token);
      return NextResponse.json(options);
    }

    // Parse filters from query params
    const filters = {
      cluster: searchParams.get("cluster") || undefined,
      storeType: searchParams.get("storeType") || undefined,
      classification: searchParams.get("classification") || undefined,
      salesman: searchParams.get("salesman") || undefined,
    };

    // Validate filters
    const validatedFilters = customerMapFilterSchema.parse(filters);

    // Call service for main data
    const data = await CustomerMapService.fetchFilteredCustomers(validatedFilters, token);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Local API Map Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch map data", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
