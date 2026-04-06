import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NavUser } from "../../_components/nav-user";

import { cookies } from "next/headers";

import InventoryReportModule from "@/modules/customer-relationship-management/customer-hub/inventory-report/InventoryReportModule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";

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

function buildHeaderUserFromToken(token: string | null | undefined) {
    const payload = token ? decodeJwtPayload(token) : null;

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

    const name = [first, last].filter(Boolean).join(" ") || email || "User";

    return {
        name,
        email: email || "",
        avatar: "/avatars/shadcn.jpg",
    };
}

// Fetch Directus Dropdown Options 
async function fetchDirectus<T>(path: string): Promise<T[]> {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    
    if (!baseUrl) {
        console.error("NEXT_PUBLIC_API_BASE_URL is not defined.");
        return [];
    }

    try {
        const res = await fetch(`${baseUrl}${path}`, { 
            cache: "no-store",
            signal: AbortSignal.timeout(7000), // Increased to 7s for stability
        });
        if (!res.ok) return [];
        const json = await res.json();
        return json?.data || [];
    } catch (e) {
        console.error(`Failed to fetch ${path} from Directus:`, e);
        return [];
    }
}

export default async function Page() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value ?? null;

    const headerUser = buildHeaderUserFromToken(token);

    // Fetch dropdown options server-side
    const [categories, brands, suppliers, branches] = await Promise.all([
        fetchDirectus<any>("/items/categories?limit=-1"),
        fetchDirectus<any>("/items/brand?limit=-1"),
        fetchDirectus<any>("/items/suppliers?limit=-1"),
        fetchDirectus<any>("/items/branch?limit=-1").then(b => b.length ? b : fetchDirectus<any>("/items/branches?limit=-1")), 
    ]);

    return (
        <SidebarProvider>
            <SidebarInset className="min-w-0 flex h-[100dvh] flex-col overflow-hidden bg-background p-0 m-0 rounded-none border-0 shadow-none">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b shadow-sm bg-background sm:h-16">
                        <div className="flex h-full min-w-0 items-center gap-2 px-3 sm:px-4">
                            <SidebarTrigger className="-ml-1 shrink-0" />

                            <Separator
                                orientation="vertical"
                                className="hidden sm:block mr-2 h-4 shrink-0"
                            />

                            <div className="min-w-0 overflow-hidden">
                                <Breadcrumb>
                                    <BreadcrumbList>
                                        <BreadcrumbItem className="hidden md:block">
                                            <BreadcrumbLink href="#">Customer Hub</BreadcrumbLink>
                                        </BreadcrumbItem>
                                        <BreadcrumbSeparator className="hidden md:block" />
                                        <BreadcrumbItem>
                                            <BreadcrumbPage className="truncate">
                                                Inventory Report
                                            </BreadcrumbPage>
                                        </BreadcrumbItem>
                                    </BreadcrumbList>
                                </Breadcrumb>
                            </div>
                        </div>

                        <div className="flex h-full items-center px-2 sm:px-4">
                            <NavUser user={headerUser} />
                        </div>
                    </header>

                    <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-2 sm:p-4 bg-muted/20">
                        <InventoryReportModule 
                            options={{
                                categories,
                                brands,
                                suppliers,
                                branches
                            }}
                        />
                    </main>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}