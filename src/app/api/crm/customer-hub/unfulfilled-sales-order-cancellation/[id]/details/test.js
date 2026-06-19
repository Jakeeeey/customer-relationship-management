const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8056";
const token = process.env.DIRECTUS_STATIC_TOKEN || "";

const orderId = process.argv[2] || "51594"; // fallback id

async function run() {
  const targetUrl = `${baseUrl}/items/sales_order_details?filter[order_id][_eq]=${orderId}&fields=*&limit=1`;
  console.log("Fetching", targetUrl);
  try {
    const res = await fetch(targetUrl, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
