import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = "vos_access_token";

function decodeJwtPayload(token: string): any | null {
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

const fetchHeaders = {
    Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    "Content-Type": "application/json",
};

export async function GET(req: NextRequest) {
    const action = req.nextUrl.searchParams.get("action");

    try {
        if (action === "salesmen") {
            // Kunin lahat ng active na salesman sa Directus
            const res = await fetch(`${DIRECTUS_URL}/items/salesman?filter[isActive][_eq]=1&limit=-1`, { headers: fetchHeaders });
            const smData = (await res.json()).data || [];
            const userIds = new Set<string>();

            // I-collect ang mga employee_id o encoder_id para mahanap ang user account nila
            smData.forEach((s: any) => {
                const uid = s.employee_id || s.encoder_id;
                if (uid) userIds.add(uid.toString());
            });
            if (userIds.size === 0) return NextResponse.json([]);

            // Hanapin ang mga user records base sa nakolektang IDs
            const uRes = await fetch(`${DIRECTUS_URL}/items/user?filter[user_id][_in]=${Array.from(userIds).join(',')}&limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await uRes.json()).data || []);
        }

        if (action === "accounts") {
            // Kunin ang mga salesman records na naka-link sa logged-in user
            const userId = req.nextUrl.searchParams.get("user_id");
            const url = `${DIRECTUS_URL}/items/salesman?filter[_or][0][employee_id][_eq]=${userId}&filter[_or][1][encoder_id][_eq]=${userId}&filter[isActive][_eq]=1&fields=id,salesman_name,salesman_code,price_type,price_type_id,truck_plate&limit=-1`;
            const res = await fetch(url, { headers: fetchHeaders });
            return NextResponse.json((await res.json()).data || []);
        }

        if (action === "customers") {
            const salesmanId = req.nextUrl.searchParams.get("salesman_id");
            if (!salesmanId) return NextResponse.json({ error: "salesman_id required" }, { status: 400 });
            const csRes = await fetch(`${DIRECTUS_URL}/items/customer_salesmen?filter[salesman_id][_eq]=${salesmanId}&limit=-1`, { headers: fetchHeaders });
            const csData = (await csRes.json()).data || [];
            const ids = csData.map((cs: any) => cs.customer_id);
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
                const customerCode = req.nextUrl.searchParams.get("customer_code") || req.nextUrl.searchParams.get("customerCode");
                const customerIdRaw = req.nextUrl.searchParams.get("customer_id") || req.nextUrl.searchParams.get("customerId");
                const customerId = customerIdRaw ? Number(customerIdRaw) : null;
                const supplierIdRaw = req.nextUrl.searchParams.get("supplier_id") || req.nextUrl.searchParams.get("supplierId");
                const supplierId = supplierIdRaw ? Number(supplierIdRaw) : null;
                const priceType = req.nextUrl.searchParams.get("price_type") || req.nextUrl.searchParams.get("priceType") || "A";
                const priceTypeId = req.nextUrl.searchParams.get("price_type_id") || req.nextUrl.searchParams.get("priceTypeId");
                const salesmanId = req.nextUrl.searchParams.get("salesman_id") || req.nextUrl.searchParams.get("salesmanId");

                if (!customerCode || !supplierId) return NextResponse.json({ error: "customer_code and supplier_id required" }, { status: 400 });

                // Resolve Branch ID from Salesman if provided
                let branchId = null;
                if (salesmanId) {
                    const smRes = await fetch(`${DIRECTUS_URL}/items/salesman/${salesmanId}?fields=branch_code,branch_id`, { headers: fetchHeaders });
                    if (smRes.ok) {
                        const smData = (await smRes.json()).data;
                        branchId = smData?.branch_code ? Number(smData.branch_code) : (smData?.branch_id ? Number(smData.branch_id) : null);
                    }
                }

                const priceField = `price${priceType.toUpperCase()}`;

                const fetchInChunks = async (urlBase: string, ids: any[], filterField: string) => {
                    let results: any[] = [];
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

                // 1. Fetch linked products
                const psRes = await fetch(`${DIRECTUS_URL}/items/product_per_supplier?filter[supplier_id][_eq]=${supplierId}&fields=product_id&limit=-1`, { headers: fetchHeaders });
                const psJson = await psRes.json();
                const psData = psJson.data || [];
                const linkedProductIds = psData.map((ps: any) => {
                    if (ps.product_id && typeof ps.product_id === 'object') return ps.product_id.id || ps.product_id.product_id;
                    return ps.product_id;
                }).filter(Boolean);

                if (linkedProductIds.length === 0) return NextResponse.json([]);

                // 2. Fetch product details
                const initialProducts = await fetchInChunks(`${DIRECTUS_URL}/items/products?filter[isActive][_eq]=1`, linkedProductIds, "product_id");
                const parentIds = Array.from(new Set(initialProducts.map((p: any) => p.parent_id).filter(Boolean)));
                const parents = parentIds.length > 0 ? await fetchInChunks(`${DIRECTUS_URL}/items/products`, parentIds, "product_id") : [];
                const children = await fetchInChunks(`${DIRECTUS_URL}/items/products?filter[isActive][_eq]=1`, linkedProductIds, "parent_id");

                // Resolve Units
                const unitsRes = await fetch(`${DIRECTUS_URL}/items/units?limit=-1`, { headers: fetchHeaders });
                const unitsData = (await unitsRes.json()).data || [];
                const unitMap: Record<number, string> = {};
                unitsData.forEach((u: any) => { unitMap[Number(u.unit_id)] = u.unit_name || ""; });

                const allProductsMap = new Map();
                [...parents, ...initialProducts, ...children].forEach(p => {
                    const id = Number(p.product_id);
                    if (id && !allProductsMap.has(id)) allProductsMap.set(id, p);
                });

                // 3. Discounts
                const allIds = Array.from(allProductsMap.keys());
                const l1Items = await fetchInChunks(`${DIRECTUS_URL}/items/product_per_customer?filter[customer_code][_eq]=${customerCode}&fields=product_id,unit_price,discount_type`, allIds, "product_id");
                const l2Items = (await (await fetch(`${DIRECTUS_URL}/items/supplier_category_discount_per_customer?filter[customer_code][_eq]=${customerCode}&filter[supplier_id][_eq]=${supplierId}&limit=-1`, { headers: fetchHeaders })).json()).data || [];
                const l3Items = await fetchInChunks(`${DIRECTUS_URL}/items/product_per_supplier?filter[supplier_id][_eq]=${supplierId}&fields=product_id,discount_type`, allIds, "product_id");

                let l4Items: any[] = [];
                if (customerId) {
                    const l4Res = await fetch(`${DIRECTUS_URL}/items/customer_discount_brand?filter[customer_id][_eq]=${customerId}&limit=-1`, { headers: fetchHeaders });
                    l4Items = (await l4Res.json()).data || [];
                }

                const customerRes = await fetch(`${DIRECTUS_URL}/items/customer?filter[customer_code][_eq]=${customerCode}&fields=discount_type`, { headers: fetchHeaders });
                const customerData = (await customerRes.json()).data?.[0];

                // 4. Price Type Overrides
                // Dito natin chine-check kung may special price ang product para sa partikular na price_type_id
                let priceOverrides: Record<number, number> = {};
                if (priceTypeId) {
                    const poRes = await fetch(`${DIRECTUS_URL}/items/product_per_price_type?filter[price_type_id][_eq]=${priceTypeId}&limit=-1`, { headers: fetchHeaders });
                    const poData = (await poRes.json()).data || [];
                    poData.forEach((po: any) => {
                        priceOverrides[Number(po.product_id)] = Number(po.price);
                    });
                }

                const typeIds = new Set(
                    l1Items.map((i: any) => i.discount_type)
                        .concat(l2Items.map((i: any) => i.discount_type))
                        .concat(l3Items.map((i: any) => i.discount_type))
                        .concat(l4Items.map((i: any) => i.discount_type_id))
                        .concat([customerData?.discount_type])
                        .filter(Boolean)
                );

                const lpdtItems = typeIds.size > 0 ? await fetchInChunks(`${DIRECTUS_URL}/items/line_per_discount_type?fields=type_id,line_id.percentage&sort=id`, Array.from(typeIds), "type_id") : [];
                const discountMap: Record<number, number[]> = {};
                lpdtItems.forEach((item: any) => {
                    const tid = Number(item.type_id);
                    if (!discountMap[tid]) discountMap[tid] = [];
                    discountMap[tid].push(Number(item.line_id?.percentage) || 0);
                });

                const discountTypesRes = typeIds.size > 0 ? await fetchInChunks(`${DIRECTUS_URL}/items/discount_type?fields=id,discount_type`, Array.from(typeIds), "id") : [];
                const discountTypeNameMap: Record<number, string> = {};
                discountTypesRes.forEach((dt: any) => {
                    discountTypeNameMap[Number(dt.id)] = dt.discount_type || "";
                });

                // 5. Fetch Dynamic Inventory from View (if branchId is available)
                let inventoryMap: Record<number, number> = {};
                if (branchId) {
                    try {
                        const invUrl = `${DIRECTUS_URL}/items/v_running_inventory?filter[branch_id][_eq]=${branchId}&filter[supplier_id][_eq]=${supplierId}&limit=-1`;
                        const invRes = await fetch(invUrl, { headers: fetchHeaders });
                        if (invRes.ok) {
                            const invData = (await invRes.json()).data || [];
                            invData.forEach((inv: any) => {
                                inventoryMap[Number(inv.product_id)] = Number(inv.running_inventory_unit) || 0;
                            });
                        }
                    } catch (e) {
                        console.error("Failed to fetch inventory view:", e);
                    }
                }

                // 6. Assembly (Include ALL active family members)
                const sellableItems = Array.from(allProductsMap.values()).filter((p: any) => p.isActive === 1 || p.isActive === true);

                const finalProducts = sellableItems.map((p: any) => {
                    let winId = null;
                    let level = "Default Customer Discount";

                    // Priority: Override by price_type_id > priceType column > price_per_unit
                    // Dito tinitignan kung anong presyo ang dapat gamitin base sa priority level
                    let price = priceOverrides[Number(p.product_id)] || Number(p[priceField]) || Number(p.price_per_unit) || 0;

                    // I-resolve ang "winning" discount type base sa hierarchy (L1 -> L2 -> L3 -> L4 -> Default)
                    const l1 = l1Items.find((i: any) => i.product_id === p.product_id);
                    if (l1) { winId = l1.discount_type; price = Number(l1.unit_price) || price; level = "Customer-Specific Price Override"; }

                    if (!winId) {
                        const l2 = l2Items.find((i: any) => i.category_id === p.product_category || !i.category_id || i.category_id === 0);
                        if (l2) { winId = l2.discount_type; level = "Supplier Category Discount"; }
                    }

                    if (!winId) {
                        const l3 = l3Items.find((i: any) => i.product_id === p.product_id) || l3Items.find((i: any) => p.parent_id && i.product_id === p.parent_id);
                        if (l3) { winId = l3.discount_type; level = "Supplier Product Discount"; }
                    }

                    if (!winId) {
                        const l4 = l4Items.find((i: any) => i.brand_id === p.product_brand);
                        if (l4) { winId = l4.discount_type_id; level = "Customer Brand Discount"; }
                    }

                    if (!winId && customerData?.discount_type) { winId = customerData.discount_type; level = "Default Customer Discount"; }

                    const specificDiscountName = winId ? discountTypeNameMap[Number(winId)] : "";
                    const displayLevel = specificDiscountName || level;

                    const parent = p.parent_id ? allProductsMap.get(Number(p.parent_id)) : null;
                    let displayName = p.product_name || p.description || "Unnamed Product";

                    const uomId = Number(p.unit_of_measurement);
                    let uomName = uomId && unitMap[uomId] ? unitMap[uomId] : "";
                    if (uomName && typeof uomName === 'string') {
                        if (uomName.toLowerCase() === "pcs") uomName = "Pieces";
                        else uomName = uomName.charAt(0).toUpperCase() + uomName.slice(1).toLowerCase();
                    }
                    if (uomName && typeof uomName === 'string' && !displayName.toLowerCase().includes(uomName.toLowerCase())) {
                        displayName = `${displayName} ${uomName}`;
                    }

                    return {
                        ...p,
                        display_name: displayName,
                        parent_product_name: parent?.product_name || null,
                        base_price: price,
                        discount_level: displayLevel,
                        discount_type: winId,
                        discounts: winId ? (discountMap[winId] || []) : [],
                        available_qty: inventoryMap[Number(p.product_id)] ?? 0
                    };
                });

                return NextResponse.json(finalProducts);
            } catch (err: any) {
                return NextResponse.json({ error: err.message }, { status: 500 });
            }
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { header, items } = body;
        const now = new Date();
        const orderNo = header.order_no || `SO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

        // Kunin ang created_by gamit ang JWT cookie
        // Tandaan: Ang "sub" sa JWT ay Spring Boot ID, kaya kailangang hanapin ang totoong user_id sa Directus user table.
        let createdBy: number | null = null;
        try {
            const cookieStore = await cookies();
            const token = cookieStore.get(COOKIE_NAME)?.value;
            if (token) {
                const payload = decodeJwtPayload(token);
                const email = payload?.email || payload?.Email || "";
                const firstName = payload?.FirstName || payload?.Firstname || payload?.firstName || payload?.firstname || "";
                const lastName = payload?.LastName || payload?.Lastname || payload?.lastName || payload?.lastname || "";

                // Strategy 1: Hanapin gamit ang email
                if (email && !createdBy) {
                    const res = await fetch(`${DIRECTUS_URL}/items/user?filter[user_email][_eq]=${encodeURIComponent(email)}&fields=user_id&limit=1`, { headers: fetchHeaders });
                    if (res.ok) {
                        const data = (await res.json()).data;
                        if (data && data.length > 0) createdBy = data[0].user_id;
                    }
                }

                // Strategy 2: Kung walang email, hanapin gamit ang First Name + Last Name
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

        // 1. Kunin ang Branch ID mula sa Salesman
        let branchId = null;
        if (header.salesman_id) {
            const smRes = await fetch(`${DIRECTUS_URL}/items/salesman/${header.salesman_id}?fields=branch_code,branch_id`, { headers: fetchHeaders });
            if (smRes.ok) {
                const smData = (await smRes.json()).data;
                // Ang branch_code sa salesman table ay madalas na ang mismong branch id (numeric)
                if (smData?.branch_code) {
                    branchId = Number(smData.branch_code);
                } else if (smData?.branch_id) {
                    branchId = Number(smData.branch_id);
                }
            }
        }
        // 3. I-process muna ang Line Items para ma-compute ang tamang header totals
        const lineItemsPayload = items.map((item: any) => {
            const unitPrice = Number(item.unitPrice) || 0;
            const orderedQty = Number(item.quantity) || 0;
            const allocatedQty = Number(item.allocated_quantity) || orderedQty;

            // Ordered-based calculations (Base sa kabuuang order)
            const orderedGross = unitPrice * orderedQty;
            const orderedNetAmount = Number(item.netAmount) || orderedGross;
            const totalDiscountOrdered = orderedGross - orderedNetAmount;

            // Per-unit discount (proportional)
            const unitDiscount = orderedQty > 0 ? totalDiscountOrdered / orderedQty : 0;

            // Allocated-based calculations (Base sa kung ano lang ang ibibigay o "allocated")
            // Ang net_amount ay dapat nakabase sa allocated quantity, hindi sa ordered.
            const allocatedDiscount = unitDiscount * allocatedQty;
            const allocatedGross = unitPrice * allocatedQty;
            const netAmountLine = allocatedGross - allocatedDiscount;
            const allocatedAmountLine = netAmountLine;

            return {
                order_id: 0, // Placeholder lang ito, papalitan mamaya pagkatapos ma-save ang header
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
                // Internal fields para sa computation ng header (hindi sinesave sa DB)
                _ordered_gross: orderedGross,
                _ordered_discount: totalDiscountOrdered
            };
        });

        // I-compute ang mga total para sa header:
        // total_amount = ordered net total (full fulfillment)
        const computedTotalAmount = lineItemsPayload.reduce((sum: number, li: any) => sum + (li._ordered_gross - li._ordered_discount), 0);
        const computedDiscountAmount = lineItemsPayload.reduce((sum: number, li: any) => sum + li.discount_amount, 0);
        const computedNetAmount = lineItemsPayload.reduce((sum: number, li: any) => sum + li.net_amount, 0);
        const computedAllocatedAmount = lineItemsPayload.reduce((sum: number, li: any) => sum + li.allocated_amount, 0);

        const headerPayload = {
            ...(header.order_id ? { order_id: header.order_id } : {}), // Omit if null for AUTO_INCREMENT
            order_no: orderNo,
            po_no: header.po_no || "",
            customer_code: header.customer_code,
            salesman_id: header.salesman_id,
            supplier_id: header.supplier_id,
            branch_id: branchId,
            receipt_type: header.receipt_type,
            sales_type: header.sales_type || 1,
            order_date: now.toISOString().split('T')[0], // DATE only
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

        // Set correct order_id and strip internal fields before saving
        const finalLineItems = lineItemsPayload.map(({ _ordered_gross, _ordered_discount, ...li }: any) => ({ ...li, order_id: soId }));

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
    } catch (e: any) {
        console.error("Submission Exception:", e);
        return NextResponse.json({ success: false, error: e.message });
    }
}
