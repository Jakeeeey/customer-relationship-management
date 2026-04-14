import { NextRequest, NextResponse } from "next/server";

const COLLECTIONS = {
    PROSPECT: "customer_prospect",
    CUSTOMER: "customer",
    SALESMAN: "salesman",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
    const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const pageSize = parseInt(searchParams.get("pageSize") || "10");
        const searchQuery = searchParams.get("q") || "";
        const statusFilter = searchParams.get("status") || "Pending"; // Default to Pending
        const salesmanFilter = searchParams.get("salesman") || "all";

        const offset = (page - 1) * pageSize;

        const params = new URLSearchParams();
        params.append("limit", pageSize.toString());
        params.append("offset", offset.toString());
        params.append("meta", "*");
        params.append("fields", "*,salesman_id.salesman_name,salesman_id.salesman_code,user_updated.first_name,user_updated.last_name"); // Join salesman name, code & updated by

        if (searchQuery) {
            params.append("filter[_or][0][customer_name][_icontains]", searchQuery);
            params.append("filter[_or][1][customer_code][_icontains]", searchQuery);
            params.append("filter[_or][2][store_name][_icontains]", searchQuery);
            params.append("filter[_or][3][salesman_id][salesman_name][_icontains]", searchQuery);
        }

        if (statusFilter !== "all") {
            params.append("filter[prospect_status][_eq]", statusFilter);
        }

        if (salesmanFilter !== "all") {
            params.append("filter[salesman_id][_eq]", salesmanFilter);
        }

        const url = `${DIRECTUS_URL}/items/${COLLECTIONS.PROSPECT}?${params.toString()}`;
        const res = await fetch(url, {
            cache: "no-store",
            headers: DIRECTUS_TOKEN ? { Authorization: `Bearer ${DIRECTUS_TOKEN}` } : {}
        });

        if (!res.ok) throw new Error(`Directus error: ${res.statusText}`);
        const json = await res.json();

        // Flatten salesman name for easier use in frontend
        const prospects = (json.data || []).map((p: { 
            salesman_id?: { salesman_name?: string; salesman_code?: string }; 
            user_updated?: { first_name?: string; last_name?: string };
            [key: string]: unknown;
        }) => ({
            ...p,
            salesman_name: p.salesman_id?.salesman_name || "Unknown Salesman",
            salesman_code: p.salesman_id?.salesman_code || null,
            updated_by_name: p.user_updated ? `${p.user_updated.first_name || ''} ${p.user_updated.last_name || ''}`.trim() : null
        }));

        return NextResponse.json({
            prospects,
            metadata: {
                total_count: json.meta?.total_count || 0,
                filter_count: json.meta?.filter_count ?? json.meta?.total_count ?? 0,
                page,
                pageSize,
                lastUpdated: new Date().toISOString(),
            }
        });
    } catch (_e) { // eslint-disable-line @typescript-eslint/no-unused-vars
        return NextResponse.json({ error: "Failed to fetch prospects" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
    
    if (!DIRECTUS_TOKEN) {
        return NextResponse.json({ error: "Server Configuration Error", message: "Missing DIRECTUS_STATIC_TOKEN in environment variables" }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { id, action } = body; // action: 'Approve' | 'Reject'

        if (!id || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Fetch the prospect data
        const getUrl = `${DIRECTUS_URL}/items/${COLLECTIONS.PROSPECT}/${id}`;
        const getRes = await fetch(getUrl, {
            headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }
        });
        if (!getRes.ok) throw new Error("Prospect not found");
        const { data: prospect } = await getRes.json();

        if (action === "Approve") {
            // 2. Insert into Customer collection
            // Map fields from prospect to customer
            /* eslint-disable @typescript-eslint/no-unused-vars */
            const {
                id: _pId, // remove prospect id
                prospect_status: _pStatus,
                prospect_date: _pDate,
                salesman_id: _pSalesmanId,
                salesman_name: _pSalesmanName,
                user_id,
                classification: prospectClassification,
                ...customerData
            } = prospect;
            /* eslint-enable @typescript-eslint/no-unused-vars */

            // 2b. Validate classification ID (Ensure it exists in customer_classification)
            let finalClassification = prospectClassification;
            if (prospectClassification) {
                const checkRes = await fetch(`${DIRECTUS_URL}/items/customer_classification/${prospectClassification}`, {
                    method: "GET",
                    headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }
                });
                
                if (!checkRes.ok) {
                    console.log(`DEBUG: Classification ID ${prospectClassification} not found. Setting to null.`);
                    finalClassification = null;
                }
            }

            // 2c. Handle Customer Code Generation
            let finalCustomerCode = prospect.customer_code;
            if (!finalCustomerCode || finalCustomerCode === "AUTO-ASSIGN" || finalCustomerCode.trim() === "") {
                try {
                    // Fetch latest customers to determine next number
                    const latestRes = await fetch(`${DIRECTUS_URL}/items/${COLLECTIONS.CUSTOMER}?sort=-customer_code&limit=1`, {
                        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }
                    });
                    if (latestRes.ok) {
                        const { data: latestCustomers } = await latestRes.json();
                        let nextNum = 1;
                        if (latestCustomers && latestCustomers.length > 0) {
                            const lastCode = latestCustomers[0].customer_code;
                            const match = lastCode.match(/CUST-(\d+)/);
                            if (match) {
                                nextNum = parseInt(match[1]) + 1;
                            }
                        }
                        finalCustomerCode = `CUST-${nextNum.toString().padStart(5, '0')}`;
                    } else {
                        finalCustomerCode = `CUST-00001`;
                    }
                } catch (err) {
                    console.error("DEBUG: Failed to generate code, defaulting to timestamp", err);
                    finalCustomerCode = `CUST-${Date.now().toString().slice(-5)}`;
                }
            }

            // CRITICAL FIX: Ensure mandatory fields are not null for the customer collection
            // Defaulting store_type to 1 (Department Store) if missing, as it's a mandatory field
            const finalStoreType = prospect.store_type || 1;
            const finalPriceType = prospect.price_type || "Standard";
            const finalPaymentTerm = prospect.payment_term || 0;

            console.log("DEBUG: Creating customer with data:", JSON.stringify({ 
                ...customerData, 
                customer_code: finalCustomerCode,
                store_type: finalStoreType,
                price_type: finalPriceType,
                payment_term: finalPaymentTerm,
                classification: finalClassification,
            }, null, 2));

            const createRes = await fetch(`${DIRECTUS_URL}/items/${COLLECTIONS.CUSTOMER}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${DIRECTUS_TOKEN}`
                },
                body: JSON.stringify({
                    ...customerData,
                    customer_code: finalCustomerCode,
                    store_type: finalStoreType,
                    price_type: finalPriceType,
                    payment_term: finalPaymentTerm,
                    classification: finalClassification,
                    isActive: 1, // Approved customers are active by default
                    user_id: user_id || null // Ensure user_id is handled
                }),
            });

            if (!createRes.ok) {
                const errText = await createRes.text();
                console.error("DEBUG: Directus customer create failed:", createRes.status, errText);
                throw new Error(`Directus customer create failed: ${createRes.status} - ${errText}`);
            }

            // 3. Update status to Approved
            const updateRes = await fetch(`${DIRECTUS_URL}/items/${COLLECTIONS.PROSPECT}/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${DIRECTUS_TOKEN}`
                },
                body: JSON.stringify({ prospect_status: "Approved" }),
            });

            if (!updateRes.ok) {
              const errText = await updateRes.text();
              console.error("DEBUG: Prospect status update failed:", updateRes.status, errText);
            }

        } else if (action === "Reject") {
            // Update status to Rejected
            await fetch(`${DIRECTUS_URL}/items/${COLLECTIONS.PROSPECT}/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${DIRECTUS_TOKEN}`
                },
                body: JSON.stringify({ prospect_status: "Rejected" }),
            });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Prospect API POST error:", e);
        return NextResponse.json({ 
            error: "Action failed", 
            message: e instanceof Error ? e.message : "Unknown error" 
        }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
    
    if (!DIRECTUS_TOKEN) {
        return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        // Protect specific fields from being updated via this route
        delete updateData.payment_term;
        delete updateData.discount_type;
        delete updateData.prospect_status;

        const updateRes = await fetch(`${DIRECTUS_URL}/items/${COLLECTIONS.PROSPECT}/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${DIRECTUS_TOKEN}`
            },
            body: JSON.stringify(updateData),
        });

        if (!updateRes.ok) {
            const errText = await updateRes.text();
            throw new Error(`Directus update failed: ${updateRes.status} - ${errText}`);
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Prospect API PATCH error:", e);
        return NextResponse.json({ 
            error: "Update failed", 
            message: e instanceof Error ? e.message : "Unknown error" 
        }, { status: 500 });
    }
}

