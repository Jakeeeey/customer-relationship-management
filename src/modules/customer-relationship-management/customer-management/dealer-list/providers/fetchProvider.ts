// src/modules/customer-relationship-management/customer-management/dealer-list/providers/fetchProvider.ts
// All Directus calls are proxied through the Next.js API route so no
// credentials are exposed to the browser. Pattern mirrors inventory-report.

import type { DealerApiResponse, DealerFilters, DealerRecord } from "../types";

/** Internal Next.js API route for dealer-list */
const API_BASE = "/api/crm/customer-management/dealer-list";

// ---------------------------------------------------------------------------
// Safe JSON parser – returns null on empty body instead of throwing
// ---------------------------------------------------------------------------
async function parseJsonSafely(res: Response): Promise<DealerApiResponse> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as DealerApiResponse;
  } catch {
    throw new Error(`Unexpected non-JSON response: ${text.slice(0, 200)}`);
  }
}

// ---------------------------------------------------------------------------
// Fetch dealer records (via the directusCollection proxy)
// ---------------------------------------------------------------------------
export const fetchDealerData = async (
  filters: DealerFilters = {},
  signal?: AbortSignal,
): Promise<DealerApiResponse> => {
  const params = new URLSearchParams();

  // Always proxy through the directusCollection parameter
  params.set("directusCollection", "dealer_list");
  params.set("limit", "-1");

  // Fields we need from the collection
  params.set(
    "fields",
    [
      "dealer_id",
      "dealer_name",
      "dealer_type",
      "dealer_code",
      "dealer_address",
      "dealer_brgy",
      "dealer_city",
      "dealer_province",
      "dealer_zipCode",
      "dealer_registrationNumber",
      "dealer_tin",
      "dealer_dateAdmitted",
      "dealer_contact",
      "dealer_email",
      "dealer_outlook",
      "dealer_gmail",
      "dealer_department",
      "dealer_logo",
      "dealer_facebook",
      "dealer_website",
      "dealer_tags",
      "subscription_tier",
    ].join(","),
  );

  params.set("sort", "dealer_name");

  // Build server-side Directus filter object for single-value filters
  const directusFilter: Record<string, unknown> = {};

  if (filters.dealer_type && filters.dealer_type.toLowerCase() !== "all") {
    directusFilter["dealer_type"] = { _eq: filters.dealer_type };
  }
  if (filters.dealer_city && filters.dealer_city.toLowerCase() !== "all") {
    directusFilter["dealer_city"] = { _eq: filters.dealer_city };
  }
  if (
    filters.dealer_province &&
    filters.dealer_province.toLowerCase() !== "all"
  ) {
    directusFilter["dealer_province"] = { _eq: filters.dealer_province };
  }
  if (filters.dealer_brgy && filters.dealer_brgy.toLowerCase() !== "all") {
    directusFilter["dealer_brgy"] = { _eq: filters.dealer_brgy };
  }
  if (
    filters.dealer_department &&
    filters.dealer_department.toLowerCase() !== "all"
  ) {
    directusFilter["dealer_department"] = { _eq: filters.dealer_department };
  }
  if (
    filters.subscription_tier &&
    filters.subscription_tier.toLowerCase() !== "all"
  ) {
    directusFilter["subscription_tier"] = { _eq: filters.subscription_tier };
  }

  if (Object.keys(directusFilter).length > 0) {
    params.set("filter", JSON.stringify(directusFilter));
  }

  const url = `${API_BASE}?${params.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal,
  });

  if (!res.ok) {
    const parsed = await res.json().catch(() => null);
    const message =
      (parsed &&
        typeof parsed === "object" &&
        (parsed as Record<string, unknown>).error) ||
      (parsed &&
        typeof parsed === "object" &&
        (parsed as Record<string, unknown>).message) ||
      `Failed to fetch dealer data (${res.status})`;
    const err = new Error(String(message)) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return parseJsonSafely(res);
};

// ---------------------------------------------------------------------------
// Fetch distinct lookup values for a single field from Directus
// ---------------------------------------------------------------------------
export const fetchDealerFieldOptions = async (
  field: string,
  signal?: AbortSignal,
): Promise<string[]> => {
  const params = new URLSearchParams({
    directusCollection: "dealer_list",
    fields: field,
    limit: "-1",
    sort: field,
  });

  const res = await fetch(`${API_BASE}?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal,
  });

  if (!res.ok) return [];

  const json = await res.json().catch(() => null);
  const rows: DealerRecord[] = Array.isArray(json?.data)
    ? (json.data as DealerRecord[])
    : Array.isArray(json)
      ? (json as DealerRecord[])
      : [];

  // Deduplicate and remove empty values
  return Array.from(
    new Set(
      rows
        .map((r) => {
          const v = r[field as keyof typeof r];
          return typeof v === "string" ? v.trim() : "";
        })
        .filter(Boolean),
    ),
  ).sort();
};

