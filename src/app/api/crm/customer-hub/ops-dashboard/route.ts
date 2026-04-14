import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const SPRING_API_BASE_URL = process.env.SPRING_API_BASE_URL;

export const dynamic = "force-dynamic";

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
        return NextResponse.json({ error: "Unauthorized: Missing access token" }, { status: 401 });
    }

    try {
        const response = await fetch(`${SPRING_API_BASE_URL}/api/view-ops-dashboard/all`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            cache: "no-store",
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Spring Boot API Error:", errorText);
            return NextResponse.json(
                { error: `Backend returned ${response.status}: ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("OPS Dashboard API Route Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
