import { cookies } from "next/headers";
import { z } from "zod";
import MainDashboardClient from "./_components/main-dashboard-client";
import { Company, CompanyMemo, CompanyMemoAttachment, Announcement } from "@/types/announcement";

const COOKIE_NAME = "vos_access_token";

// Strict Payload Schema
const JwtPayloadSchema = z.object({
    id: z.union([z.number(), z.string()]).optional(),
    user_id: z.union([z.number(), z.string() ]).optional(),
    sub: z.union([z.number(), z.string()]).optional(),
    role: z.string().optional(),
    subsystems: z.array(z.string()).optional(),
    FirstName: z.string().optional(),
    LastName: z.string().optional(),
    email: z.string().optional(),
}).passthrough();

type JwtPayload = z.infer<typeof JwtPayloadSchema>;

// Helper to decode JWT without verification
function decodeJwt(token: string): JwtPayload | null {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        let s = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        while (s.length % 4) s += "=";
        const json = Buffer.from(s, "base64").toString("utf8");
        return JwtPayloadSchema.parse(JSON.parse(json));
    } catch {
        return null;
    }
}

// Zod Schemas for Dashboard Registry
const DashboardCategorySchema = z.enum([
    "Operations",
    "Customer & Engagement",
    "Corporate Services",
    "Governance & Assurance",
    "Monitoring & Oversight",
]);
type DashboardCategory = z.infer<typeof DashboardCategorySchema>;

const DashboardStatusSchema = z.enum(["active", "comingSoon"]);
type DashboardStatus = z.infer<typeof DashboardStatusSchema>;

const DashboardSubmoduleSchema = z.object({
    id: z.number(),
    title: z.string(),
    status: DashboardStatusSchema.optional().default("active"),
});

const DashboardModuleSchema = z.object({
    id: z.number(),
    title: z.string(),
    subModules: z.array(DashboardSubmoduleSchema).optional().default([]),
});

const DashboardSubsystemSchema = z.object({
    slug: z.string(),
    title: z.string(),
    subtitle: z.string().nullable().optional(),
    base_path: z.string().nullable().optional(),
    status: DashboardStatusSchema,
    category: DashboardCategorySchema.nullable().optional(),
    icon_name: z.string().nullable().optional(),
    tag: z.string().nullable().optional(),
    modules: z.array(DashboardModuleSchema).optional().default([]),
});

// Mapped structure for the client
interface MappedSubsystem {
    id: string;
    title: string;
    subtitle?: string;
    href?: string;
    status: DashboardStatus;
    category: DashboardCategory;
    iconName: string;
    tag?: string;
    accentClass: string;
    submodules: { id: string; title: string; status?: DashboardStatus }[];
}

/**
 * Server Component: Main ERP Dashboard
 */
