import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

const COOKIE_NAME = "vos_access_token";

const JwtPayloadSchema = z.object({
    id: z.union([z.number(), z.string()]).optional(),
    user_id: z.union([z.number(), z.string()]).optional(),
    sub: z.union([z.number(), z.string()]).optional(),
    role: z.string().optional(),
    subsystems: z.array(z.string()).optional(),
    FirstName: z.string().optional(),
    LastName: z.string().optional(),
    email: z.string().optional(),
}).passthrough();

type JwtPayload = z.infer<typeof JwtPayloadSchema>;

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

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;

        if (!token) {
            return NextResponse.json({ announcements: [] }, { status: 401 });
        }

        const payload = decodeJwt(token);
        if (!payload) {
            return NextResponse.json({ announcements: [] }, { status: 401 });
        }

        const directusBase = process.env.NEXT_PUBLIC_API_BASE_URL;
        let announcementsData: any[] = [];

        console.log("[Announcement API Debug] Starting fetch process from directusBase:", directusBase);
        const companyListRes = await fetch(`${directusBase?.replace(/\/+$/, "")}/items/company_list?limit=-1`, {
            headers: { "Authorization": `Bearer ${process.env.DIRECTUS_STATIC_TOKEN}` },
            next: { revalidate: 0 }
        });

        if (companyListRes.ok) {
            const companyListJson = await companyListRes.json();
            const companies = companyListJson.data || [];
            console.log(`[Announcement API Debug] Successfully fetched ${companies.length} companies`);
            
            const defaultCompany = companies.find((c: any) => c.is_default === true || c.is_default === 1 || c.is_default === "1");
            console.log("[Announcement API Debug] Default Company found:", defaultCompany ? { company_id: defaultCompany.company_id, company_name: defaultCompany.company_name } : "None");

            if (defaultCompany) {
                const defaultCompanyId = defaultCompany.company_id;
                const company1 = companies.find((c: any) => c.company_id === 1);
                console.log("[Announcement API Debug] Company ID 1 found:", company1 ? { company_id: company1.company_id, directus: company1.directus } : "None");
                
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
                                status: { _in: ["Active", "Approved"] }
                            }
                        ]
                    });

                    const memoUrl = `${targetDirectus}/items/company_memo?filter=${encodeURIComponent(memoFilter)}&sort=-id,-created_at`;
                    console.log(`[Announcement API Debug] Fetching memos from URL: ${memoUrl}`);
                    const memoRes = await fetch(memoUrl, {
                        headers: { "Authorization": `Bearer ${targetToken}` },
                        next: { revalidate: 0 }
                    });

                    if (memoRes.ok) {
                        const memoJson = await memoRes.json();
                        const memos = memoJson.data || [];
                        console.log(`[Announcement API Debug] Fetched ${memos.length} memos`);

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
                        console.log(`[Announcement API Debug] Current PHT Date: ${currentDateStr}`);

                        const matchingMemos = memos.filter((memo: any) => {
                            const start = memo.start_date?.split("T")[0];
                            const end = memo.end_date?.split("T")[0];
                            const isMatch = !!(start && end && currentDateStr >= start && currentDateStr <= end);
                            console.log(`[Announcement API Debug] Comparing memo ID ${memo.id} (Subject: ${memo.subject}): start=${start}, end=${end}, match=${isMatch}`);
                            return isMatch;
                        });

                        if (matchingMemos.length > 0) {
                            console.log(`[Announcement API Debug] Matching memos found count: ${matchingMemos.length}`);
                            
                            const matchingMemoIds = matchingMemos.map((m: any) => m.id);
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
                            console.log(`[Announcement API Debug] Fetched ${attachments.length} total attachments for matching memos`);

                            announcementsData = matchingMemos.map((memo: any) => ({
                                memo,
                                attachments: attachments.filter((att: any) => att.company_memo_id === memo.id),
                                directusBaseUrl: targetDirectus
                            }));
                        } else {
                            console.log("[Announcement API Debug] No matching memos for current date range");
                        }
                    } else {
                        console.error("[Announcement API Debug] Memo fetch failed with status:", memoRes.status);
                    }
                } else {
                    console.log("[Announcement API Debug] Company ID 1 is missing directus or directus_token");
                }
            } else {
                console.log("[Announcement API Debug] No default company found");
            }
        } else {
            console.error("[Announcement API Debug] Company list fetch failed with status:", companyListRes.status);
        }

        return NextResponse.json({ announcements: announcementsData });
    } catch (err) {
        console.error("[Announcement API Debug] Caught exception in fetch process:", err);
        return NextResponse.json({ announcements: [], error: String(err) }, { status: 500 });
    }
}
