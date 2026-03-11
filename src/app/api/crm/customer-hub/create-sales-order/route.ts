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
const SPRING_API_BASE_URL = process.env.SPRING_API_BASE_URL || "http://100.81.225.79:8083";

const fetchHeaders = {
    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    "Content-Type": "application/json",
};

interface DirectusItem {
    id: number | string;
}

interface ProductItem extends DirectusItem {
    product_id: number;
    product_name?: string;
    description?: string;
    product_code?: string;
    parent_id?: number | null;
    isActive?: number | boolean;
    unit_of_measurement?: number | string;
    product_category?: number;
    product_brand?: number;
    [key: string]: unknown;
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

    try {
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
            const cRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[id][_in]=${ids.join(',')}&limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await cRes.json()).data || []);
        }

        if (action === "suppliers") {
            const res = await fetch(`${DIRECTUS_URL}/items/suppliers?limit=-1`, { headers: fetchHeaders });
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
                        let branchId: any = queryBranchId;

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
                                        branchId = branchId.id || branchId.branch_code || branchId.branch_id;
                                    }
                                }
                            }
                        }

                        console.log(`[InventoryDebug] Final Branch ID: ${branchId}`);

                        if (branchId) {
                            const cookieStore = await cookies();
                            const token = cookieStore.get(COOKIE_NAME)?.value;

                            // Fetch running inventory by unit
                            const invUrl = `${SPRING_API_BASE_URL.replace(/\/$/, "")}/api/view-running-inventory-by-unit/all`;
                            console.log(`[InventoryDebug] Fetching Inventory from: ${invUrl}`);
                            const inventoryRes = await fetch(invUrl, {
                                headers: token ? { "Authorization": `Bearer ${token}` } : {},
                                cache: 'no-store'
                            });
                            if (inventoryRes.ok) {
                                const invJson = await inventoryRes.json();
                                const invData = Array.isArray(invJson) ? invJson : (invJson.data || []);
                                console.log(`[InventoryDebug] Inventory Records Received: ${invData.length}`);
                                if (Array.isArray(invData)) {
                                    console.log(`[InventoryDebug] Matching for Branch ID: ${branchId} (Type: ${typeof branchId})`);
                                    if (invData.length > 0) {
                                        console.log(`[InventoryDebug] Sample Inv Item:`, JSON.stringify(invData[0]));
                                    }

                                    // filter STRICTLY by the salesman's branch
                                    invData.forEach((item: any) => {
                                        // The Spring Boot API uses camelCase (productId, branchId, runningInventoryUnit, unitCount)
                                        const itemBranchId = item.branchId || item.branch_id;
                                        if (itemBranchId && Number(itemBranchId) === Number(branchId)) {
                                            const pid = Number(item.productId || item.product_id);
                                            if (pid) {
                                                inventoryMap[pid] = {
                                                    available: Number(item.runningInventoryUnit || item.running_inventory_unit) || 0,
                                                    unitCount: Number(item.unitCount || item.unit_count) || 1
                                                };
                                            }
                                        }
                                    });
                                }
                            } else {
                                console.log(`[InventoryDebug] Spring Boot Fetch Error: ${inventoryRes.status}`);
                            }
                        } else {
                            console.log(`[InventoryDebug] No Branch ID found for salesman ${salesmanId}`);
                        }
                    } catch (e) {
                        console.error("[InventoryDebug] Failed to fetch inventory from Spring Boot:", e);
                    }
                }
                // --- End Inventory Fetch ---

                const initialProducts = await fetchInChunks<ProductItem>(`${DIRECTUS_URL}/items/products?filter[isActive][_eq]=1&fields=*,unit_of_measurement.unit_name,product_category.category_name,product_brand.brand_name`, linkedProductIds, "product_id");

                // Collect all involved parents
                const directParentIds = initialProducts.map(p => p.parent_id).filter((id): id is number => !!id);
                // Also treat initial products with parent_id as null as their own family anchors
                const selfParentIds = initialProducts.filter(p => !p.parent_id).map(p => Number(p.product_id));
                const allFamilyAnchorIds = Array.from(new Set([...directParentIds, ...selfParentIds]));

                // Fetch all members of these product families to get sibling UOMs
                const familyMembers = allFamilyAnchorIds.length > 0
                    ? await fetchInChunks<ProductItem>(`${DIRECTUS_URL}/items/products?filter[isActive][_eq]=1&fields=*,unit_of_measurement.unit_name,product_category.category_name,product_brand.brand_name`, allFamilyAnchorIds, "parent_id")
                    : [];

                const anchors = allFamilyAnchorIds.length > 0
                    ? await fetchInChunks<ProductItem>(`${DIRECTUS_URL}/items/products?filter[isActive][_eq]=1&fields=*,unit_of_measurement.unit_name,product_category.category_name,product_brand.brand_name`, allFamilyAnchorIds, "product_id")
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
                const l3Items = await fetchInChunks<DiscountItem>(`${DIRECTUS_URL}/items/product_per_supplier?filter[supplier_id][_eq]=${supplierId}&fields=product_id,discount_type`, allIds, "product_id");

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
                        .concat(l3Items.map((i: DiscountItem) => i.discount_type))
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
                    let level = "Default Customer Discount";

                    let price = priceOverrides[Number(p.product_id)] || Number(p[priceField] as number) || Number(p.price_per_unit) || 0;

                    const l1 = l1Items.find((item: DiscountItem) => item.product_id === p.product_id);
                    if (l1) { winId = l1.discount_type; price = Number(l1.unit_price) || price; level = "Customer-Specific Price Override"; }

                    if (!winId) {
                        const l2 = l2Items.find((item: DiscountItem) => item.category_id === p.product_category || !item.category_id || item.category_id === 0);
                        if (l2) { winId = l2.discount_type; level = "Supplier Category Discount"; }
                    }

                    if (!winId) {
                        const l3 = l3Items.find((item: DiscountItem) => item.product_id === p.product_id) || l3Items.find((item: DiscountItem) => p.parent_id && item.product_id === p.parent_id);
                        if (l3) { winId = l3.discount_type; level = "Supplier Product Discount"; }
                    }

                    if (!winId) {
                        const l4 = l4Items.find((item: DiscountItem) => item.brand_id === p.product_brand);
                        if (l4) { winId = l4.discount_type_id; level = "Customer Brand Discount"; }
                    }

                    if (!winId && customerData?.discount_type) { winId = customerData.discount_type; level = "Default Customer Discount"; }

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

                    // Append UOM to display name if not already present
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
                        available_qty: inventoryMap[Number(p.product_id)]?.available ?? 0,
                        unit_count: inventoryMap[Number(p.product_id)]?.unitCount ?? (Number(p.unit_of_measurement_count) || 1)
                    };
                });

                return NextResponse.json(finalProducts);
            } catch (err: unknown) {
                const e = err as Error;
                return NextResponse.json({ error: e.message }, { status: 500 });
            }
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

        // Enhance fallback generation if order_no is missing
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

        const lineItemsPayload = items.map((item: { unitPrice: number; quantity: number; allocated_quantity?: number; netAmount: number; product: { product_id: number; discount_type?: number }; remarks?: string }) => {
            const unitPrice = Number(item.unitPrice) || 0;
            const orderedQty = Number(item.quantity) || 0;
            const allocatedQty = Number(item.allocated_quantity) || orderedQty;

            const orderedGross = unitPrice * orderedQty;
            const orderedNetAmount = Number(item.netAmount) || orderedGross;
            const totalDiscountOrdered = orderedGross - orderedNetAmount;

            const unitDiscount = orderedQty > 0 ? totalDiscountOrdered / orderedQty : 0;

            const allocatedDiscount = unitDiscount * allocatedQty;
            const allocatedGross = unitPrice * allocatedQty;
            const netAmountLine = allocatedGross - allocatedDiscount;
            const allocatedAmountLine = netAmountLine;

            return {
                order_id: 0,
                product_id: item.product.product_id,
                unit_price: unitPrice,
                ordered_quantity: orderedQty,
                allocated_quantity: allocatedQty,
                served_quantity: 0,
                discount_type: item.product?.discount_type || null,
                discount_amount: allocatedDiscount,
                gross_amount: allocatedGross,
                net_amount: netAmountLine,
                allocated_amount: allocatedAmountLine,
                remarks: item.remarks || "",
                _ordered_gross: orderedGross,
                _ordered_discount: totalDiscountOrdered
            };
        });

        const computedTotalAmount = lineItemsPayload.reduce((sum: number, li: { _ordered_gross: number; _ordered_discount: number }) => sum + (li._ordered_gross - li._ordered_discount), 0);
        const computedDiscountAmount = lineItemsPayload.reduce((sum: number, li: { discount_amount: number }) => sum + li.discount_amount, 0);
        const computedNetAmount = lineItemsPayload.reduce((sum: number, li: { net_amount: number }) => sum + li.net_amount, 0);
        const computedAllocatedAmount = lineItemsPayload.reduce((sum: number, li: { allocated_amount: number }) => sum + li.allocated_amount, 0);

        const headerPayload = {
            ...(header.order_id ? { order_id: header.order_id } : {}),
            order_no: orderNo,
            po_no: header.po_no || "",
            customer_code: header.customer_code,
            salesman_id: header.salesman_id,
            supplier_id: header.supplier_id,
            branch_id: branchId,
            price_type_id: header.price_type_id || null,
            receipt_type: header.receipt_type,
            sales_type: header.sales_type || 1,
            order_date: now.toISOString().split('T')[0],
            order_status: "For Approval",
            due_date: header.due_date || null,
            delivery_date: header.delivery_date || null,
            total_amount: computedTotalAmount,
            discount_amount: computedDiscountAmount,
            net_amount: computedNetAmount,
            allocated_amount: computedAllocatedAmount,
            remarks: header.remarks || "",
            created_by: createdBy,
            created_date: now.toISOString(),
            for_approval_at: now.toISOString()
        };

        const hRes = await fetch(`${DIRECTUS_URL}/items/sales_order`, {
            method: "POST",
            headers: fetchHeaders,
            body: JSON.stringify(headerPayload)
        });

        if (!hRes.ok) {
            const errText = await hRes.text();
            console.error("Header Save Error:", errText);
            return NextResponse.json({ success: false, error: errText });
        }

        const hJson = await hRes.json();
        const soId = hJson.data.order_id || hJson.data.id;

        const finalLineItems = lineItemsPayload.map((item: { _ordered_gross?: number; _ordered_discount?: number;[key: string]: unknown }) => {
            const li = { ...item };
            delete li._ordered_gross;
            delete li._ordered_discount;
            return { ...li, order_id: soId };
        });

        const itemsRes = await fetch(`${DIRECTUS_URL}/items/sales_order_details`, {
            method: "POST",
            headers: fetchHeaders,
            body: JSON.stringify(finalLineItems)
        });

        if (!itemsRes.ok) {
            const errText = await itemsRes.text();
            console.error("Lines Save Error:", errText);
            return NextResponse.json({ success: false, error: errText });
        }

        return NextResponse.json({ success: true, order_no: orderNo });
    } catch (e: unknown) {
        const err = e as Error;
        console.error("Submission Exception:", err);
        return NextResponse.json({ success: false, error: err.message });
    }
}