export default async function ERPMainDashboardPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const payload = decodeJwt(token);
    if (!payload) return null;

    const isAdmin = payload.role === "ADMIN";
    const allowedSubsystems = new Set(payload.subsystems || []);
    const directusBase = process.env.NEXT_PUBLIC_API_BASE_URL;


    let subsystems: MappedSubsystem[] = [];

    try {
        const url = `${directusBase?.replace(/\/+$/, "")}/items/subsystems?fields=*,modules.*,modules.subModules.*&limit=-1`;
        const res = await fetch(url, {
            headers: { "Authorization": `Bearer ${process.env.DIRECTUS_STATIC_TOKEN}` },
            next: { revalidate: 60 } 
        });

        if (res.ok) {
            const jsonResponse = await res.json();
            const validatedData = z.array(DashboardSubsystemSchema).parse(jsonResponse.data || []);
            
            subsystems = validatedData
                .filter((s) => isAdmin || allowedSubsystems.has(s.slug))
                .map((s): MappedSubsystem => ({
                    id: s.slug,
                    title: s.title,
                    subtitle: s.subtitle || undefined,
                    href: s.base_path || undefined,
                    status: s.status,
                    category: s.category || "Operations",
                    iconName: s.icon_name || "Activity",
                    tag: s.tag || undefined,
                    accentClass: "bg-primary/10 text-primary dark:text-primary-foreground ring-1 ring-primary/20",
                    submodules: s.modules.flatMap((m) => m.subModules.map((sm) => ({
                        id: String(sm.id),
                        title: sm.title,
                        status: sm.status
                    })))
                }));
        }
    } catch (err) {
        console.error("[Dashboard Server] Fetch Error:", err);
    }

    let announcementsData: Announcement[] = [];
    try {
        console.log("[Announcement Debug] Starting fetch process from directusBase:", directusBase);
        const companyListRes = await fetch(`${directusBase?.replace(/\/+$/, "")}/items/company_list?limit=-1`, {
            headers: { "Authorization": `Bearer ${process.env.DIRECTUS_STATIC_TOKEN}` },
            next: { revalidate: 0 }
        });

        if (companyListRes.ok) {
            const companyListJson = await companyListRes.json();
            const companies = companyListJson.data || [];
            console.log(`[Announcement Debug] Successfully fetched ${companies.length} companies`);
            
            const defaultCompany = companies.find((c: Company) => c.is_default === true || c.is_default === 1 || c.is_default === "1");
            console.log("[Announcement Debug] Default Company found:", defaultCompany ? { company_id: defaultCompany.company_id, company_name: defaultCompany.company_name } : "None");

            if (defaultCompany) {
                const defaultCompanyId = defaultCompany.company_id;
                const company1 = companies.find((c: Company) => c.company_id === 1);
                console.log("[Announcement Debug] Company ID 1 found:", company1 ? { company_id: company1.company_id, directus: company1.directus } : "None");
                
                if (company1 && company1.directus && company1.directus_token) {
                    const targetDirectus = company1.directus.replace(/\/+$/, "");
                    const targetToken = company1.directus_token;

                    const memoFilter = JSON.stringify({
                        _and: [
                            {
                                _or: [
                                    { company_id: { _eq: defaultCompanyId } },
                                    { company_id: { _eq: 7 } }
                                ]
                            },
                            {
                                status: { _eq: "Released" }
                            }
                        ]
                    });

                    const memoUrl = `${targetDirectus}/items/company_memo?filter=${encodeURIComponent(memoFilter)}&sort=-id,-created_at`;
                    console.log(`[Announcement Debug] Fetching memos from URL: ${memoUrl}`);
                    const memoRes = await fetch(memoUrl, {
                        headers: { "Authorization": `Bearer ${targetToken}` },
                        next: { revalidate: 0 }
                    });

                    if (memoRes.ok) {
                        const memoJson = await memoRes.json();
                        const memos = memoJson.data || [];
                        console.log(`[Announcement Debug] Fetched ${memos.length} memos`);

                        const parts = new Intl.DateTimeFormat("en-US", {
                            timeZone: "Asia/Manila",
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit"
                        }).formatToParts(new Date());

                        const year = parts.find(p => p.type === 'year')?.value;
                        const month = parts.find(p => p.type === 'month')?.value;
                        const day = parts.find(p => p.type === 'day')?.value;
                        const currentDateStr = `${year}-${month}-${day}`;
                        console.log(`[Announcement Debug] Current PHT Date: ${currentDateStr}`);

                        const matchingMemos = memos.filter((memo: CompanyMemo) => {
                            const start = memo.start_date?.split("T")[0];
                            const end = memo.end_date?.split("T")[0];
                            const isMatch = !!(start && end && currentDateStr >= start && currentDateStr <= end);
                            console.log(`[Announcement Debug] Comparing memo ID ${memo.id} (Subject: ${memo.subject}): start=${start}, end=${end}, match=${isMatch}`);
                            return isMatch;
                        });

                        if (matchingMemos.length > 0) {
                            console.log(`[Announcement Debug] Matching memos found count: ${matchingMemos.length}`);
                            
                            const matchingMemoIds = matchingMemos.map((m: CompanyMemo) => m.id);
                            const attachmentFilter = JSON.stringify({
                                company_memo_id: { _in: matchingMemoIds }
                            });
                            const attachmentUrl = `${targetDirectus}/items/company_memo_attachments?filter=${encodeURIComponent(attachmentFilter)}`;
                            const attachmentRes = await fetch(attachmentUrl, {
                                headers: { "Authorization": `Bearer ${targetToken}` },
                                next: { revalidate: 0 }
                            });

                            let attachments = [];
                            if (attachmentRes.ok) {
                                const attachmentJson = await attachmentRes.json();
                                attachments = attachmentJson.data || [];
                            }
                            console.log(`[Announcement Debug] Fetched ${attachments.length} total attachments for matching memos`);

                            announcementsData = matchingMemos.map((memo: CompanyMemo) => ({
                                memo,
                                attachments: attachments.filter((att: CompanyMemoAttachment) => att.company_memo_id === memo.id),
                                directusBaseUrl: targetDirectus
                            }));
                        } else {
                            console.log("[Announcement Debug] No matching memos for current date range");
                        }
                    } else {
                        console.error("[Announcement Debug] Memo fetch failed with status:", memoRes.status, await memoRes.text().catch(() => ""));
                    }
                } else {
                    console.log("[Announcement Debug] Company ID 1 is missing directus or directus_token");
                }
            } else {
                console.log("[Announcement Debug] No default company found");
            }
        } else {
            console.error("[Announcement Debug] Company list fetch failed with status:", companyListRes.status, await companyListRes.text().catch(() => ""));
        }
    } catch (err) {
        console.error("[Announcement Debug] Caught exception in fetch process:", err);
    }

    const userFullName = [payload.FirstName, payload.LastName].filter(Boolean).join(" ") || "User";
    const userEmail = payload.email || "";

    return (
        <MainDashboardClient 
            initialSubsystems={subsystems} 
            userFullName={userFullName}
            userEmail={userEmail}
            announcements={announcementsData}
        />
    );
}
