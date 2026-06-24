import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const getDirectusBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url) {
    console.warn("⚠️ WARNING: NEXT_PUBLIC_API_BASE_URL is undefined in .env.local!");
  }
  return (url || "http://localhost:8056").replace(/\/$/, "");
};

const getDirectusToken = () => {
  const token = process.env.DIRECTUS_STATIC_TOKEN;
  if (!token) {
    console.warn("⚠️ WARNING: DIRECTUS_STATIC_TOKEN is undefined in .env.local!");
  }
  return token || "";
};

export async function GET() {
  const baseUrl = getDirectusBaseUrl();
  const token = getDirectusToken();

  // We will fetch sales_orders first, then manually fetch customers to prevent Directus SQL 500 relation errors
  const targetUrl = `${baseUrl}/items/sales_order?limit=-1&filter[order_status][_in]=For Consolidation,Not Fulfilled&filter[not_fulfilled_at][_nnull]=true&sort=-order_date`;

  try {
    const directusRes = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      cache: "no-store",
    });

    if (!directusRes.ok) {
      const errText = await directusRes.text();
      console.error("🔥 Directus Error (GET Sales Orders):", errText);
      return NextResponse.json(
          { ok: false, message: "Failed to fetch eligible orders from server", detail: errText },
          { status: directusRes.status }
      );
    }

    const { data: salesOrders } = await directusRes.json();

    if (!salesOrders || salesOrders.length === 0) {
      return NextResponse.json([]);
    }

    // Extract unique customer codes
    const customerCodes = Array.from(new Set(salesOrders.map((so: Record<string, unknown>) => String(so.customer_code)).filter(Boolean)));
    const supplierIds = Array.from(new Set(salesOrders.map((so: Record<string, unknown>) => Number(so.supplier_id)).filter((id: number) => !isNaN(id) && id !== 0)));
    const salesmanIds = Array.from(new Set(salesOrders.map((so: Record<string, unknown>) => Number(so.salesman_id)).filter((id: number) => !isNaN(id) && id !== 0)));
    const branchIds = Array.from(new Set(salesOrders.map((so: Record<string, unknown>) => Number(so.branch_id)).filter((id: number) => !isNaN(id) && id !== 0)));
    const orderNos = Array.from(new Set(salesOrders.map((so: Record<string, unknown>) => String(so.order_no)).filter(Boolean)));
    
    const customersMap: Record<string, string> = {};
    const suppliersMap: Record<number, string> = {};
    const salesmenMap: Record<number, { name: string, code: string }> = {};
    const branchesMap: Record<number, string> = {};
    const invoiceMap: Record<string, { invoice_no: string, net_amount: number }[]> = {};
    const dispatchPlanMap: Record<number, string> = {};
    const detailsByOrder: Record<number, { detail_id: number, dispatch_id: number }[]> = {};

    const fetchPromises: Promise<void>[] = [];

    if (customerCodes.length > 0) {
      const customersUrl = `${baseUrl}/items/customer?filter[customer_code][_in]=${customerCodes.join(',')}&fields=customer_code,customer_name`;
      fetchPromises.push(
        fetch(customersUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          cache: "no-store",
        }).then(async (res) => {
          if (res.ok) {
            const { data: customersData } = await res.json();
            customersData?.forEach((c: Record<string, unknown>) => {
              customersMap[String(c.customer_code)] = String(c.customer_name);
            });
          }
        })
      );
    }

    if (supplierIds.length > 0) {
      const suppliersUrl = `${baseUrl}/items/suppliers?filter[id][_in]=${supplierIds.join(',')}&fields=id,supplier_name,supplier_shortcut`;
      fetchPromises.push(
        fetch(suppliersUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          cache: "no-store",
        }).then(async (res) => {
          if (res.ok) {
            const { data: suppliersData } = await res.json();
            suppliersData?.forEach((s: Record<string, unknown>) => {
              suppliersMap[Number(s.id)] = String(s.supplier_name || s.supplier_shortcut || '');
            });
          }
        })
      );
    }

    if (salesmanIds.length > 0) {
      const salesmenUrl = `${baseUrl}/items/salesman?filter[id][_in]=${salesmanIds.join(',')}&fields=id,salesman_name,salesman_code`;
      fetchPromises.push(
        fetch(salesmenUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          cache: "no-store",
        }).then(async (res) => {
          if (res.ok) {
            const { data: salesmenData } = await res.json();
            salesmenData?.forEach((s: Record<string, unknown>) => {
              salesmenMap[Number(s.id)] = {
                name: String(s.salesman_name || ''),
                code: String(s.salesman_code || '')
              };
            });
          }
        })
      );
    }

    if (branchIds.length > 0) {
      const branchesUrl = `${baseUrl}/items/branches?filter[id][_in]=${branchIds.join(',')}&fields=id,branch_name`;
      fetchPromises.push(
        fetch(branchesUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          cache: "no-store",
        }).then(async (res) => {
          if (res.ok) {
            const { data: branchData } = await res.json();
            branchData?.forEach((b: Record<string, unknown>) => {
              branchesMap[Number(b.id)] = String(b.branch_name || '');
            });
          }
        })
      );
    }

    if (orderNos.length > 0) {
      const invoiceUrl = `${baseUrl}/items/sales_invoice?filter[order_id][_in]=${orderNos.map(o => encodeURIComponent(String(o))).join(',')}&fields=order_id,invoice_no,net_amount,isReplaced,transaction_status`;
      fetchPromises.push(
        fetch(invoiceUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          cache: "no-store",
        }).then(async (res) => {
          if (res.ok) {
            const { data: invoiceData } = await res.json();
            invoiceData?.forEach((inv: Record<string, unknown>) => {
              const rep = inv.isReplaced;
              const isReplaced = rep === true || rep === 1 || rep === "1" || rep === "true" || 
                (rep && typeof rep === 'object' && 'data' in rep && Array.isArray((rep as { data: unknown }).data) && (rep as { data: number[] }).data[0] === 1);
              
              if (isReplaced || inv.transaction_status !== "Not Delivered") return;
              
              if (inv.order_id && inv.invoice_no) {
                const orderId = String(inv.order_id);
                if (!invoiceMap[orderId]) {
                  invoiceMap[orderId] = [];
                }
                invoiceMap[orderId].push({
                  invoice_no: String(inv.invoice_no),
                  net_amount: Number(inv.net_amount) || 0
                });
              }
            });
          }
        })
      );
    }

    interface DirectusDispatchDetail {
      sales_order_id: number;
      detail_id: number;
      dispatch_id: number;
    }

    interface DirectusDispatchPlan {
      dispatch_id: number;
      created_at: string;
    }

    // Fetch dispatch plan details
    fetchPromises.push(
      fetch(`${baseUrl}/items/dispatch_plan_details?limit=-1&fields=detail_id,dispatch_id,sales_order_id`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store",
      }).then(async (res) => {
        if (res.ok) {
          const { data } = await res.json();
          (data as DirectusDispatchDetail[])?.forEach((dd: DirectusDispatchDetail) => {
            const soId = Number(dd.sales_order_id);
            if (!isNaN(soId)) {
              if (!detailsByOrder[soId]) {
                detailsByOrder[soId] = [];
              }
              detailsByOrder[soId].push({
                detail_id: Number(dd.detail_id),
                dispatch_id: Number(dd.dispatch_id),
              });
            }
          });
        }
      })
    );

    // Fetch dispatch plans
    fetchPromises.push(
      fetch(`${baseUrl}/items/dispatch_plan?limit=-1&fields=dispatch_id,created_at`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store",
      }).then(async (res) => {
        if (res.ok) {
          const { data } = await res.json();
          (data as DirectusDispatchPlan[])?.forEach((dp: DirectusDispatchPlan) => {
            if (dp.dispatch_id && dp.created_at) {
              dispatchPlanMap[Number(dp.dispatch_id)] = String(dp.created_at);
            }
          });
        }
      })
    );

    await Promise.all(fetchPromises);

    // Sort details for each order to ensure the last detail row is retrieved correctly
    Object.keys(detailsByOrder).forEach((key) => {
      detailsByOrder[Number(key)].sort((a, b) => a.detail_id - b.detail_id);
    });

    // Filter out sales orders based on dispatch plans dates comparison
    const filteredOrders = salesOrders.filter((so: Record<string, unknown>) => {
      const soId = Number(so.order_id);
      const linkedDetails = detailsByOrder[soId] || [];
      
      if (linkedDetails.length > 0) {
        const lastDetail = linkedDetails[linkedDetails.length - 1];
        const dispatchId = Number(lastDetail.dispatch_id);
        const dispatchCreatedAtStr = dispatchPlanMap[dispatchId];
        
        if (dispatchCreatedAtStr && so.not_fulfilled_at) {
          const dispatchTime = new Date(dispatchCreatedAtStr).getTime();
          const notFulfilledTime = new Date(so.not_fulfilled_at as string).getTime();
          
          if (!isNaN(dispatchTime) && !isNaN(notFulfilledTime)) {
            if (dispatchTime > notFulfilledTime) {
              // Exclude: dispatch plan created after not fulfilled date
              return false;
            }
            return true;
          }
        }
        // If either date is missing or invalid, we exclude (as requested by the user)
        return false;
      }
      // If no dispatch plan details associated at all, include it
      return true;
    });

    // Map customer data back to sales orders so it matches our frontend Zod Schema
    const enrichedOrders = filteredOrders.map((so: Record<string, unknown>) => {
      const orderInvoices = so.order_no ? invoiceMap[String(so.order_no)] : undefined;
      const validInvoiceNos = orderInvoices ? orderInvoices.map(i => i.invoice_no) : undefined;
      const invoiceAmount = orderInvoices ? orderInvoices.reduce((sum, i) => sum + i.net_amount, 0) : undefined;
      
      return {
        ...so,
        invoice_no: validInvoiceNos && validInvoiceNos.length > 0 ? validInvoiceNos : undefined,
        invoice_amount: invoiceAmount,
      customer_code: so.customer_code ? {
        customer_code: so.customer_code,
        customer_name: customersMap[String(so.customer_code)] || so.customer_code
      } : so.customer_code,
      supplier_id: so.supplier_id ? {
        id: Number(so.supplier_id),
        name: suppliersMap[Number(so.supplier_id)] || String(so.supplier_id)
      } : so.supplier_id,
      salesman_id: so.salesman_id && salesmenMap[Number(so.salesman_id)] ? {
        id: Number(so.salesman_id),
        name: salesmenMap[Number(so.salesman_id)].name,
        code: salesmenMap[Number(so.salesman_id)].code
      } : so.salesman_id,
      branch_id: so.branch_id ? {
        id: Number(so.branch_id),
        name: branchesMap[Number(so.branch_id)] || String(so.branch_id)
      } : so.branch_id,
    };
    });

    return NextResponse.json(enrichedOrders);

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("🔥 Network Error (GET):", errorMessage);
    return NextResponse.json({ ok: false, message: "Network Error", detail: errorMessage }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ ok: false, message: "Missing id parameter" }, { status: 400 });
  }

  const baseUrl = getDirectusBaseUrl();
  const token = getDirectusToken();

  const targetUrl = `${baseUrl}/items/sales_order/${id}`;

  try {
    const body = await req.json();
    const remarks = body.remarks;

    // Generate literal Philippine Time (UTC+8) formatted as YYYY-MM-DD HH:mm:ss for DATETIME column
    const now = new Date();
    const phTimeDate = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const phTimeStr = phTimeDate.toISOString().replace("T", " ").substring(0, 19);

    const directusRes = await fetch(targetUrl, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        order_status: "Cancelled",
        cancelled_at: phTimeStr,
        isCancelled: true,
        remarks: remarks
      }),
    });

    if (!directusRes.ok) {
      const errText = await directusRes.text();
      console.error("🔥 Directus Error (PATCH):", errText);
      return NextResponse.json(
          { ok: false, message: "Failed to update order status", detail: errText },
          { status: directusRes.status }
      );
    }

    const data = await directusRes.json();
    return NextResponse.json(data.data || {});
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("🔥 Network Error (PATCH):", errorMessage);
    return NextResponse.json({ ok: false, message: "Network Error", detail: errorMessage }, { status: 502 });
  }
}
