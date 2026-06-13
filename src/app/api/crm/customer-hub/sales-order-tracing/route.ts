// src/app/api/crm/customer-hub/sales-order-tracing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { AuditingRow } from "@/modules/customer-relationship-management/customer-hub/sales-order-tracing/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPRING_API_BASE_URL = process.env.SPRING_API_BASE_URL;

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authHeader = req.headers.get("authorization");
    const cookieToken = cookieStore.get("vos_access_token")?.value;

    const token = authHeader?.replace("Bearer ", "") || cookieToken;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: Missing access token" },
        { status: 401 }
      );
    }

    if (!SPRING_API_BASE_URL) {
      return NextResponse.json(
        { error: "Spring API base URL is not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const clientStart = searchParams.get("startDate");
    const clientEnd = searchParams.get("endDate");
    
    // Pagination params
    const pageParam = Number(searchParams.get("page") || "1");
    const page = Math.max(0, pageParam - 1); // 0-indexed for pagination slicing
    const size = Number(searchParams.get("size") || "10");

    // Filter params
    const search = searchParams.get("search");
    const customerName = searchParams.get("customerName");
    const orderStatus = searchParams.get("orderStatus");

    // Use active client parameters if provided, otherwise default to full dynamic coverage
    const startDate = clientStart && clientStart.trim() ? clientStart.trim() : "2026-01-01";
    const endDate = clientEnd && clientEnd.trim() ? clientEnd.trim() : "2026-12-31";

    const targetUrl = `${SPRING_API_BASE_URL.replace(/\/$/, "")}/api/vw-sales-order-pdp-cldto-dp/filter?startDate=${startDate}&endDate=${endDate}`;

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Backend returned ${response.status}: ${errorText}` },
        { status: response.status }
      );
    }

    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return NextResponse.json(
        { error: `Unexpected non-JSON response from server: ${text.slice(0, 200)}` },
        { status: 502 }
      );
    }

    let list: AuditingRow[] = [];
    if (Array.isArray(data)) {
      list = data;
    } else if (
      data &&
      typeof data === "object" &&
      "content" in data &&
      Array.isArray(data.content)
    ) {
      list = data.content as AuditingRow[];
    }

    // Extract unique customer names before any filters are applied
    const customerNamesSet = new Set<string>();
    list.forEach((row: AuditingRow) => {
      if (row.customerName) {
        customerNamesSet.add(row.customerName);
      }
    });
    const uniqueCustomerNames = Array.from(customerNamesSet).sort((a, b) =>
      a.localeCompare(b)
    );

    // Apply filtering in NextJS BFF for search, customerName, orderStatus
    if (orderStatus && orderStatus.toLowerCase() !== "all") {
      const targetStatus = orderStatus.toLowerCase();
      list = list.filter(
        (row) => row.orderStatus && row.orderStatus.toLowerCase() === targetStatus
      );
    }

    if (customerName && customerName !== "all") {
      list = list.filter((row) => row.customerName === customerName);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      const flattenToSearchable = (val: string | string[] | null | undefined): string => {
        if (!val) return "";
        if (Array.isArray(val)) return val.join(" ").toLowerCase();
        return String(val).toLowerCase();
      };
      list = list.filter(
        (row) =>
          (row.orderNo && row.orderNo.toLowerCase().includes(q)) ||
          flattenToSearchable(row.pdpList).includes(q) ||
          flattenToSearchable(row.cldtoList).includes(q) ||
          flattenToSearchable(row.dpList).includes(q)
      );
    }

    const totalElements = list.length;
    const totalPages = Math.ceil(totalElements / size);
    const start = page * size;
    const paginatedList = list.slice(start, start + size);

    return NextResponse.json({
      content: paginatedList,
      totalElements,
      totalPages,
      customerNames: uniqueCustomerNames,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
