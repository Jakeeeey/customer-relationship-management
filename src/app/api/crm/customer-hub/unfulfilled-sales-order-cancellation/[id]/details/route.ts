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

interface DirectusInvoiceDetail {
  detail_id: number;
  product_id: number;
  unit: number;
  quantity: number;
  unit_price: number;
  gross_amount: number;
  discount_amount: number;
  total_amount: number;
  invoice_no?: {
    invoice_no?: string;
    isReplaced?: boolean | number | string | { data: number[] };
    transaction_status?: string;
  } | string;
}

interface DirectusProduct {
  product_id: number;
  product_name: string;
  product_code?: string;
}

interface DirectusUnit {
  unit_id: number;
  unit_name?: string;
  unit_shortcut?: string;
}

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;

  if (!id) {
    return NextResponse.json({ ok: false, message: "Missing id parameter" }, { status: 400 });
  }

  const baseUrl = getDirectusBaseUrl();
  const token = getDirectusToken();

  // Fetch sales_invoice_details for this order_id
  const targetUrl = `${baseUrl}/items/sales_invoice_details?filter[order_id][_eq]=${encodeURIComponent(id)}&limit=-1&fields=*,invoice_no.invoice_no,invoice_no.isReplaced,invoice_no.transaction_status`;

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
      console.error("🔥 Directus Error (GET Sales Invoice Details):", errText);
      return NextResponse.json(
          { ok: false, message: "Failed to fetch invoice details", detail: errText },
          { status: directusRes.status }
      );
    }

    const { data: details } = await directusRes.json();

    if (!details || details.length === 0) {
      return NextResponse.json([]);
    }

    // Filter out details where the parent invoice isReplaced == 1 or true, or transaction_status is not 'Not Delivered'
    const validDetails = (details as DirectusInvoiceDetail[]).filter((d: DirectusInvoiceDetail) => {
      if (d.invoice_no && typeof d.invoice_no === 'object') {
        const rep = d.invoice_no.isReplaced;
        const isReplaced = rep === true || rep === 1 || rep === "1" || rep === "true" || 
          (rep && typeof rep === 'object' && Array.isArray(rep.data) && rep.data[0] === 1);
        if (isReplaced || d.invoice_no.transaction_status !== "Not Delivered") return false;
      } else {
        return false;
      }
      return true;
    });

    if (validDetails.length === 0) return NextResponse.json([]);

    // Extract product_ids and unit_ids to fetch manually
    const productIds = Array.from(new Set(validDetails.map((d: DirectusInvoiceDetail) => Number(d.product_id)).filter((id: number) => !isNaN(id) && id > 0)));
    const unitIds = Array.from(new Set(validDetails.map((d: DirectusInvoiceDetail) => Number(d.unit)).filter((id: number) => !isNaN(id) && id > 0)));

    const productsMap: Record<number, DirectusProduct> = {};
    const unitsMap: Record<number, string> = {};

    const fetchPromises: Promise<void>[] = [];

    if (productIds.length > 0) {
      const productsUrl = `${baseUrl}/items/products?filter[product_id][_in]=${productIds.join(',')}&fields=product_id,product_name,product_code`;
      fetchPromises.push(
        fetch(productsUrl, {
          method: "GET",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          cache: "no-store",
        }).then(async (res) => {
          if (res.ok) {
            const { data: prodData } = await res.json();
            (prodData as DirectusProduct[])?.forEach((p: DirectusProduct) => { productsMap[Number(p.product_id)] = p; });
          }
        })
      );
    }

    if (unitIds.length > 0) {
      const unitsUrl = `${baseUrl}/items/units?filter[unit_id][_in]=${unitIds.join(',')}&fields=unit_id,unit_name,unit_shortcut`;
      fetchPromises.push(
        fetch(unitsUrl, {
          method: "GET",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          cache: "no-store",
        }).then(async (res) => {
          if (res.ok) {
            const { data: unitData } = await res.json();
            (unitData as DirectusUnit[])?.forEach((u: DirectusUnit) => { unitsMap[Number(u.unit_id)] = String(u.unit_shortcut || u.unit_name || ''); });
          }
        })
      );
    }

    await Promise.all(fetchPromises);

    // Group by invoice_no string
    const grouped: Record<string, {
      detail_id: number;
      product_name: string;
      product_code: string;
      unit: string;
      ordered_quantity: number;
      unit_price: number;
      gross_amount: number;
      discount_amount: number;
      net_amount: number;
    }[]> = {};
    const statusMap: Record<string, string> = {};

    validDetails.forEach((d: DirectusInvoiceDetail) => {
      let invNoStr = "Unknown Invoice";
      let statusStr = "Unknown Status";
      if (d.invoice_no && typeof d.invoice_no === 'object' && d.invoice_no.invoice_no) {
        invNoStr = String(d.invoice_no.invoice_no);
        statusStr = String(d.invoice_no.transaction_status || "Unknown Status");
      } else if (typeof d.invoice_no === 'string') {
        invNoStr = d.invoice_no;
      }
      
      statusMap[invNoStr] = statusStr;
      const prod = productsMap[Number(d.product_id)] || { product_id: d.product_id, product_name: String(d.product_id) };
      const unitStr = unitsMap[Number(d.unit)] || String(d.unit || '');

      const mappedDetail = {
        detail_id: Number(d.detail_id),
        product_name: String(prod.product_name || d.product_id),
        product_code: String(prod.product_code || ''),
        unit: unitStr,
        ordered_quantity: Number(d.quantity || 0),
        unit_price: Number(d.unit_price || 0),
        gross_amount: Number(d.gross_amount || 0),
        discount_amount: Number(d.discount_amount || 0),
        net_amount: Number(d.total_amount || 0),
      };

      if (!grouped[invNoStr]) {
        grouped[invNoStr] = [];
      }
      grouped[invNoStr].push(mappedDetail);
    });

    const responseData = Object.keys(grouped).map(invNo => ({
      invoice_no: invNo,
      transaction_status: statusMap[invNo],
      details: grouped[invNo]
    }));

    return NextResponse.json(responseData);

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("🔥 Network Error (GET Details):", errorMessage);
    return NextResponse.json({ ok: false, message: "Network Error", detail: errorMessage }, { status: 502 });
  }
}
// force reload
