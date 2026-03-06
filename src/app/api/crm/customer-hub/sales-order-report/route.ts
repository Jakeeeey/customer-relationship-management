import { NextRequest, NextResponse } from "next/server";

const BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/items`;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
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

    const token = process.env.DIRECTUS_STATIC_TOKEN;
    const headers: Record<string, string> = {};
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
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
            const details = json.data || [];

            // Manual join for product descriptions
            if (details.length > 0) {
                const productIds = Array.from(new Set(details.map((d: any) => d.product_id).filter(Boolean)));
                if (productIds.length > 0) {
                    const productsUrl = `${BASE_URL}/products?filter[product_id][_in]=${productIds.join(',')}&fields=product_id,product_name,description,product_code&limit=-1`;
                    console.log(`[DEBUG] Fetching products for join. URL: ${productsUrl}`);
                    const pRes = await fetch(productsUrl, { headers });
                    if (pRes.ok) {
                        const pJson = await pRes.json();
                        const productMap = new Map();
                        (pJson.data || []).forEach((p: any) => {
                            const pid = Number(p.product_id);
                            if (pid) productMap.set(pid, p);
                        });

                        details.forEach((d: any) => {
                            const pid = Number(d.product_id);
                            if (productMap.has(pid)) {
                                d.product_id = productMap.get(pid); // Transform ID to Object
                            }
                        });
                    } else {
                        console.error(`[DEBUG] Product join fetch failed: ${pRes.status}`);
                    }
                }
            }

            return NextResponse.json({ data: details });
        } catch (error: any) {
            console.error("[DEBUG] Order details join error:", error);
            return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
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
        const filters: any[] = [];

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
        const isValidDate = (d: any) => d && typeof d === 'string' && d.length >= 10 && d !== "null" && d !== "undefined";

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
            } catch (err: any) {
                console.error(`[DEBUG] Fetch exception for ${name}:`, err.message);
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
            fetch(`${BASE_URL}/sales_order?limit=${pageSize}&offset=${offset}&meta=*&fields=${salesOrderFields}${filterParam}`, { headers }),
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
                total_count: salesOrdersData.meta?.filter_count || 0,
                aggregates: aggregatesRes.data?.[0]?.sum || { total_amount: 0, allocated_amount: 0 }
            }
        });
    } catch (error: any) {
        console.error("[DEBUG] [FATAL] Global API Error:", error);
        return NextResponse.json(
            {
                error: error.message || "Internal Server Error",
                details: error.stack,
                context: "Global GET handler"
            },
            { status: 500 }
        );
    }
}
