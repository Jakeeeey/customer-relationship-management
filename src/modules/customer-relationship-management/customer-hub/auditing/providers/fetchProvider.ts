// src/modules/customer-relationship-management/customer-hub/auditing/providers/fetchProvider.ts
import type { AuditingApiResponse, AuditingFilters } from "../types";

const API_BASE = "/api/crm/customer-hub/auditing";

async function parseJsonSafely(res: Response): Promise<AuditingApiResponse> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as AuditingApiResponse;
  } catch {
    throw new Error(`Unexpected non-JSON response: ${text.slice(0, 200)}`);
  }
}

export const fetchAuditingData = async (
  filters: AuditingFilters = {},
  signal?: AbortSignal
): Promise<AuditingApiResponse> => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append("startDate", filters.startDate);
  if (filters.endDate) params.append("endDate", filters.endDate);

  const paramString = params.toString();
  const url = paramString ? `${API_BASE}?${paramString}` : API_BASE;

  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal,
  });

  if (!res.ok) {
    const parsed = await res.json().catch(() => null);
    const message =
      (parsed && typeof parsed === "object" && (parsed.error || parsed.message)) ||
      `Failed to fetch auditing data (${res.status})`;
    const err = new Error(String(message)) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return parseJsonSafely(res);
};

export const auditingProvider = {
  fetchAuditingData,
};
