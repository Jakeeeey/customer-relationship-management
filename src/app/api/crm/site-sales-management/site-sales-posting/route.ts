import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = "vos_access_token";
const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const SPRING_API_BASE_URL = process.env.SPRING_API_BASE_URL;

const fetchHeaders = {
    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    "Content-Type": "application/json",
};

export const dynamic = "force-dynamic";

interface JwtPayload {
    email?: string;
    Email?: string;
}

interface CategoryBrand {
    category_id?: number;
    id?: number;
    category_name?: string;
    brand_id?: number;
    brand_name?: string;
}

interface ProductItem {
    product_id: number;
    product_name: string;
    product_code: string;
    description?: string;
    isActive?: number | boolean;
    product_category?: CategoryBrand | number | null;
    product_brand?: CategoryBrand | number | null;
    unit_of_measurement?: number;
    unit_of_measurement_count?: number;
}

interface DiscountItem {
    product_id?: number;
    category_id?: number;
    brand_id?: number;
    discount_type?: number;
    discount_type_id?: number;
    unit_price?: number | string;
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

const fetchInChunks = async <T = Record<string, unknown>>(urlBase: string, ids: (string | number)[], filterField: string): Promise<T[]> => {
    let results: T[] = [];
    const chunkSize = 80;
    const cleanBase = urlBase.replace(/[?&]limit=-1$/, "");
    const connector = cleanBase.includes("?") ? "&" : "?";
    for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const url = `${cleanBase}${connector}filter[${filterField}][_in]=${chunk.join(",")}&limit=-1`;
        const res = await fetch(url, { headers: fetchHeaders });
        if (res.ok) {
            const json = await res.json();
            if (json.data) results = results.concat(json.data);
        }
    }
    return results;
};

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

            // Fetch Header with expanded info
            const headerRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice/${invoiceId}?fields=*,salesman_id.salesman_name,salesman_id.salesman_code,salesman_id.price_type_id,branch_id.*`, { headers: fetchHeaders });
            const header = (await headerRes.json()).data || {};

            // Resolve Customer Name
            if (header.customer_code) {
                const custRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[customer_code][_eq]=${header.customer_code}&fields=customer_name`, { headers: fetchHeaders });
                const custData = (await custRes.json()).data;
                if (custData && custData.length > 0) {
                    header.customer_name = custData[0].customer_name;
                }
            }

            // Fetch Units for mapping
            const unitsRes = await fetch(`${DIRECTUS_URL}/items/units?limit=-1`, { headers: fetchHeaders });
            const unitsData = (await unitsRes.json()).data || [];
            const unitMap: Record<number, string> = unitsData.reduce((acc: Record<number, string>, u: { unit_id: number; unit_name?: string }) => ({
                ...acc,
                [Number(u.unit_id)]: u.unit_name || "N/A"
            }), {});

            // Fetch Details (Items) with brand and category
            const detRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice_details?filter[invoice_no][_eq]=${invoiceId}&fields=*,product_id.product_id,product_id.product_name,product_id.product_code,product_id.product_brand.brand_name,product_id.product_category.category_name,discount_type.discount_type&limit=-1`, { headers: fetchHeaders });
            const details = (await detRes.json()).data || [];

            // Identify Main Supplier from existing items
            let main_supplier_id = null;
            let main_supplier_name = null;
            if (details.length > 0) {
                const firstProductId = typeof details[0].product_id === 'object' ? details[0].product_id?.product_id : details[0].product_id;
                if (firstProductId) {
                    const ppsRes = await fetch(`${DIRECTUS_URL}/items/product_per_supplier?filter[product_id][_eq]=${firstProductId}&fields=supplier_id.id,supplier_id.supplier_name&limit=1`, { headers: fetchHeaders });
                    const ppsData = (await ppsRes.json()).data;
                    if (ppsData && ppsData.length > 0) {
                        main_supplier_id = ppsData[0].supplier_id?.id || ppsData[0].supplier_id;
                        main_supplier_name = ppsData[0].supplier_id?.supplier_name || null;
                    }
                }
            }

            // Fetch Returns logic remains the same...
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

                // Fetch Linked Memos (everything associated with this invoice)
                const memosRes = await fetch(`${DIRECTUS_URL}/items/customer_memo_invoices?filter[invoice_id][_eq]=${invoiceId}&fields=*,memo_id.*,memo_id.type.balance_name,memo_id.chart_of_account.account_title,memo_id.chart_of_account.gl_code,memo_id.chart_of_account.account_type&limit=-1`, { headers: fetchHeaders });
                if (memosRes.ok) {
                    const memosData = (await memosRes.json()).data || [];
                    const mappedMemos = memosData.map((m: {
                        id: number;
                        memo_id: {
                            id: number;
                            memo_number?: string;
                            status?: string;
                            type?: { id: number; balance_name?: string };
                            chart_of_account?: { account_title?: string; gl_code?: string; account_type?: number };
                        };
                        amount: number;
                        date_applied: string;
                        created_at: string;
                    }) => ({
                        id: m.id,
                        type: "MEMO",
                        reference_no: m.memo_id?.memo_number || `MEMO-${m.memo_id?.id || m.memo_id}`,
                        date: m.date_applied || m.created_at,
                        amount: Number(m.amount) || 0,
                        status: m.memo_id?.status || "LINKED",
                        balance_name: m.memo_id?.type?.balance_name || "N/A",
                        account_title: m.memo_id?.chart_of_account?.account_title || "N/A",
                        gl_code: m.memo_id?.chart_of_account?.gl_code || "N/A",
                        memo_type_id: m.memo_id?.type?.id || m.memo_id?.type
                    }));
                    linkedDocs = [...linkedDocs, ...mappedMemos];
                }

            } catch (e) { console.error("Linked documents fetch exception:", e); }

            const mappedDetails = [];
            for (const d of details) {
                let discTypeName = (d.discount_type && typeof d.discount_type === 'object') ? (d.discount_type as { discount_type?: string }).discount_type : null;
                if (!discTypeName && d.discount_type && (typeof d.discount_type === 'number' || typeof d.discount_type === 'string')) {
                    const dtRes = await fetch(`${DIRECTUS_URL}/items/discount_type/${d.discount_type}?fields=discount_type`, { headers: fetchHeaders });
                    if (dtRes.ok) discTypeName = (await dtRes.json()).data?.discount_type;
                }
                if (!discTypeName && Number(d.discount_amount) > 0) discTypeName = "Discount";

                const prod = d.product_id && typeof d.product_id === 'object' ? d.product_id : null;

                mappedDetails.push({
                    ...d,
                    product_name: prod?.product_name || `Product ${prod?.product_id || 'N/A'}`,
                    brand_name: prod?.product_brand?.brand_name || 'N/A',
                    category_name: prod?.product_category?.category_name || 'N/A',
                    unit_name: (d.unit && unitMap[Number(d.unit)]) ? unitMap[Number(d.unit)] : 'PCS',
                    discount_type_name: discTypeName
                });
            }

            return NextResponse.json({
                header,
                details: mappedDetails,
                linkedDocs,
                main_supplier_id,
                main_supplier_name
            });
        }

        if (type === "search_products") {
            try {
                const search = searchParams.get("search") || "";
                const priceTypeId = searchParams.get("priceTypeId");
                const supplierIdRaw = searchParams.get("supplierId");
                const supplierId = supplierIdRaw ? Number(supplierIdRaw) : null;
                const branchId = searchParams.get("branchId");
                const customerCode = searchParams.get("customerCode");

                if (!priceTypeId || !customerCode || !supplierIdRaw) {
                    return NextResponse.json({ error: "priceTypeId, customerCode and supplierIdRaw required" }, { status: 400 });
                }

                // 1. Fetch products linked to this supplier (or all if specified)
                let linkedProductIds: (string | number)[] = [];
                if (supplierIdRaw === "all") {
                    // Fetch all products that have a price for this price type
                    const poRes = await fetch(`${DIRECTUS_URL}/items/product_per_price_type?filter[price_type_id][_eq]=${priceTypeId}&filter[status][_eq]=published&fields=product_id&limit=-1`, { headers: fetchHeaders });
                    const poData = (await poRes.json()).data || [];
                    linkedProductIds = poData.map((po: { product_id: number | { id?: number; product_id?: number } }) => {
                        if (po.product_id && typeof po.product_id === 'object') return po.product_id.id || po.product_id.product_id;
                        return po.product_id;
                    }).filter(Boolean);
                } else {
                    const ppsRes = await fetch(`${DIRECTUS_URL}/items/product_per_supplier?filter[supplier_id][_eq]=${supplierId}&fields=product_id&limit=-1`, { headers: fetchHeaders });
                    const psData = (await ppsRes.json()).data || [];
                    linkedProductIds = psData.map((ps: { product_id: number | { id?: number; product_id?: number } }) => {
                        if (ps.product_id && typeof ps.product_id === 'object') return ps.product_id.id || ps.product_id.product_id;
                        return ps.product_id;
                    }).filter(Boolean);
                }

                if (linkedProductIds.length === 0) return NextResponse.json([]);

                // 2. Fetch prices from product_per_price_type (Strict base)
                const priceOverrides: Record<number, number> = {};
                const poRes = await fetchInChunks<{ product_id: number | string; price: number | string }>(`${DIRECTUS_URL}/items/product_per_price_type?filter[price_type_id][_eq]=${priceTypeId}&filter[status][_eq]=published`, linkedProductIds, "product_id");
                poRes.forEach(po => { priceOverrides[Number(po.product_id)] = Number(po.price); });

                // 3. Fetch Full Product Details
                const initialProducts = await fetchInChunks<ProductItem>(`${DIRECTUS_URL}/items/products?filter[isActive][_eq]=1&fields=*,product_category.category_id,product_category.category_name,product_brand.brand_id,product_brand.brand_name`, linkedProductIds, "product_id");

                // Filter by search and strict price requirement
                const sellableItems = initialProducts.filter((p) => {
                    const hasPrice = Object.prototype.hasOwnProperty.call(priceOverrides, Number(p.product_id));
                    const q = search.toLowerCase();
                    const matchesSearch = (p.product_name || "").toLowerCase().includes(q) || (p.product_code || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
                    return hasPrice && matchesSearch;
                });

                if (sellableItems.length === 0) return NextResponse.json([]);

                // 4. Waterfall Data Fetching
                const allIds = sellableItems.map((p) => Number(p.product_id));

                // L1: Customer Price Overrides
                const l1Items = await fetchInChunks<DiscountItem>(`${DIRECTUS_URL}/items/product_per_customer?filter[customer_code][_eq]=${customerCode}&fields=product_id,unit_price,discount_type`, allIds, "product_id");

                // L2: Supplier Category Discount
                const l2Items: DiscountItem[] = (await (await fetch(`${DIRECTUS_URL}/items/supplier_category_discount_per_customer?filter[customer_code][_eq]=${customerCode}&filter[supplier_id][_eq]=${supplierId}&limit=-1`, { headers: fetchHeaders })).json()).data || [];

                // L4: Customer Brand Discount
                const custRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[customer_code][_eq]=${customerCode}&fields=id,discount_type`, { headers: fetchHeaders });
                const customerData = (await custRes.json()).data?.[0];
                const customerId = customerData?.id;

                let l4Items: DiscountItem[] = [];
                if (customerId) {
                    const l4Res = await fetch(`${DIRECTUS_URL}/items/customer_discount_brand?filter[customer_id][_eq]=${customerId}&limit=-1`, { headers: fetchHeaders });
                    l4Items = (await l4Res.json()).data || [];
                }

                // 5. Discount Types Resolution
                const typeIds = new Set(
                    l1Items.map((i) => i.discount_type)
                        .concat(l2Items.map((i) => i.discount_type))
                        .concat(l4Items.map((i) => i.discount_type_id))
                        .concat([customerData?.discount_type])
                        .filter(Boolean)
                );

                const discountMap: Record<number, number[]> = {};
                const discountTypeNameMap: Record<number, string> = {};

                if (typeIds.size > 0) {
                    const lpdtItems = await fetchInChunks<{ type_id: number; line_id: { percentage: number } }>(`${DIRECTUS_URL}/items/line_per_discount_type?fields=type_id,line_id.percentage&sort=id`, Array.from(typeIds) as (string | number)[], "type_id");
                    lpdtItems.forEach(item => {
                        const tid = Number(item.type_id);
                        if (!discountMap[tid]) discountMap[tid] = [];
                        discountMap[tid].push(Number(item.line_id?.percentage) || 0);
                    });

                    const dtRes = await fetchInChunks<{ id: number; discount_type: string }>(`${DIRECTUS_URL}/items/discount_type?fields=id,discount_type`, Array.from(typeIds) as (string | number)[], "id");
                    dtRes.forEach(dt => { discountTypeNameMap[Number(dt.id)] = dt.discount_type || ""; });
                }

                // 6. Inventory Data Fetching
                const inventoryMap: Record<number, { available: number; unitCount: number }> = {};
                if (branchId && SPRING_API_BASE_URL) {
                    try {
                        let branchCodeStr: string | null = null;
                        if (!isNaN(Number(branchId))) {
                            const bRes = await fetch(`${DIRECTUS_URL}/items/branches/${branchId}?fields=branch_code`, { headers: fetchHeaders });
                            if (bRes.ok) branchCodeStr = (await bRes.json()).data?.branch_code || null;
                        } else branchCodeStr = String(branchId);

                        const cookieStore = await cookies();
                        const token = cookieStore.get(COOKIE_NAME)?.value;
                        const invUrl = `${SPRING_API_BASE_URL.replace(/\/$/, "")}/api/view-running-inventory-by-unit/all?startDate=2025-01-01&endDate=2026-12-30`;
                        const inventoryRes = await fetch(invUrl, {
                            headers: { "Accept": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
                            cache: 'no-store',
                        });

                        if (inventoryRes.ok) {
                            const invData = (await inventoryRes.json()) as { branchId?: number; branch_id?: number; BranchId?: number; productId?: number; product_id?: number; ProductId?: number; runningInventoryUnit?: number; running_inventory_unit?: number; runningInventory?: number; running_inventory?: number; unitCount?: number; unit_count?: number }[];
                            invData.forEach((item) => {
                                const itemBId = item.branchId ?? item.branch_id ?? item.BranchId;
                                const matchId = (itemBId && Number(itemBId) === Number(branchId));
                                const matchCode = (branchCodeStr && itemBId && String(itemBId).toUpperCase() === String(branchCodeStr).toUpperCase());
                                if (matchId || matchCode) {
                                    const pid = item.productId ?? item.product_id ?? item.ProductId;
                                    if (pid) {
                                        const available = Number(item.runningInventoryUnit ?? item.running_inventory_unit ?? item.runningInventory ?? item.running_inventory ?? 0);
                                        const unitCount = Number(item.unitCount ?? item.unit_count ?? 1);
                                        inventoryMap[Number(pid)] = { available, unitCount };
                                    }
                                }
                            });
                        }
                    } catch (e) { console.error("[InventoryFetch] Error:", e); }
                }

                // 7. Unit Mapping
                const unitsRes = await fetch(`${DIRECTUS_URL}/items/units?limit=-1`, { headers: fetchHeaders });
                const unitsData = (await unitsRes.json()).data || [];
                const unitMap: Record<number, string> = unitsData.reduce((acc: Record<number, string>, u: { unit_id: number; unit_shortcut?: string; unit_name?: string }) => ({ ...acc, [Number(u.unit_id)]: u.unit_shortcut || u.unit_name || "PCS" }), {});

                // 8. Sorting Priority
                const uomPriority: Record<string, number> = { 'BOX': 1, 'CASE': 1, 'CS': 1, 'TIE': 2, 'PACK': 3, 'PCK': 3, 'BNDL': 3, 'PCS': 4, 'PC': 4 };

                // 9. Final Mapping with Waterfall Logic
                const results = sellableItems.map((p) => {
                    let winId = null;
                    let price = priceOverrides[Number(p.product_id)] || 0;

                    // L1 check
                    const l1 = l1Items.find((item) => Number(item.product_id) === Number(p.product_id));
                    if (l1) { winId = l1.discount_type; price = Number(l1.unit_price) || price; }

                    // L2 check
                    if (!winId) {
                        const rawCatId = (p.product_category as CategoryBrand)?.category_id || (p.product_category as CategoryBrand)?.id || p.product_category;
                        const l2 = l2Items.find((item) => Number(item.category_id) === Number(rawCatId) || !item.category_id || item.category_id === 0);
                        if (l2) winId = l2.discount_type;
                    }

                    // L4 check
                    if (!winId) {
                        const rawBrandId = (p.product_brand as CategoryBrand)?.brand_id || (p.product_brand as CategoryBrand)?.id || p.product_brand;
                        const l4 = l4Items.find((item) => Number(item.brand_id) === Number(rawBrandId));
                        if (l4) winId = l4.discount_type_id;
                    }

                    // L0 check
                    if (!winId && customerData?.discount_type) winId = customerData.discount_type;

                    const inv = inventoryMap[Number(p.product_id)] || { available: 0, unitCount: Number(p.unit_of_measurement_count) || 1 };
                    const unitShortcut = unitMap[Number(p.unit_of_measurement)] || "PCS";

                    return {
                        product_id: p.product_id,
                        product_name: p.product_name,
                        description: p.description || p.product_name,
                        product_code: p.product_code,
                        category_name: (p.product_category as CategoryBrand)?.category_name || null,
                        brand_name: (p.product_brand as CategoryBrand)?.brand_name || null,
                        unit_price: price,
                        unit: unitShortcut,
                        available_qty: inv.available,
                        unit_count: inv.unitCount,
                        discount_type: winId,
                        discount_type_name: winId ? discountTypeNameMap[Number(winId)] : null,
                        discounts: winId ? (discountMap[winId] || []) : [],
                        _uomRank: uomPriority[unitShortcut.toUpperCase()] || 99
                    };
                }).sort((a, b) => {
                    if (a._uomRank !== b._uomRank) return a._uomRank - b._uomRank;
                    return a.product_name.localeCompare(b.product_name);
                });

                return NextResponse.json(results);
            } catch (err: unknown) {
                return NextResponse.json({ error: (err as Error).message }, { status: 500 });
            }
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

        if (type === "available_memos") {
            const customerCode = searchParams.get("customerCode");
            if (!customerCode) return NextResponse.json({ error: "customerCode required" }, { status: 400 });

            // Resolve customer_id first if customerCode is passed
            const custRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[customer_code][_eq]=${customerCode}&fields=id`, { headers: fetchHeaders });
            const custData = (await custRes.json()).data?.[0];
            if (!custData) return NextResponse.json([]);

            const customerId = custData.id;

            // Fetch memos for this customer (filtered by account_type 7-11)
            const filters = {
                _and: [
                    { customer_id: { _eq: customerId } },
                    { chart_of_account: { account_type: { _between: [7, 11] } } }
                ]
            };

            const res = await fetch(`${DIRECTUS_URL}/items/customers_memo?filter=${JSON.stringify(filters)}&fields=*,type.balance_name,chart_of_account.account_title,chart_of_account.gl_code,chart_of_account.account_type&limit=-1`, { headers: fetchHeaders });
            if (!res.ok) throw new Error("Failed to fetch available memos");

            const memos = (await res.json()).data || [];
            
            // Map the data to include flattened names for the frontend
            const results = memos.map((m: Record<string, unknown>) => ({
                ...m,
                balance_name: m.type?.balance_name || "N/A",
                account_title: m.chart_of_account?.account_title || "N/A",
                gl_code: m.chart_of_account?.gl_code || "N/A"
            }));

            return NextResponse.json(results);
        }

        if (type === "available_memos") {
            const customerCode = searchParams.get("customerCode");
            if (!customerCode) return NextResponse.json({ error: "customerCode required" }, { status: 400 });

            // Resolve customer_id first if customerCode is passed
            const custRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[customer_code][_eq]=${customerCode}&fields=id`, { headers: fetchHeaders });
            const custData = (await custRes.json()).data?.[0];
            if (!custData) return NextResponse.json([]);

            const customerId = custData.id;

            // Fetch ALL memos for this customer (filtered only by account_type 7-11)
            const filters = {
                _and: [
                    { customer_id: { _eq: customerId } },
                    { chart_of_account: { account_type: { _between: [7, 11] } } }
                ]
            };

            const res = await fetch(`${DIRECTUS_URL}/items/customers_memo?filter=${JSON.stringify(filters)}&fields=*,type.balance_name,chart_of_account.account_title,chart_of_account.gl_code,chart_of_account.account_type&limit=-1`, { headers: fetchHeaders });
            if (!res.ok) throw new Error("Failed to fetch available memos");

            const memos = (await res.json()).data || [];
            
            // Map the data to include flattened names for the frontend
            const results = memos.map((m: Record<string, unknown>) => ({
                ...m,
                balance_name: m.type?.balance_name || "N/A",
                account_title: m.chart_of_account?.account_title || "N/A",
                gl_code: m.chart_of_account?.gl_code || "N/A"
            }));

            return NextResponse.json(results);
        }

        if (type === "suppliers") {
            const res = await fetch(`${DIRECTUS_URL}/items/suppliers?filter[supplier_type][_eq]=Trade&filter[isActive][_eq]=1&fields=id,supplier_name,supplier_shortcut&sort=supplier_name&limit=-1`, { headers: fetchHeaders });
            if (!res.ok) throw new Error("Failed to fetch suppliers");
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
        const { action, invoiceId, customer_code, order_id, invoice_date, due_date, remarks, details, deletedDetailIds } = body;

        if (action === "save_adjustments") {
            const userId = await resolveUserId();
            const now = new Date().toISOString();

            // 1. Process deleted items
            if (deletedDetailIds && deletedDetailIds.length > 0) {
                console.log(`[SaveAdjustments] Deleting ${deletedDetailIds.length} items:`, deletedDetailIds);
                for (const id of deletedDetailIds) {
                    try {
                        const delRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice_details/${id}`, {
                            method: "DELETE",
                            headers: fetchHeaders
                        });
                        if (!delRes.ok) {
                            const errorText = await delRes.text();
                            console.error(`[SaveAdjustments] Failed to delete detail_id ${id}:`, errorText);
                        } else {
                            console.log(`[SaveAdjustments] Successfully deleted detail_id ${id}`);
                        }
                    } catch (err) {
                        console.error(`[SaveAdjustments] Critical error deleting detail_id ${id}:`, err);
                    }
                }
            }

            // 2. Upsert items
            for (const item of details) {
                try {
                    const method = item.detail_id ? "PATCH" : "POST";
                    const url = item.detail_id
                        ? `${DIRECTUS_URL}/items/sales_invoice_details/${item.detail_id}`
                        : `${DIRECTUS_URL}/items/sales_invoice_details`;

                    const qty = Number(item.quantity) || 0;
                    const price = Number(item.unit_price) || 0;
                    const disc = Number(item.discount_amount) || 0;
                    const lineGross = qty * price;
                    const lineTotal = lineGross - disc;

                    // Flatten IDs for Directus schema consistency
                    const prodId = typeof item.product_id === 'object' ? (item.product_id as { product_id?: number }).product_id : item.product_id;
                    const unitId = typeof item.unit === 'object' ? (item.unit as { unit_id?: number; id?: number }).unit_id || (item.unit as { id?: number }).id : item.unit;

                    const payload = {
                        ...item,
                        order_id: order_id || '', // Populating order_id in details table
                        product_id: Number(prodId),
                        unit: Number(unitId) || 1,
                        invoice_no: invoiceId,
                        gross_amount: lineGross,
                        total_amount: lineTotal,
                        modified_date: now
                    };

                    // Clean up detail_id for POST
                    if (method === "POST") delete (payload as { detail_id?: number }).detail_id;

                    await fetch(url, {
                        method,
                        headers: fetchHeaders,
                        body: JSON.stringify(payload)
                    });
                } catch (e) {
                    console.error("[SaveAdjustments] Item Save Error:", e);
                }
            }

            // 3. Recalculate totals and Update Header
            const detRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice_details?filter[invoice_no][_eq]=${invoiceId}&fields=*&limit=-1`, { headers: fetchHeaders });
            const currentDetails = ((await detRes.json()).data || []) as { quantity: number | string; unit_price: number | string; discount_amount: number | string }[];

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
                // VAT Extraction (Assuming VAT-inclusive prices)
                const lineVat = (lineNet / 1.12) * 0.12;

                totalGross += lineGross;
                totalDiscount += disc;
                totalNet += lineNet;
                totalVat += lineVat;
            });

            const headerUpdate = {
                customer_code,
                order_id, // Syncing header order_id as well
                invoice_date,
                due_date,
                remarks,
                gross_amount: totalGross,
                discount_amount: totalDiscount,
                net_amount: totalNet,
                vat_amount: totalVat,
                total_amount: totalNet, // Net already includes VAT if inclusive
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
                        transaction_status: "Dispatched",
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

        if (action === "link_memo") {
            const { invoiceId, memoId, amount } = body;
            const now = new Date().toISOString();
            const res = await fetch(`${DIRECTUS_URL}/items/customer_memo_invoices`, {
                method: "POST", headers: fetchHeaders,
                body: JSON.stringify({ invoice_id: invoiceId, memo_id: memoId, amount, date_applied: now })
            });
            if (!res.ok) throw new Error("Failed to link memo");
            const memoRes = await fetch(`${DIRECTUS_URL}/items/customers_memo/${memoId}?fields=applied_amount,amount`, { headers: fetchHeaders });
            if (memoRes.ok) {
                const memo = (await memoRes.json()).data;
                const newApplied = (Number(memo.applied_amount) || 0) + Number(amount);
                const newStatus = newApplied >= Number(memo.amount) ? "APPLIED" : "PARTIALLY APPLIED";
                await fetch(`${DIRECTUS_URL}/items/customers_memo/${memoId}`, {
                    method: "PATCH", headers: fetchHeaders,
                    body: JSON.stringify({ applied_amount: newApplied, status: newStatus })
                });
            }
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
