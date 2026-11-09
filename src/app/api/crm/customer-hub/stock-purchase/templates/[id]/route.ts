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

// GET /api/crm/customer-hub/stock-purchase/templates/[id]
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "ID parameter is required" }, { status: 400 });
        }

        const paramId = parseInt(id);

        // 1. Try fetching by Template Record ID (PK)
        const pkRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template/${paramId}`, {
            headers: directusHeaders(),
            cache: 'no-store'
        });

        if (pkRes.ok) {
            const pkData = await pkRes.json();
            if (pkData.data) {
                return NextResponse.json({ 
                    data: pkData.data,
                    template_config: pkData.data.template_config || null 
                });
            }
        }

        // 2. Fallback: Search by sales_invoice_type_id (Prefer is_default = true)
        const defaultRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template?filter[sales_invoice_type_id][_eq]=${paramId}&filter[is_default][_eq]=true&limit=1`, {
            headers: directusHeaders(),
            cache: 'no-store'
        });

        if (defaultRes.ok) {
            const defaultData = await defaultRes.json();
            if (defaultData.data && defaultData.data.length > 0) {
                return NextResponse.json({
                    data: defaultData.data[0],
                    template_config: defaultData.data[0].template_config || null
                });
            }
        }

        // 3. Fallback: Search any template for sales_invoice_type_id
        const fallbackRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template?filter[sales_invoice_type_id][_eq]=${paramId}&limit=1`, {
            headers: directusHeaders(),
            cache: 'no-store'
        });

        if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            const rec = fallbackData.data?.[0];
            if (rec) {
                return NextResponse.json({
                    data: rec,
                    template_config: rec.template_config || null
                });
            }
        }

        return NextResponse.json({ data: null, template_config: null });
    } catch (err: unknown) {
        console.error("[Stock Purchase Template API GET] Error:", err);
        return NextResponse.json({ error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}

// PATCH /api/crm/customer-hub/stock-purchase/templates/[id]
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
        }

        const templateId = parseInt(id);
        const body = await req.json();
        const { name, is_default, template_config, sales_invoice_type_id } = body;

        // Fetch current template record
        const curRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template/${templateId}`, {
            headers: directusHeaders(),
            cache: 'no-store'
        });

        if (!curRes.ok) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        const curData = await curRes.json();
        const currentRecord = curData.data;
        const targetTypeId = sales_invoice_type_id || currentRecord.sales_invoice_type_id;

        // Check name uniqueness if name is changed
        if (name && name.trim() !== currentRecord.name) {
            const cleanName = name.trim();
            const nameCheckRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template?filter[name][_eq]=${encodeURIComponent(cleanName)}&filter[id][_neq]=${templateId}`, {
                headers: directusHeaders()
            });
            if (nameCheckRes.ok) {
                const nameCheckData = await nameCheckRes.json();
                if (nameCheckData.data && nameCheckData.data.length > 0) {
                    return NextResponse.json({ error: `Template name "${cleanName}" already exists. Please choose a unique name.` }, { status: 400 });
                }
            }
        }

        // If setting as default, unset on others with same sales_invoice_type_id
        if (is_default) {
            const allRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template?filter[sales_invoice_type_id][_eq]=${targetTypeId}&filter[id][_neq]=${templateId}`, {
                headers: directusHeaders()
            });
            if (allRes.ok) {
                const allData = await allRes.json();
                for (const t of (allData.data || [])) {
                    if (t.is_default) {
                        await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template/${t.id}`, {
                            method: 'PATCH',
                            headers: directusHeaders(),
                            body: JSON.stringify({ is_default: false })
                        });
                    }
                }
            }
        }

        // Prepare update payload
        const updatePayload: Record<string, unknown> = {};
        if (name !== undefined) updatePayload.name = name.trim();
        if (is_default !== undefined) updatePayload.is_default = is_default;
        if (template_config !== undefined) updatePayload.template_config = template_config;
        if (sales_invoice_type_id !== undefined) updatePayload.sales_invoice_type_id = targetTypeId;

        const patchRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template/${templateId}`, {
            method: 'PATCH',
            headers: directusHeaders(),
            body: JSON.stringify(updatePayload)
        });

        if (!patchRes.ok) {
            const errBody = await patchRes.text();
            throw new Error(`Directus patch error: ${errBody}`);
        }

        const updatedData = await patchRes.json();
        return NextResponse.json({ success: true, data: updatedData.data });
    } catch (err: unknown) {
        console.error("[Stock Purchase Template API PATCH] Error:", err);
        return NextResponse.json({ error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}

// DELETE /api/crm/customer-hub/stock-purchase/templates/[id]
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
        }

        const templateId = parseInt(id);

        const curRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template/${templateId}`, {
            headers: directusHeaders()
        });

        if (!curRes.ok) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        const curData = await curRes.json();
        const currentRecord = curData.data;

        if (currentRecord.is_default) {
            return NextResponse.json({ error: "Cannot delete the default template. Set another template as default first." }, { status: 400 });
        }

        const delRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template/${templateId}`, {
            method: 'DELETE',
            headers: directusHeaders()
        });

        if (!delRes.ok) {
            const errBody = await delRes.text();
            throw new Error(`Directus delete error: ${errBody}`);
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        console.error("[Stock Purchase Template API DELETE] Error:", err);
        return NextResponse.json({ error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}

