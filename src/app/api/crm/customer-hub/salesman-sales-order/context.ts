import "server-only";
import { cookies } from "next/headers";
import { COOKIE_NAME, decodeJwtPayload } from "@/lib/auth-utils";

export const MODULE_PATH = "/crm/customer-hub/salesman-sales-order";
export class ScopeError extends Error {
    constructor(message: string, public status = 403) { super(message); }
}
export interface Account {
    id: number;
    employee_id: number;
    encoder_id?: number;
    branch_code: number;
    supplier_code?: number;
    price_type_id?: number;
    price_type?: string;
    salesman_name: string;
    salesman_code: string;
}
export interface CustomerRecord {
    id: number;
    customer_code: string;
    credit_limit?: number;
    payment_term?: number;
}
export interface SalesmanContext {
    user: { user_id: number; user_fname: string; user_lname: string };
    accounts: Account[];
}

export async function directus<T>(collection: string, filter: object = {}, fields = "*", limit = -1, offset = 0): Promise<T[]> {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
    const token = process.env.DIRECTUS_STATIC_TOKEN;
    if (!base || !token) throw new ScopeError("Directus configuration unavailable", 503);
    const params = new URLSearchParams({ filter: JSON.stringify(filter), fields, limit: String(limit), offset: String(offset), ...(collection === "customer" ? { sort: "id" } : {}) });
    const response = await fetch(`${base}/items/${collection}?${params}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new ScopeError(`Required ${collection} data is unavailable`, 503);
    const json = await response.json();
    if (!Array.isArray(json.data)) throw new ScopeError("Invalid database response", 503);
    return json.data;
}

export async function resolveSalesmanContext(): Promise<SalesmanContext> {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    if (!token) throw new ScopeError("Please sign in", 401);
    const spring = process.env.SPRING_API_BASE_URL?.replace(/\/+$/, "");
    if (!spring) throw new ScopeError("Authentication service unavailable", 503);
    let verified: Response;
    try {
        verified = await fetch(`${spring}/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(5000) });
    } catch { throw new ScopeError("Authentication service unavailable", 503); }
    if (!verified.ok) throw new ScopeError("Session verification failed", verified.status >= 500 ? 503 : 401);
    // Only inspect claims AFTER this instance's Spring backend has accepted the token.
    const payload = decodeJwtPayload(token);
    if (payload?.role !== "ADMIN" && (!Array.isArray(payload?.subsystems) || !payload.subsystems.includes("crm"))) throw new ScopeError("CRM subsystem access is required");
    const email = payload?.email || payload?.Email;
    if (typeof email !== "string" || !email.trim()) throw new ScopeError("Session has no canonical user email");
    const users = await directus<SalesmanContext["user"]>("user", { user_email: { _eq: email } }, "user_id,user_fname,user_lname", 2);
    if (users.length !== 1) throw new ScopeError("Session cannot be mapped uniquely to a VOS user");
    const user = users[0];
    const modules = await directus<{ id: number }>("modules", { base_path: { _eq: MODULE_PATH }, status: { _eq: "active" } }, "id", 2);
    if (modules.length !== 1) throw new ScopeError("Salesman Sales Order must be registered and activated in module permissions");
    const grants = await directus<{ id: number }>("user_access_modules", { user_id: { _eq: user.user_id }, module_id: { _eq: modules[0].id } }, "id", 1);
    if (!grants.length && payload?.role !== "ADMIN") throw new ScopeError("Salesman Sales Order permission is required");
    const accounts = await directus<Account>("salesman", { employee_id: { _eq: user.user_id }, isActive: { _eq: true } },
        "id,employee_id,encoder_id,salesman_name,salesman_code,branch_code,supplier_code,price_type,price_type_id,truck_plate");
    if (!accounts.length) throw new ScopeError("No active owned salesman accounts. Encoder assignments do not grant salesman access.");
    return { user, accounts };
}

export function requireAccount(context: SalesmanContext, id: unknown) {
    const account = context.accounts.find(a => String(a.id) === String(id));
    if (!account) throw new ScopeError("Salesman account access denied");
    return account;
}

export async function requireCustomer(account: Account, code: unknown, id?: unknown) {
    if (!code) throw new ScopeError("Customer is required", 400);
    const customers = await directus<CustomerRecord>("customer", { customer_code: { _eq: code }, isActive: { _eq: 1 } }, "id,customer_code,credit_limit,payment_term", 2);
    if (customers.length !== 1 || (id && String(customers[0].id) !== String(id))) throw new ScopeError("Customer access denied");
    const links = await directus<{ id: number }>("customer_salesmen", { salesman_id: { _eq: account.id }, customer_id: { _eq: customers[0].id } }, "id", 1);
    if (!links.length) throw new ScopeError("Customer is not assigned to this account");
    return customers[0];
}

export async function accountOptions(account: Account) {
    if (!account.branch_code) throw new ScopeError("This account has no assigned branch");
    const [branches, suppliers, priceTypes] = await Promise.all([
        directus<{ id: number }>("branches", { id: { _eq: account.branch_code }, isActive: { _eq: 1 } }),
        // Retain original Trade eligibility. A populated account supplier narrows it further.
        directus<{ id: number }>("suppliers", { supplier_type: { _eq: "Trade" }, isActive: { _eq: 1 }, ...(account.supplier_code ? { id: { _eq: account.supplier_code } } : {}) }),
        account.price_type_id ? directus<{ price_type_id: number; price_type_name: string }>("price_types", { price_type_id: { _eq: account.price_type_id } }) : Promise.resolve([]),
    ]);
    if (branches.length !== 1) throw new ScopeError("Assigned branch is unavailable");
    return { branches, suppliers, priceTypes };
}

export async function validateContext(context: SalesmanContext, input: Record<string, unknown>) {
    const account = requireAccount(context, input.salesman_id);
    const customer = await requireCustomer(account, input.customer_code, input.customer_id);
    const options = await accountOptions(account);
    if (String(input.branch_id) !== String(account.branch_code)) throw new ScopeError("Branch access denied");
    if (!options.suppliers.some(s => String(s.id) === String(input.supplier_id))) throw new ScopeError("Supplier access denied");
    if (input.price_type_id && Number(input.price_type_id) !== Number(account.price_type_id)) throw new ScopeError("Price type access denied");
    return { account, customer, options };
}
