export async function getSalesmen() {
    const res = await fetch(`/api/crm/customer-hub/callsheet-printable?type=salesmen`);
    if (!res.ok) throw new Error("Failed to fetch salesmen");
    const json = await res.json();
    return json.data || [];
}

export async function getAccounts(salesmanId: string | number) {
    const res = await fetch(`/api/crm/customer-hub/callsheet-printable?type=accounts&userId=${salesmanId}`);
    if (!res.ok) throw new Error("Failed to fetch accounts");
    const json = await res.json();
    return json.data || [];
}

export async function getCustomers(accountId: string | number) {
    const res = await fetch(`/api/crm/customer-hub/callsheet-printable?type=customers&salesmanId=${accountId}`);
    if (!res.ok) throw new Error("Failed to fetch customers");
    const json = await res.json();
    return json.data || [];
}

export async function getSuppliers() {
    const res = await fetch(`/api/crm/customer-hub/callsheet-printable?type=suppliers`);
    if (!res.ok) throw new Error("Failed to fetch suppliers");
    const json = await res.json();
    return json.data || [];
}

export async function getProducts(supplierId: string | number) {
    const res = await fetch(`/api/crm/customer-hub/callsheet-printable?type=products&supplierId=${supplierId}`);
    if (!res.ok) throw new Error("Failed to fetch products");
    const json = await res.json();
    return json.data || [];
}
export async function getMonthlyAverage(customerCode: string) {
    const res = await fetch(`/api/crm/customer-hub/callsheet-printable?type=mo-avg&customerCode=${customerCode}`);
    if (!res.ok) throw new Error("Failed to fetch MO AVG");
    const json = await res.json();
    return json.data || {};
}
