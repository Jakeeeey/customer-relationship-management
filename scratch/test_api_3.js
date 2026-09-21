/* eslint-disable */
const token = 'YOUR_STATIC_TOKEN';
require('dotenv').config({ path: 'C:/Users/Admin/Documents/vos-web-v2-systems/customer-relationship-management/.env.local' });

async function test() {
    const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const invoicesUrl = `${DIRECTUS_URL}/items/sales_invoice?aggregate[count]=transaction_status&groupBy[]=transaction_status`;
    const invoicesRes = await fetch(invoicesUrl, { headers });
    const invoicesJson = await invoicesRes.json();
    console.log('Transaction Statuses:', invoicesJson.data);
}
test();
