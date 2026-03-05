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

    const token = process.env.DIRECTUS_STATIC_TOKEN;
    const headers: Record<string, string> = {};
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    try {
        // Build optimized queries with field filtering
        const salesOrderFields = [
            "order_id", "order_no", "customer_code", "salesman_id",
            "supplier_id", "branch_id", "order_date", "delivery_date",
            "due_date", "order_status", "total_amount", "allocated_amount",
            "discount_amount", "net_amount", "remarks", "created_date"
        ].join(",");

        // Construct filter object
        const filters: Record<string, unknown>[] = [];

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

        const filterParam = filters.length > 0 ? `&filter=${JSON.stringify({ "_and": filters })}` : "";

        const [salesOrdersRes, customersRes, salesmenRes, branchesRes, suppliersRes] = await Promise.all([
            fetch(`${BASE_URL}/sales_order?limit=${pageSize}&offset=${offset}&meta=*&fields=${salesOrderFields}${filterParam}`, { headers }),
            fetch(`${BASE_URL}/customer?limit=-1&fields=id,customer_code,customer_name,store_name,city,province`, { headers }),
            fetch(`${BASE_URL}/salesman?limit=-1&fields=id,salesman_code,salesman_name,truck_plate`, { headers }),
            fetch(`${BASE_URL}/branches?limit=-1&fields=id,branch_code,branch_name`, { headers }),
            fetch(`${BASE_URL}/suppliers?limit=-1&fields=id,supplier_shortcut`, { headers }),
        ]);

        if (!salesOrdersRes.ok) throw new Error(`Failed to fetch sales_order: ${salesOrdersRes.statusText}`);
        if (!customersRes.ok) throw new Error(`Failed to fetch customer: ${customersRes.statusText}`);
        if (!salesmenRes.ok) throw new Error(`Failed to fetch salesman: ${salesmenRes.statusText}`);
        if (!branchesRes.ok) throw new Error(`Failed to fetch branches: ${branchesRes.statusText}`);
        if (!suppliersRes.ok) throw new Error(`Failed to fetch supplier: ${suppliersRes.statusText}`);

        const [salesOrdersData, customersData, salesmenData, branchesData, suppliersData] = await Promise.all([
            salesOrdersRes.json(),
            customersRes.json(),
            salesmenRes.json(),
            branchesRes.json(),
            suppliersRes.json(),
        ]);

        return NextResponse.json({
            salesOrders: salesOrdersData.data,
            salesOrderDetails: [], // Removed as unused
            customers: customersData.data,
            salesmen: salesmenData.data,
            branches: branchesData.data,
            suppliers: suppliersData.data,
            meta: {
                total_count: salesOrdersData.meta?.filter_count || 0
            }
        });
    } catch (error: unknown) {
        return NextResponse.json(
            { error: (error as Error).message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