// ---------------------------------------------------------------------------
// Fetch department options from Directus department collection
// ---------------------------------------------------------------------------
export const fetchDepartmentOptions = async (
  signal?: AbortSignal,
): Promise<string[]> => {
  const params = new URLSearchParams({
    directusCollection: "department",
    fields: "department_name,name,department",
    limit: "-1",
    sort: "department_name",
  });

  const res = await fetch(`${API_BASE}?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal,
  });

  if (!res.ok) return [];

  const json = await res.json().catch(() => null);
  const rows: Record<string, unknown>[] = Array.isArray(json?.data)
    ? (json.data as Record<string, unknown>[])
    : Array.isArray(json)
      ? (json as Record<string, unknown>[])
      : [];

  const values = rows
    .map((r) => {
      const departmentName =
        typeof r.department_name === "string" ? r.department_name.trim() : "";
      const name = typeof r.name === "string" ? r.name.trim() : "";
      const department =
        typeof r.department === "string" ? r.department.trim() : "";
      return departmentName || name || department || "";
    })
    .filter(Boolean);

  return Array.from(new Set(values)).sort();
};

// ---------------------------------------------------------------------------
// Create a new dealer record (POST → Directus via Next.js proxy route)
// ---------------------------------------------------------------------------
export const createDealer = async (
  payload: Partial<DealerRecord>,
): Promise<DealerRecord> => {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Unexpected non-JSON response: ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const obj =
      json && typeof json === "object" ? (json as Record<string, unknown>) : {};
    const message =
      (typeof obj.error === "string" && obj.error) ||
      (typeof obj.message === "string" && obj.message) ||
      `Failed to create dealer (${res.status})`;
    throw new Error(message);
  }

  // Directus wraps the created record in { data: {...} }
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    if (obj.data && typeof obj.data === "object") {
      return obj.data as DealerRecord;
    }
  }
  return json as DealerRecord;
};

// ---------------------------------------------------------------------------
// Update an existing dealer record (PATCH → Directus via Next.js proxy route)
// ---------------------------------------------------------------------------
export const updateDealer = async (
  dealerId: number | string,
  payload: Partial<DealerRecord>,
): Promise<DealerRecord> => {
  const res = await fetch(`${API_BASE}?id=${encodeURIComponent(dealerId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Unexpected non-JSON response: ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const obj =
      json && typeof json === "object" ? (json as Record<string, unknown>) : {};
    const message =
      (typeof obj.error === "string" && obj.error) ||
      (typeof obj.message === "string" && obj.message) ||
      `Failed to update dealer (${res.status})`;
    throw new Error(message);
  }

  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    if (obj.data && typeof obj.data === "object") {
      return obj.data as DealerRecord;
    }
  }
  return json as DealerRecord;
};

export const dealerProvider = {
  fetchDealerData,
  fetchDealerFieldOptions,
  fetchDepartmentOptions,
  createDealer,
  updateDealer,
};
