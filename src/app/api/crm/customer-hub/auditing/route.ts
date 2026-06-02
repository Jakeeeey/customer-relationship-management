// src/app/api/crm/customer-hub/auditing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

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

    // Use active client parameters if provided, otherwise default to full dynamic coverage
    const startDate = clientStart && clientStart.trim() ? clientStart.trim() : "2025-01-01";
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

    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
