import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = "vos_access_token";

interface JwtPayload {
    email?: string;
    Email?: string;
    FirstName?: string;
    Firstname?: string;
    firstName?: string;
    firstname?: string;
    LastName?: string;
    Lastname?: string;
    lastName?: string;
    lastname?: string;
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

export const dynamic = "force-dynamic";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const SPRING_API_BASE_URL = process.env.SPRING_API_BASE_URL;

const fetchHeaders = {
    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    "Content-Type": "application/json",
};

interface ProductMetadata {
    product_id: number;
    product_name: string;
    product_code: string;
    description: string;
    discount_type: string;
    unit_of_measurement_count?: number;
}

interface IncomingLineItem {
    id: string;
    detail_id?: number | string;
    order_detail_id?: number | string;
    unitPrice: number;
    quantity: number;
    allocated_quantity?: number;
    netAmount: number;
    uom?: string;
    product: {
        product_id: number;
        discount_type?: number;
        display_name?: string;
        product_name?: string;
        description?: string;
        available_qty?: number;
        unit_count?: number;
    };
    remarks?: string;
    discountType?: string;
    discounts?: number[];
    savedAllocatedQty?: number;
    savedNetAmount?: number;
    savedDiscountAmount?: number;
}

interface DirectusItem {
    id: number | string;
}

interface ExpandedCategory {
    category_id?: number;
    id?: number;
    category_name?: string;
}

interface ExpandedBrand {
    brand_id?: number;
    id?: number;
    brand_name?: string;
}

interface ProductItem extends DirectusItem {
    product_id: number;
    product_name?: string;
    description?: string;
    product_code?: string;
    parent_id?: number | null;
    isActive?: number | boolean;
    unit_of_measurement?: number | string;
    product_category?: number | ExpandedCategory;
    product_brand?: number | ExpandedBrand;
    [key: string]: unknown;
}

interface HeaderPayload {
    order_status: string;
    total_amount: number;
    discount_amount: number;
    net_amount: number;
    allocated_amount: number;
    remarks: string;
    modified_by?: number | null;
    draft_at?: string;
    pending_date?: string;
    for_approval_at?: string;
    po_no?: string;
    due_date?: string | null;
    delivery_date?: string | null;
    receipt_type?: number;
    sales_type?: number;
    order_no?: string;
    customer_code?: string;
    salesman_id?: number;
    supplier_id?: number;
    branch_id?: number;
    price_type_id?: number | null;
    order_date?: string;
    payment_terms?: number | null;
    created_by?: number | null;
    created_date?: string;
}

interface DiscountItem {
    product_id?: number;
    category_id?: number;
    brand_id?: number;
    discount_type?: number;
    discount_type_id?: number;
    unit_price?: number | string;
}

export async function GET(req: NextRequest) {
    const action = req.nextUrl.searchParams.get("action");
    const searchParams = req.nextUrl.searchParams;

    try {
        if (action === "delete_item") {
            const detailId = searchParams.get("id");
            if (!detailId) return NextResponse.json({ error: "id required" }, { status: 400 });

            console.log(`[API] Force Deleting Detail ID: ${detailId}`);
            // Use Directus standard delete by ID
            const delRes = await fetch(`${DIRECTUS_URL}/items/sales_order_details/${detailId}`, {
                method: "DELETE",
                headers: fetchHeaders
            });

            if (!delRes.ok) {
                // Secondary attempt using filter to be absolutely sure
                await fetch(`${DIRECTUS_URL}/items/sales_order_details?filter[detail_id][_eq]=${detailId}`, {
                    method: "DELETE",
                    headers: fetchHeaders
                });
            }

            return NextResponse.json({ success: true });
        }

        if (action === "salesmen") {
            const res = await fetch(`${DIRECTUS_URL}/items/salesman?filter[isActive][_eq]=1&limit=-1`, { headers: fetchHeaders });
            const smData = (await res.json()).data || [];
            const userIds = new Set<string>();

            smData.forEach((s: { employee_id?: number | string; encoder_id?: number | string }) => {
                const uid = s.employee_id || s.encoder_id;
                if (uid) userIds.add(uid.toString());
            });
            if (userIds.size === 0) return NextResponse.json([]);

            const uRes = await fetch(`${DIRECTUS_URL}/items/user?filter[user_id][_in]=${Array.from(userIds).join(',')}&limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await uRes.json()).data || []);
        }

        if (action === "accounts") {
            const userId = req.nextUrl.searchParams.get("user_id");
            const url = `${DIRECTUS_URL}/items/salesman?filter[_or][0][employee_id][_eq]=${userId}&filter[_or][1][encoder_id][_eq]=${userId}&filter[isActive][_eq]=1&fields=id,salesman_name,salesman_code,price_type,price_type_id,truck_plate,branch_code&limit=-1`;
            const res = await fetch(url, { headers: fetchHeaders });
            return NextResponse.json((await res.json()).data || []);
        }

        if (action === "branches") {
            const res = await fetch(`${DIRECTUS_URL}/items/branches?filter[isActive][_eq]=1&limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await res.json()).data || []);
        }

        if (action === "price_types") {
            const res = await fetch(`${DIRECTUS_URL}/items/price_types?sort=sort&limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await res.json()).data || []);
        }

        if (action === "customers") {
            const salesmanId = req.nextUrl.searchParams.get("salesman_id");
            if (!salesmanId) return NextResponse.json({ error: "salesman_id required" }, { status: 400 });
            const csRes = await fetch(`${DIRECTUS_URL}/items/customer_salesmen?filter[salesman_id][_eq]=${salesmanId}&limit=-1`, { headers: fetchHeaders });
            const csData = (await csRes.json()).data || [];
            const ids = csData.map((cs: { customer_id: number | string }) => cs.customer_id);
            if (ids.length === 0) return NextResponse.json([]);
            const cRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[id][_in]=${ids.join(',')}&filter[isActive][_eq]=1&fields=*,province,city&limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await cRes.json()).data || []);
        }

        if (action === "all_customers") {
            const search = req.nextUrl.searchParams.get("search");
            const offset = req.nextUrl.searchParams.get("offset") || "0";
            let url = `${DIRECTUS_URL}/items/customer?filter[isActive][_eq]=1&fields=*,province,city&limit=30&offset=${offset}`;
            if (search) {
                url += `&filter[_or][0][customer_name][_icontains]=${encodeURIComponent(search)}&filter[_or][1][store_name][_icontains]=${encodeURIComponent(search)}&filter[_or][2][customer_code][_icontains]=${encodeURIComponent(search)}`;
            }
            const cRes = await fetch(url, { headers: fetchHeaders });
            return NextResponse.json((await cRes.json()).data || []);
        }

        if (action === "salesman_by_customer") {
            const customerId = req.nextUrl.searchParams.get("customer_id");
            if (!customerId) return NextResponse.json({ error: "customer_id required" }, { status: 400 });

            // 1. Get all customer_salesman links for this customer
            const csRes = await fetch(`${DIRECTUS_URL}/items/customer_salesmen?filter[customer_id][_eq]=${customerId}&limit=-1`, { headers: fetchHeaders });
            const csData = (await csRes.json()).data || [];
            if (csData.length === 0) return NextResponse.json([]);

            const salesmanIds = csData.map((cs: { salesman_id?: number | string }) => cs.salesman_id).filter(Boolean);
            if (salesmanIds.length === 0) return NextResponse.json([]);

            // 2. Resolve Salesman records to find employee_id / encoder_id
            const sRes = await fetch(`${DIRECTUS_URL}/items/salesman?filter[id][_in]=${salesmanIds.join(',')}&limit=-1`, { headers: fetchHeaders });
            const sData = (await sRes.json()).data || [];
            if (sData.length === 0) return NextResponse.json([]);

            const userIds = new Set<string>();
            sData.forEach((s: { employee_id?: number | string; encoder_id?: number | string; user_id?: number | string }) => {
                const uid = s.employee_id || s.encoder_id || s.user_id;
                if (uid) userIds.add(uid.toString());
            });
            if (userIds.size === 0) return NextResponse.json([]);

            // 3. Fetch full User records for the distinct user IDs
            const uRes = await fetch(`${DIRECTUS_URL}/items/user?filter[user_id][_in]=${Array.from(userIds).join(',')}&limit=-1`, { headers: fetchHeaders });
            const uData = (await uRes.json()).data || [];

            // 🚀 SMART MAPPING: Attach the specific accounts (salesman_id) linked to this customer for each Master User
            const finalUsers = uData.map((user: { user_id: number | string }) => {
                const myLinkedAccounts = sData
                    .filter((s: { employee_id?: number | string; encoder_id?: number | string; user_id?: number | string; id: number | string }) => {
                        const sid = (s.employee_id || s.encoder_id || s.user_id)?.toString();
                        return sid === user.user_id.toString();
                    })
                    .map((s: { id: number | string }) => s.id);

                return {
                    ...user,
                    linked_account_ids: myLinkedAccounts
                };
            });

            return NextResponse.json(finalUsers);
        }

        if (action === "salesman_by_id") {
            const id = req.nextUrl.searchParams.get("id");
            if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
            const sRes = await fetch(`${DIRECTUS_URL}/items/salesman/${id}`, { headers: fetchHeaders });
            return NextResponse.json((await sRes.json()).data || null);
        }

        if (action === "suppliers") {
            const res = await fetch(`${DIRECTUS_URL}/items/suppliers?filter[supplier_type][_eq]=Trade&filter[isActive][_eq]=1&limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await res.json()).data || []);
        }

