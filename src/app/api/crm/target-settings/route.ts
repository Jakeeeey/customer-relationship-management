import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const STATIC_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

const fetchHeaders = {
    Authorization: `Bearer ${STATIC_TOKEN}`,
    "Content-Type": "application/json",
};

interface DirectusResponse<T> {
    data?: T;
    errors?: { message: string }[];
}

interface SupDiv {
    id: number;
    supervisor_id: number;
}

interface Mapping {
    salesman_id: number;
    customer_id: number;
}
interface TargetSettingRecord {
    id: number;
    salesman_id: number;
    [key: string]: unknown;
}
interface TacticalSkuRecord {
    id: number;
    salesman_target_setting_id: number;
    product_id: { product_id: number; product_code: string; product_name: string } | number;
    target_quantity: number;
    target_value: number;
}

export const dynamic = "force-dynamic";

function decodeUserIdFromJwt(token: string): number | null {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        const payloadPart = parts[1];
        const pad = "=".repeat((4 - (payloadPart.length % 4)) % 4);
        const b64 = (payloadPart + pad).replace(/-/g, "+").replace(/_/g, "/");
        const jsonStr = Buffer.from(b64, "base64").toString("utf8");
        const payload = JSON.parse(jsonStr);
        const userId = Number(payload.sub || payload.id); // Try both sub and id
        return Number.isFinite(userId) ? userId : null;
    } catch {
        return null;
    }
}

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supervisorId = decodeUserIdFromJwt(token);
    if (!supervisorId) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || new Date().getMonth() + 1;
    const year = searchParams.get("year") || new Date().getFullYear();

    const dateFrom = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;

    try {
        // 1. Get supervisor_per_division entries for this supervisor
        // Note: supervisorId from JWT matches supervisor_id in this table
        const supDivRes = await fetch(`${DIRECTUS_URL}/items/supervisor_per_division?filter[supervisor_id][_eq]=${supervisorId}&limit=-1`, { headers: fetchHeaders });
        const supDivData = await supDivRes.json() as DirectusResponse<SupDiv[]>;
        const supDivs = supDivData.data || [];
        const supDivIds = supDivs.map((sd) => sd.id);

        if (supDivIds.length === 0) {
            return NextResponse.json({ salesmen: [], targets: [], message: "No supervisor divisions found" });
        }

        // 2. Get linked salesmen for these supervisor divisions
        const mappingRes = await fetch(`${DIRECTUS_URL}/items/salesman_per_supervisor?filter[supervisor_per_division_id][_in]=${supDivIds.join(',')}&limit=-1`, { headers: fetchHeaders });
        const mappingData = await mappingRes.json() as DirectusResponse<Mapping[]>;
        const mapping = mappingData.data || [];
        const linkedSalesmanIds = [...new Set(mapping.map((m: Mapping) => m.salesman_id))];

        if (linkedSalesmanIds.length === 0) {
            return NextResponse.json({ salesmen: [], targets: [], message: "No salesmen linked to supervisor" });
        }

        // 2. Fetch salesmen details
        const salesmenRes = await fetch(`${DIRECTUS_URL}/items/salesman?filter[id][_in]=${linkedSalesmanIds.join(',')}&limit=-1`, { headers: fetchHeaders });
        const smResData = await salesmenRes.json() as DirectusResponse<RawSalesman[]>;
        const salesmenRaw = smResData.data || [];

        // 2b. Fetch real emails from 'user' table via employee_id -> user_id link
        const usersRes = await fetch(`${DIRECTUS_URL}/items/user?fields=user_id,user_email&limit=-1`, { headers: fetchHeaders });
        const usersData = await usersRes.json() as DirectusResponse<{ user_id: number | string, user_email: string }[]>;
        const users = usersData.data || [];
        
        const userMap: Record<string, string> = {};

        users.forEach((u: { user_id: number | string, user_email: string }) => {
            if (u.user_id && u.user_email) {
                userMap[String(u.user_id)] = u.user_email;
            }
        });

        // Map real emails to salesmen
        interface RawSalesman {
            id: number;
            employee_id: number;
            email?: string;
            salesman_code: string;
            [key: string]: unknown;
        }

        const salesmen = salesmenRaw.map((s: RawSalesman) => {
            let email = s.email;
            
            // Link by employee_id -> user_id
            if (s.employee_id && userMap[String(s.employee_id)]) {
                email = userMap[String(s.employee_id)];
            } 
            
            // Last fallback to generated email if still missing
            if (!email) {
                email = `${s.salesman_code.toLowerCase()}@vos.com`;
            }

            return { ...s, email };
        });

        // 3. Fetch targets for these salesmen in this month
        const smIds = salesmen.map((s: { id: number }) => s.id).filter(Boolean);
        if (smIds.length === 0) {
            return NextResponse.json({ salesmen, targets: [] });
        }

        const targetsRes = await fetch(`${DIRECTUS_URL}/items/salesman_target_setting?filter[salesman_id][_in]=${smIds.join(',')}&filter[date_range_from][_eq]=${dateFrom}&limit=-1`, { headers: fetchHeaders });
        const targetsResData = await targetsRes.json() as DirectusResponse<TargetSettingRecord[]>;
        const targets = targetsResData.data || [];

        // 4. Fetch tactical SKUs for these targets
        const targetIds = targets.map((t: { id: number }) => t.id);
        let tacticalSkus: {
            id: number;
            salesman_target_setting_id: number;
            product_id: number;
            product_code?: string;
            product_name?: string;
            target_quantity: number;
            target_value: number;
        }[] = [];
        if (targetIds.length > 0) {
            const skusRes = await fetch(`${DIRECTUS_URL}/items/salesman_tactical_sku?filter[salesman_target_setting_id][_in]=${targetIds.join(',')}&limit=-1`, { headers: fetchHeaders });
            const sResData = await skusRes.json() as DirectusResponse<TacticalSkuRecord[]>;
            const rawSkus = sResData.data || [];
            
            // Map database fields to frontend names
            tacticalSkus = rawSkus.map((ts: TacticalSkuRecord) => ({
                id: ts.id,
                salesman_target_setting_id: ts.salesman_target_setting_id,
                product_id: typeof ts.product_id === 'object' ? ts.product_id?.product_id : ts.product_id,
                // These will be joined or filled from allProducts in the frontend
                product_code: typeof ts.product_id === 'object' ? ts.product_id?.product_code : undefined, 
                product_name: typeof ts.product_id === 'object' ? ts.product_id?.product_name : undefined,
                target_quantity: ts.target_quantity,
                target_value: ts.target_value
            }));
        }

        // 5. Fetch all products with core prices (A, B, C, D, E)
        // Filter by unit_of_measurement = 11 (Box) as requested by user
        const productsRes = await fetch(`${DIRECTUS_URL}/items/products?filter[isActive][_eq]=1&filter[unit_of_measurement][_eq]=11&fields=product_id,product_name,product_code,priceA,priceB,priceC,priceD,priceE&limit=-1`, { headers: fetchHeaders });
        const productsData = await productsRes.json() as DirectusResponse<object[]>;
        const allProducts = productsData.data || [];

        // 6. Fetch special pricing (product_per_price_type)
        const pricingRes = await fetch(`${DIRECTUS_URL}/items/product_per_price_type?limit=-1`, { headers: fetchHeaders });
        const pData = await pricingRes.json() as DirectusResponse<object[]>;
        const productPricing = pData.data || [];

        // 7. Fetch Customer-Salesman mappings for these salesmen
        const custSalesmenRes = await fetch(`${DIRECTUS_URL}/items/customer_salesmen?filter[salesman_id][_in]=${smIds.join(',')}&limit=-1`, { headers: fetchHeaders });
        const custMappingsData = await custSalesmenRes.json() as DirectusResponse<Mapping[]>;
        const customerMappings = custMappingsData.data || [];
        const uniqueCustomerIds = [...new Set(customerMappings.map((m: Mapping) => m.customer_id))];

        // 8. Fetch Customer master details
        // 8. Fetch Customer master details
        const allCustomers: object[] = [];
        if (uniqueCustomerIds.length > 0) {
            const chunkedIds = [];
            for (let i = 0; i < uniqueCustomerIds.length; i += 100) {
                chunkedIds.push(uniqueCustomerIds.slice(i, i + 100));
            }
            
            const customerPromises = chunkedIds.map(ids => 
                fetch(`${DIRECTUS_URL}/items/customer?filter[id][_in]=${ids.join(',')}&fields=id,customer_name,province,city,brgy&limit=-1`, { headers: fetchHeaders })
            );
            const customerResponses = await Promise.all(customerPromises);
            for (const r of customerResponses) {
                const resData = await r.json() as DirectusResponse<object[]>;
                const data = resData.data || [];
                allCustomers.push(...data);
            }
        }

        // 9. Fetch Trade Suppliers
        const suppliersRes = await fetch(`${DIRECTUS_URL}/items/suppliers?filter[supplier_type][_eq]=Trade&filter[isActive][_eq]=1&fields=id,supplier_name&limit=-1`, { headers: fetchHeaders });
        const suppData = await suppliersRes.json() as DirectusResponse<object[]>;
        const allSuppliers = suppData.data || [];

        // 10. Fetch existing Customer and Supplier allocations for these targets
        // 10. Fetch existing Customer and Supplier allocations for these targets
        let customerTargets: object[] = [];
        let supplierTargets: object[] = [];
        if (targetIds.length > 0) {
            const ctRes = await fetch(`${DIRECTUS_URL}/items/salesman_target_customer_sales?filter[target_setting_id][_in]=${targetIds.join(',')}&limit=-1`, { headers: fetchHeaders });
            const ctData = await ctRes.json() as DirectusResponse<object[]>;
            customerTargets = ctData.data || [];

            const stRes = await fetch(`${DIRECTUS_URL}/items/salesman_target_supplier_sales?filter[target_setting_id][_in]=${targetIds.join(',')}&limit=-1`, { headers: fetchHeaders });
            const stData = await stRes.json() as DirectusResponse<object[]>;
            supplierTargets = stData.data || [];
        }

        return NextResponse.json({
            salesmen,
            targets,
            tacticalSkus,
            customerTargets,
            supplierTargets,
            allCustomers,
            customerMappings,
            allSuppliers,
            allProducts,
            productPricing,
            supervisorId
        });

    } catch (error) {
        console.error("Target Settings API GET Error:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supervisorId = decodeUserIdFromJwt(token);

    try {
        const body: {
            target: Record<string, unknown>;
            tacticalSkus: { product_id: number; target_quantity: number; target_value: number }[];
            customerTargets: { customer_id: number; target_amount: number }[];
            supplierTargets: { supplier_id: number; target_amount: number }[];
        } = await req.json();
        const { target, tacticalSkus, customerTargets, supplierTargets } = body;

        // Restore field mapping for salesman_target_setting
        const directusTarget = { 
            ...target, 
            created_by: supervisorId || target.created_by,
            // Ensure all numeric fields have values to prevent validation failure
            volume: Number(target.volume) || 0,
            frequency: Number(target.frequency) || 0,
            new_accounts: Number(target.new_accounts) || 0,
            productive_outlets: Number(target.productive_outlets) || 0,
            line_sales: Number(target.line_sales) || 0,
            basket_count: Number(target.basket_count) || 0,
            reach: Number(target.reach) || 0
        };

        // Check existing targets for this salesman and month
        const checkRes = await fetch(`${DIRECTUS_URL}/items/salesman_target_setting?filter[salesman_id][_eq]=${target.salesman_id}&filter[date_range_from][_eq]=${target.date_range_from}&limit=1`, { headers: fetchHeaders });
        const existingTargets = (await checkRes.json()).data || [];

        let targetId;
        if (existingTargets.length > 0) {
            // Update
            targetId = existingTargets[0].id;
            await fetch(`${DIRECTUS_URL}/items/salesman_target_setting/${targetId}`, {
                method: "PATCH",
                headers: fetchHeaders,
                body: JSON.stringify(directusTarget),
            });
        } else {
            // Create
            const now = new Date().toISOString();
            const createRes = await fetch(`${DIRECTUS_URL}/items/salesman_target_setting`, {
                method: "POST",
                headers: fetchHeaders,
                body: JSON.stringify({
                    ...directusTarget,
                    created_at: now
                }),
            });
            const created = await createRes.json() as DirectusResponse<{ id: number }>;
            if (created.errors) {
                console.error("Directus Target Creation Error:", created.errors);
                throw new Error("Failed to create target in database");
            }
            targetId = created.data?.id;
        }

        // Handle Tactical SKUs
        // Clear old ones first to ensure consistency with the current state in UI
        if (existingTargets.length > 0) {
             const oldSkusRes = await fetch(`${DIRECTUS_URL}/items/salesman_tactical_sku?filter[salesman_target_setting_id][_eq]=${targetId}&limit=-1`, { headers: fetchHeaders });
             const oldSkusData = await oldSkusRes.json() as DirectusResponse<{ id: number }[]>;
             const oldSkus = oldSkusData.data || [];
             if (oldSkus.length > 0) {
                 const deletePromises = oldSkus.map((os: { id: number }) => 
                     fetch(`${DIRECTUS_URL}/items/salesman_tactical_sku/${os.id}`, { method: "DELETE", headers: fetchHeaders })
                 );
                 await Promise.all(deletePromises);
             }
        }

        // Create new ones
        if (tacticalSkus && tacticalSkus.length > 0) {
            const skusToCreate = tacticalSkus.map((sku: {
                product_id: number;
                target_quantity: number;
                target_value: number;
            }) => ({
                salesman_target_setting_id: targetId,
                product_id: sku.product_id,
                target_quantity: sku.target_quantity,
                target_value: sku.target_value,
                created_by: supervisorId
            }));

            await fetch(`${DIRECTUS_URL}/items/salesman_tactical_sku`, {
                method: "POST",
                headers: fetchHeaders,
                body: JSON.stringify(skusToCreate),
            });
        }

        // Handle Customer Targets
        if (existingTargets.length > 0) {
            const oldCustRes = await fetch(`${DIRECTUS_URL}/items/salesman_target_customer_sales?filter[target_setting_id][_eq]=${targetId}&limit=-1`, { headers: fetchHeaders });
            const oldCustData = await oldCustRes.json() as DirectusResponse<{ id: number }[]>;
            const oldCust = oldCustData.data || [];
            if (oldCust.length > 0) {
                await Promise.all(oldCust.map((oc: { id: number }) => 
                    fetch(`${DIRECTUS_URL}/items/salesman_target_customer_sales/${oc.id}`, { method: "DELETE", headers: fetchHeaders })
                ));
            }
        }
        if (customerTargets && customerTargets.length > 0) {
            const ctToCreate = customerTargets.map((ct: { customer_id: number, target_amount: number }) => ({
                target_setting_id: targetId,
                customer_id: ct.customer_id,
                target_amount: ct.target_amount
            }));
            await fetch(`${DIRECTUS_URL}/items/salesman_target_customer_sales`, { method: "POST", headers: fetchHeaders, body: JSON.stringify(ctToCreate) });
        }

        // Handle Supplier Targets
        if (existingTargets.length > 0) {
            const oldSuppRes = await fetch(`${DIRECTUS_URL}/items/salesman_target_supplier_sales?filter[target_setting_id][_in]=${targetId}&limit=-1`, { headers: fetchHeaders });
            const oldSuppData = await oldSuppRes.json() as DirectusResponse<{ id: number }[]>;
            const oldSupp = oldSuppData.data || [];
            if (oldSupp.length > 0) {
                await Promise.all(oldSupp.map((os: { id: number }) => 
                    fetch(`${DIRECTUS_URL}/items/salesman_target_supplier_sales/${os.id}`, { method: "DELETE", headers: fetchHeaders })
                ));
            }
        }
        if (supplierTargets && supplierTargets.length > 0) {
            const stToCreate = supplierTargets.map((st: { supplier_id: number, target_amount: number }) => ({
                target_setting_id: targetId,
                supplier_id: st.supplier_id,
                target_amount: st.target_amount
            }));
            await fetch(`${DIRECTUS_URL}/items/salesman_target_supplier_sales`, { method: "POST", headers: fetchHeaders, body: JSON.stringify(stToCreate) });
        }

        return NextResponse.json({ success: true, targetId });

    } catch (error) {
        console.error("Target Settings API POST Error:", error);
        return NextResponse.json({ error: "Failed to save target" }, { status: 500 });
    }
}
