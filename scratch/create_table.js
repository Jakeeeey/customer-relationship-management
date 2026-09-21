/* eslint-disable */
require('dotenv').config({ path: 'C:/Users/Admin/Documents/vos-web-v2-systems/customer-relationship-management/.env.local' });

async function createTable() {
    const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    console.log("Checking if collection exists...");
    try {
        const res = await fetch(`${DIRECTUS_URL}/collections/normalize_recycled_invoice_requests`, { headers });
        if (res.ok) {
            console.log("Collection already exists.");
            return;
        }

        console.log("Creating collection...");
        const createRes = await fetch(`${DIRECTUS_URL}/collections`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                collection: 'normalize_recycled_invoice_requests',
                meta: {
                    collection: 'normalize_recycled_invoice_requests',
                    icon: 'assignment_return',
                    note: 'Requests to transform unfulfilled recycled invoices to normal'
                },
                schema: {
                    name: 'normalize_recycled_invoice_requests'
                },
                fields: [
                    {
                        field: 'id',
                        type: 'uuid',
                        meta: { hidden: true, readonly: true, interface: 'input' },
                        schema: { is_primary_key: true, has_auto_increment: false }
                    },
                    {
                        field: 'invoice_id',
                        type: 'integer',
                        meta: { interface: 'input' }
                    },
                    {
                        field: 'invoice_no',
                        type: 'string',
                        meta: { interface: 'input' }
                    },
                    {
                        field: 'order_id',
                        type: 'string',
                        meta: { interface: 'input' }
                    },
                    {
                        field: 'requested_by',
                        type: 'integer',
                        meta: { interface: 'input' }
                    },
                    {
                        field: 'requested_date',
                        type: 'timestamp',
                        meta: { interface: 'datetime' }
                    },
                    {
                        field: 'status',
                        type: 'string',
                        meta: {
                            interface: 'select-dropdown',
                            options: {
                                choices: [
                                    { text: 'Pending', value: 'Pending' },
                                    { text: 'Approved', value: 'Approved' },
                                    { text: 'Rejected', value: 'Rejected' }
                                ]
                            }
                        }
                    },
                    {
                        field: 'remarks',
                        type: 'text',
                        meta: { interface: 'textarea' }
                    }
                ]
            })
        });

        const data = await createRes.json();
        console.log("Create Response:", JSON.stringify(data, null, 2));

    } catch (e) {
        console.error("Error:", e);
    }
}

createTable();
