import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = "vos_access_token";
const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

const fetchHeaders = {
    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    "Content-Type": "application/json",
};

export const dynamic = "force-dynamic";

interface JwtPayload {
    email?: string;
    Email?: string;
}

function decodeJwtPayload(token: string): JwtPayload | null {
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

async function resolveUserId() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;
        if (!token) return null;

        const payload = decodeJwtPayload(token);
        const email = payload?.email || payload?.Email || "";

        if (email) {
            const res = await fetch(`${DIRECTUS_URL}/items/user?filter[user_email][_eq]=${encodeURIComponent(email)}&fields=user_id&limit=1`, { headers: fetchHeaders });
            if (res.ok) {
                const data = (await res.json()).data;
                if (data && data.length > 0) return data[0].user_id;
            }
        }
    } catch (e) {
        console.error("Failed to resolve user_id:", e);
    }
    return null;
}

export async function GET(req: NextRequest) {
    const type = req.nextUrl.searchParams.get("type");
    const searchParams = req.nextUrl.searchParams;

    try {
        if (type === "worklist") {
            const search = searchParams.get("search") || "";
            const salesmanId = searchParams.get("salesmanId");
            const customerId = searchParams.get("customerId");
            const salesTypeId = searchParams.get("salesTypeId");
            const startDate = searchParams.get("startDate");
            const endDate = searchParams.get("endDate");
            const isDispatched = searchParams.get("isDispatched") === "true"; 
            const page = parseInt(searchParams.get("page") || "1", 10);
            const limit = parseInt(searchParams.get("limit") || "-1", 10);

            // Filter building
            const filters: { _and: Record<string, unknown>[] } = {
                _and: []
            };

            // Filter by Sales Type if specified and not 'all'
            if (salesTypeId && salesTypeId !== "all") {
                filters._and.push({ sales_type: { _eq: salesTypeId } });
            } else if (!salesTypeId) {
                // If not provided at all, default to 3 (Van Sales)
                filters._and.push({ sales_type: { _eq: 3 } });
            }
            // If salesTypeId is 'all', we don't add the filter, allowing nulls and other types

            if (searchParams.has("isDispatched")) {
                if (isDispatched) {
                    filters._and.push({ isDispatched: { _eq: true } });
                } else {
                    filters._and.push({ isDispatched: { _neq: true } });
                }
            }

            if (searchParams.has("isPaid")) {
                const paidValue = searchParams.get("isPaid") === "true";
                if (paidValue) {
                    filters._and.push({ payment_status: { _eq: "Paid" } });
                } else {
                    // Use _neq to include everything that is NOT "Paid" (including NULLs)
                    filters._and.push({ 
                        payment_status: { _neq: "Paid" } 
                    });
                }
            }

            if (salesmanId && salesmanId !== "all") {
                filters._and.push({ salesman_id: { _eq: salesmanId } });
            }

            if (startDate && endDate) {
                filters._and.push({ created_date: { _between: [startDate, endDate] } });
            }

            if (search) {
                filters._and.push({ invoice_no: { _icontains: search } });
            }

            if (customerId && customerId !== "all") {
                filters._and.push({ customer_code: { _eq: customerId } });
            }

            const query = new URLSearchParams({
                filter: JSON.stringify(filters),
                page: page.toString(),
                limit: limit.toString(),
                fields: "*,salesman_id.salesman_name", // Removed customer_code expansion for now
                meta: "total_count"
            });

            console.log("Fetching worklist with query:", query.toString());

            const res = await fetch(`${DIRECTUS_URL}/items/sales_invoice?${query.toString()}`, { headers: fetchHeaders });
            if (!res.ok) {
                const errorData = await res.json();
                console.error("Directus Error:", JSON.stringify(errorData, null, 2));
                throw new Error(errorData?.errors?.[0]?.message || "Failed to fetch worklist");
            }
            
            const json = await res.json();
            const rawData = json.data || [];

            // Fetch customer names manually to avoid NaN join error
            const customerCodes = Array.from(new Set(rawData.map((item: { customer_code: string }) => item.customer_code).filter(Boolean)));
            const customerMap: Record<string, string> = {};
            
            if (customerCodes.length > 0) {
                const cRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[customer_code][_in]=${customerCodes.join(",")}&fields=customer_code,customer_name,store_name`, { headers: fetchHeaders });
                if (cRes.ok) {
                    const cData = (await cRes.json()).data || [];
                    cData.forEach((c: { customer_code: string; store_name?: string; customer_name?: string }) => {
                        customerMap[c.customer_code] = c.store_name || c.customer_name || "N/A";
                    });
                }
            }

            const data = rawData.map((item: { 
                customer_code: string; 
                salesman_id: { id: string | number; salesman_name: string } | string | number;
            }) => ({
                ...item,
                salesman_name: typeof item.salesman_id === 'object' ? item.salesman_id?.salesman_name : "N/A",
                customer_name: customerMap[item.customer_code] || item.customer_code || "N/A",
                salesman_id: typeof item.salesman_id === 'object' ? item.salesman_id?.id : item.salesman_id
            }));


            return NextResponse.json({
                data,
                metadata: {
                    totalCount: json.meta?.total_count || 0,
                    page,
                    limit
                }
            });
        }


        if (type === "details") {
            const invoiceId = searchParams.get("invoiceId");
            if (!invoiceId) return NextResponse.json({ error: "invoiceId required" }, { status: 400 });

            // Fetch Header with expanded info (Added price_type_id)
            const headerRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice/${invoiceId}?fields=*,salesman_id.salesman_name,salesman_id.salesman_code,salesman_id.price_type_id,branch_id.branch_name`, { headers: fetchHeaders });
            const header = (await headerRes.json()).data || {};

            // Fetch Details (Items)
            const detRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice_details?filter[invoice_no][_eq]=${invoiceId}&fields=*,product_id.product_id,product_id.product_name,product_id.product_code,discount_type.discount_type&limit=-1`, { headers: fetchHeaders });
            const details = (await detRes.json()).data || [];

            // Identify Main Supplier from existing items
            let main_supplier_id = null;
            if (details.length > 0) {
                const firstProductId = typeof details[0].product_id === 'object' ? details[0].product_id?.product_id : details[0].product_id;
                if (firstProductId) {
                    const ppsRes = await fetch(`${DIRECTUS_URL}/items/product_per_supplier?filter[product_id][_eq]=${firstProductId}&fields=supplier_id&limit=1`, { headers: fetchHeaders });
                    const ppsData = (await ppsRes.json()).data;
                    if (ppsData && ppsData.length > 0) {
                        main_supplier_id = ppsData[0].supplier_id;
                    }
                }
            }

            // Fetch Returns logic remains the same...
            // (I'll keep the existing Return fetch logic here, just making sure I don't break it)
            // [EXISTING RETURNS FETCH LOGIC START]
            interface ReturnItem {
                id: number;
                product_name: string;
                quantity: number;
                unit_price: number;
                total_amount: number;
                discount_amount: number;
                discount_type_name: string | null;
                reason?: string;
            }

            interface ReturnDoc {
                id: number;
                type: string;
                reference_no: string;
                date: string;
                amount: number;
                status: string;
                items: ReturnItem[];
            }

            interface DirectusReturnItemDetail {
                detail_id: number;
                product_id: { product_name: string; product_id?: string | number };
                quantity: number;
                unit_price: number;
                total_amount: number;
                discount_amount: number;
                discount_type?: { discount_type: string };
                reason?: string;
                return_no: string | number | { return_number: string };
            }

            let linkedDocs: ReturnDoc[] = [];
            try {
                const returnsRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice_sales_return?filter[invoice_no][_eq]=${invoiceId}&fields=id,amount,created_at,return_no.*&limit=-1`, { headers: fetchHeaders });
                if (returnsRes.ok) {
                    const resJson = await returnsRes.json();
                    const returnsData = resJson.data || [];
                    const processedReturns = [];
                    for (const r of returnsData) {
                        let headerInfo = (r.return_no && typeof r.return_no === 'object') ? r.return_no : null;
                        if (!headerInfo && r.return_no) {
                            const hRes = await fetch(`${DIRECTUS_URL}/items/sales_return/${r.return_no}?fields=return_id,return_number,return_date,total_amount`, { headers: fetchHeaders });
                            if (hRes.ok) headerInfo = (await hRes.json()).data;
                        }
                        processedReturns.push({ ...r, headerInfo });
                    }
                    const returnNumbers = processedReturns.map(p => p.headerInfo?.return_number).filter(Boolean);
                    let allReturnItems = [];
                    if (returnNumbers.length > 0) {
                        const itemsRes = await fetch(`${DIRECTUS_URL}/items/sales_return_details?filter[return_no][_in]=${returnNumbers.join(",")}&fields=*,product_id.product_name,product_id.product_id,discount_type.discount_type&limit=-1`, { headers: fetchHeaders });
                        if (itemsRes.ok) allReturnItems = (await itemsRes.json()).data || [];
                    }
                    linkedDocs = processedReturns.map(p => {
                        const returnNumberStr = p.headerInfo?.return_number || null;
                        const displayRef = returnNumberStr || (p.headerInfo ? p.headerInfo.return_id : p.return_no);
                        const items = allReturnItems.filter((item: DirectusReturnItemDetail) => {
                            const itemReturnNo = (item.return_no && typeof item.return_no === 'object') ? (item.return_no as { return_number: string }).return_number : item.return_no;
                            return itemReturnNo === returnNumberStr;
                        }).map((item: DirectusReturnItemDetail) => ({
                            id: item.detail_id,
                            product_name: item.product_id?.product_name || `Product ${item.product_id}`,
                            quantity: item.quantity,
                            unit_price: item.unit_price,
                            total_amount: item.total_amount,
                            discount_amount: item.discount_amount,
                            discount_type_name: item.discount_type?.discount_type || (Number(item.discount_amount) > 0 ? "Discount" : null),
                            reason: item.reason
                        }));
                        return {
                            id: p.id, type: "RETURN", reference_no: displayRef ? `${displayRef}` : `RET-${p.id}`,
                            date: p.headerInfo?.return_date || p.created_at,
                            amount: Number(p.amount) || Number(p.headerInfo?.total_amount) || 0,
                            status: "LINKED", items
                        };
                    });
                }
            } catch (e) { console.error("Returns fetch exception:", e); }
            // [EXISTING RETURNS FETCH LOGIC END]

            const mappedDetails = [];
            for (const d of details) {
                let discTypeName = (d.discount_type && typeof d.discount_type === 'object') ? (d.discount_type as { discount_type?: string }).discount_type : null;
                if (!discTypeName && d.discount_type && (typeof d.discount_type === 'number' || typeof d.discount_type === 'string')) {
                    const dtRes = await fetch(`${DIRECTUS_URL}/items/discount_type/${d.discount_type}?fields=discount_type`, { headers: fetchHeaders });
                    if (dtRes.ok) discTypeName = (await dtRes.json()).data?.discount_type;
                }
                if (!discTypeName && Number(d.discount_amount) > 0) discTypeName = "Discount";
                mappedDetails.push({ ...d, product_name: d.product_id?.product_name || `Product ${d.product_id?.product_id || 'N/A'}`, discount_type_name: discTypeName });
            }

            return NextResponse.json({
                header,
                details: mappedDetails,
                linkedDocs,
                main_supplier_id // Added this
            });
        }

        if (type === "search_products") {
            const search = searchParams.get("search") || "";
            const priceTypeId = searchParams.get("priceTypeId");
            const supplierId = searchParams.get("supplierId");

            if (!priceTypeId) return NextResponse.json({ error: "priceTypeId required" }, { status: 400 });

            // 1. Fetch products linked to this supplier (via product_per_supplier)
            let productIdsBySupplier: number[] | null = null;
            if (supplierId && supplierId !== "null") {
                const ppsRes = await fetch(`${DIRECTUS_URL}/items/product_per_supplier?filter[supplier_id][_eq]=${supplierId}&fields=product_id&limit=-1`, { headers: fetchHeaders });
                const ppsData = (await ppsRes.json()).data || [];
                productIdsBySupplier = ppsData.map((p: { product_id: number }) => p.product_id);
            }

            // 2. Fetch prices from product_per_price_type
            const priceFilter: { _and: Record<string, unknown>[] } = {
                _and: [
                    { price_type_id: { _eq: priceTypeId } },
                    { status: { _eq: "published" } }
                ]
            };
            if (productIdsBySupplier) {
                priceFilter._and.push({ product_id: { _in: productIdsBySupplier } });
            }

            const pricesRes = await fetch(`${DIRECTUS_URL}/items/product_per_price_type?filter=${JSON.stringify(priceFilter)}&fields=price,product_id.*&limit=-1`, { headers: fetchHeaders });
            const pricesData: { price: number; product_id: { product_id: number; product_name: string; product_code: string; unit_of_measurement: number } }[] = (await pricesRes.json()).data || [];

            // 3. Combine and search
            const results = pricesData.filter((p) => {
                const prod = p.product_id;
                if (!prod) return false;
                const nameMatch = prod.product_name?.toLowerCase().includes(search.toLowerCase());
                const codeMatch = prod.product_code?.toLowerCase().includes(search.toLowerCase());
                return nameMatch || codeMatch;
            }).map((p) => ({
                product_id: p.product_id.product_id,
                product_name: p.product_id.product_name,
                product_code: p.product_id.product_code,
                unit_price: p.price,
                unit: p.product_id.unit_of_measurement // Use default UOM from product
            }));

            return NextResponse.json(results);
        }

        if (type === "salesmen") {
            const res = await fetch(`${DIRECTUS_URL}/items/salesman?filter[isActive][_eq]=1&fields=*&limit=-1`, { headers: fetchHeaders, cache: "no-store" });
            return NextResponse.json((await res.json()).data || []);
        }

        if (type === "sales_types") {
            const res = await fetch(`${DIRECTUS_URL}/items/operation?fields=id,operation_name&limit=-1`, { headers: fetchHeaders, cache: "no-store" });
            return NextResponse.json((await res.json()).data || []);
        }

        if (type === "customers") {
            const search = searchParams.get("search") || "";
            let url = `${DIRECTUS_URL}/items/customer?filter[isActive][_eq]=1&fields=customer_code,customer_name,store_name,city,province&limit=-1`;
            if (search) {
                url += `&filter[_or][0][customer_name][_icontains]=${encodeURIComponent(search)}&filter[_or][1][customer_code][_icontains]=${encodeURIComponent(search)}`;
            }
            const res = await fetch(url, { headers: fetchHeaders, cache: "no-store" });
            return NextResponse.json((await res.json()).data || []);
        }

        if (type === "available_returns") {
            const customerCode = searchParams.get("customerCode");
            if (!customerCode) return NextResponse.json({ error: "customerCode required" }, { status: 400 });

            // 1. Get all returns already linked to ANY invoice (to avoid double linking)
            const linkedRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice_sales_return?fields=return_no&limit=-1`, { headers: fetchHeaders });
            const linkedData = (await linkedRes.json()).data || [];
            const linkedReturnIds = linkedData.map((l: { return_no: number | string }) => l.return_no).filter(Boolean);

            // 2. Fetch returns for this customer that are NOT in the linked list
            const filters: { _and: Record<string, unknown>[] } = {
                _and: [
                    { customer_code: { _eq: customerCode } }
                ]
            };

            if (linkedReturnIds.length > 0) {
                filters._and.push({ return_id: { _nin: linkedReturnIds } });
            }

            const res = await fetch(`${DIRECTUS_URL}/items/sales_return?filter=${JSON.stringify(filters)}&fields=*,salesman_id.salesman_name&limit=-1`, { headers: fetchHeaders });
            if (!res.ok) throw new Error("Failed to fetch available returns");
            
            return NextResponse.json((await res.json()).data || []);
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, invoiceId, customer_code, invoice_date, due_date, remarks, details, deletedDetailIds } = body;
        
        if (action === "save_adjustments") {
            const userId = await resolveUserId();
            const now = new Date().toISOString();

            // 1. Process deleted items
            if (deletedDetailIds && deletedDetailIds.length > 0) {
                for (const id of deletedDetailIds) {
                    await fetch(`${DIRECTUS_URL}/items/sales_invoice_details/${id}`, {
                        method: "DELETE",
                        headers: fetchHeaders
                    });
                }
            }

            // 2. Upsert items
            for (const item of details) {
                const method = item.detail_id ? "PATCH" : "POST";
                const url = item.detail_id 
                    ? `${DIRECTUS_URL}/items/sales_invoice_details/${item.detail_id}`
                    : `${DIRECTUS_URL}/items/sales_invoice_details`;

                await fetch(url, {
                    method,
                    headers: fetchHeaders,
                    body: JSON.stringify({
                        ...item,
                        invoice_id: invoiceId
                    })
                });
            }

            // 3. Recalculate totals and Update Header
            const detRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice_details?filter[invoice_id][_eq]=${invoiceId}&fields=*&limit=-1`, { headers: fetchHeaders });
            const currentDetails = (await detRes.json()).data || [];

            let totalGross = 0;
            let totalNet = 0;
            let totalDiscount = 0;
            let totalVat = 0;

            currentDetails.forEach((d: { 
                quantity: number | string; 
                unit_price: number | string; 
                discount_amount: number | string; 
            }) => {
                const qty = Number(d.quantity) || 0;
                const price = Number(d.unit_price) || 0;
                const disc = Number(d.discount_amount) || 0;
                
                const lineGross = qty * price;
                const lineNet = lineGross - disc;
                // Simple 12% VAT logic for now, or use what's in the DB if available
                const lineVat = lineNet * 0.12; 

                totalGross += lineGross;
                totalDiscount += disc;
                totalNet += lineNet;
                totalVat += lineVat;
            });

            const headerUpdate = {
                customer_code,
                invoice_date,
                due_date,
                remarks,
                gross_amount: totalGross,
                discount_amount: totalDiscount,
                net_amount: totalNet,
                vat_amount: totalVat,
                total_amount: totalNet + totalVat,
                modified_by: userId,
                modified_date: now
            };

            const hRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice/${invoiceId}`, {
                method: "PATCH",
                headers: fetchHeaders,
                body: JSON.stringify(headerUpdate)
            });

            if (!hRes.ok) throw new Error("Failed to update header");

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, invoiceIds } = body;

        if (action === "finalize_settlement") {
            const userId = await resolveUserId();
            const now = new Date().toISOString();

            for (const id of invoiceIds) {
                await fetch(`${DIRECTUS_URL}/items/sales_invoice/${id}`, {
                    method: "PATCH",
                    headers: fetchHeaders,
                    body: JSON.stringify({
                        isDispatched: 1,
                        modified_by: userId,
                        modified_date: now
                    })
                });
            }

            return NextResponse.json({ success: true });
        }

        if (action === "link_return") {
            const { invoiceId, returnId, amount } = body;
            const userId = await resolveUserId();
            const now = new Date().toISOString();

            const res = await fetch(`${DIRECTUS_URL}/items/sales_invoice_sales_return`, {
                method: "POST",
                headers: fetchHeaders,
                body: JSON.stringify({
                    invoice_no: invoiceId,
                    return_no: returnId,
                    amount: amount,
                    linked_by: userId,
                    created_at: now
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData?.errors?.[0]?.message || "Failed to link return");
            }

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
