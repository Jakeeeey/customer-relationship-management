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
    supplier_id?: number;
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
    if (!ids || ids.length === 0) return [];

    let results: T[] = [];
    const chunkSize = 500; 
    const cleanBase = urlBase.replace(/[?&]limit=-1$/, "");
    const connector = cleanBase.includes("?") ? "&" : "?";

    for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const url = `${cleanBase}${connector}filter[${filterField}][_in]=${chunk.join(",")}&limit=-1`;
        try {
            const res = await fetch(url, { headers: fetchHeaders });
            if (!res.ok) {
                console.error(`[fetchInChunks] Chunk ${i / chunkSize} failed (${res.status})`);
                continue;
            }
            const json = await res.json();
            if (json.data) results = results.concat(json.data);
        } catch (e) {
            console.error(`[fetchInChunks] Chunk ${i / chunkSize} exception:`, e);
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

            // Filter by Sales Type if specified
            if (salesTypeId && salesTypeId !== "all") {
                filters._and.push({ sales_type: { _eq: salesTypeId } });
            } else if (!salesTypeId) {
                // DEFAULT FOR DEALER SALES - Adjust this ID as needed
                filters._and.push({ sales_type: { _eq: 3 } }); 
            }

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
                    filters._and.push({
                        payment_status: { _neq: "Paid" }
                    });
                }
            }

            if (salesmanId && salesmanId !== "all") {
                filters._and.push({ salesman_id: { _eq: salesmanId } });
            }

            if (startDate) {
                filters._and.push({ invoice_date: { _gte: startDate } });
            }

            if (endDate) {
                const endOfDay = endDate.includes("T") || endDate.includes(" ") ? endDate : `${endDate}T23:59:59`;
                filters._and.push({ invoice_date: { _lte: endOfDay } });
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
                fields: "*,salesman_id.salesman_name", 
                meta: "filter_count"
            });

            const res = await fetch(`${DIRECTUS_URL}/items/sales_invoice?${query.toString()}`, { headers: fetchHeaders });
            if (!res.ok) {
                const errorData = await res.json();
                return NextResponse.json({ error: errorData.errors?.[0]?.message || "Failed to fetch worklist" }, { status: res.status });
            }

            const json = await res.json();
            const rawData = json.data || [];
            const totalCount = json.meta?.filter_count || 0;

            const customerCodes = Array.from(new Set((rawData as { customer_code: string }[]).map((item) => item.customer_code).filter(Boolean))) as (string | number)[];
            const customerMap: Record<string, string> = {};

            if (customerCodes.length > 0) {
                const cData = await fetchInChunks<{ customer_code: string; store_name?: string; customer_name?: string }>(
                    `${DIRECTUS_URL}/items/customer?fields=customer_code,customer_name,store_name`,
                    customerCodes,
                    "customer_code"
                );
                cData.forEach((c) => {
                    customerMap[c.customer_code?.trim()] = c.customer_name || c.store_name || "N/A";
                });
            }

            const invoiceIds = rawData.map((item: { invoice_id: number | string }) => item.invoice_id);
            const returnsMap: Record<string, number> = {};
            const creditsMap: Record<string, number> = {};
            const debitsMap: Record<string, number> = {};

            if (invoiceIds.length > 0) {
                const [returnsBatch, memosBatch] = await Promise.all([
                    fetchInChunks<{ invoice_no: number | string; amount: number }>(
                        `${DIRECTUS_URL}/items/sales_invoice_sales_return?fields=invoice_no,amount`,
                        invoiceIds,
                        "invoice_no"
                    ),
                    fetchInChunks<{ invoice_id: number | string; amount: number; memo_id: { type: { id: number; balance_name: string } } | number }>(
                        `${DIRECTUS_URL}/items/customer_memo_invoices?fields=invoice_id,amount,memo_id.type.id,memo_id.type.balance_name`,
                        invoiceIds,
                        "invoice_id"
                    )
                ]);

                returnsBatch.forEach(r => {
                    const id = String(r.invoice_no);
                    returnsMap[id] = (returnsMap[id] || 0) + Number(r.amount || 0);
                });

                memosBatch.forEach(m => {
                    const id = String(m.invoice_id);
                    const memoType = typeof m.memo_id === 'object' ? m.memo_id?.type : null;
                    const isDebit = (memoType && (memoType.balance_name === "DEBIT" || memoType.id === 2));

                    if (isDebit) {
                        debitsMap[id] = (debitsMap[id] || 0) + Number(m.amount || 0);
                    } else {
                        creditsMap[id] = (creditsMap[id] || 0) + Number(m.amount || 0);
                    }
                });
            }

            const data = rawData.map((item: {
                invoice_id: number | string;
                customer_code: string;
                salesman_id: { id: string | number; salesman_name: string } | string | number;
                net_amount: number;
            }) => {
                const id = String(item.invoice_id);
                const ret = returnsMap[id] || 0;
                const cre = creditsMap[id] || 0;
                const deb = debitsMap[id] || 0;
                const net = Number(item.net_amount || 0);
                const bal = net - cre - ret + deb;

                return {
                    ...item,
                    salesman_name: typeof item.salesman_id === 'object' ? item.salesman_id?.salesman_name : "N/A",
                    customer_name: customerMap[item.customer_code?.trim()] || item.customer_code || "N/A",
                    salesman_id: typeof item.salesman_id === 'object' ? item.salesman_id?.id : item.salesman_id,
                    credits: cre,
                    debits: deb,
                    returns: ret,
                    balance: bal
                };
            });

            return NextResponse.json({
                data,
                metadata: {
                    totalCount,
                    page,
                    limit
                }
            });
        }

        if (type === "summary_stats") {
            const search = searchParams.get("search") || "";
            const salesmanId = searchParams.get("salesmanId");
            const customerId = searchParams.get("customerId");
            const salesTypeId = searchParams.get("salesTypeId");
            const startDate = searchParams.get("startDate");
            const endDate = searchParams.get("endDate");
            const isDispatched = searchParams.get("isDispatched") === "true";

            const filters: { _and: Record<string, unknown>[] } = { _and: [] };

            if (salesTypeId && salesTypeId !== "all") {
                filters._and.push({ sales_type: { _eq: salesTypeId } });
            } else if (!salesTypeId) {
                filters._and.push({ sales_type: { _eq: 3 } });
            }
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
                    filters._and.push({ payment_status: { _neq: "Paid" } });
                }
            }
            if (salesmanId && salesmanId !== "all") {
                filters._and.push({ salesman_id: { _eq: salesmanId } });
            }
            if (startDate) {
                filters._and.push({ invoice_date: { _gte: startDate } });
            }
            if (endDate) {
                const endOfDay = endDate.includes("T") || endDate.includes(" ") ? endDate : `${endDate}T23:59:59`;
                filters._and.push({ invoice_date: { _lte: endOfDay } });
            }
            if (search) {
                filters._and.push({ invoice_no: { _icontains: search } });
            }
            if (customerId && customerId !== "all") {
                filters._and.push({ customer_code: { _eq: customerId } });
            }

            const totalsQuery = new URLSearchParams({
                filter: JSON.stringify(filters),
                "aggregate[sum]": "gross_amount,net_amount"
            });
            const totalsRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice?${totalsQuery.toString()}`, { headers: fetchHeaders });
            if (!totalsRes.ok) throw new Error("Failed to fetch aggregates");
            
            const totalsData = await totalsRes.json();
            const totalNet = Number(totalsData.data?.[0]?.sum?.net_amount || 0);

            const returnsNestedFilter = { invoice_no: filters };
            const memosNestedFilter = { invoice_id: filters };

            const [returnsRes, creditsRes, debitsRes] = await Promise.all([
                fetch(`${DIRECTUS_URL}/items/sales_invoice_sales_return?filter=${JSON.stringify(returnsNestedFilter)}&aggregate[sum]=amount`, { headers: fetchHeaders }),
                fetch(`${DIRECTUS_URL}/items/customer_memo_invoices?filter=${JSON.stringify({
                    ...memosNestedFilter,
                    memo_id: { type: { balance_name: { _eq: "CREDIT" } } }
                })}&aggregate[sum]=amount`, { headers: fetchHeaders }),
                fetch(`${DIRECTUS_URL}/items/customer_memo_invoices?filter=${JSON.stringify({
                    ...memosNestedFilter,
                    memo_id: { type: { balance_name: { _eq: "DEBIT" } } }
                })}&aggregate[sum]=amount`, { headers: fetchHeaders })
            ]);

            const [returnsJson, creditsJson, debitsJson] = await Promise.all([
                returnsRes.ok ? returnsRes.json() : Promise.resolve({ data: [] }),
                creditsRes.ok ? creditsRes.json() : Promise.resolve({ data: [] }),
                debitsRes.ok ? debitsRes.json() : Promise.resolve({ data: [] })
            ]);

            const totalReturns = Number(returnsJson.data?.[0]?.sum?.amount || 0);
            const totalCredits = Number(creditsJson.data?.[0]?.sum?.amount || 0);
            const totalDebits = Number(debitsJson.data?.[0]?.sum?.amount || 0);

            const totalBalance = Math.round((totalNet - totalCredits - totalReturns + totalDebits) * 100) / 100;

            return NextResponse.json({
                totalGross: Math.round(totalNet * 100) / 100, 
                totalReturns: Math.round(totalReturns * 100) / 100,
                totalCredits: Math.round(totalCredits * 100) / 100,
                totalDebits: Math.round(totalDebits * 100) / 100,
                totalBalance
            });
        }

        if (type === "details") {
            const invoiceId = searchParams.get("invoiceId");
            if (!invoiceId) return NextResponse.json({ error: "invoiceId required" }, { status: 400 });

            const headerRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice/${invoiceId}?fields=*,salesman_id.salesman_name,salesman_id.salesman_code,salesman_id.price_type_id,branch_id.*,invoice_type.type,sales_type.operation_name,price_type.price_type_name`, { headers: fetchHeaders });
            const header = (await headerRes.json()).data || {};

            if (header.customer_code) {
                const custRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[customer_code][_eq]=${header.customer_code}&fields=customer_name`, { headers: fetchHeaders });
                const custData = (await custRes.json()).data;
                if (custData && custData.length > 0) {
                    header.customer_name = custData[0].customer_name;
                }
            }

            const unitsRes = await fetch(`${DIRECTUS_URL}/items/units?limit=-1`, { headers: fetchHeaders });
            const unitsData = (await unitsRes.json()).data || [];
            const unitMap: Record<number, string> = unitsData.reduce((acc: Record<number, string>, u: { unit_id: number; unit_name?: string }) => ({
                ...acc,
                [Number(u.unit_id)]: u.unit_name || "N/A"
            }), {});

            const detRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice_details?filter[invoice_no][_eq]=${invoiceId}&fields=*,product_id.product_id,product_id.product_name,product_id.product_code,product_id.product_brand.brand_name,product_id.product_category.category_name,product_id.unit_of_measurement_count,discount_type.discount_type&limit=-1`, { headers: fetchHeaders });
            const details = (await detRes.json()).data || [];

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

            const linkedDocs: unknown[] = [];



            let collections: Record<string, unknown>[] = [];
            try {
                const collRes = await fetch(`${DIRECTUS_URL}/items/collection_invoices?filter[invoice_id][_eq]=${invoiceId}&fields=*,collection_id.collection_receipt_no,collection_id.collection_date,collection_id.isPosted&limit=-1`, { headers: fetchHeaders });
                if (collRes.ok) {
                    const collData = (await collRes.json()).data || [];
                    collections = collData.map((item: Record<string, unknown>) => ({
                        id: item.id as number | string,
                        collection_receipt_no: (item.collection_id as Record<string, unknown>)?.collection_receipt_no as string || "N/A",
                        collection_date: (item.collection_id as Record<string, unknown>)?.collection_date as string || item.date_linked as string,
                        amount: Number(item.amount || 0),
                        isPosted: (item.collection_id as Record<string, unknown>)?.isPosted === true || (item.collection_id as Record<string, unknown>)?.isPosted === 1
                    }));
                }
            } catch (e) { console.error("Collections fetch exception:", e); }

            const detailTypeIds = new Set(details.map((d: Record<string, unknown>) => d.discount_type as number).filter(Boolean));
            const detailDiscountMap: Record<number, number[]> = {};
            if (detailTypeIds.size > 0) {
                const lpdtItems = await fetchInChunks<{ type_id: number; line_id: { percentage: number } }>(`${DIRECTUS_URL}/items/line_per_discount_type?fields=type_id,line_id.percentage&sort=id`, Array.from(detailTypeIds) as (string | number)[], "type_id");
                lpdtItems.forEach(item => {
                    const tid = Number(item.type_id);
                    if (!detailDiscountMap[tid]) detailDiscountMap[tid] = [];
                    detailDiscountMap[tid].push(Number(item.line_id?.percentage) || 0);
                });
            }

            const mappedDetails = [];
            for (const d of details) {
                let discTypeName = (d.discount_type && typeof d.discount_type === 'object') ? (d.discount_type as { discount_type?: string }).discount_type : null;
                const dtId = (d.discount_type && typeof d.discount_type === 'object') ? (d.discount_type as { id?: number }).id : d.discount_type;

                if (!discTypeName && d.discount_type && (typeof d.discount_type === 'number' || typeof d.discount_type === 'string')) {
                    const dtRes = await fetch(`${DIRECTUS_URL}/items/discount_type/${d.discount_type}?fields=discount_type`, { headers: fetchHeaders });
                    if (dtRes.ok) discTypeName = (await dtRes.json()).data?.discount_type;
                }

                mappedDetails.push({
                    ...d,
                    product_name: d.product_id?.product_name || `Product ${d.product_id?.product_id}`,
                    brand_name: d.product_id?.product_brand?.brand_name || 'N/A',
                    category_name: d.product_id?.product_category?.category_name || 'N/A',
                    unit_name: unitMap[Number(d.unit)] || 'PCS',
                    unit_count: Number(d.product_id?.unit_of_measurement_count) || 1,
                    discount_type_name: discTypeName,
                    discounts: dtId ? (detailDiscountMap[Number(dtId)] || []) : []
                });
            }

            return NextResponse.json({
                header,
                details: mappedDetails,
                linkedDocs,
                collections,
                main_supplier_id,
                main_supplier_name
            });
        }

        if (type === "search_products") {
            const search = searchParams.get("search") || "";
            const priceTypeId = searchParams.get("priceTypeId");
            const supplierIdRaw = searchParams.get("supplierId");
            const supplierId = supplierIdRaw ? Number(supplierIdRaw) : null;
            const branchId = searchParams.get("branchId");
            const customerCode = searchParams.get("customerCode");

            if (!priceTypeId || !customerCode || !supplierIdRaw) {
                return NextResponse.json({ error: "Required params missing" }, { status: 400 });
            }

            let linkedProductIds: (string | number)[] = [];
            if (supplierIdRaw === "all") {
                const poRes = await fetch(`${DIRECTUS_URL}/items/product_per_price_type?filter[price_type_id][_eq]=${priceTypeId}&filter[status][_in]=published,approved&fields=product_id&limit=-1`, { headers: fetchHeaders });
                linkedProductIds = (await poRes.json()).data?.map((po: Record<string, unknown>) => ((po.product_id as Record<string, unknown>)?.id || po.product_id) as string | number).filter(Boolean) || [];
            } else {
                const ppsRes = await fetch(`${DIRECTUS_URL}/items/product_per_supplier?filter[supplier_id][_eq]=${supplierId}&fields=product_id&limit=-1`, { headers: fetchHeaders });
                linkedProductIds = (await ppsRes.json()).data?.map((ps: Record<string, unknown>) => ((ps.product_id as Record<string, unknown>)?.id || ps.product_id) as string | number).filter(Boolean) || [];
            }

            if (linkedProductIds.length === 0) return NextResponse.json([]);

            const priceOverrides: Record<number, number> = {};
            const poRes = await fetchInChunks<{ product_id: number | string; price: number | string }>(`${DIRECTUS_URL}/items/product_per_price_type?filter[price_type_id][_eq]=${priceTypeId}&filter[status][_in]=published,approved`, linkedProductIds, "product_id");
            poRes.forEach(po => { priceOverrides[Number(po.product_id)] = Number(po.price); });

            const initialProducts = await fetchInChunks<ProductItem>(`${DIRECTUS_URL}/items/products?filter[isActive][_eq]=1&fields=*,product_category.category_id,product_category.category_name,product_brand.brand_id,product_brand.brand_name`, linkedProductIds, "product_id");

            const sellableItems = initialProducts.filter((p) => {
                const hasPrice = Object.prototype.hasOwnProperty.call(priceOverrides, Number(p.product_id));
                const q = search.toLowerCase().trim();
                if (!q) return hasPrice;
                return hasPrice && (p.product_name.toLowerCase().includes(q) || p.product_code.toLowerCase().includes(q));
            });

            if (sellableItems.length === 0) return NextResponse.json([]);

            const allIds = sellableItems.map((p) => Number(p.product_id));
            const l1Items = await fetchInChunks<DiscountItem>(`${DIRECTUS_URL}/items/product_per_customer?filter[customer_code][_eq]=${customerCode}&fields=product_id,unit_price,discount_type`, allIds, "product_id");
            const l2Items: DiscountItem[] = (await (await fetch(`${DIRECTUS_URL}/items/supplier_category_discount_per_customer?filter[customer_code][_eq]=${customerCode}${supplierId && !isNaN(supplierId) ? `&filter[supplier_id][_eq]=${supplierId}` : ""}&limit=-1`, { headers: fetchHeaders })).json()).data || [];

            const custRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[customer_code][_eq]=${customerCode}&fields=id,discount_type`, { headers: fetchHeaders });
            const customerData = (await custRes.json()).data?.[0];
            const customerId = customerData?.id;

            let l4Items: DiscountItem[] = [];
            if (customerId) {
                const l4Res = await fetch(`${DIRECTUS_URL}/items/customer_discount_brand?filter[customer_id][_eq]=${customerId}&limit=-1`, { headers: fetchHeaders });
                l4Items = (await l4Res.json()).data || [];
            }

            const typeIds = new Set(l1Items.map(i => i.discount_type).concat(l2Items.map(i => i.discount_type)).concat(l4Items.map(i => i.discount_type_id)).concat([customerData?.discount_type]).filter(Boolean));
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

            const inventoryMap: Record<number, { available: number; unitCount: number }> = {};
            if (branchId && SPRING_API_BASE_URL) {
                try {
                    const cookieStore = await cookies();
                    const token = cookieStore.get(COOKIE_NAME)?.value;
                    const invUrl = `${SPRING_API_BASE_URL.replace(/\/$/, "")}/api/view-running-inventory-by-unit/all?startDate=2025-01-01&endDate=2026-12-30`;
                    const inventoryRes = await fetch(invUrl, { headers: { "Accept": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) }, cache: 'no-store' });
                    if (inventoryRes.ok) {
                        const invData = await inventoryRes.json() as Record<string, unknown>[];
                        invData.forEach((item) => {
                            if (Number(item.branchId || item.branch_id) === Number(branchId)) {
                                const pid = item.productId || item.product_id;
                                inventoryMap[Number(pid)] = { available: Number(item.runningInventoryUnit || 0), unitCount: Number(item.unitCount || 1) };
                            }
                        });
                    }
                } catch (e) { console.error("Inventory error:", e); }
            }

            const unitsRes = await fetch(`${DIRECTUS_URL}/items/units?limit=-1`, { headers: fetchHeaders });
            const unitMap: Record<number, string> = (await unitsRes.json()).data?.reduce((acc: Record<number, string>, u: Record<string, unknown>) => ({ ...acc, [Number(u.unit_id)]: u.unit_name as string || u.unit_shortcut as string || "PCS" }), {}) || {};

            const results = sellableItems.map((p) => {
                let winId = null;
                let price = priceOverrides[Number(p.product_id)] || 0;
                const l1 = l1Items.find(i => Number(i.product_id) === Number(p.product_id));
                if (l1) { winId = l1.discount_type; price = Number(l1.unit_price) || price; }
                if (!winId) {
                    const pc = p.product_category;
                    const catId = (pc && typeof pc === 'object') ? (pc.category_id || pc.id) : pc;
                    const l2 = l2Items.find(i => (i.category_id && Number(i.category_id) === Number(catId)) || (!i.category_id && i.supplier_id && Number(i.supplier_id) === Number(supplierId)));
                    if (l2) winId = l2.discount_type;
                }
                if (!winId) {
                    const pb = p.product_brand;
                    const brandId = (pb && typeof pb === 'object') ? (pb.brand_id || pb.id) : pb;
                    const l4 = l4Items.find(i => Number(i.brand_id) === Number(brandId));
                    if (l4) winId = l4.discount_type_id;
                }
                if (!winId && customerData?.discount_type) winId = customerData.discount_type;

                const inv = inventoryMap[Number(p.product_id)] || { available: 0, unitCount: Number(p.unit_of_measurement_count) || 1 };
                const unitName = unitMap[Number(p.unit_of_measurement)] || "PCS";

                return {
                    product_id: p.product_id,
                    product_name: p.product_name,
                    product_code: p.product_code,
                    category_name: (p.product_category as CategoryBrand)?.category_name || null,
                    brand_name: (p.product_brand as CategoryBrand)?.brand_name || null,
                    unit_price: price,
                    unit: unitName,
                    available_qty: inv.available,
                    unit_count: inv.unitCount,
                    discount_type: winId,
                    discount_type_name: winId ? discountTypeNameMap[Number(winId)] : null,
                    discounts: winId ? (discountMap[winId] || []) : [],
                    unit_id: p.unit_of_measurement
                };
            });

            return NextResponse.json(results);
        }

        if (type === "salesmen") {
            const res = await fetch(`${DIRECTUS_URL}/items/salesman?filter[isActive][_eq]=1&fields=*,branch_code&limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await res.json()).data || []);
        }

        if (type === "master_users") {
            const res = await fetch(`${DIRECTUS_URL}/items/salesman?filter[isActive][_eq]=1&limit=-1`, { headers: fetchHeaders });
            const smData = (await res.json()).data || [];
            const userIds = Array.from(new Set(smData.map((s: Record<string, unknown>) => ((s.employee_id || s.encoder_id || s.user_id) as string | number)?.toString()).filter(Boolean)));
            if (userIds.length === 0) return NextResponse.json([]);
            const uRes = await fetch(`${DIRECTUS_URL}/items/user?filter[user_id][_in]=${userIds.join(',')}&limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await uRes.json()).data || []);
        }

        if (type === "accounts") {
            const userId = searchParams.get("userId");
            const res = await fetch(`${DIRECTUS_URL}/items/salesman?filter[_or][0][employee_id][_eq]=${userId}&filter[_or][1][encoder_id][_eq]=${userId}&filter[isActive][_eq]=1&fields=id,salesman_name,salesman_code,price_type,price_type_id,branch_code&limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await res.json()).data || []);
        }

        if (type === "salesman_by_customer") {
            const customerId = searchParams.get("customerId");
            const csRes = await fetch(`${DIRECTUS_URL}/items/customer_salesmen?filter[customer_id][_eq]=${customerId}&limit=-1`, { headers: fetchHeaders });
            const csData = (await csRes.json()).data || [];
            const smIds = csData.map((cs: Record<string, unknown>) => cs.salesman_id).filter(Boolean);
            if (smIds.length === 0) return NextResponse.json([]);
            const sRes = await fetch(`${DIRECTUS_URL}/items/salesman?filter[id][_in]=${smIds.join(',')}&limit=-1`, { headers: fetchHeaders });
            const sData = (await sRes.json()).data || [];
            const userIds = Array.from(new Set(sData.map((s: Record<string, unknown>) => ((s.employee_id || s.encoder_id || s.user_id) as string | number)?.toString()).filter(Boolean)));
            const uRes = await fetch(`${DIRECTUS_URL}/items/user?filter[user_id][_in]=${userIds.join(',')}&fields=*,user_id,user_fname,user_lname&limit=-1`, { headers: fetchHeaders });
            const uData = (await uRes.json()).data || [];
            const final = uData.map((u: Record<string, unknown>) => ({ ...u, linked_account_ids: sData.filter((s: Record<string, unknown>) => ((s.employee_id || s.encoder_id || s.user_id) as string | number)?.toString() === (u.user_id || u.id)?.toString()).map((s: Record<string, unknown>) => s.id) }));
            return NextResponse.json(final);
        }

        if (type === "sales_types") {
            const res = await fetch(`${DIRECTUS_URL}/items/operation?fields=id,operation_name&limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await res.json()).data || []);
        }

        if (type === "customers") {
            const search = searchParams.get("search") || "";
            let url = `${DIRECTUS_URL}/items/customer?filter[isActive][_eq]=1&fields=id,customer_code,customer_name,store_name,city,province,isActive,payment_term&limit=-1`;
            if (search) url += `&filter[_or][0][customer_name][_icontains]=${encodeURIComponent(search)}&filter[_or][1][customer_code][_icontains]=${encodeURIComponent(search)}`;
            const res = await fetch(url, { headers: fetchHeaders });
            return NextResponse.json((await res.json()).data || []);
        }



        if (type === "suppliers") {
            const res = await fetch(`${DIRECTUS_URL}/items/suppliers?filter[supplier_type][_eq]=Trade&filter[isActive][_eq]=1&limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await res.json()).data || []);
        }

        if (type === "utility_info") {
            const [itRes, ptRes, brRes, pyRes] = await Promise.all([
                fetch(`${DIRECTUS_URL}/items/sales_invoice_type?limit=-1`, { headers: fetchHeaders }),
                fetch(`${DIRECTUS_URL}/items/price_types?limit=-1`, { headers: fetchHeaders }),
                fetch(`${DIRECTUS_URL}/items/branches?limit=-1`, { headers: fetchHeaders }),
                fetch(`${DIRECTUS_URL}/items/payment_terms?limit=-1`, { headers: fetchHeaders })
            ]);
            return NextResponse.json({
                invoice_types: (await itRes.json()).data || [],
                price_types: (await ptRes.json()).data || [],
                branches: (await brRes.json()).data || [],
                payment_terms: (await pyRes.json()).data || []
            });
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    } catch (e: unknown) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, invoiceId, customer_code, order_id, invoice_date, due_date, remarks, details, deletedDetailIds } = body;

        if (action === "save_adjustments") {
            const userId = await resolveUserId();
            const now = new Date().toISOString();

            if (deletedDetailIds?.length > 0) {
                for (const id of deletedDetailIds) {
                    await fetch(`${DIRECTUS_URL}/items/sales_invoice_details/${id}`, { method: "DELETE", headers: fetchHeaders });
                }
            }

            for (const item of details) {
                const method = item.detail_id ? "PATCH" : "POST";
                const url = item.detail_id ? `${DIRECTUS_URL}/items/sales_invoice_details/${item.detail_id}` : `${DIRECTUS_URL}/items/sales_invoice_details`;
                const qty = Number(item.quantity) || 0;
                const price = Number(item.unit_price) || 0;
                const disc = Number(item.discount_amount) || 0;
                const payload = {
                    ...item,
                    order_id: order_id || '',
                    product_id: Number(item.product_id?.product_id || item.product_id),
                    unit: Number(item.unit?.unit_id || item.unit) || 1,
                    invoice_no: invoiceId,
                    gross_amount: qty * price,
                    total_amount: (qty * price) - disc,
                    modified_date: now
                };
                if (method === "POST") delete payload.detail_id;
                await fetch(url, { method, headers: fetchHeaders, body: JSON.stringify(payload) });
            }

            const [detRes, hInfoRes] = await Promise.all([
                fetch(`${DIRECTUS_URL}/items/sales_invoice_details?filter[invoice_no][_eq]=${invoiceId}&fields=*&limit=-1`, { headers: fetchHeaders }),
                fetch(`${DIRECTUS_URL}/items/sales_invoice/${invoiceId}?fields=invoice_type`, { headers: fetchHeaders })
            ]);
            const currentDetails = (await detRes.json()).data || [];
            const isVatApplicable = Number((await hInfoRes.json()).data?.invoice_type) !== 3;

            let totalGross = 0, totalNet = 0, totalDiscount = 0, totalVat = 0;
            currentDetails.forEach((d: Record<string, unknown>) => {
                const ln = Number(d.quantity) * Number(d.unit_price) - Number(d.discount_amount);
                totalGross += Number(d.quantity) * Number(d.unit_price);
                totalDiscount += Number(d.discount_amount);
                totalNet += ln;
                if (isVatApplicable) totalVat += (ln / 1.12) * 0.12;
            });

            await fetch(`${DIRECTUS_URL}/items/sales_invoice/${invoiceId}`, {
                method: "PATCH",
                headers: fetchHeaders,
                body: JSON.stringify({
                    customer_code, order_id, invoice_date, due_date, remarks,
                    gross_amount: totalGross, discount_amount: totalDiscount,
                    net_amount: totalNet, vat_amount: totalVat, total_amount: totalNet,
                    modified_by: userId, modified_date: now
                })
            });
            return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (e: unknown) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
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
                const invRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice/${id}?fields=invoice_type`, { headers: fetchHeaders });
                const isDR = Number((await invRes.json()).data?.invoice_type) === 3;
                const update: Record<string, unknown> = { transaction_status: "Dispatched", isDispatched: 1, dispatch_date: now, modified_by: userId, modified_date: now };
                if (isDR) update.vat_amount = 0;
                await fetch(`${DIRECTUS_URL}/items/sales_invoice/${id}`, { method: "PATCH", headers: fetchHeaders, body: JSON.stringify(update) });
            }
            return NextResponse.json({ success: true });
        }

        if (action === "link_return") {
            const { invoiceId, returnId, amount } = body;
            const userId = await resolveUserId();
            const res = await fetch(`${DIRECTUS_URL}/items/sales_invoice_sales_return`, {
                method: "POST", headers: fetchHeaders,
                body: JSON.stringify({ invoice_no: invoiceId, return_no: returnId, amount, linked_by: userId, created_at: new Date().toISOString() })
            });
            if (!res.ok) throw new Error("Link failed");
            return NextResponse.json({ success: true });
        }



        if (action === "un_dispatch") {
            await fetch(`${DIRECTUS_URL}/items/sales_invoice/${body.id}`, { method: "PATCH", headers: fetchHeaders, body: JSON.stringify({ transaction_status: "New Invoice", isDispatched: 0, dispatch_date: null, modified_date: new Date().toISOString() }) });
            return NextResponse.json({ success: true });
        }



        if (action === "create_invoice") {
            const userId = await resolveUserId();
            const now = new Date().toISOString();
            const header = {
                ...body,
                transaction_status: "New Invoice", payment_status: "Awaiting Payment",
                total_amount: body.net_amount, created_by: userId, created_date: now,
                isDispatched: 0, isPosted: 0, isReceipt: 0, isRemitted: 0
            };
            delete header.items; delete header.action;
            const hRes = await fetch(`${DIRECTUS_URL}/items/sales_invoice`, { method: "POST", headers: fetchHeaders, body: JSON.stringify(header) });
            const newId = (await hRes.json()).data.invoice_id;
            if (body.items?.length > 0) {
                const details = body.items.map((i: Record<string, unknown>) => ({
                    order_id: body.order_id as string, invoice_no: newId as number | string, product_id: i.product_id,
                    unit: i.unit_id, unit_price: i.unit_price, quantity: i.quantity,
                    discount_amount: (i.discount_amount as number) || 0, discount_type: i.discount_type,
                    gross_amount: (i.quantity as number) * (i.unit_price as number), total_amount: i.total_amount, created_date: now
                }));
                await fetch(`${DIRECTUS_URL}/items/sales_invoice_details`, { method: "POST", headers: fetchHeaders, body: JSON.stringify(details) });
            }
            return NextResponse.json({ success: true, invoiceId: newId });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (e: unknown) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
