/* eslint-disable */
const token = 'YOUR_STATIC_TOKEN';
require('dotenv').config({ path: 'C:/Users/Admin/Documents/vos-web-v2-systems/customer-relationship-management/.env.local' });

async function test() {
    const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const ordersUrl = `${DIRECTUS_URL}/items/sales_order?limit=1&fields=*`;
    const invoicesUrl = `${DIRECTUS_URL}/items/sales_invoice?limit=1&fields=*`;

    const [ordersRes, invoicesRes] = await Promise.all([
        fetch(ordersUrl, { headers }),
        fetch(invoicesUrl, { headers })
    ]);

    const ordersJson = await ordersRes.json();
    const invoicesJson = await invoicesRes.json();

    console.log('Order Fields:', Object.keys(ordersJson.data[0]));
    console.log('Invoice Fields:', Object.keys(invoicesJson.data[0]));
}
test();
