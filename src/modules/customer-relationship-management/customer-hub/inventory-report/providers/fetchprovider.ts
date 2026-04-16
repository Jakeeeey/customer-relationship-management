import type { InventoryApiResponse, InventoryFilters } from "../type";

const API_BASE = "/api/crm/customer-hub/inventory-report";

async function parseJsonSafely(res: Response): Promise<InventoryApiResponse> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as InventoryApiResponse;
  } catch {
    throw new Error(`Unexpected non-JSON response: ${text.slice(0, 200)}`);
  }
}

export const fetchInventoryData = async (
  page: number = 1,
  pageSize: number = 20,
  filters: Record<string, string | undefined> | InventoryFilters = {},
  signal?: AbortSignal,
): Promise<InventoryApiResponse> => {
  // Build params, supporting multi-value filters (arrays) by appending
  // repeated query parameters (e.g. ?branch=A&branch=B)
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item == null) continue;
        const s = String(item).trim();
        if (!s || s.toLowerCase() === "all") continue;
        params.append(k, s);
      }
      return;
    }
    const s = String(v).trim();
    if (!s || s.toLowerCase() === "all") return;
    params.append(k, s);
  });

  const paramString = params.toString();
  const url = paramString ? `${API_BASE}?${paramString}` : API_BASE;

  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    // Ensure browser cookies (session JWT) are sent to the proxy route
    credentials: "include",
    signal,
  });

  if (!res.ok) {
    // Try to parse a helpful JSON error message first
    const parsed = await res.json().catch(() => null);
    const message =
      (parsed &&
        typeof parsed === "object" &&
        (parsed as Record<string, unknown>).error) ||
      (parsed &&
        typeof parsed === "object" &&
        (parsed as Record<string, unknown>).message) ||
      `Failed to fetch inventory data (${res.status})`;
    const err = new Error(String(message)) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return parseJsonSafely(res);
};

export const inventoryProvider = {
  fetchInventoryData,
};
