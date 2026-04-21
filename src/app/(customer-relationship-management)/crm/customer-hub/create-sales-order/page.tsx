import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NavUser } from "@/components/shared/app-sidebar/nav-user";

import { cookies } from "next/headers";

import { CreateSalesOrderModule } from "@/modules/customer-relationship-management/customer-hub/create-sales-order";

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

export default async function Page(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const searchParams = await props.searchParams;
    const attachmentId = searchParams.attachment_id as string | undefined;

    const orderId = searchParams.orderId as string | undefined;

    // ✅ Next.js 16: cookies() is async
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value ?? null;

    const headerUser = buildHeaderUserFromToken(token);

    let documentViewerUrl: string | null = null;

    try {
        const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
        const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
        const headers = { Authorization: `Bearer ${DIRECTUS_TOKEN}`, "Content-Type": "application/json" };

        let targetFileId: string | null = null;
        let targetFileName: string | null = null;

        if (attachmentId) {
            const res = await fetch(`${DIRECTUS_URL}/items/sales_order_attachment/${attachmentId}?fields=file_id,attachment_name`, { headers, cache: 'no-store' });
            if (res.ok) {
                const json = await res.json();
                targetFileId = json.data?.file_id;
                targetFileName = json.data?.attachment_name;
            }
        } else if (orderId) {
            const res = await fetch(`${DIRECTUS_URL}/items/sales_order_attachment?filter[sales_order_id][_eq]=${orderId}&fields=file_id,attachment_name&limit=1`, { headers, cache: 'no-store' });
            if (res.ok) {
                const json = await res.json();
                if (json.data && json.data.length > 0) {
                    targetFileId = json.data[0].file_id;
                    targetFileName = json.data[0].attachment_name;
                }
            }
        }

        if (targetFileId) {
            documentViewerUrl = `/api/crm/customer-hub/callsheet/file?id=${targetFileId}`;
            if (targetFileName) documentViewerUrl += `&filename=${encodeURIComponent(targetFileName)}`;
        }
    } catch (e) {
        console.error("Failed to resolve file ID for Viewer:", e);
    }

    return (
        // ✅ This fills the RIGHT column provided by SidebarInset (which is now fixed-height).
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {/* ✅ Topbar is fixed in place because ONLY <main> scrolls */}
            <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b shadow-sm bg-background sm:h-16 overflow-hidden">
                <div className="flex h-full min-w-0 items-center gap-2 px-3 sm:px-4 overflow-hidden">
                    <SidebarTrigger className="-ml-1 shrink-0" />

                    <Separator
                        orientation="vertical"
                        className="hidden sm:block mr-2 data-[orientation=vertical]:h-4 shrink-0"
                    />

                    <div className="min-w-0 overflow-hidden">
                        <Breadcrumb>
                            <BreadcrumbList className="min-w-0 overflow-hidden">
                                <BreadcrumbItem className="hidden md:block shrink-0">
                                    <BreadcrumbLink href="#">Customer Hub</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block shrink-0" />
                                <BreadcrumbItem className="min-w-0 overflow-hidden">
                                    <BreadcrumbPage className="truncate max-w-[56vw] sm:max-w-[60vw] md:max-w-none">
                                        Sales Order
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </div>

                <div className="flex h-full items-center px-2 sm:px-4 shrink-0 max-w-[48vw] sm:max-w-none overflow-hidden">
                    <NavUser user={headerUser} />
                </div>
            </header>

            {/* ✅ Only content scrolls inside RIGHT column */}
            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-6 sm:p-8">
                <CreateSalesOrderModule documentViewerUrl={documentViewerUrl} />
            </main>
        </div>
    );
}
