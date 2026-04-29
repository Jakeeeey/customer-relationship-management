import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/items`;

interface Product {
    product_id: number;
    product_name: string;
    description: string;
    product_code: string;
    uom?: string;
}

interface SaleOrderDetail {
    product_id: number | Product;
    [key: string]: string | number | boolean | Product | null | undefined;
}

interface InvoiceItem {
    invoice_id: number;
    [key: string]: unknown;
}

interface InvoiceDetailItem {
    invoice_no: string | number;
    product_id: number;
    discount_type?: number | string | null;
    [key: string]: unknown;
}

interface ProductItem {
    product_id: number;
    product_name?: string;
    description?: string;
    product_code?: string;
    unit_of_measurement?: number;
    [key: string]: unknown;
}

export interface Supplier {
    id: number;
    supplier_shortcut: string;
    supplier_name: string;
    supplier_type?: string;
}

interface UnitItem {
    unit_id: number;
    unit_shortcut?: string;
    unit_name?: string;
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
    const supplierId = searchParams.get("supplierId");
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

    if (type === "order-pdf") {
        try {
            const soId = searchParams.get("salesOrderId");
            const orderNo = searchParams.get("orderNo");
            const folderName = process.env.DIRECTUS_INVOICE_PDF_FOLDER_NAME || "sales_invoice_pdf";
            const FOLDER_ID = await getOrCreateFolderId(folderName);

            if (!soId) return NextResponse.json({ error: "salesOrderId required" }, { status: 400 });

            console.log(`[PDF-FINAL] Start search for SOID=${soId}, No=${orderNo}`);

            // 1. Get Invoices for this SO first
            const invUrl = `${BASE_URL}/sales_invoice?filter[order_id][_eq]=${soId}&fields=invoice_id,invoice_no&limit=-1`;
            const invRes = await fetch(invUrl, { headers, cache: "no-store" });
            const invJson = await invRes.json();
            const invoices = invJson.data || [];

            let record: { pdf_file?: string; receipt_numbers?: string; width_mm?: number; height_mm?: number; [key: string]: unknown } | null = null;

            // CHAIN 1: Direct ID Match (Revised Schema)
            if (invoices.length > 0) {
                const invIds = invoices.map((i: Record<string, unknown>) => i.invoice_id);
                const pdfUrl = `${BASE_URL}/sales_invoice_pdf?filter[sales_invoice_id][_in]=${invIds.join(",")}&fields=pdf_file,receipt_numbers,width_mm,height_mm&limit=1`;
                const pdfRes = await fetch(pdfUrl, { headers, cache: "no-store" });
                const pdfJson = await pdfRes.json();
                record = pdfJson.data?.[0];
            }

            // CHAIN 2: Invoice No string search in 'receipt_numbers'
            if (!record && invoices.length > 0) {
                for (const inv of invoices) {
                    const pdfUrl = `${BASE_URL}/sales_invoice_pdf?filter[receipt_numbers][_icontains]=${inv.invoice_no}&fields=pdf_file,receipt_numbers,width_mm,height_mm&limit=1`;
                    const pdfRes = await fetch(pdfUrl, { headers, cache: "no-store" });
                    const pdfJson = await pdfRes.json();
                    if (pdfJson.data?.[0]) { record = pdfJson.data[0]; break; }
                }
            }

            // CHAIN 3: Order No string search in 'receipt_numbers'
            if (!record && orderNo) {
                const pdfUrl = `${BASE_URL}/sales_invoice_pdf?filter[receipt_numbers][_icontains]=${orderNo}&fields=pdf_file,receipt_numbers,width_mm,height_mm&limit=1`;
                const pdfRes = await fetch(pdfUrl, { headers, cache: "no-store" });
                const pdfJson = await pdfRes.json();
                record = pdfJson.data?.[0];
            }

            // CHAIN 4: Legacy sales_order_id field
            if (!record) {
                const pdfUrl = `${BASE_URL}/sales_invoice_pdf?filter[sales_order_id][_eq]=${soId}&fields=pdf_file,receipt_numbers,width_mm,height_mm&limit=1`;
                const pdfRes = await fetch(pdfUrl, { headers, cache: "no-store" });
                const pdfJson = await pdfRes.json();
                record = pdfJson.data?.[0];
            }

            // CHAIN 5: THE "FALLSAFE" - Direct /files search in specific folder
            if (!record) {
                console.log(`[PDF-FINAL] Searching direct /files in folder ${FOLDER_ID}...`);
                const queries = [orderNo, ...(invoices.map((i: Record<string, unknown>) => i.invoice_no))].filter(Boolean);

                for (const query of queries) {
                    // Search title OR filename for the keyword in the correct folder
                    const filesUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/files?filter[folder][_eq]=${FOLDER_ID}&filter[_or][0][title][_icontains]=${query}&filter[_or][1][filename_download][_icontains]=${query}&limit=1`;
                    const filesRes = await fetch(filesUrl, { headers, cache: "no-store" });
                    const filesJson = await filesRes.json();

                    if (filesJson.data?.[0]?.id) {
                        const file = filesJson.data[0];
                        console.log(`[PDF-FINAL] FOUND IN /FILES! fileId=${file.id}, match=${query}`);
                        return NextResponse.json({
                            data: {
                                fileId: file.id,
                                receipts: file.title,
                                url: `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${file.id}`
                            }
                        });
                    }
                }
            }

            if (!record || !record.pdf_file) {
                console.log(`[PDF-FINAL] No record found anywhere for SOID=${soId}`);
                return NextResponse.json({ data: null });
            }

            console.log(`[PDF-FINAL] Success! asset=${record.pdf_file}`);
            return NextResponse.json({
                data: {
                    fileId: record.pdf_file,
                    receipts: record.receipt_numbers,
                    width_mm: record.width_mm,
                    height_mm: record.height_mm,
                    url: `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${record.pdf_file}`
                }
            });

        } catch (error: unknown) {
            console.error("[PDF-FINAL] Fatal Error:", error);
            return NextResponse.json({ error: String(error) }, { status: 500 });
        }
    }

    if (type === "order-attachments") {
        try {
            const orderNo = searchParams.get("orderNo");
            if (!orderNo) return NextResponse.json({ error: "orderNo required" }, { status: 400 });

            const attUrl = `${BASE_URL}/sales_order_attachment?filter[sales_order_no][_eq]=${orderNo}&fields=*&limit=-1`;
            const attRes = await fetch(attUrl, { headers });

            if (!attRes.ok) return NextResponse.json({ error: "Failed to fetch attachments" }, { status: 500 });

            const attJson = await attRes.json();
            const attachments = attJson.data || [];

            const enriched = attachments.map((att: Record<string, unknown>) => ({
                id: att.id,
                name: att.attachment_name,
                url: att.file ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${att.file}` : null
            }));

            return NextResponse.json({ data: enriched });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            return NextResponse.json({ error: message }, { status: 500 });
        }
    }

    if (type === "invoice-details") {
        try {
            const orderId = searchParams.get("orderId");
            const orderNo = searchParams.get("orderNo");
            if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

            // 1. Fetch All Invoices for the specific Order (multi-invoice support)
            // Fields: *, and we'll manually fetch details to avoid deep join limits if any, 
            // but Directus can handle nested fields like details.*, details.product_id.* if configured.
            let invUrl = `${BASE_URL}/sales_invoice?fields=*&limit=-1`;
            const orFilters = [{ order_id: { _eq: orderId } }];
            if (orderNo) orFilters.push({ order_id: { _eq: orderNo } });
            invUrl += `&filter=${encodeURIComponent(JSON.stringify({ _or: orFilters }))}`;

            const invRes = await fetch(invUrl, { headers });
            if (!invRes.ok) return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });

            const invJson = await invRes.json();
            const invoices = invJson.data || [];

            if (invoices.length === 0) return NextResponse.json({ data: [], message: "No invoices found" });
            const invoiceIds = invoices.map((inv: InvoiceItem) => inv.invoice_id);

            // 2. Fetch All Details (Standard fetch, manual join later to avoid 500 deep-join errors)
            const detRes = await fetch(
                `${BASE_URL}/sales_invoice_details?filter[invoice_no][_in]=${invoiceIds.join(',')}&fields=*&limit=-1`,
                { headers }
            );
            if (!detRes.ok) return NextResponse.json({ error: "Failed to fetch invoice details" }, { status: 500 });

            const detJson = await detRes.json();
            const allDetails = detJson.data || [];

            // 3. Manual Join for Products and Units
            let detailsWithProducts = allDetails;
            if (allDetails.length > 0) {
                const productIds = Array.from(new Set(allDetails.map((d: InvoiceDetailItem) => d.product_id).filter(Boolean)));
                if (productIds.length > 0) {
                    const productsUrl = `${BASE_URL}/products?filter[product_id][_in]=${productIds.join(',')}&fields=product_id,product_name,description,product_code,unit_of_measurement&limit=-1`;
                    const pRes = await fetch(productsUrl, { headers });

                    if (pRes.ok) {
                        const pJson = await pRes.json();
                        const pData = pJson.data || [];

                        // Fetch Units for UOM
                        const unitRes = await fetch(`${BASE_URL}/units?limit=-1`, { headers });
                        const unitMap = new Map<number, string>();
                        if (unitRes.ok) {
                            const uJson = await unitRes.json();
                            (uJson.data || []).forEach((u: UnitItem) => unitMap.set(Number(u.unit_id), u.unit_shortcut || u.unit_name || ""));
                        }

                        const pMap = new Map<number, ProductItem>();
                        pData.forEach((p: ProductItem) => {
                            pMap.set(Number(p.product_id), {
                                ...p,
                                uom: unitMap.get(Number(p.unit_of_measurement)) || "PCS"
                            });
                        });

                        // Fetch Discount Types for Invoice Details mapping
                        const dtRes = await fetch(`${BASE_URL}/discount_type?limit=-1&fields=id,discount_type`, { headers });
                        const dtMap = new Map<number, string>();
                        if (dtRes.ok) {
                            const dtJson = await dtRes.json();
                            (dtJson.data || []).forEach((dt: { id: number; discount_type: string }) => dtMap.set(Number(dt.id), dt.discount_type));
                        }

                        detailsWithProducts = allDetails.map((d: InvoiceDetailItem) => ({
                            ...d,
                            product_id: pMap.get(Number(d.product_id)) || d.product_id,
                            discount_type: d.discount_type ? (dtMap.get(Number(d.discount_type)) || d.discount_type) : null
                        }));
                    }
                }
            }

            // 4. Fetch PDFs for these invoices
            const pdfRes = await fetch(`${BASE_URL}/sales_invoice_pdf?filter[sales_invoice_id][_in]=${invoiceIds.join(',')}&fields=pdf_file,sales_invoice_id,width_mm,height_mm&limit=-1`, { headers });
            const pdfJson = await pdfRes.json();
            const pdfsData = pdfJson.data || [];
            const pdfMap = new Map();
            pdfsData.forEach((p: Record<string, unknown>) => pdfMap.set(Number(p.sales_invoice_id), p));

            // 5. Final Grouping by Invoice
            const invoicesWithDetails = invoices.map((inv: InvoiceItem) => ({
                invoice: inv,
                details: detailsWithProducts.filter((d: InvoiceDetailItem) => Number(d.invoice_no) === Number(inv.invoice_id)),
                pdf: pdfMap.get(Number(inv.invoice_id)) ? {
                    ...pdfMap.get(Number(inv.invoice_id)),
                    url: `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${pdfMap.get(Number(inv.invoice_id)).pdf_file}`
                } : null
            }));

            return NextResponse.json({ data: invoicesWithDetails });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            return NextResponse.json({ error: message }, { status: 500 });
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

            // Fetch Discount Types for mapping
            const dtUrl = `${BASE_URL}/discount_type?limit=-1&fields=id,discount_type`;
            const dtRes = await fetch(dtUrl, { headers });
            const dtMap = new Map<number, string>();
            if (dtRes.ok) {
                const dtJson = await dtRes.json();
                (dtJson.data || []).forEach((dt: { id: number; discount_type: string }) => {
                    dtMap.set(Number(dt.id), dt.discount_type);
                });
            }

            // Manual join for product descriptions
            if (details.length > 0) {
                const productIds = Array.from(new Set(details.map((d: SaleOrderDetail) => {
                    if (typeof d.product_id === 'number') return d.product_id;
                    return null;
                }).filter(Boolean)));

                if (productIds.length > 0) {
                    const productsUrl = `${BASE_URL}/products?filter[product_id][_in]=${productIds.join(',')}&fields=product_id,product_name,description,product_code,unit_of_measurement&limit=-1`;
                    console.log(`[DEBUG] Fetching products for join. URL: ${productsUrl}`);
                    const pRes = await fetch(productsUrl, { headers });

                    if (pRes.ok) {
                        const pJson = await pRes.json();
                        const pData = pJson.data || [];

                        // Fetch Units for UOM
                        const unitRes = await fetch(`${BASE_URL}/units?limit=-1`, { headers });
                        const unitMap = new Map<number, string>();
                        if (unitRes.ok) {
                            const uJson = await unitRes.json();
                            (uJson.data || []).forEach((u: UnitItem) => unitMap.set(Number(u.unit_id), u.unit_shortcut || u.unit_name || ""));
                        }

                        const productMap = new Map<number, ProductItem>();
                        pData.forEach((p: ProductItem) => {
                            const pid = Number(p.product_id);
                            if (pid) productMap.set(pid, {
                                ...p,
                                uom: unitMap.get(Number(p.unit_of_measurement)) || "PCS"
                            });
                        });

                        details.forEach((d: SaleOrderDetail) => {
                            const pid = Number(d.product_id);
                            if (productMap.has(pid)) {
                                d.product_id = productMap.get(pid) as Product; // Transform ID to Object
                            }

                            // Map discount type ID to name
                            if (d.discount_type && dtMap.has(Number(d.discount_type))) {
                                d.discount_type = dtMap.get(Number(d.discount_type));
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
            // ------------------------------------------------------------------
            // KEY CONCEPT: The sales_order table only has `customer_code` (an ID),
            // NOT the customer's name. To enable name-based search, we must first
            // query the `customer` table for matching names, collect their codes,
            // and add those codes to the filter. This is a "manual join" pattern
            // commonly needed in APIs that don't support cross-table search.
            // ------------------------------------------------------------------
            const orConditions: Record<string, object>[] = [
                { "order_no": { "_icontains": search } },
                { "customer_code": { "_icontains": search } },
                { "po_no": { "_icontains": search } }
            ];

            // Look up customer codes by customer_name or store_name
            try {
                const customerSearchFilter = JSON.stringify({
                    "_or": [
                        { "customer_name": { "_icontains": search } },
                        { "store_name": { "_icontains": search } }
                    ]
                });
                const customerSearchUrl = `${BASE_URL}/customer?filter=${encodeURIComponent(customerSearchFilter)}&fields=customer_code&limit=-1`;
                const custRes = await fetch(customerSearchUrl, { headers });

                if (custRes.ok) {
                    const custJson = await custRes.json();
                    const matchingCodes: string[] = (custJson.data || [])
                        .map((c: { customer_code: string }) => c.customer_code)
                        .filter(Boolean);

                    if (matchingCodes.length > 0) {
                        // Add an _in filter for all matching customer codes
                        orConditions.push({
                            "customer_code": { "_in": matchingCodes }
                        });
                    }
                }
            } catch (err) {
                // If customer lookup fails, we still have the basic search
                console.error("[DEBUG] Customer name lookup failed:", err);
            }

            filters.push({ "_or": orConditions });
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
        if (supplierId && supplierId !== "none") {
            filters.push({ "supplier_id": { "_eq": supplierId } });
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
            safeFetch(`${BASE_URL}/suppliers?filter[supplier_type][_in]=TRADE,Trade&limit=-1&fields=id,supplier_shortcut,supplier_name`, "suppliers"),
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

/**
 * Directus Folder Utility (Inlined)
 */
async function getOrCreateFolderId(folderName: string): Promise<string | null> {
    const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

    if (!DIRECTUS_URL || !DIRECTUS_TOKEN) {
        console.error("[Directus Folders] Missing API URL or Static Token.");
        return null;
    }

    try {
        const searchUrl = `${DIRECTUS_URL}/folders?filter[name][_eq]=${encodeURIComponent(folderName)}&fields=id`;
        const searchRes = await fetch(searchUrl, {
            headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
            cache: "no-store",
        });

        if (!searchRes.ok) return null;

        const searchResult = await searchRes.json();
        if (searchResult.data && searchResult.data.length > 0) {
            return searchResult.data[0].id;
        }

        const createRes = await fetch(`${DIRECTUS_URL}/folders`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${DIRECTUS_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: folderName }),
        });

        if (!createRes.ok) return null;

        const createdResult = await createRes.json();
        return createdResult.data?.id || null;
    } catch (error) {
        console.error(`[Directus Folders] Error for '${folderName}':`, error);
        return null;
    }
}

