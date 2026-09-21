/* eslint-disable */
const token = 'YOUR_STATIC_TOKEN';
require('dotenv').config({ path: 'C:/Users/Admin/Documents/vos-web-v2-systems/customer-relationship-management/.env.local' });

async function test() {
    const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const url = `${DIRECTUS_URL}/items/customer?limit=1&fields=*`;
    const res = await fetch(url, { headers });
    const json = await res.json();
    console.log('Customer Fields:', json.data ? Object.keys(json.data[0]) : json);
}
test();
