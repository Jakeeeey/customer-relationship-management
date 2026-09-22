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

// GET /api/crm/invoicing/templates/[id]
// If [id] is numeric, tries fetching by record PK first. If not found or if requested as type, fetches default template for typeId.
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
        console.error("[Template API GET] Error:", err);
        return NextResponse.json({ error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}

// PATCH /api/crm/invoicing/templates/[id] - Update template by record PK ID
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
        const currentRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template/${templateId}`, {
            headers: directusHeaders()
        });

        if (!currentRes.ok) {
            return NextResponse.json({ error: `Template ID ${templateId} not found.` }, { status: 404 });
        }

        const currentRecord = (await currentRes.json()).data;
        const targetTypeId = sales_invoice_type_id ? parseInt(sales_invoice_type_id) : currentRecord.sales_invoice_type_id;

        const updatePayload: Record<string, unknown> = {};

        // 1. Name unique check if name is changing
        if (name && name.trim() && name.trim() !== currentRecord.name) {
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
            updatePayload.name = cleanName;
        }

        // 2. Is Default toggle logic
        if (is_default !== undefined) {
            updatePayload.is_default = Boolean(is_default);

            if (is_default === true && targetTypeId) {
                // Reset is_default = false on all other templates for this typeId
                const otherRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template?filter[sales_invoice_type_id][_eq]=${targetTypeId}&filter[id][_neq]=${templateId}`, {
                    headers: directusHeaders()
                });
                if (otherRes.ok) {
                    const otherData = await otherRes.json();
                    for (const t of (otherData.data || [])) {
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
        }

        // 3. Template Config update
        if (template_config) {
            updatePayload.template_config = {
                ...template_config,
                name: updatePayload.name || currentRecord.name || template_config.name
            };
        }

        if (sales_invoice_type_id) {
            updatePayload.sales_invoice_type_id = targetTypeId;
        }

        const saveRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template/${templateId}`, {
            method: 'PATCH',
            headers: directusHeaders(),
            body: JSON.stringify(updatePayload)
        });

        if (!saveRes.ok) {
            const errorText = await saveRes.text();
            return NextResponse.json({ error: "Failed to update template in Directus", details: errorText }, { status: saveRes.status });
        }

        const saveData = await saveRes.json();
        return NextResponse.json({ success: true, data: saveData.data });

    } catch (err: unknown) {
        console.error("[Template API PATCH] Uncaught Error:", err);
        return NextResponse.json({ 
            error: "Internal Server Error", 
            details: err instanceof Error ? err.message : String(err)
        }, { status: 500 });
    }
}

// DELETE /api/crm/invoicing/templates/[id]
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

        // Fetch current template record
        const currentRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template/${templateId}`, {
            headers: directusHeaders()
        });

        if (!currentRes.ok) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        const record = (await currentRes.json()).data;
        const typeId = record.sales_invoice_type_id;
        const wasDefault = record.is_default;

        // Delete record
        const delRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template/${templateId}`, {
            method: 'DELETE',
            headers: directusHeaders()
        });

        if (!delRes.ok) {
            return NextResponse.json({ error: "Failed to delete template" }, { status: delRes.status });
        }

        // If it was default, set another remaining template for this typeId as default
        if (wasDefault && typeId) {
            const remainingRes = await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template?filter[sales_invoice_type_id][_eq]=${typeId}&limit=1`, {
                headers: directusHeaders()
            });
            if (remainingRes.ok) {
                const remData = await remainingRes.json();
                if (remData.data && remData.data.length > 0) {
                    const nextDefaultId = remData.data[0].id;
                    await fetch(`${DIRECTUS_BASE}/items/sales_invoice_template/${nextDefaultId}`, {
                        method: 'PATCH',
                        headers: directusHeaders(),
                        body: JSON.stringify({ is_default: true })
                    });
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        console.error("[Template DELETE] Error:", err);
        return NextResponse.json({ error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
