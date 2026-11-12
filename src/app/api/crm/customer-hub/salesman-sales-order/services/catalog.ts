import { NextRequest, NextResponse } from "next/server";

import { cookies } from "next/headers";

import { loadCustomerProductDiscounts, resolveCustomerProductDiscount } from "@/modules/customer-relationship-management/customer-hub/salesman-sales-order/utils/customerProductDiscount";

const COOKIE_NAME = "vos_access_token";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

const SPRING_API_BASE_URL = process.env.SPRING_API_BASE_URL;

const fetchHeaders = {
    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    "Content-Type": "application/json",
};

const globalCachedInventory: Record<string, Record<string, unknown>[]> = {};

const globalCachedInventoryTime: Record<string, number> = {};

interface ProductMetadata {
    product_id: number;
    product_name: string;
    product_code: string;
    description: string;
    discount_type: string;
    unit_of_measurement_count?: number;
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

interface DiscountItem {
    id?: number;
    product_id?: number;
    category_id?: number;
    brand_id?: number;
    discount_type?: number;
    discount_type_id?: number;
    unit_price?: number | string;
    deleted_at?: string | null;
}

// Private module-owned adapter. Only the authenticated salesman BFF calls this.
export async function getSalesmanOrderData(req: NextRequest) {
    const action = req.nextUrl.searchParams.get("action");
    const searchParams = req.nextUrl.searchParams;
    try {
if (action === "general_setting") {
            const key = req.nextUrl.searchParams.get("key");
            let url = `${DIRECTUS_URL}/items/general_setting`;
            if (key) {
                url += `?filter[setting_key][_eq]=${encodeURIComponent(key)}&limit=1`;
            } else {
                url += `?limit=-1`;
            }
            try {
                const res = await fetch(url, { headers: fetchHeaders });
                if (!res.ok) return NextResponse.json({ data: [] });
                const json = await res.json();
                return NextResponse.json(json);
            } catch (err) {
                console.error("[CreateSalesOrder] Error fetching general_setting:", err);
                return NextResponse.json({ data: [] });
            }
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
                const search = req.nextUrl.searchParams.get("search") || "";
                console.log(`[InventoryDebug] Action: products, SalesmanID: ${salesmanId}, Search: "${search}"`);
                const customerCode = req.nextUrl.searchParams.get("customer_code") || req.nextUrl.searchParams.get("customerCode");
                const customerIdRaw = req.nextUrl.searchParams.get("customer_id") || req.nextUrl.searchParams.get("customerId");
                const customerId = customerIdRaw ? Number(customerIdRaw) : null;
                const supplierIdRaw = req.nextUrl.searchParams.get("supplier_id") || req.nextUrl.searchParams.get("supplierId");
                const supplierId = supplierIdRaw ? Number(supplierIdRaw) : null;
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

                // --- 1. Fetch Linkages (Product per Supplier) ---
                const psRes = await fetch(`${DIRECTUS_URL}/items/product_per_supplier?filter[supplier_id][_eq]=${supplierId}&fields=product_id&limit=-1`, { headers: fetchHeaders });
                const psJson = await psRes.json();
                const psData = psJson.data || [];
                console.log(`[InventoryDebug] Linked products count: ${psData.length}`);

                let linkedProductIds = psData.map((ps: { product_id: number | { id?: number; product_id?: number } }) => {
                    if (ps.product_id && typeof ps.product_id === 'object') return ps.product_id.id || ps.product_id.product_id;
                    return ps.product_id;
                }).filter(Boolean);

                if (linkedProductIds.length === 0) {
                    console.log(`[InventoryDebug] No linked products found for supplier ${supplierId}`);
                    return NextResponse.json([]);
                }

                if (search) {
                    const encodedSearch = encodeURIComponent(search);
                    const sRes = await fetch(`${DIRECTUS_URL}/items/products?filter[isActive][_eq]=1&filter[_or][0][product_name][_icontains]=${encodedSearch}&filter[_or][1][product_code][_icontains]=${encodedSearch}&filter[_or][2][description][_icontains]=${encodedSearch}&fields=product_id&limit=-1`, { headers: fetchHeaders });
                    if (sRes.ok) {
                        const sData = (await sRes.json()).data || [];
                        const searchIds = new Set(sData.map((p: { product_id: number }) => Number(p.product_id)));
                        linkedProductIds = linkedProductIds.filter((id: string | number) => searchIds.has(Number(id)));
                    }
                }




                // --- Start Inventory Fetch Promise from Spring Boot ---
                const inventoryFetchPromise = (async () => {
                    const inventoryMap: Record<string | number, { available: number; unitCount: number }> = {};
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

                        let supplierShortcutStr: string | null = null;
                        let branchCodeStr: string | null = null;
                        let branchNameStr: string | null = null;
                        
                        // Concurrent resolution of supplier shortcut and branch code/name
                        await Promise.all([
                            (async () => {
                                if (supplierId) {
                                    try {
                                        const supRes = await fetch(`${DIRECTUS_URL}/items/suppliers/${supplierId}?fields=supplier_shortcut`, { headers: fetchHeaders });
                                        if (supRes.ok) {
                                            const supData = (await supRes.json()).data;
                                            supplierShortcutStr = supData?.supplier_shortcut || null;
                                        }
                                    } catch (e) {
                                        console.error("[InventoryDebug] Supplier resolution error:", e);
                                    }
                                }
                            })(),
                            (async () => {
                                if (branchId) {
                                    if (isNaN(Number(branchId))) {
                                        branchCodeStr = String(branchId);
                                        try {
                                            const bRes = await fetch(`${DIRECTUS_URL}/items/branches?filter[branch_code][_eq]=${branchCodeStr}&fields=branch_name`, { headers: fetchHeaders });
                                            if (bRes.ok) {
                                                const bData = (await bRes.json()).data;
                                                if (bData && bData.length > 0) branchNameStr = bData[0].branch_name;
                                            }
                                        } catch {}
                                    } else {
                                        try {
                                            const bRes = await fetch(`${DIRECTUS_URL}/items/branches/${branchId}?fields=branch_code,branch_name`, { headers: fetchHeaders });
                                            if (bRes.ok) {
                                                const bData = (await bRes.json()).data;
                                                branchCodeStr = bData?.branch_code || null;
                                                branchNameStr = bData?.branch_name || null;
                                            }
                                        } catch (e) {
                                            console.error("[InventoryDebug] Branch resolution error:", e);
                                        }
                                    }
                                }
                            })()
                        ]);

                        console.log(`[InventoryDebug] Final Branch Target: ID=${branchId}, Code=${branchCodeStr}, Name=${branchNameStr}, SupplierShortcut=${supplierShortcutStr}`);

                        if (branchId && SPRING_API_BASE_URL) {
                            const cookieStore = await cookies();
                            const token = cookieStore.get(COOKIE_NAME)?.value;

                            const currentYear = new Date().getFullYear();
                            const invStartDate = searchParams.get("startDate") || `${currentYear}-01-01`;
                            const todayStr = new Date().toISOString().split('T')[0];
                            const invEndDate = searchParams.get("endDate") || todayStr;

                            let invUrl = `${SPRING_API_BASE_URL.replace(/\/$/, "")}/api/view-running-inventory-by-unit/all?startDate=${invStartDate}&endDate=${invEndDate}`;
                            if (branchNameStr) {
                                invUrl += `&branchName=${encodeURIComponent(branchNameStr)}`;
                            }
                            if (supplierShortcutStr) {
                                invUrl += `&supplierShortcut=${encodeURIComponent(supplierShortcutStr)}`;
                            }
                            
                            const nowTime = Date.now();
                            let invDataToProcess: Record<string, unknown>[] = [];
                            let inventoryIsOk = true;
                            const forceRefresh = searchParams.get("force_refresh") === "true" || searchParams.get("refresh") === "true";

                            if (!forceRefresh && globalCachedInventory[invUrl] && (nowTime - (globalCachedInventoryTime[invUrl] || 0) < 5 * 60 * 1000)) {
                                invDataToProcess = globalCachedInventory[invUrl];
                                console.log(`[InventoryDebug] Using cached inventory. Records: ${invDataToProcess.length}`);
                            } else {
                                console.log(`[InventoryDebug] Fetching fresh inventory (forceRefresh=${forceRefresh}): ${invUrl}`);
                                const inventoryRes = await fetch(invUrl, {
                                    headers: {
                                        "Accept": "application/json",
                                        ...(token ? { "Authorization": `Bearer ${token}` } : {})
                                    },
                                    cache: 'no-store',
                                });

                                if (inventoryRes.ok) {
                                    const invJson = await inventoryRes.json();
                                    invDataToProcess = Array.isArray(invJson) ? invJson : (invJson.data || []);
                                    globalCachedInventory[invUrl] = invDataToProcess;
                                    globalCachedInventoryTime[invUrl] = nowTime;
                                    console.log(`[InventoryDebug] Fetched fresh inventory. Records: ${invDataToProcess.length}`);
                                } else {
                                    inventoryIsOk = false;
                                }
                            }

                            if (inventoryIsOk) {
                                const invData = invDataToProcess;
                                console.log(`[InventoryDebug] Processing Records: ${invData.length}`);

                                if (Array.isArray(invData) && invData.length > 0) {
                                    const branchesInStock = new Set<string>();
                                    // 🎓 Smart Matching: Handles both numeric IDs and string Codes, and accumulates available quantities
                                    invData.forEach((item: Record<string, unknown>) => {
                                        const itemBId = item.branchId ?? item.branch_id ?? item.BranchId ?? item.Branch_Id;
                                        const itemSId = item.supplierId ?? item.supplier_id ?? item.SupplierId ?? item.Supplier_Id;
                                        
                                        if (itemBId) branchesInStock.add(itemBId.toString());

                                        const matchId = (itemBId && !isNaN(Number(itemBId)) && Number(itemBId) === Number(branchId));
                                        const matchCode = (branchCodeStr && itemBId && String(itemBId).toUpperCase() === String(branchCodeStr).toUpperCase());
                                        const matchSupplier = !supplierId || (itemSId && String(itemSId) === String(supplierId));

                                        if ((matchId || matchCode) && matchSupplier) {
                                            const pid = item.productId ?? item.product_id ?? item.ProductId ?? item.Product_Id ?? item.id;
                                            if (pid) {
                                                const available = Number(
                                                    item.availableStock ??
                                                    item.available_stock ??
                                                    item.runningInventoryUnit ??
                                                    item.running_inventory_unit ??
                                                    item.runningInventory ??
                                                    item.running_inventory ??
                                                    0
                                                );
                                                const unitCount = Number(item.unitCount ?? item.unit_count ?? 1);

                                                // Accumulate quantities 💎
                                                const existingNum = inventoryMap[Number(pid)] || { available: 0, unitCount };
                                                const newAvailable = existingNum.available + available;

                                                if (!isNaN(Number(pid))) inventoryMap[Number(pid)] = { available: newAvailable, unitCount };
                                                inventoryMap[String(pid)] = { available: newAvailable, unitCount };
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
                return inventoryMap;
            })();
            // --- End Inventory Fetch Promise ---

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
                const l1Rules = await loadCustomerProductDiscounts(DIRECTUS_URL, fetchHeaders, customerCode, allIds);
                const l1Items = Array.from(l1Rules.values());
                const l2Raw: DiscountItem[] = (await (await fetch(`${DIRECTUS_URL}/items/supplier_category_discount_per_customer?filter[customer_code][_eq]=${customerCode}&filter[supplier_id][_eq]=${supplierId}&filter[deleted_at][_null]=true&sort=-id&limit=-1`, { headers: fetchHeaders })).json()).data || [];
                // Sort descending by id as an in-memory guarantee that the latest created/updated record is always first
                const l2Items = l2Raw
                    .filter((item) => !item.deleted_at)
                    .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));

                let l4Items: DiscountItem[] = [];
                if (customerId) {
                    const l4Res = await fetch(`${DIRECTUS_URL}/items/customer_discount_brand?filter[customer_id][_eq]=${customerId}&limit=-1`, { headers: fetchHeaders });
                    l4Items = (await l4Res.json()).data || [];
                }

                const customerRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[customer_code][_eq]=${customerCode}&fields=discount_type`, { headers: fetchHeaders });
                const customerData = (await customerRes.json()).data?.[0];

                const priceOverrides: Record<number, number> = {};
                if (priceTypeId) {
                    const poRes = await fetch(`${DIRECTUS_URL}/items/product_per_price_type?filter[price_type_id][_eq]=${priceTypeId}&filter[status][_in]=published,approved&fields=product_id,price&limit=-1`, { headers: fetchHeaders });
                    const poData: { product_id: number | string | { id?: number; product_id?: number }; price: number | string }[] = (await poRes.json()).data || [];
                    poData.forEach((po) => {
                        const pid = po.product_id && typeof po.product_id === 'object' ? (po.product_id.id || po.product_id.product_id) : po.product_id;
                        if (pid) priceOverrides[Number(pid)] = Number(po.price);
                    });
                }

                const typeIds = new Set(
                    l1Items.map((i) => i.discount_type)
                        .concat(l2Items.map((i: DiscountItem) => i.discount_type))
                        .concat(l4Items.map((i: DiscountItem) => i.discount_type_id))
                        .concat([customerData?.discount_type])
                        .filter(Boolean)
                );

                const lpdtItems = typeIds.size > 0 ? await fetchInChunks<{ type_id: number; line_id: { percentage: number } }>(`${DIRECTUS_URL}/items/line_per_discount_type?fields=type_id,line_id.percentage&sort=id`, Array.from(typeIds) as (string | number)[], "type_id") : [];
                const discountMap: Record<number, number[]> = {};
                lpdtItems.forEach((item: { type_id: number; line_id?: { percentage: number } }) => {
                    const tid = Number(item.type_id);
                    if (!discountMap[tid]) discountMap[tid] = [];
                    discountMap[tid].push(Number(item.line_id?.percentage) || 0);
                });

                const discountTypesRes = typeIds.size > 0 ? await fetchInChunks<{ id: number; discount_type: string }>(`${DIRECTUS_URL}/items/discount_type?fields=id,discount_type`, Array.from(typeIds) as (string | number)[], "id") : [];
                const discountTypeNameMap: Record<number, string> = {};
                discountTypesRes.forEach((dt: { id: number | string; discount_type?: string }) => {
                    discountTypeNameMap[Number(dt.id)] = dt.discount_type || "";
                });

                const sellableItems = Array.from(allProductsMap.values()).filter(p => {
                    const isActive = p.isActive === 1 || p.isActive === true;
                    const hasOverride = Object.prototype.hasOwnProperty.call(priceOverrides, Number(p.product_id));
                    return isActive && hasOverride;
                });

                // Wait for the inventory fetch to complete before generating final products
                const inventoryMap = await inventoryFetchPromise;

                const finalProducts = sellableItems.map((p) => {
                    let winId = null;
                    let level = "None";

                    let price = priceOverrides[Number(p.product_id)] || 0;

                    const l1 = resolveCustomerProductDiscount(l1Rules, p.product_id, p.parent_id, price);
                    price = l1.price;
                    if (l1.discountTypeId || l1Rules.has(Number(p.product_id))) {
                        winId = l1.discountTypeId;
                        level = "Customer-Specific Price Override";
                    }

                    if (!winId) {
                        // Extract raw numeric ID from Directus expanded object
                        const rawCatId = typeof p.product_category === 'object' && p.product_category !== null
                            ? (p.product_category as ExpandedCategory).category_id || (p.product_category as ExpandedCategory).id
                            : p.product_category;
                        const l2 = l2Items.find((item: DiscountItem) => rawCatId && Number(item.category_id) === Number(rawCatId))
                            || l2Items.find((item: DiscountItem) => !item.category_id || item.category_id === 0);
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
                    let displayName = p.description || p.product_name || "Unnamed Product";

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
                        parent_product_name: parent?.description || parent?.product_name || null,
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

                // Sort by UOM Priority (Box > Tie > Pack > Pcs)
                const uomPriority: Record<string, number> = {
                    'BOX': 1, 'CASE': 1, 'CS': 1,
                    'TIE': 2,
                    'PACK': 3, 'PCK': 3, 'BNDL': 3,
                    'PCS': 4, 'PC': 4
                };

                finalProducts.sort((a, b) => {
                    const pa = a as { uom: string; display_name: string; product_name: string };
                    const pb = b as { uom: string; display_name: string; product_name: string };
                    const rankA = uomPriority[String(pa.uom).toUpperCase()] || 99;
                    const rankB = uomPriority[String(pb.uom).toUpperCase()] || 99;
                    if (rankA !== rankB) return rankA - rankB;
                    return String(pa.display_name || pa.product_name).localeCompare(String(pb.display_name || pb.product_name));
                });

                return NextResponse.json(finalProducts);
            } catch (err: unknown) {
                const e = err as Error;
                return NextResponse.json({ error: e.message }, { status: 500 });
            }
        }
if (action === "cart_inventory") {
            try {
                const branchId = req.nextUrl.searchParams.get("branch_id");
                const supplierId = req.nextUrl.searchParams.get("supplier_id");
                
                if (!branchId) return NextResponse.json({ error: "branch_id required" }, { status: 400 });

                let branchCodeStr: string | null = null;
                let branchNameStr: string | null = null;
                if (isNaN(Number(branchId))) {
                    branchCodeStr = String(branchId);
                    try {
                        const bRes = await fetch(`${DIRECTUS_URL}/items/branches?filter[branch_code][_eq]=${branchCodeStr}&fields=branch_name`, { headers: fetchHeaders });
                        if (bRes.ok) {
                            const bData = (await bRes.json()).data;
                            if (bData && bData.length > 0) branchNameStr = bData[0].branch_name;
                        }
                    } catch {}
                } else {
                    try {
                        const bRes = await fetch(`${DIRECTUS_URL}/items/branches/${branchId}?fields=branch_code,branch_name`, { headers: fetchHeaders });
                        if (bRes.ok) {
                            const bData = (await bRes.json()).data;
                            branchCodeStr = bData?.branch_code || null;
                            branchNameStr = bData?.branch_name || null;
                        }
                    } catch {}
                }

                let supplierShortcutStr: string | null = null;
                if (supplierId) {
                    try {
                        const supRes = await fetch(`${DIRECTUS_URL}/items/suppliers/${supplierId}?fields=supplier_shortcut`, { headers: fetchHeaders });
                        if (supRes.ok) {
                            const supData = (await supRes.json()).data;
                            supplierShortcutStr = supData?.supplier_shortcut || null;
                        }
                    } catch {}
                }

                const inventoryMap: Record<string | number, { available: number; unitCount: number }> = {};
                
                if (branchId && process.env.SPRING_API_BASE_URL) {
                    const cookieStore = await cookies();
                    const token = cookieStore.get(COOKIE_NAME)?.value;

                    const currentYear = new Date().getFullYear();
                    const invStartDate = searchParams.get("startDate") || `${currentYear}-01-01`;
                    const todayStr = new Date().toISOString().split('T')[0];
                    const invEndDate = searchParams.get("endDate") || todayStr;

                    let invUrl = `${process.env.SPRING_API_BASE_URL.replace(/\/$/, "")}/api/view-running-inventory-by-unit/all?startDate=${invStartDate}&endDate=${invEndDate}`;
                    if (branchNameStr) invUrl += `&branchName=${encodeURIComponent(branchNameStr)}`;
                    if (supplierShortcutStr) invUrl += `&supplierShortcut=${encodeURIComponent(supplierShortcutStr)}`;

                    const inventoryRes = await fetch(invUrl, {
                        headers: {
                            "Accept": "application/json",
                            ...(token ? { "Authorization": `Bearer ${token}` } : {})
                        },
                        cache: 'no-store',
                    });

                    console.log("\n[INVENTORY DEBUG] API URL Called:", invUrl);
                    console.log(`[INVENTORY DEBUG] Response Status: ${inventoryRes.status} ${inventoryRes.statusText}`);

                    if (inventoryRes.ok) {
                        const invJson = await inventoryRes.json();
                        console.log("[INVENTORY DEBUG] Raw JSON Response from Spring API (first 500 chars):");
                        console.log(JSON.stringify(invJson).substring(0, 500) + "..."); 

                        const invDataToProcess = Array.isArray(invJson) ? invJson : (invJson.data || []);
                        
                        invDataToProcess.forEach((item: Record<string, unknown>) => {
                            const itemBId = item.branchId ?? item.branch_id ?? item.BranchId ?? item.Branch_Id;
                            
                            const matchId = (itemBId && !isNaN(Number(itemBId)) && Number(itemBId) === Number(branchId));
                            const matchCode = (branchCodeStr && itemBId && String(itemBId).toUpperCase() === String(branchCodeStr).toUpperCase());
                            if ((matchId || matchCode)) {
                                const pid = item.productId ?? item.product_id ?? item.ProductId ?? item.Product_Id ?? item.id;
                                if (pid) {
                                    const available = Number(
                                        item.availableStock ?? item.available_stock ?? item.runningInventoryUnit ?? item.running_inventory_unit ?? item.runningInventory ?? item.running_inventory ?? 0
                                    );
                                    const unitCount = Number(item.unitCount ?? item.unit_count ?? 1);

                                    const existingNum = inventoryMap[Number(pid)] || { available: 0, unitCount };
                                    const newAvailable = existingNum.available + available;

                                    if (!isNaN(Number(pid))) inventoryMap[Number(pid)] = { available: newAvailable, unitCount };
                                    inventoryMap[String(pid)] = { available: newAvailable, unitCount };
                                }
                            }
                        });
                    }
                }

                return NextResponse.json(inventoryMap);
            } catch (err: unknown) {
                const e = err as Error;
                return NextResponse.json({ error: e.message }, { status: 500 });
            }
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const productIds = Array.from(new Set(items.map((i: any) => {
                    const p = i.product_id;
                    return typeof p === 'object' && p !== null ? (p.product_id || p.id) : p;
                }))).filter(Boolean);
                
                // Included description and unit of measurement
                const pRes = await fetch(`${DIRECTUS_URL}/items/products?filter[product_id][_in]=${productIds.join(',')}&fields=product_id,product_name,product_code,description,unit_of_measurement_count,unit_of_measurement.unit_shortcut,unit_of_measurement.unit_name&limit=-1`, { headers: fetchHeaders });
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

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                items.forEach((item: { product_id: any; discount_type?: string | number; product?: unknown; discountType?: string | number;[key: string]: unknown }) => {
                    const pVal = item.product_id;
                    const pid = Number(typeof pVal === 'object' && pVal !== null ? (pVal.product_id || pVal.id) : pVal);
                    if (pMap.has(pid)) {
                        const pData = pMap.get(pid)!;

                        // Resolve discount name
                        const rawDt = item.discount_type || pData.discount_type;
                        let resolvedDtName = rawDt;
                        if (rawDt && dtMap.has(Number(rawDt))) {
                            resolvedDtName = dtMap.get(Number(rawDt))!;
                        }

                        // @ts-expect-error unit_of_measurement might be dynamically shaped
                        const uomObj = pData.unit_of_measurement;
                        const uomName = uomObj?.unit_name || null;
                        const uomShortcut = uomObj?.unit_shortcut || null;

                        item.product = {
                            ...pData,
                            id: pData.product_id,
                            product_id: pData.product_id,
                            product_name: pData.product_name,
                            display_name: pData.description || pData.product_name || `Unknown Product ${pData.product_id}`, // Map for UI (matching catalog logic)
                            description: pData.description,
                            discount_level: resolvedDtName, // UI expects discount_level
                            unit_count: pData.unit_of_measurement_count || 1, // Support UC column
                            uom: uomShortcut || uomName || "PCS",
                            uom_name: uomName,
                            uom_shortcut: uomShortcut
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
return NextResponse.json({ error: "Unsupported catalog action" }, { status: 400 });
    } catch {
        return NextResponse.json({ error: "Salesman catalog service unavailable" }, { status: 503 });
    }
}
