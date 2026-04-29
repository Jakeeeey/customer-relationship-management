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
      const customers: CustomerMapRecord[] = Array.isArray(data) ? data : (data.data || []);

      // Apply area_per_cluster mapping to fill in missing clusters
      try {
        const mapping = await this.fetchAreaClusterMapping(activeToken);
        return customers.map(customer => {
          // If cluster is already set and not "N/A", keep it
          if (customer.cluster && customer.cluster !== "N/A" && customer.cluster !== "") {
            return customer;
          }

          const province = (customer.province || "").toUpperCase().trim();
          const city = (customer.city || "").toUpperCase().trim();
          const brgy = (customer.brgy || "").toUpperCase().trim();

          // Try to find a match in the mapping with decreasing specificity
          const clusterName =
            (province && city && brgy && mapping[`${province}|${city}|${brgy}`]) ||
            (province && city && mapping[`${province}|${city}`]) ||
            (province && mapping[province]);

          return {
            ...customer,
            cluster: clusterName || customer.cluster || "N/A"
          };
        });
      } catch (mapErr) {
        console.warn("Error applying area cluster mapping:", mapErr);
        return customers;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetches area to cluster mapping from Directus
   */
  static async fetchAreaClusterMapping(token?: string): Promise<Record<string, string>> {
    const directusUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const directusToken = process.env.DIRECTUS_STATIC_TOKEN;
    if (!directusUrl) return {};

    const activeToken = directusToken || token;
    const baseUrl = directusUrl.replace(/\/+$/, "");

    try {
      // Fetch both area_per_cluster mapping and cluster names for lookup
      const [areasRes, clustersRes] = await Promise.all([
        fetch(`${baseUrl}/items/area_per_cluster?limit=-1`, {
          headers: { "Authorization": `Bearer ${activeToken}` }
        }),
        fetch(`${baseUrl}/items/cluster?fields=id,cluster_name&limit=-1`, {
          headers: { "Authorization": `Bearer ${activeToken}` }
        })
      ]);

      if (!areasRes.ok || !clustersRes.ok) return {};

      const areasResult = await areasRes.json();
      const clustersResult = await clustersRes.json();

      const areasData = areasResult.data || [];
      const clustersData = clustersResult.data || [];

      // Create a lookup for cluster names by ID
      const clusterLookup: Record<number, string> = {};
      clustersData.forEach((c: { id: number; cluster_name: string }) => {
        clusterLookup[c.id] = c.cluster_name;
      });

      // Build the geographical mapping
      const mapping: Record<string, string> = {};
      areasData.forEach((a: { province: string | null; city: string | null; baranggay: string | null; cluster_id: number }) => {
        const province = (a.province || "").toUpperCase().trim();
        const city = (a.city || "").toUpperCase().trim();
        const brgy = (a.baranggay || "").toUpperCase().trim();
        const clusterName = clusterLookup[a.cluster_id];

        if (clusterName) {
          // Store mapping at multiple levels of specificity
          if (province && city && brgy) mapping[`${province}|${city}|${brgy}`] = clusterName;
          if (province && city) mapping[`${province}|${city}`] = clusterName;
          if (province) mapping[province] = clusterName;
        }
      });

      return mapping;
    } catch (error) {
      console.warn("Failed to fetch area-cluster mapping:", error);
      return {};
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
