import { NextRequest, NextResponse } from "next/server";

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
            const res = await fetch(`${DIRECTUS_URL}/items/salesman?filter[isActive][_eq]=1&limit=-1`, { headers: fetchHeaders });
            const smData = (await res.json()).data || [];
            const userIds = new Set<string>();
            smData.forEach((s: any) => {
                const uid = s.employee_id || s.encoder_id;
                if (uid) userIds.add(uid.toString());
            });
            if (userIds.size === 0) return NextResponse.json([]);
            const uRes = await fetch(`${DIRECTUS_URL}/items/user?filter[user_id][_in]=${Array.from(userIds).join(',')}&limit=-1`, { headers: fetchHeaders });
            return NextResponse.json((await uRes.json()).data || []);
        }

        if (action === "accounts") {
            const userId = req.nextUrl.searchParams.get("user_id");
            const url = `${DIRECTUS_URL}/items/salesman?filter[_or][0][employee_id][_eq]=${userId}&filter[_or][1][encoder_id][_eq]=${userId}&filter[isActive][_eq]=1&fields=id,salesman_name,salesman_code,price_type,truck_plate&limit=-1`;
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

                if (!customerCode || !supplierId) return NextResponse.json({ error: "customer_code and supplier_id required" }, { status: 400 });

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

                // 4. Assembly (Include ALL active family members)
                const sellableItems = Array.from(allProductsMap.values()).filter((p: any) => p.isActive === 1 || p.isActive === true);

                const finalProducts = sellableItems.map((p: any) => {
                    let winId = null;
                    let level = "Default Customer Discount";
                    let price = Number(p[priceField]) || Number(p.price_per_unit) || 0;

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
                        discounts: winId ? (discountMap[winId] || []) : []
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
        const orderNo = `SO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

        const headerPayload = {
            order_no: orderNo,
            po_no: header.po_no || "",
            customer_code: header.customer_code,
            salesman_id: header.salesman_id,
            supplier_id: header.supplier_id,
            receipt_type: header.receipt_type,
            sales_type: header.sales_type || 1,
            order_date: now.toISOString(),
            order_status: "For Approval",
            due_date: header.due_date,
            total_amount: header.total_amount,
            discount_amount: header.discount_amount,
            net_amount: header.net_amount,
            created_date: now.toISOString()
        };

        const hRes = await fetch(`${DIRECTUS_URL}/items/sales_order`, {
            method: "POST",
            headers: fetchHeaders,
            body: JSON.stringify(headerPayload)
        });

        if (!hRes.ok) return NextResponse.json({ success: false, error: await hRes.text() });
        const hJson = await hRes.json();
        const soId = hJson.data.id;

        const lineItemsPayload = items.map((item: any) => ({
            so_id: soId,
            product_id: item.product.product_id,
            quantity: item.quantity,
            uom: item.uom,
            unit_price: item.unitPrice,
            discount_type: item.discountType,
            discount_amount: item.discountAmount,
            net_amount: item.netAmount,
            total_amount: item.totalAmount
        }));

        const itemsRes = await fetch(`${DIRECTUS_URL}/items/sales_order_line_items`, {
            method: "POST",
            headers: fetchHeaders,
            body: JSON.stringify(lineItemsPayload)
        });

        if (!itemsRes.ok) return NextResponse.json({ success: false, error: await itemsRes.text() });
        return NextResponse.json({ success: true, order_no: orderNo });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