        if (action === "invoice_types") {
            const res = await fetch(`${DIRECTUS_URL}/items/sales_invoice_type?limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await res.json()).data || []);
        }

        if (action === "operations") {
            const res = await fetch(`${DIRECTUS_URL}/items/operation?limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await res.json()).data || []);
        }

        if (action === "payment_terms") {
            const res = await fetch(`${DIRECTUS_URL}/items/payment_terms?limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await res.json()).data || []);
        }



        if (action === "products") {
            try {
                const salesmanId = req.nextUrl.searchParams.get("salesman_id") || req.nextUrl.searchParams.get("salesmanId");
                console.log(`[InventoryDebug] Action: products, SalesmanID: ${salesmanId}`);
                const customerCode = req.nextUrl.searchParams.get("customer_code") || req.nextUrl.searchParams.get("customerCode");
                const customerIdRaw = req.nextUrl.searchParams.get("customer_id") || req.nextUrl.searchParams.get("customerId");
                const customerId = customerIdRaw ? Number(customerIdRaw) : null;
                const supplierIdRaw = req.nextUrl.searchParams.get("supplier_id") || req.nextUrl.searchParams.get("supplierId");
                const supplierId = supplierIdRaw ? Number(supplierIdRaw) : null;
                const priceType = req.nextUrl.searchParams.get("price_type") || req.nextUrl.searchParams.get("priceType") || "A";
                const priceTypeId = req.nextUrl.searchParams.get("price_type_id") || req.nextUrl.searchParams.get("priceTypeId");

                if (!customerCode || !supplierId) {
                    console.log(`[InventoryDebug] Missing customerCode or supplierId`);
                    return NextResponse.json({ error: "customer_code and supplier_id required" }, { status: 400 });
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

                const priceField = `price${priceType.toUpperCase()}`;

                // --- 1. Fetch Linkages (Product per Supplier) ---
                const psRes = await fetch(`${DIRECTUS_URL}/items/product_per_supplier?filter[supplier_id][_eq]=${supplierId}&fields=product_id&limit=-1`, { headers: fetchHeaders });
                const psJson = await psRes.json();
                const psData = psJson.data || [];
                console.log(`[InventoryDebug] Linked products count: ${psData.length}`);

                const linkedProductIds = psData.map((ps: { product_id: number | { id?: number; product_id?: number } }) => {
                    if (ps.product_id && typeof ps.product_id === 'object') return ps.product_id.id || ps.product_id.product_id;
                    return ps.product_id;
                }).filter(Boolean);

                if (linkedProductIds.length === 0) {
                    console.log(`[InventoryDebug] No linked products found for supplier ${supplierId}`);
                    return NextResponse.json([]);
                }

                // --- Start Inventory Fetch from Spring Boot ---
                const inventoryMap: Record<number, { available: number; unitCount: number }> = {};
                const queryBranchId = req.nextUrl.searchParams.get("branch_id") || req.nextUrl.searchParams.get("branchId");

                if (salesmanId || queryBranchId) {
                    try {
                        let branchId: string | number | null = queryBranchId;

                        // If no branchId was passed but we have salesmanId, try to look it up (fallback)
                        if (!branchId && salesmanId) {
                            const smUrl = `${DIRECTUS_URL}/items/salesman?filter[id][_eq]=${salesmanId}&fields=id,branch_id,branch_code&limit=1`;
                            const smRes = await fetch(smUrl, { headers: fetchHeaders });
                            if (smRes.ok) {
                                const smResJson = await smRes.json();
                                const smData = Array.isArray(smResJson.data) ? smResJson.data[0] : null;
                                if (smData) {
                                    branchId = smData.branch_code || smData.branch_id;
                                    if (branchId && typeof branchId === 'object') {
                                        const obj = branchId as { id?: number | string; branch_code?: number | string; branch_id?: number | string };
                                        branchId = obj.branch_code || obj.id || obj.branch_id || null;
                                    }
                                }
                            }
                        }

                        // Resolve numeric ID vs string code
                        let branchCodeStr: string | null = null;
                        if (branchId) {
                            if (isNaN(Number(branchId))) {
                                branchCodeStr = String(branchId);
                            } else {
                                try {
                                    const bRes = await fetch(`${DIRECTUS_URL}/items/branches/${branchId}?fields=branch_code`, { headers: fetchHeaders });
                                    if (bRes.ok) {
                                        const bData = (await bRes.json()).data;
                                        branchCodeStr = bData?.branch_code || null;
                                    }
                                } catch (e) {
                                    console.error("[InventoryDebug] Branch resolution error:", e);
                                }
                            }
                        }

                        console.log(`[InventoryDebug] Final Branch Target: ID=${branchId}, Code=${branchCodeStr}`);

                        if (branchId && SPRING_API_BASE_URL) {
                            const cookieStore = await cookies();
                            const token = cookieStore.get(COOKIE_NAME)?.value;

                            // Added date filter as suggested
                            const invUrl = `${SPRING_API_BASE_URL.replace(/\/$/, "")}/api/view-running-inventory-by-unit/all?startDate=2025-01-01&endDate=2026-12-30`;
                            console.log(`[InventoryDebug] Fetching: ${invUrl}`);

                            const inventoryRes = await fetch(invUrl, {
                                headers: {
                                    "Accept": "application/json",
                                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                                },
                                cache: 'no-store',
                            });

                            if (inventoryRes.ok) {
                                const invJson = await inventoryRes.json();
                                const invData = Array.isArray(invJson) ? invJson : (invJson.data || []);
                                console.log(`[InventoryDebug] Records Received: ${invData.length}`);

                                if (Array.isArray(invData)) {
                                    const branchesInStock = new Set<string>();
                                    invData.forEach((item: Record<string, unknown>) => {
                                        const itemBId = item.branchId ?? item.branch_id ?? item.BranchId;
                                        if (itemBId) branchesInStock.add(itemBId.toString());

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
                                    console.log(`[InventoryDebug] Branches found in API: ${Array.from(branchesInStock).slice(0, 10).join(", ")}`);
                                    console.log(`[InventoryDebug] Map populated with ${Object.keys(inventoryMap).length} items for branch ${branchId}`);
                                }
                            }
                        }
                    } catch (e) {
                        console.error("[InventoryDebug] Inventory Fetch Exception:", e);
                    }
                }
                // --- End Inventory Fetch ---

                const initialProducts = await fetchInChunks<ProductItem>(`${DIRECTUS_URL}/items/products?filter[isActive][_eq]=1&fields=*,product_category.category_id,product_category.category_name,product_brand.brand_id,product_brand.brand_name`, linkedProductIds, "product_id");

                const directParentIds = initialProducts.map(p => p.parent_id).filter((id): id is number => !!id);
                const selfParentIds = initialProducts.filter(p => !p.parent_id).map(p => Number(p.product_id));
                const allFamilyAnchorIds = Array.from(new Set([...directParentIds, ...selfParentIds]));

                const familyMembers = allFamilyAnchorIds.length > 0
                    ? await fetchInChunks<ProductItem>(`${DIRECTUS_URL}/items/products?filter[isActive][_eq]=1&fields=*,product_category.category_id,product_category.category_name,product_brand.brand_id,product_brand.brand_name`, allFamilyAnchorIds, "parent_id")
                    : [];

                const anchors = allFamilyAnchorIds.length > 0
                    ? await fetchInChunks<ProductItem>(`${DIRECTUS_URL}/items/products?filter[isActive][_eq]=1&fields=*,product_category.category_id,product_category.category_name,product_brand.brand_id,product_brand.brand_name`, allFamilyAnchorIds, "product_id")
                    : [];

                const unitsRes = await fetch(`${DIRECTUS_URL}/items/units?limit=-1`, { headers: fetchHeaders });
                const unitsData = (await unitsRes.json()).data || [];
                const unitMap: Record<number, { name: string; shortcut: string }> = {};
                unitsData.forEach((u: { unit_id: number | string; unit_name?: string; unit_shortcut?: string }) => {
                    unitMap[Number(u.unit_id)] = {
                        name: u.unit_name || "",
                        shortcut: u.unit_shortcut || ""
                    };
                });

                const allProductsMap = new Map<number, ProductItem>();
                [...anchors, ...initialProducts, ...familyMembers].forEach(p => {
                    const id = Number(p.product_id);
                    if (id && !allProductsMap.has(id)) allProductsMap.set(id, p);
                });

                const allIds = Array.from(allProductsMap.keys());
                const l1Items = await fetchInChunks<DiscountItem>(`${DIRECTUS_URL}/items/product_per_customer?filter[customer_code][_eq]=${customerCode}&fields=product_id,unit_price,discount_type`, allIds, "product_id");
                const l2Items: DiscountItem[] = (await (await fetch(`${DIRECTUS_URL}/items/supplier_category_discount_per_customer?filter[customer_code][_eq]=${customerCode}&filter[supplier_id][_eq]=${supplierId}&limit=-1`, { headers: fetchHeaders })).json()).data || [];

                let l4Items: DiscountItem[] = [];
                if (customerId) {
                    const l4Res = await fetch(`${DIRECTUS_URL}/items/customer_discount_brand?filter[customer_id][_eq]=${customerId}&limit=-1`, { headers: fetchHeaders });
                    l4Items = (await l4Res.json()).data || [];
                }

                const customerRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[customer_code][_eq]=${customerCode}&fields=discount_type`, { headers: fetchHeaders });
                const customerData = (await customerRes.json()).data?.[0];

                const priceOverrides: Record<number, number> = {};
                if (priceTypeId) {
                    const poRes = await fetch(`${DIRECTUS_URL}/items/product_per_price_type?filter[price_type_id][_eq]=${priceTypeId}&filter[status][_eq]=published&limit=-1`, { headers: fetchHeaders });
                    const poData: { product_id: number | string; price: number | string }[] = (await poRes.json()).data || [];
                    poData.forEach((po: { product_id: number | string; price: number | string }) => {
                        priceOverrides[Number(po.product_id)] = Number(po.price);
                    });
                }

                const typeIds = new Set(
                    l1Items.map((i: DiscountItem) => i.discount_type)
                        .concat(l2Items.map((i: DiscountItem) => i.discount_type))
                        .concat(l4Items.map((i: DiscountItem) => i.discount_type_id))
                        .concat([customerData?.discount_type])
                        .filter(Boolean)
                );

                const lpdtItems = typeIds.size > 0 ? await fetchInChunks<{ type_id: number; line_id: { percentage: number } }>(`${DIRECTUS_URL}/items/line_per_discount_type?fields=type_id,line_id.percentage&sort=id`, Array.from(typeIds) as (string | number)[], "type_id") : [];
                const discountMap: Record<number, number[]> = {};
                lpdtItems.forEach((item: { type_id: number | string; line_id?: { percentage: number | string } }) => {
                    const tid = Number(item.type_id);
                    if (!discountMap[tid]) discountMap[tid] = [];
                    discountMap[tid].push(Number(item.line_id?.percentage) || 0);
                });

                const discountTypesRes = typeIds.size > 0 ? await fetchInChunks<{ id: number; discount_type: string }>(`${DIRECTUS_URL}/items/discount_type?fields=id,discount_type`, Array.from(typeIds) as (string | number)[], "id") : [];
                const discountTypeNameMap: Record<number, string> = {};
                discountTypesRes.forEach((dt: { id: number | string; discount_type?: string }) => {
                    discountTypeNameMap[Number(dt.id)] = dt.discount_type || "";
                });

                const sellableItems = Array.from(allProductsMap.values()).filter(p => p.isActive === 1 || p.isActive === true);

                const finalProducts = sellableItems.map((p) => {
                    let winId = null;
                    let level = "None";

                    let price = priceOverrides[Number(p.product_id)] || Number(p[priceField] as number) || Number(p.price_per_unit) || 0;

                    const l1 = l1Items.find((item: DiscountItem) => item.product_id === p.product_id);
                    if (l1) { winId = l1.discount_type; price = Number(l1.unit_price) || price; level = "Customer-Specific Price Override"; }

                    if (!winId) {
                        // Extract raw numeric ID from Directus expanded object
                        const rawCatId = typeof p.product_category === 'object' && p.product_category !== null
                            ? (p.product_category as ExpandedCategory).category_id || (p.product_category as ExpandedCategory).id
                            : p.product_category;
                        const l2 = l2Items.find((item: DiscountItem) => Number(item.category_id) === Number(rawCatId) || !item.category_id || item.category_id === 0);
                        if (l2) { winId = l2.discount_type; level = "Supplier Category Discount"; }
                    }

                    if (!winId) {
                        const rawBrandId = typeof p.product_brand === 'object' && p.product_brand !== null
                            ? (p.product_brand as ExpandedBrand).brand_id || (p.product_brand as ExpandedBrand).id
                            : p.product_brand;
                        const l4 = l4Items.find((item: DiscountItem) => Number(item.brand_id) === Number(rawBrandId));
                        if (l4) { winId = l4.discount_type_id; level = "Customer Brand Discount"; }
                    }

                    if (!winId && customerData?.discount_type) { winId = customerData.discount_type; level = "None"; }

                    const specificDiscountName = winId ? discountTypeNameMap[Number(winId)] : "";
                    const displayLevel = specificDiscountName || level;

                    const parent = p.parent_id ? allProductsMap.get(Number(p.parent_id)) : null;
                    let displayName = p.description || "Unnamed Product";

                    const uomId = Number(p.unit_of_measurement);
                    const uomInfo = uomId && unitMap[uomId] ? unitMap[uomId] : { name: "", shortcut: "" };
                    let uomName = uomInfo.name;
                    const uomShortcut = uomInfo.shortcut;

                    if (uomName && typeof uomName === 'string') {
                        if (uomName.toLowerCase() === "pcs") uomName = "Pieces";
                        else uomName = uomName.charAt(0).toUpperCase() + uomName.slice(1).toLowerCase();
                    }

                    if (uomShortcut && !displayName.toLowerCase().includes(uomShortcut.toLowerCase())) {
                        displayName = `${displayName} (${uomShortcut})`;
                    } else if (uomName && !displayName.toLowerCase().includes(uomName.toLowerCase())) {
                        displayName = `${displayName} (${uomName})`;
                    }

                    return {
                        ...p,
                        display_name: displayName,
                        parent_product_name: parent?.description || null,
                        parent_id: p.parent_id || null,
                        unit_of_measurement_count: Number(p.unit_of_measurement_count) || 1,
                        uom: uomShortcut || uomName || "PCS",
                        uom_name: uomName,
                        uom_shortcut: uomShortcut,
                        base_price: price,
                        discount_level: displayLevel,
                        discount_type: winId,
                        discounts: winId ? (discountMap[winId] || []) : [],
                        category_name: (p.product_category as { category_name?: string })?.category_name || null,
                        brand_name: (p.product_brand as { brand_name?: string })?.brand_name || null,
                        available_qty: inventoryMap[Number(p.product_id)]?.available ?? inventoryMap[Number(p.id)]?.available ?? 0,
                        unit_count: inventoryMap[Number(p.product_id)]?.unitCount ?? inventoryMap[Number(p.id)]?.unitCount ?? (Number(p.unit_of_measurement_count) || 1)
                    };
                });

                const itemsWithStock = finalProducts.filter(p => (Number(p.available_qty) || 0) > 0);
                console.log(`[InventoryDebug] Total Products: ${finalProducts.length}, with Stock: ${itemsWithStock.length}`);

                if (itemsWithStock.length === 0 && finalProducts.length > 0) {
                    const p = finalProducts[0];
                    console.log(`[InventoryDebug] Sample Check (PID: ${p.product_id}): MapAvailable=${inventoryMap[Number(p.product_id)]?.available ?? 'MISSING'}`);
                }

                return NextResponse.json(finalProducts);
            } catch (err: unknown) {
                const e = err as Error;
                return NextResponse.json({ error: e.message }, { status: 500 });
            }
        }

        if (action === "get_attachment") {
            const id = req.nextUrl.searchParams.get("id");
            if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

            const res = await fetch(`${DIRECTUS_URL}/items/sales_order_attachment/${id}?fields=*`, { headers: fetchHeaders });
            const data = (await res.json()).data;
            if (!data) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });

            return NextResponse.json(data);
        }

        if (action === "get_order") {
            let orderId = req.nextUrl.searchParams.get("order_id") || req.nextUrl.searchParams.get("id");
            const orderNo = req.nextUrl.searchParams.get("order_no");

            if (!orderId && orderNo) {
                // Find ID by Order No
                const checkRes = await fetch(`${DIRECTUS_URL}/items/sales_order?filter[order_no][_eq]=${encodeURIComponent(orderNo)}&fields=order_id&limit=1`, { headers: fetchHeaders });
                const checkData = (await checkRes.json()).data;
                if (checkData && checkData.length > 0) {
                    orderId = checkData[0].order_id;
                    console.log(`[API] Resolved order_no ${orderNo} to ID ${orderId} via direct match.`);
                }
            }

            // SMART LOOKUP: If still no orderId but we have orderNo, check other attachments in the group
            if (!orderId && orderNo) {
                console.log(`[API] Attempting smart lookup for group reference: ${orderNo}`);
                const groupRes = await fetch(`${DIRECTUS_URL}/items/sales_order_attachment?filter[sales_order_no][_eq]=${encodeURIComponent(orderNo)}&filter[sales_order_id][_is_not_null]=true&fields=sales_order_id&limit=1`, { headers: fetchHeaders });
                const groupData = (await groupRes.json()).data;
                if (groupData && groupData.length > 0) {
                    orderId = groupData[0].sales_order_id;
                    console.log(`[API] Smart Resolved group ${orderNo} to existing Order ID: ${orderId}`);
                }
            }

            if (!orderId) return NextResponse.json({ error: "order_id or order_no required" }, { status: 400 });

            // 1. Fetch Header
            const hRes = await fetch(`${DIRECTUS_URL}/items/sales_order/${orderId}?fields=*`, { headers: fetchHeaders });
            const header = (await hRes.json()).data;
            if (!header) return NextResponse.json({ error: "Order not found" }, { status: 404 });

            // 2. Fetch Details
            const dRes = await fetch(`${DIRECTUS_URL}/items/sales_order_details?filter[order_id][_eq]=${orderId}&fields=*&limit=-1`, { headers: fetchHeaders });
            const items = (await dRes.json()).data || [];

            // 3. Enrich products
            if (items.length > 0) {
                const productIds = Array.from(new Set(items.map((i: { product_id: number }) => i.product_id))).filter(Boolean);
                // Included description and discount_type
                const pRes = await fetch(`${DIRECTUS_URL}/items/products?filter[product_id][_in]=${productIds.join(',')}&fields=product_id,product_name,product_code,description,discount_type&limit=-1`, { headers: fetchHeaders });
                const products = (await pRes.json()).data || [];
                const pMap = new Map<number, ProductMetadata>(products.map((p: ProductMetadata) => [Number(p.product_id), p]));

                // Fetch discount types for mapping
                const dtRes = await fetch(`${DIRECTUS_URL}/items/discount_type?fields=id,discount_type&limit=-1`, { headers: fetchHeaders });
                const dtMap = new Map<number, string>();
                if (dtRes.ok) {
                    const dtData = (await dtRes.json()).data || [];
                    dtData.forEach((dt: { id: number, discount_type: string }) => {
                        dtMap.set(Number(dt.id), dt.discount_type);
                    });
                }

                items.forEach((item: { product_id: number; discount_type?: string | number; product?: unknown; discountType?: string | number;[key: string]: unknown }) => {
                    const pid = Number(item.product_id);
                    if (pMap.has(pid)) {
                        const pData = pMap.get(pid)!;

                        // Resolve discount name
                        const rawDt = item.discount_type || pData.discount_type;
                        let resolvedDtName = rawDt;
                        if (rawDt && dtMap.has(Number(rawDt))) {
                            resolvedDtName = dtMap.get(Number(rawDt))!;
                        }

                        item.product = {
                            ...pData,
                            id: pData.product_id,
                            product_id: pData.product_id,
                            product_name: pData.product_name,
                            display_name: pData.product_name, // Map for UI
                            description: pData.description,
                            discount_level: resolvedDtName, // UI expects discount_level
                            unit_count: pData.unit_of_measurement_count || 1 // Support UC column
                        };

                        // Set it on the item directly too for consistency with cart
                        if (resolvedDtName) {
                            item.discountType = resolvedDtName;
                        }
                    }
                });
            }

            return NextResponse.json({ header, items });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (e: unknown) {
        const err = e as Error;
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { header, items } = body;
        const now = new Date();

        console.log(`\n>>> [POST /create-sales-order] Received request: order_id=${header.order_id || 'NEW'}, items=${items?.length || 0}`);
        if (items && items.length > 0) {
            items.forEach((it: IncomingLineItem, i: number) => {
                console.log(`  [Recv Item ${i}] detail_id=${it.detail_id}, product_id=${it.product?.product_id}, qty=${it.quantity}`);
            });
        }

        let orderNo = header.order_no;
        if (!orderNo) {
            let prefix = "SO";
            if (header.supplier_id) {
                try {
                    const supRes = await fetch(`${DIRECTUS_URL}/items/suppliers/${header.supplier_id}?fields=supplier_shortcut`, { headers: fetchHeaders });
                    if (supRes.ok) {
                        const supData = (await supRes.json()).data;
                        if (supData?.supplier_shortcut) {
                            prefix = supData.supplier_shortcut;
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch supplier shortcut for fallback order_no:", e);
                }
            }
            orderNo = `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        }

        let createdBy: number | null = null;
        try {
            const cookieStore = await cookies();
            const token = cookieStore.get(COOKIE_NAME)?.value;
            if (token) {
                const payload = decodeJwtPayload(token);
                const email = payload?.email || payload?.Email || "";
                const firstName = payload?.FirstName || payload?.Firstname || payload?.firstName || payload?.firstname || "";
                const lastName = payload?.LastName || payload?.Lastname || payload?.lastName || payload?.lastname || "";

                if (email && !createdBy) {
                    const res = await fetch(`${DIRECTUS_URL}/items/user?filter[user_email][_eq]=${encodeURIComponent(email)}&fields=user_id&limit=1`, { headers: fetchHeaders });
                    if (res.ok) {
                        const data = (await res.json()).data;
                        if (data && data.length > 0) createdBy = data[0].user_id;
                    }
                }

                if (!createdBy && firstName && lastName) {
                    const res = await fetch(`${DIRECTUS_URL}/items/user?filter[user_fname][_eq]=${encodeURIComponent(firstName)}&filter[user_lname][_eq]=${encodeURIComponent(lastName)}&fields=user_id&limit=1`, { headers: fetchHeaders });
                    if (res.ok) {
                        const data = (await res.json()).data;
                        if (data && data.length > 0) createdBy = data[0].user_id;
                    }
                }
            }
        } catch (e) {
            console.error("Failed to resolve created_by from JWT:", e);
        }

        let branchId = header.branch_id || null;
        if (!branchId && header.salesman_id) {
            const smRes = await fetch(`${DIRECTUS_URL}/items/salesman/${header.salesman_id}?fields=branch_code,branch_id`, { headers: fetchHeaders });
            if (smRes.ok) {
                const smData = (await smRes.json()).data;
                if (smData?.branch_code) {
                    branchId = Number(smData.branch_code);
                } else if (smData?.branch_id) {
                    branchId = Number(smData.branch_id);
                }
            }
        }

        const lineItemsPayload = items.map((item: IncomingLineItem, idx: number) => {
            const unitPrice = Number(item.unitPrice) || 0;
            const orderedQty = Number(item.quantity) || 0;
            const allocatedQty = Number(item.allocated_quantity) || 0;

            // Financial Context:
            // 1. gross_amount: ordered_qty * unitPrice (PRE-DISCOUNT)
            // 2. net_amount: ordered_qty * (unitPrice - unitDiscount) (POST-DISCOUNT)
            // 3. allocated_amount: allocated_qty * (unitPrice - unitDiscount) (BILLABLE)

            const orderedGross = unitPrice * orderedQty;
            const orderedNet = Number(item.netAmount) || orderedGross;
            const totalDiscountOrdered = Math.max(0, orderedGross - orderedNet);
            const unitDiscount = orderedQty > 0 ? totalDiscountOrdered / orderedQty : 0;

            const allocatedAmountLine = Math.max(0, (unitPrice - unitDiscount) * allocatedQty);

            const resolvedDiscountType = item.product?.discount_type
                || (typeof item.discountType === 'string' && !isNaN(Number(item.discountType)) ? Number(item.discountType) : null);

            console.log(`[CreateSalesOrder] Detail[${idx}]: PID=${item.product?.product_id}, ordQty=${orderedQty}, allocQty=${allocatedQty}, ordGross=${orderedGross.toFixed(2)}, ordNet=${orderedNet.toFixed(2)}, allocAmt=${allocatedAmountLine.toFixed(2)}`);

            return {
                detail_id: item.detail_id,
                order_id: 0,
                product_id: item.product.product_id,
                unit_price: unitPrice,
                ordered_quantity: orderedQty,
                quantity: orderedQty,
                allocated_quantity: allocatedQty,
                served_quantity: 0,
                discount_type: resolvedDiscountType,
                discount_amount: totalDiscountOrdered,
                gross_amount: orderedGross,
                net_amount: orderedNet,
                allocated_amount: allocatedAmountLine,
                uom: item.uom || null,
                remarks: item.remarks || ""
            };
        });

        const computedTotalAmount = lineItemsPayload.reduce((sum: number, li: { gross_amount: number }) => sum + li.gross_amount, 0);
        const computedDiscountAmount = lineItemsPayload.reduce((sum: number, li: { discount_amount: number }) => sum + li.discount_amount, 0);
        const computedNetAmount = lineItemsPayload.reduce((sum: number, li: { net_amount: number }) => sum + li.net_amount, 0);
        const computedAllocatedAmount = lineItemsPayload.reduce((sum: number, li: { allocated_amount: number }) => sum + li.allocated_amount, 0);

        const hasZeroAllocation = lineItemsPayload.some((item: { allocated_quantity: number }) => item.allocated_quantity === 0);
        // Prioritize manual choice from modal if available
        const orderStatus = header.order_status || (hasZeroAllocation ? "Draft" : "For Approval");

        let finalOrderId = header.order_id;
        // If no ID but we have an order_no, check if it exists to avoid RECORD_NOT_UNIQUE
        if (!finalOrderId && header.order_no) {
            try {
                const checkRes = await fetch(`${DIRECTUS_URL}/items/sales_order?filter[order_no][_eq]=${encodeURIComponent(header.order_no)}&fields=order_id&limit=1`, { headers: fetchHeaders });
                const checkData = (await checkRes.json()).data;
                if (checkData && checkData.length > 0) {
                    finalOrderId = checkData[0].order_id;
                    console.log(`[CreateSalesOrder] Found existing order by number: ${header.order_no} -> ID: ${finalOrderId}`);
                }
            } catch (e) {
                console.error("Check existing by order_no failed", e);
            }
        }

        const nowStr = now.toISOString();
        const dateOnly = nowStr.split('T')[0];

        let headerPayload: HeaderPayload;

        if (finalOrderId) {
            // FOR PATCH (Existing Order) - FULL WORKFLOW ENABLED
            headerPayload = {
                order_status: orderStatus, // Re-enabled now that trigger is fixed!
                total_amount: Number(computedTotalAmount),
                discount_amount: Number(computedDiscountAmount),
                net_amount: Number(computedNetAmount),
                allocated_amount: Number(computedAllocatedAmount),
                remarks: header.remarks || "",
                modified_by: createdBy,
                // Update specific timestamps based on status
                ...(orderStatus === "Draft" ? { draft_at: nowStr } : {}),
                ...(orderStatus === "Pending" ? { pending_date: nowStr } : {}),
                ...(orderStatus === "For Approval" ? { for_approval_at: nowStr } : {}),
            };

            if (header.po_no) headerPayload.po_no = header.po_no;
            if (header.due_date) headerPayload.due_date = header.due_date;
            if (header.delivery_date) headerPayload.delivery_date = header.delivery_date;
            if (header.receipt_type) headerPayload.receipt_type = Number(header.receipt_type);
            if (header.sales_type) headerPayload.sales_type = Number(header.sales_type);
            if (header.payment_terms !== undefined) headerPayload.payment_terms = header.payment_terms ? Number(header.payment_terms) : null;
        } else {
            // FOR POST (New Order)
            headerPayload = {
                order_no: orderNo,
                po_no: header.po_no || "",
                customer_code: header.customer_code,
                salesman_id: header.salesman_id,
                supplier_id: header.supplier_id,
                branch_id: branchId,
                price_type_id: header.price_type_id || null,
                receipt_type: header.receipt_type,
                sales_type: header.sales_type || 1,
                payment_terms: header.payment_terms ? Number(header.payment_terms) : null,
                order_date: dateOnly,
                order_status: orderStatus,
                due_date: header.due_date || null,
                delivery_date: header.delivery_date || null,
                total_amount: computedTotalAmount,
                discount_amount: computedDiscountAmount,
                net_amount: computedNetAmount,
                allocated_amount: computedAllocatedAmount,
                remarks: header.remarks || "",
                created_by: createdBy,
                created_date: nowStr,
                ...(orderStatus === "Draft" ? { draft_at: nowStr } : {}),
                ...(orderStatus === "Pending" ? { pending_date: nowStr } : {}),
                ...(orderStatus === "For Approval" ? { for_approval_at: nowStr } : {}),
            };
        }

        console.log("[CreateSalesOrder] Header Payload:", JSON.stringify(headerPayload));

        let hRes;
        if (finalOrderId) {
            // 2. Patch Header
            hRes = await fetch(`${DIRECTUS_URL}/items/sales_order/${finalOrderId}`, {
                method: "PATCH",
                headers: fetchHeaders,
                body: JSON.stringify(headerPayload)
            });
        } else {
            hRes = await fetch(`${DIRECTUS_URL}/items/sales_order`, {
                method: "POST",
                headers: fetchHeaders,
                body: JSON.stringify(headerPayload)
            });
        }

        if (!hRes.ok) {
            const errText = await hRes.text();
            console.error(`[CreateSalesOrder] Header Save Error (Status: ${hRes.status}):`, errText);
            return NextResponse.json({ success: false, error: errText });
        }

        const hText = await hRes.text();
        let hJson: { data?: { order_id?: number | string; id?: number | string } } = {};
        if (hText.trim()) {
            try {
                hJson = JSON.parse(hText);
            } catch {
                console.error("[CreateSalesOrder] Failed to parse Header response JSON:", hText);
                // We keep hJson empty but don't crash
            }
        } else {
            console.log(`[CreateSalesOrder] Header save successful but returned empty body (Status: ${hRes.status})`);
        }

        const targetId = Number(finalOrderId || hJson.data?.order_id || hJson.data?.id || header.order_id);

        // --- SMART UPSERT (SYNC) LOGIC ---
        try {
            // 1. Fetch current items in DB to see what to delete
            const currentRes = await fetch(`${DIRECTUS_URL}/items/sales_order_details?filter[order_id][_eq]=${targetId}&fields=detail_id,id&limit=-1`, {
                headers: fetchHeaders,
                cache: 'no-store'
            });
            const currentItems = currentRes.ok ? (await currentRes.json()).data || [] : [];

            // Map IDs robustly from DB (using detail_id primarily)
            const currentIds = currentItems.map((it: { detail_id?: number | string; id?: number | string }) => Number(it.detail_id || it.id)).filter((n: number) => !isNaN(n) && n > 0);

            // Get IDs from incoming items (those to KEEP)
            const incomingIds = items.map((it: IncomingLineItem) => Number(it.detail_id || it.id || it.order_detail_id)).filter((n: number) => !isNaN(n) && n > 0);

            const idsToDelete = currentIds.filter((id: number) => !incomingIds.includes(id));
            const incomingWithIds = lineItemsPayload.filter((it: { detail_id?: number | string }) => it.detail_id);
            const incomingNew = lineItemsPayload.filter((it: { detail_id?: number | string }) => !it.detail_id);

            console.log(`\n========== [SmartSync] Order ${targetId} ==========`);
            console.log(`  DB has ${currentIds.length} item(s): [${currentIds.join(", ")}]`);
            console.log(`  Frontend sent ${incomingIds.length} item(s): [${incomingIds.join(", ")}]`);
            console.log(`  Items to DELETE: ${idsToDelete.length > 0 ? `[${idsToDelete.join(", ")}]` : "none"}`);
            console.log(`  Items to UPDATE: ${incomingWithIds.length}`);
            console.log(`  Items to INSERT: ${incomingNew.length}`);
            console.log(`===============================================\n`);

            // 2. Perform DELETES — delete each removed item from DB individually
            for (const idToDelete of idsToDelete) {
                console.log(`[SmartSync] Deleting detail_id=${idToDelete} from DB...`);
                const delRes = await fetch(`${DIRECTUS_URL}/items/sales_order_details/${idToDelete}`, {
                    method: "DELETE",
                    headers: fetchHeaders
                });
                if (!delRes.ok) {
                    const errText = await delRes.text();
                    console.error(`[SmartSync] FAILED to delete detail_id=${idToDelete}: ${errText}`);
                    throw new Error(`Failed to delete order detail ${idToDelete}: ${errText}`);
                }
                console.log(`[SmartSync] SUCCESS deleted detail_id=${idToDelete}`);
            }

            // 3. Perform UPDATES (PATCH)
            if (incomingWithIds.length > 0) {
                for (const item of incomingWithIds) {
                    const pk = item.detail_id;
                    const updatePayload = { ...item };
                    delete updatePayload.detail_id;
                    delete updatePayload._ordered_gross;
                    delete updatePayload._ordered_discount;
                    updatePayload.order_id = targetId;

                    await fetch(`${DIRECTUS_URL}/items/sales_order_details/${pk}`, {
                        method: "PATCH",
                        headers: { ...fetchHeaders, "Content-Type": "application/json" },
                        body: JSON.stringify(updatePayload)
                    });
                }
            }

            // 4. Perform INSERTS (POST) for brand new items
            if (incomingNew.length > 0) {
                const inserts = incomingNew.map((item: Record<string, unknown>) => {
                    const li = { ...item };
                    delete li.detail_id; // Remove detail_id if present for new items
                    delete li._ordered_gross;
                    delete li._ordered_discount;
                    return { ...li, order_id: targetId };
                });

                const itemsRes = await fetch(`${DIRECTUS_URL}/items/sales_order_details`, {
                    method: "POST",
                    headers: fetchHeaders,
                    body: JSON.stringify(inserts)
                });

                if (!itemsRes.ok) {
                    console.error("Lines Insert Error:", await itemsRes.text());
                }
            }

        } catch (syncErr) {
            console.error("[CreateSalesOrder] Sync Logic Error:", syncErr);
            return NextResponse.json({ success: false, error: "Line Item Sync Failed" });
        }
        // --- END SMART SYNC ---

        if (header.attachment_id) {
            console.log(`[CreateSalesOrder] Processing grouped attachment linkage for ID: ${header.attachment_id}, Target SO ID: ${targetId}`);
            try {
                // 1. Fetch info for this source attachment
                const attachInfoRes = await fetch(`${DIRECTUS_URL}/items/sales_order_attachment/${header.attachment_id}?fields=sales_order_id,sales_order_no`, {
                    headers: fetchHeaders
                });

                let targetKeys: (string | number)[] = [header.attachment_id];

                if (attachInfoRes.ok) {
                    const attachInfo = (await attachInfoRes.json()).data;
                    const filterOptions: Record<string, unknown> = {};

                    if (attachInfo?.sales_order_id) {
                        filterOptions.sales_order_id = { _eq: attachInfo.sales_order_id };
                    } else if (attachInfo?.sales_order_no) {
                        filterOptions.sales_order_no = { _eq: attachInfo.sales_order_no };
                    }

                    if (Object.keys(filterOptions).length > 0) {
                        const filterValues = JSON.stringify(filterOptions);
                        const groupRes = await fetch(`${DIRECTUS_URL}/items/sales_order_attachment?filter=${filterValues}&fields=id&limit=-1`, {
                            headers: fetchHeaders
                        });

                        if (groupRes.ok) {
                            const groupJson = await groupRes.json();
                            if (groupJson.data && groupJson.data.length > 0) {
                                targetKeys = groupJson.data.map((a: { id: string | number }) => a.id);
                            }
                        }
                    }
                }

                console.log(`[CreateSalesOrder] Bulk updating ${targetKeys.length} attachments: [${targetKeys.join(", ")}]`);

                // 2. Bulk PATCH using Directus /items/{collection} JSON schema
                const attachRes = await fetch(`${DIRECTUS_URL}/items/sales_order_attachment`, {
                    method: "PATCH",
                    headers: fetchHeaders,
                    body: JSON.stringify({
                        keys: targetKeys,
                        data: {
                            sales_order_id: targetId,
                            status: "Approved"
                        }
                    })
                });

                if (attachRes.ok) {
                    console.log(`[CreateSalesOrder] SUCCESSFULLY linked attachments [${targetKeys.join(", ")}] to SO ${targetId}`);
                } else {
                    const attachErr = await attachRes.text();
                    console.error(`[CreateSalesOrder] Attachment Update FAILED for keys [${targetKeys.join(", ")}]:`, attachErr);

                    // Fallback to updating just the single one if BULK fails
                    await fetch(`${DIRECTUS_URL}/items/sales_order_attachment/${header.attachment_id}`, {
                        method: "PATCH",
                        headers: fetchHeaders,
                        body: JSON.stringify({ sales_order_id: targetId, status: "Approved" })
                    });
                }
            } catch (e) {
                console.error("[CreateSalesOrder] Back-linking attachment exception:", e);
            }
        }

        return NextResponse.json({ success: true, order_no: orderNo, order_id: targetId });
    } catch (e: unknown) {
        const err = e as Error;
        console.error("[CreateSalesOrder] Submission Exception:", err);
        return NextResponse.json({ success: false, error: err.message });
    }
}
