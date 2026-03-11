import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/items`;

interface Product {
    product_id: number;
    product_name: string;
    description: string;
    product_code: string;
}

interface SaleOrderDetail {
    product_id: number | Product;
    [key: string]: string | number | boolean | Product | null | undefined;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "15");
    const offset = (page - 1) * pageSize;

    // Filter parameters
    const search = searchParams.get("search");
    const dateCreated = searchParams.get("dateCreated");
    const orderDate = searchParams.get("orderDate");
    const deliveryDate = searchParams.get("deliveryDate");
    const dueDate = searchParams.get("dueDate");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const salesmanId = searchParams.get("salesmanId");
    const branchId = searchParams.get("branchId");
    const status = searchParams.get("status");
    const orderId = searchParams.get("orderId");
    const customerCode = searchParams.get("customerCode");

    const token = process.env.DIRECTUS_STATIC_TOKEN;
    const headers: Record<string, string> = {};
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    // MO AVG Calculation Logic
    if (type === "mo-avg") {
        try {
            if (!customerCode) {
                return NextResponse.json({ error: "customerCode required for MO AVG" }, { status: 400 });
            }

            // Calculate date 5 months ago (start of month)
            const now = new Date();
            const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            const dateStr = sixMonthsAgo.toISOString().split('T')[0];

            // Simple filter for mo-avg: just get items for specific orders if possible, 
            // but for now let's try to fix the existing filter to be more compatible.
            // Directus deep filter syntax check: invoice_no.order_id.customer_code
            let jsonItems;
            const filter = {
                "_and": [
                    { "invoice_no": { "isRemitted": { "_eq": 1 } } },
                    { "invoice_no": { "customer_code": { "_eq": customerCode } } },
                    { "invoice_no": { "invoice_date": { "_gte": dateStr } } }
                ]
            };

            const url = `${BASE_URL}/sales_invoice_details?filter=${encodeURIComponent(JSON.stringify(filter))}&fields=product_id,quantity&limit=-1`;
            console.log(`[DEBUG] MO AVG Fetch URL: ${url}`);

            const res = await fetch(url, { headers });

            if (!res.ok) {
                const errText = await res.text();
                console.error(`[DEBUG] MO AVG API Error: Status ${res.status}`, errText);

                // Fallback attempt: Try without the isRemitted filter if it's the culprit
                if (errText.includes("isRemitted") || errText.includes("field") || res.status === 400) {
                    console.log("[DEBUG] MO AVG Fallback: Attempting without isRemitted filter...");
                    const fallbackFilter = {
                        "_and": [
                            { "invoice_no": { "order_id": { "customer_code": { "_eq": customerCode } } } },
                            { "invoice_no": { "order_id": { "order_date": { "_gte": dateStr } } } }
                        ]
                    };
                    const fallbackUrl = `${BASE_URL}/sales_invoice_details?filter=${encodeURIComponent(JSON.stringify(fallbackFilter))}&fields=product_id,quantity&limit=-1`;
                    const fallbackRes = await fetch(fallbackUrl, { headers });
                    if (fallbackRes.ok) {
                        const json = await fallbackRes.json();
                        const items = json.data || [];
                        console.log(`[DEBUG] MO AVG (Fallback) Items fetched: ${items.length}`);
                        // Update items to continue processing below
                        jsonItems = items;
                    } else {
                        return NextResponse.json({ error: `MO AVG Fetch Error: ${res.status}`, details: errText }, { status: res.status });
                    }
                } else {
                    return NextResponse.json({ error: `MO AVG Fetch Error: ${res.status}`, details: errText }, { status: res.status });
                }
            } else {
                jsonItems = (await res.json()).data || [];
            }

            const items = jsonItems;
            console.log(`[DEBUG] MO AVG Items fetched: ${items.length}`);

            // Aggregate by product_id
            const aggregates: Record<number, number> = {};
            items.forEach((item: { product_id: number; quantity: number }) => {
                const pid = Number(item.product_id);
                if (pid) {
                    aggregates[pid] = (aggregates[pid] || 0) + (Number(item.quantity) || 0);
                }
            });

            // Calculate average per month (6 months total)
            const results: Record<number, number> = {};
            Object.entries(aggregates).forEach(([pid, total]) => {
                results[Number(pid)] = Number((total / 6.0).toFixed(2));
            });

            return NextResponse.json({ data: results });
        } catch (error: unknown) {
            const err = error as Error;
            console.error("[DEBUG] MO AVG calculation error:", err);
            return NextResponse.json({ error: err.message }, { status: 500 });
        }
    }

    if (type === "invoice-details") {
        try {
            const orderId = searchParams.get("orderId");
            const orderNo = searchParams.get("orderNo");
            if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

            // 1. Fetch Invoice
            let invUrl = `${BASE_URL}/sales_invoice?fields=*&limit=1`;
            const orFilters = [{ order_id: { _eq: orderId } }];
            if (orderNo) orFilters.push({ order_id: { _eq: orderNo } });
            invUrl += `&filter=${encodeURIComponent(JSON.stringify({ _or: orFilters }))}`;

            const invRes = await fetch(invUrl, { headers });
            if (!invRes.ok) return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 });

            const invJson = await invRes.json();
            const invoice = invJson.data?.[0];

            if (!invoice) return NextResponse.json({ data: null, message: "No invoice found" });

            // 2. Fetch Invoice Details using the numeric invoice_id as the FK (invoice_no field in schema)
            const detUrl = `${BASE_URL}/sales_invoice_details?filter[invoice_no][_eq]=${invoice.invoice_id}&fields=*&limit=-1`;
            const detRes = await fetch(detUrl, { headers });
            if (!detRes.ok) return NextResponse.json({ error: "Failed to fetch invoice details" }, { status: 500 });

            const detJson = await detRes.json();
            const details = detJson.data || [];

            // 3. Manual Product Join
            if (details.length > 0) {
                const productIds = Array.from(new Set(details.map((d: any) => d.product_id))).filter(Boolean);
                if (productIds.length > 0) {
                    const pUrl = `${BASE_URL}/products?filter[product_id][_in]=${productIds.join(',')}&fields=product_id,product_name,product_code,description&limit=-1`;
                    const pRes = await fetch(pUrl, { headers });
                    if (pRes.ok) {
                        const pJson = await pRes.json();
                        const pMap = new Map((pJson.data || []).map((p: any) => [Number(p.product_id), p]));

                        details.forEach((d: any) => {
                            const pid = Number(d.product_id);
                            if (pMap.has(pid)) {
                                d.product_id = pMap.get(pid);
                            }
                        });
                    }
                }
            }

            return NextResponse.json({
                data: {
                    invoice,
                    details
                }
            });
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }

    if (orderId) {
        try {
            const url = `${BASE_URL}/sales_order_details?filter[order_id][_eq]=${orderId}&limit=-1&fields=*`;
            console.log(`[DEBUG] Fetching order details. URL: ${url}`);

            const res = await fetch(url, { headers });
            if (!res.ok) {
                const errText = await res.text();
                return NextResponse.json({ error: `Directus Details Error: ${res.status}`, details: errText }, { status: res.status });
            }

            const json = await res.json();
            const details: SaleOrderDetail[] = json.data || [];

            // Manual join for product descriptions
            if (details.length > 0) {
                const productIds = Array.from(new Set(details.map((d: SaleOrderDetail) => {
                    if (typeof d.product_id === 'number') return d.product_id;
                    return null;
                }).filter(Boolean)));

                if (productIds.length > 0) {
                    const productsUrl = `${BASE_URL}/products?filter[product_id][_in]=${productIds.join(',')}&fields=product_id,product_name,description,product_code&limit=-1`;
                    console.log(`[DEBUG] Fetching products for join. URL: ${productsUrl}`);
                    const pRes = await fetch(productsUrl, { headers });
                    if (pRes.ok) {
                        const pJson = await pRes.json();
                        const productMap = new Map<number, Product>();
                        (pJson.data || []).forEach((p: Product) => {
                            const pid = Number(p.product_id);
                            if (pid) productMap.set(pid, p);
                        });

                        details.forEach((d: SaleOrderDetail) => {
                            const pid = Number(d.product_id);
                            if (productMap.has(pid)) {
                                d.product_id = productMap.get(pid) as Product; // Transform ID to Object
                            }
                        });
                    } else {
                        console.error(`[DEBUG] Product join fetch failed: ${pRes.status}`);
                    }
                }
            }

            return NextResponse.json({ data: details });
        } catch (error: unknown) {
            const err = error as Error;
            console.error("[DEBUG] Order details join error:", err);
            return NextResponse.json({ error: err.message }, { status: 500 });
        }
    }

    try {
        console.log(`[DEBUG] Starting main report fetch...`);
        // Build optimized queries with field filtering
        const salesOrderFields = [
            "order_id", "order_no", "customer_code", "salesman_id",
            "supplier_id", "branch_id", "order_date", "delivery_date",
            "due_date", "order_status", "total_amount", "allocated_amount",
            "discount_amount", "net_amount", "remarks", "created_date", "po_no"
        ].join(",");

        // Construct filter object
        const filters: Record<string, string | number | boolean | object>[] = [];

        if (search) {
            filters.push({
                "_or": [
                    { "order_no": { "_icontains": search } },
                    { "customer_code": { "_icontains": search } },
                    { "po_no": { "_icontains": search } }
                ]
            });
        }

        if (dateCreated) {
            filters.push({ "created_date": { "_between": [`${dateCreated}T00:00:00`, `${dateCreated}T23:59:59`] } });
        }
        if (orderDate) {
            filters.push({ "order_date": { "_eq": orderDate } });
        }
        if (deliveryDate) {
            filters.push({ "delivery_date": { "_eq": deliveryDate } });
        }
        if (dueDate) {
            filters.push({ "due_date": { "_eq": dueDate } });
        }

        // New range and specific filters
        // Helper to check if a string looks like a valid date YYYY-MM-DD
        const isValidDate = (d: string | null) => d && typeof d === 'string' && d.length >= 10 && d !== "null" && d !== "undefined";

        if (isValidDate(startDate) && isValidDate(endDate)) {
            filters.push({ "order_date": { "_between": [startDate, endDate] } });
        } else if (isValidDate(startDate)) {
            filters.push({ "order_date": { "_gte": startDate } });
        } else if (isValidDate(endDate)) {
            filters.push({ "order_date": { "_lte": endDate } });
        }

        if (salesmanId && salesmanId !== "none") {
            filters.push({ "salesman_id": { "_eq": salesmanId } });
        }
        if (branchId && branchId !== "none") {
            filters.push({ "branch_id": { "_eq": branchId } });
        }
        if (status && status !== "none") {
            filters.push({ "order_status": { "_eq": status } });
        }

        const filterParam = filters.length > 0 ? `&filter=${JSON.stringify({ "_and": filters })}` : "";
        console.log(`[DEBUG] Final Filter Param: ${filterParam}`);

        const safeFetch = async (url: string, name: string) => {
            try {
                const res = await fetch(url, { headers });
                if (!res.ok) {
                    const errMsg = await res.text();
                    console.error(`[DEBUG] Failed to fetch ${name}: Status ${res.status} - ${errMsg.substring(0, 100)}`);
                    return { data: [] };
                }
                const json = await res.json();
                return { data: json.data || [] };
            } catch (err: unknown) {
                const e = err as Error;
                console.error(`[DEBUG] Fetch exception for ${name}:`, e.message);
                return { data: [] };
            }
        };

        const [
            salesOrdersRes,
            customersRes,
            salesmenRes,
            branchesRes,
            suppliersRes,
            aggregatesRes
        ] = await Promise.all([
            fetch(`${BASE_URL}/sales_order?limit=${pageSize}&offset=${offset}&sort=-order_date,-created_date&meta=*&fields=${salesOrderFields}${filterParam}`, { headers }),
            safeFetch(`${BASE_URL}/customer?limit=-1&fields=id,customer_code,customer_name,store_name,city,province`, "customer"),
            safeFetch(`${BASE_URL}/salesman?limit=-1&fields=id,salesman_code,salesman_name,truck_plate`, "salesman"),
            safeFetch(`${BASE_URL}/branches?limit=-1&fields=id,branch_code,branch_name`, "branches"),
            safeFetch(`${BASE_URL}/suppliers?limit=-1&fields=id,supplier_shortcut`, "suppliers"),
            safeFetch(`${BASE_URL}/sales_order?aggregate[sum]=total_amount,allocated_amount${filterParam}`, "aggregates"),
        ]);

        if (!salesOrdersRes.ok) {
            const errBody = await salesOrdersRes.text();
            console.error(`[DEBUG] Main sales_order fetch failed: ${salesOrdersRes.status}`, errBody);
            return NextResponse.json({ error: `Directus Report Error: ${salesOrdersRes.status}`, details: errBody }, { status: salesOrdersRes.status });
        }

        const salesOrdersData = await salesOrdersRes.json();
        console.log(`[DEBUG] Main fetch complete. Orders found: ${salesOrdersData.data?.length || 0}`);

        return NextResponse.json({
            salesOrders: salesOrdersData.data || [],
            customers: customersRes.data,
            salesmen: salesmenRes.data,
            branches: branchesRes.data,
            suppliers: suppliersRes.data,
            meta: {
                total_count: salesOrdersData.meta?.filter_count ?? salesOrdersData.meta?.total_count ?? 0,
                aggregates: aggregatesRes.data?.[0]?.sum || { total_amount: 0, allocated_amount: 0 }
            }
        });
    } catch (error: unknown) {
        const err = error as Error;
        console.error("[DEBUG] [FATAL] Global API Error:", err);
        return NextResponse.json(
            {
                error: err.message || "Internal Server Error",
                details: err.stack,
                context: "Global GET handler"
            },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
        return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const token = process.env.DIRECTUS_STATIC_TOKEN;
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    try {
        console.log(`[DEBUG] Attempting to delete sales order ${orderId} and its details...`);

        // 1. Delete sales order details first
        const detailsFilter = { "order_id": { "_eq": orderId } };
        const detailsDeleteUrl = `${BASE_URL}/sales_order_details?filter=${encodeURIComponent(JSON.stringify(detailsFilter))}`;
        const detailsDeleteRes = await fetch(detailsDeleteUrl, {
            method: "DELETE",
            headers
        });

        if (!detailsDeleteRes.ok && detailsDeleteRes.status !== 204 && detailsDeleteRes.status !== 404) {
            const errText = await detailsDeleteRes.text();
            console.error(`[DEBUG] Failed to delete details: ${detailsDeleteRes.status}`, errText);
            // We'll try to delete the main order anyway, as details might not exist
        }

        // 2. Delete the sales order
        const orderDeleteUrl = `${BASE_URL}/sales_order/${orderId}`;
        const orderDeleteRes = await fetch(orderDeleteUrl, {
            method: "DELETE",
            headers
        });

        if (!orderDeleteRes.ok) {
            const errText = await orderDeleteRes.text();
            console.error(`[DEBUG] Failed to delete order: ${orderDeleteRes.status}`, errText);
            return NextResponse.json({
                error: `Failed to delete sales order: ${orderDeleteRes.status}`,
                details: errText
            }, { status: orderDeleteRes.status });
        }

        console.log(`[DEBUG] Sales order ${orderId} deleted successfully.`);
        return NextResponse.json({ success: true, message: "Sales order deleted successfully" });
    } catch (error: unknown) {
        const err = error as Error;
        console.error("[DEBUG] Delete error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
