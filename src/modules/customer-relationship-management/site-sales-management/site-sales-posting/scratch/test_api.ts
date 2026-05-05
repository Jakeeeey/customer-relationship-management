
const API_BASE = "http://localhost:3000/api/crm/site-sales-management/site-sales-posting";

async function debugSuppliers() {
    try {
        console.log("Fetching debug info for suppliers...");
        const res = await fetch(`${API_BASE}?type=suppliers_debug`);
        const data = await res.json();
        console.log("Sample Suppliers Data:", JSON.stringify(data, null, 2));
        
        if (data.length > 0) {
            const first = data[0];
            console.log("\nField values for first supplier:");
            console.log(`supplier_type: "${first.supplier_type}"`);
            console.log(`isActive: ${first.isActive} (Type: ${typeof first.isActive})`);
        }
    } catch (e) {
        console.error("Debug failed:", e);
    }
}

debugSuppliers();
