
const DIRECTUS_URL = "http://goatedcodoer:8056";
const DIRECTUS_TOKEN = "AAKv73dkIV8DfAIA5vEt3eXVdIebzmBW";

async function checkFields() {
    try {
        const res = await fetch(`${DIRECTUS_URL}/items/collection?limit=1`, {
            headers: {
                "Authorization": `Bearer ${DIRECTUS_TOKEN}`
            }
        });
        const json = await res.json();
        console.log("Collection Sample:", JSON.stringify(json.data?.[0], null, 2));
        
        const res2 = await fetch(`${DIRECTUS_URL}/items/collection_invoices?limit=1`, {
            headers: {
                "Authorization": `Bearer ${DIRECTUS_TOKEN}`
            }
        });
        const json2 = await res2.json();
        console.log("Collection Invoices Sample:", JSON.stringify(json2.data?.[0], null, 2));
    } catch (e) {
        console.error(e);
    }
}

checkFields();
