/* eslint-disable */
const token = 'YOUR_STATIC_TOKEN'; // I need to get it from .env
require('dotenv').config({ path: 'C:/Users/Admin/Documents/vos-web-v2-systems/customer-relationship-management/.env.local' });

async function test() {
    const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // 1. Fetch sales orders
    const ordersUrl = `${DIRECTUS_URL}/items/sales_order?filter[order_status][_eq]=For Invoicing&filter[not_fulfilled_at][_nnull]=true&fields=order_no,not_fulfilled_at,order_status`;
    console.log('Orders URL:', ordersUrl);
    const ordersRes = await fetch(ordersUrl, { headers });
    const ordersJson = await ordersRes.json();
    console.log('Orders Count:', ordersJson?.data?.length || 0);

    if (ordersJson?.data?.length > 0) {
        console.log('Sample Order:', ordersJson.data[0]);
        const orderNos = ordersJson.data.map(o => o.order_no);
        const invoicesUrl = `${DIRECTUS_URL}/items/sales_invoice?filter[order_id][_in]=${orderNos.join(',')}&filter[transaction_status][_in]=Not Delivered,Not Fulfilled&fields=invoice_id,order_id,invoice_no,transaction_status,invoice_date,total_amount`;
        console.log('Invoices URL:', invoicesUrl);
        const invoicesRes = await fetch(invoicesUrl, { headers });
        const invoicesJson = await invoicesRes.json();
        console.log('Invoices Count:', invoicesJson?.data?.length || 0);
        if (invoicesJson?.data?.length > 0) {
            console.log('Sample Invoice:', invoicesJson.data[0]);
        }
    } else {
        console.log('No orders found matching criteria.');
        // Let's see what order_status values exist
        const allOrdersUrl = `${DIRECTUS_URL}/items/sales_order?limit=5&fields=order_no,order_status,not_fulfilled_at`;
        const allOrdersRes = await fetch(allOrdersUrl, { headers });
        const allOrdersJson = await allOrdersRes.json();
        console.log('Sample all orders:', allOrdersJson.data);
    }
}
test();
