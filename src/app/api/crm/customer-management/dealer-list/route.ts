// src/app/api/crm/customer-management/dealer-list/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPRING_API_BASE = process.env.SPRING_API_BASE_URL;
const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/$/,
  "",
);
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const p = parts[1];
    const b64 = p.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);

    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function pickString(obj: Record<string, unknown> | null | undefined, keys: string[]): string {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function getCreatorNameFromToken(token: string | null | undefined): string {
  if (!token) return "Active User";
  const payload = token ? decodeJwtPayload(token) : null;
  if (!payload) return "Active User";

  const first = pickString(payload, [
    "Firstname",
    "FirstName",
    "firstName",
    "firstname",
    "first_name",
  ]);
  const last = pickString(payload, [
    "LastName",
    "Lastname",
    "lastName",
    "lastname",
    "last_name",
  ]);
  const email = pickString(payload, ["email", "Email"]);

  return [first, last].filter(Boolean).join(" ") || email || "Active User";
}

function getDirectusHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

export async function GET(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    const { searchParams } = new URL(req.url);

    // ─────────────────────────────────────────────────────────────────────────
    // PSGC Proxy — forward Philippine Standard Geographic Code lookups to
    // psgc.cloud so the browser never needs to reach an external host.
    // Usage: ?psgc=provinces | ?psgc=cities&provinceCode=<code>
    //        ?psgc=barangays&cityCode=<code>
    // ─────────────────────────────────────────────────────────────────────────
    const psgcType = searchParams.get("psgc");
    if (psgcType) {
      const PSGC_BASE = "https://psgc.cloud/api";
      let psgcUrl = "";

      if (psgcType === "provinces") {
        psgcUrl = `${PSGC_BASE}/provinces`;
      } else if (psgcType === "cities") {
        const provinceCode = searchParams.get("provinceCode");
        if (!provinceCode) {
          return NextResponse.json(
            { error: "provinceCode is required for psgc=cities" },
            { status: 400 },
          );
        }
        psgcUrl = `${PSGC_BASE}/provinces/${provinceCode}/cities-municipalities`;
      } else if (psgcType === "barangays") {
        const cityCode = searchParams.get("cityCode");
        if (!cityCode) {
          return NextResponse.json(
            { error: "cityCode is required for psgc=barangays" },
            { status: 400 },
          );
        }
        psgcUrl = `${PSGC_BASE}/cities-municipalities/${cityCode}/barangays`;
      } else {
        return NextResponse.json(
          { error: `Unknown psgc type: ${psgcType}` },
          { status: 400 },
        );
      }

      const psgcRes = await fetch(psgcUrl, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const psgcText = await psgcRes.text();
      return new NextResponse(psgcText, {
        status: psgcRes.status,
        headers: {
          "content-type":
            psgcRes.headers.get("content-type") || "application/json",
        },
      });
    }

    // If the frontend requested a Directus collection proxy, forward to Directus
    // using the configured NEXT_PUBLIC_API_BASE_URL. Use the `directusCollection`
    // query parameter to indicate which collection to fetch and forward any
    // additional query params (fields, limit, etc.). Do not require the
    // SPRING API token for directus proxying.
    const directusCollection = searchParams.get("directusCollection");

    if (directusCollection) {
      if (!DIRECTUS_BASE) {
        return NextResponse.json(
          { error: "DIRECTUS base URL not configured" },
          { status: 500 },
        );
      }

      // Build target URL with remaining search params except `directusCollection`
      // Use the string form to construct a new URLSearchParams (avoids `any` casting)
      const proxyParams = new URLSearchParams(searchParams.toString());
      proxyParams.delete("directusCollection");
      const target = `${DIRECTUS_BASE}/items/${encodeURIComponent(
        directusCollection,
      )}${proxyParams.toString() ? `?${proxyParams.toString()}` : ""}`;

      const headers = getDirectusHeaders();

      const res = await fetch(target, { method: "GET", headers });

      // If Directus returns 401, provide a clearer error so frontend can
      // surface a helpful message to developers/admins (invalid static token).
      if (res.status === 401) {
        const txt = await res.text().catch(() => "");
        let msg = "Directus authentication failed";
        try {
          const parsed = txt ? JSON.parse(txt) : null;
          if (parsed && typeof parsed === "object") {
            const p = parsed as Record<string, unknown>;
            if (typeof p.message === "string") {
              msg = `Directus authentication failed: ${p.message}`;
            } else if (typeof p.error === "string") {
              msg = `Directus authentication failed: ${p.error}`;
            } else if (txt) {
              msg = `Directus authentication failed: ${txt}`;
            }
          } else if (txt) {
            msg = `Directus authentication failed: ${txt}`;
          }
        } catch {
          if (txt) msg = `Directus authentication failed: ${txt}`;
        }
        console.error(msg);
        return NextResponse.json({ error: msg }, { status: 502 });
      }

      // If Directus returns 403, this usually means the static token does not
      // have permission to access the requested collection. Return a clear
      // message so the frontend can surface actionable guidance.
      if (res.status === 403) {
        console.error(
          "Directus returned 403 for collection:",
          directusCollection,
        );
        return NextResponse.json(
          {
            error:
              "Directus returned 403 Forbidden. Check that DIRECTUS_STATIC_TOKEN is valid and has read permissions for the collection.",
          },
          { status: 502 },
        );
      }

      const text = await res.text();
      const contentType = res.headers.get("content-type") || "application/json";
      const respHeaders: Record<string, string> = {
        "content-type": contentType,
      };
      return new NextResponse(text, {
        status: res.status,
        headers: respHeaders,
      });
    }

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: no token provided" },
        { status: 401 },
      );
    }

    if (!SPRING_API_BASE) {
      return NextResponse.json(
        { error: "Spring API base URL is not configured" },
        { status: 500 },
      );
    }

    // Dealer-list module uses Directus exclusively.
    // The Spring API path below is a placeholder – it is not called by
    // this module but must compile in case a future sub-module needs it.
    const url = new URL(
      `${SPRING_API_BASE}/api/dealer-list/filter`,
    );

    const FILTER_KEYS = ["dealer_type", "dealer_city", "dealer_province"];

    const appendFilterValues = (name: string) => {
      const values = searchParams.getAll(name);
      const normalized = Array.from(
        new Set(
          values
            .map((v) => String(v ?? "").trim())
            .filter((v) => v.length > 0 && v.toLowerCase() !== "all"),
        ),
      );
      if (normalized.length === 0) return;
      url.searchParams.append(name, normalized.join(","));
    };

    FILTER_KEYS.forEach(appendFilterValues);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    // Read as text first so non-JSON responses (HTML errors, empty body) don't throw
    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      const preview = text.slice(0, 300);
      return NextResponse.json(
        {
          error: response.ok
            ? `Unexpected non-JSON response from data server: ${preview}`
            : preview || "Failed to fetch data",
        },
        { status: response.ok ? 502 : response.status },
      );
    }

    if (!response.ok) {
      const dataObj =
        data && typeof data === "object"
          ? (data as Record<string, unknown>)
          : null;
      const errMsg = dataObj
        ? typeof dataObj["message"] === "string"
          ? (dataObj["message"] as string)
          : typeof dataObj["error"] === "string"
            ? (dataObj["error"] as string)
            : undefined
        : undefined;
      return NextResponse.json(
        {
          error: errMsg || "Failed to fetch dealer data",
        },
        { status: response.status },
      );
    }

    let records: unknown[] = [];
    if (Array.isArray(data)) {
      records = data;
    } else if (data && typeof data === "object") {
      // Check if response has a .data property (cast to a record to access keys)
      const dataObj = data as Record<string, unknown>;
      if (Array.isArray(dataObj.data)) {
        records = dataObj.data as unknown[];
      }
    }

    return NextResponse.json(records);
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Dealer List API Route Error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — Create a new dealer record in Directus
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    if (!DIRECTUS_BASE) {
      return NextResponse.json(
        { error: "Directus base URL not configured" },
        { status: 500 },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const code = String(body.dealer_code || "").trim();
    const name = String(body.dealer_name || "").trim();

    if (!code || !name) {
      return NextResponse.json(
        { error: "Dealer Code and Dealer Name are required" },
        { status: 400 },
      );
    }

    // Check uniqueness in Directus
    const checkTarget = `${DIRECTUS_BASE}/items/dealer_list?filter=${encodeURIComponent(
      JSON.stringify({
        _or: [
          { dealer_code: { _eq: code } },
          { dealer_name: { _eq: name } }
        ]
      })
    )}`;

    const checkRes = await fetch(checkTarget, {
      method: "GET",
      headers: getDirectusHeaders(),
    });

    if (checkRes.ok) {
      const checkJson = await checkRes.json().catch(() => null);
      const existing = Array.isArray(checkJson?.data) ? checkJson.data : [];
      if (existing.length > 0) {
        const duplicate = existing[0];
        if (String(duplicate.dealer_code).toLowerCase() === code.toLowerCase()) {
          return NextResponse.json(
            { error: `Dealer Code "${code}" is already in use. It must be unique.` },
            { status: 409 },
          );
        }
        if (String(duplicate.dealer_name).toLowerCase() === name.toLowerCase()) {
          return NextResponse.json(
            { error: `Dealer Name "${name}" is already in use. It must be unique.` },
            { status: 409 },
          );
        }
      }
    }

    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("vos_access_token")?.value;

    body.created_date = new Date().toISOString();
    body.created_by = getCreatorNameFromToken(token);
    if (!body.status) {
      body.status = "Active";
    }

    const target = `${DIRECTUS_BASE}/items/dealer_list`;

    const res = await fetch(target, {
      method: "POST",
      headers: getDirectusHeaders(),
      body: JSON.stringify(body),
    });

    const text = await res.text();

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Directus authentication failed" },
        { status: 502 },
      );
    }

    if (res.status === 403) {
      return NextResponse.json(
        {
          error:
            "Directus 403 Forbidden. Check for right token and dummy or live ",
        },
        { status: 502 },
      );
    }

    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Dealer List POST Route Error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH — Update an existing dealer record in Directus
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  try {
    if (!DIRECTUS_BASE) {
      return NextResponse.json(
        { error: "Directus base URL not configured" },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(req.url);
    const dealerId = searchParams.get("id");
    if (!dealerId) {
      return NextResponse.json(
        { error: "Dealer ID is required" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const code = body.dealer_code ? String(body.dealer_code).trim() : undefined;
    const name = body.dealer_name ? String(body.dealer_name).trim() : undefined;

    if (code || name) {
      const orFilters: Record<string, unknown>[] = [];
      if (code) orFilters.push({ dealer_code: { _eq: code } });
      if (name) orFilters.push({ dealer_name: { _eq: name } });

      const checkTarget = `${DIRECTUS_BASE}/items/dealer_list?filter=${encodeURIComponent(
        JSON.stringify({
          _and: [
            { dealer_id: { _neq: Number(dealerId) } },
            { _or: orFilters }
          ]
        })
      )}`;

      const checkRes = await fetch(checkTarget, {
        method: "GET",
        headers: getDirectusHeaders(),
      });

      if (checkRes.ok) {
        const checkJson = await checkRes.json().catch(() => null);
        const existing = Array.isArray(checkJson?.data) ? checkJson.data : [];
        if (existing.length > 0) {
          const duplicate = existing[0];
          if (code && String(duplicate.dealer_code).toLowerCase() === code.toLowerCase()) {
            return NextResponse.json(
              { error: `Dealer Code "${code}" is already in use. It must be unique.` },
              { status: 409 },
            );
          }
          if (name && String(duplicate.dealer_name).toLowerCase() === name.toLowerCase()) {
            return NextResponse.json(
              { error: `Dealer Name "${name}" is already in use. It must be unique.` },
              { status: 409 },
            );
          }
        }
      }
    }

    const target = `${DIRECTUS_BASE}/items/dealer_list/${encodeURIComponent(dealerId)}`;

    const res = await fetch(target, {
      method: "PATCH",
      headers: getDirectusHeaders(),
      body: JSON.stringify(body),
    });

    const text = await res.text();

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Directus authentication failed" },
        { status: 502 },
      );
    }

    if (res.status === 403) {
      return NextResponse.json(
        {
          error:
            "Directus 403 Forbidden. Check static token permissions.",
        },
        { status: 502 },
      );
    }

    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Dealer List PATCH Route Error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

