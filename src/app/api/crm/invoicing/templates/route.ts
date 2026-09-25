import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function directusHeaders() {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    return h;
}

// GET /api/crm/invoicing/templates?typeId=1
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const typeId = searchParams.get("typeId");

        let filterQuery = "";
        if (typeId) {
            filterQuery = `?filter[sales_invoice_type_id][_eq]=${typeId}&sort=id`;
        } else {
            filterQuery = `?sort=id`;
        }

        const res = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template${filterQuery}`, {
            headers: directusHeaders(),
            cache: 'no-store'
        });

        if (!res.ok) {
            throw new Error(await res.text());
        }

        const data = await res.json();
        const templates = data.data || [];

        return NextResponse.json({ data: templates });
    } catch (err: unknown) {
        console.error("[Template List API GET] Error:", err);
        return NextResponse.json({ error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}

// POST /api/crm/invoicing/templates
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { sales_invoice_type_id, name, is_default, template_config } = body;

        if (!sales_invoice_type_id) {
            return NextResponse.json({ error: "sales_invoice_type_id is required" }, { status: 400 });
        }
        if (!name || !name.trim()) {
            return NextResponse.json({ error: "Template name is required" }, { status: 400 });
        }
        if (!template_config) {
            return NextResponse.json({ error: "template_config is required" }, { status: 400 });
        }

        const cleanName = name.trim();
        const typeId = parseInt(sales_invoice_type_id);

        // 1. Check unique name across all templates
        const nameCheckRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template?filter[name][_eq]=${encodeURIComponent(cleanName)}`, {
            headers: directusHeaders()
        });
        if (nameCheckRes.ok) {
            const nameCheckData = await nameCheckRes.json();
            if (nameCheckData.data && nameCheckData.data.length > 0) {
                return NextResponse.json({ error: `Template name "${cleanName}" already exists. Please choose a unique name.` }, { status: 400 });
            }
        }

        // 2. Check if there are existing templates for this typeId
        const existingRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template?filter[sales_invoice_type_id][_eq]=${typeId}`, {
            headers: directusHeaders()
        });
        const existingData = await existingRes.json();
        const existingTemplates = existingData.data || [];

        // If this is the first template for this type, or if is_default is true, set shouldBeDefault = true
        const shouldBeDefault = is_default || existingTemplates.length === 0;

        // 3. If setting as default, unset is_default on all existing templates for this typeId
        if (shouldBeDefault && existingTemplates.length > 0) {
            for (const t of existingTemplates) {
                if (t.is_default) {
                    await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template/${t.id}`, {
                        method: 'PATCH',
                        headers: directusHeaders(),
                        body: JSON.stringify({ is_default: false })
                    });
                }
            }
        }

        // 4. Create new template record
        const createRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template`, {
            method: 'POST',
            headers: directusHeaders(),
            body: JSON.stringify({
                sales_invoice_type_id: typeId,
                name: cleanName,
                is_default: shouldBeDefault,
                template_config: {
                    ...template_config,
                    name: cleanName
                }
            })
        });

        if (!createRes.ok) {
            const errorText = await createRes.text();
            return NextResponse.json({ error: "Failed to create template in Directus", details: errorText }, { status: createRes.status });
        }

        const saveData = await createRes.json();
        return NextResponse.json({ success: true, data: saveData.data });
    } catch (err: unknown) {
        console.error("[Template POST] Error:", err);
        return NextResponse.json({ error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
