import { CustomerMapFilter, CustomerMapRecord } from "../types/customer-map.schema";

export class CustomerMapService {
  /**
   * Fetches filtered customer map data from the Spring Boot API
   */
  static async fetchFilteredCustomers(filters: CustomerMapFilter, token?: string): Promise<CustomerMapRecord[]> {
    const baseUrl = process.env.SPRING_API_BASE_URL;
    if (!baseUrl) {
      throw new Error("SPRING_API_BASE_URL is not configured in environment variables");
    }

    const params = new URLSearchParams();
    if (filters.cluster) params.append("cluster", filters.cluster === "none" ? "" : filters.cluster);
    if (filters.storeType) params.append("storeType", filters.storeType === "none" ? "" : filters.storeType);
    if (filters.classification) params.append("classification", filters.classification === "none" ? "" : filters.classification);
    if (filters.salesman) params.append("salesman", filters.salesman === "none" ? "" : filters.salesman);

    // Use the base URL as is, allowing the environment to specify the correct port (8086 or 8087)
    const url = `${baseUrl.replace(/\/$/, "")}/api/view-customer-map/filter?${params.toString()}`;

    // Token strategy: prioritise session token, fallback to static token
    const directusToken = process.env.DIRECTUS_STATIC_TOKEN;
    const activeToken = token || directusToken;

    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          "Accept": "application/json",
          ...(activeToken ? { "Authorization": `Bearer ${activeToken}` } : {}),
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "No error details");
        throw new Error(`Failed to fetch from upstream: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetches unique values for filter dropdowns from Directus
   */
  static async fetchFilterOptions(field: string, token?: string): Promise<string[]> {
    const directusUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const directusToken = process.env.DIRECTUS_STATIC_TOKEN;
    
    if (!directusUrl) return [];

    let endpoint = "";
    let dataField = "";

    switch (field) {
      case "cluster":
        endpoint = "cluster";
        dataField = "cluster_name";
        break;
      case "storeType":
        endpoint = "store_type";
        dataField = "store_type";
        break;
      case "classification":
        endpoint = "customer_classification";
        dataField = "classification_name";
        break;
      case "salesman":
        endpoint = "salesman";
        dataField = "salesman_name";
        break;
      default:
        return [];
    }

    const baseUrl = directusUrl.replace(/\/+$/, "");
    const url = `${baseUrl}/items/${endpoint}?fields=${dataField}&limit=-1${field === 'salesman' ? '&filter[isActive][_eq]=1' : ''}`;

    try {
      // Use static token if available, otherwise fallback to the passed token
      const activeToken = directusToken || token;

      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          "Authorization": `Bearer ${activeToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) return [];
      
      const result = await response.json();
      const items = result.data || [];
      
      return Array.from(new Set(
        items.map((item: Record<string, unknown>) => String(item[dataField] || "").trim())
          .filter((val: string) => val !== "")
      )) as string[];
    } catch (error) {
      console.warn(`Failed to fetch options for ${field} from Directus:`, error);
      return [];
    }
  }
}
