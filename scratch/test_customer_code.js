/* eslint-disable */
const token = 'YOUR_STATIC_TOKEN';
require('dotenv').config({ path: 'C:/Users/Admin/Documents/vos-web-v2-systems/customer-relationship-management/.env.local' });

async function test() {
    const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const url = `${DIRECTUS_URL}/items/sales_invoice?limit=5&fields=invoice_id,customer_code`;
    const res = await fetch(url, { headers });
    const json = await res.json();
    console.log('Invoices with customer_code:', json.data);
}
test();
