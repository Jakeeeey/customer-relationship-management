/* eslint-disable */
const token = 'YOUR_STATIC_TOKEN';
require('dotenv').config({ path: 'C:/Users/Admin/Documents/vos-web-v2-systems/customer-relationship-management/.env.local' });

async function test() {
    const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // Find invoices with Not Delivered or Not Fulfilled
    const invoicesUrl = `${DIRECTUS_URL}/items/sales_invoice?filter[transaction_status][_in]=Not Delivered,Not Fulfilled&fields=invoice_id,order_id,transaction_status&limit=10`;
    const invoicesRes = await fetch(invoicesUrl, { headers });
    const invoicesJson = await invoicesRes.json();
    
    if (invoicesJson.data && invoicesJson.data.length > 0) {
        const orderIds = invoicesJson.data.map(i => i.order_id);
        console.log(`Found ${invoicesJson.data.length} invoices with Not Delivered/Not Fulfilled. Orders:`, orderIds);
        
        const ordersUrl = `${DIRECTUS_URL}/items/sales_order?filter[order_no][_in]=${orderIds.join(',')}&fields=order_no,order_status,not_fulfilled_at`;
        const ordersRes = await fetch(ordersUrl, { headers });
        const ordersJson = await ordersRes.json();
        console.log('Their actual order statuses:', ordersJson.data);
    } else {
        console.log('No invoices found.');
    }
}
test();
