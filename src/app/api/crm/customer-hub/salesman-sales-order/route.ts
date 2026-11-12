import { NextRequest, NextResponse } from "next/server";
import { getSalesmanOrderData } from "./services/catalog";
import { getReceivableRows as receivableGet } from "./services/receivable";
import { accountOptions, directus, requireAccount, requireCustomer, resolveSalesmanContext, ScopeError, validateContext, type SalesmanContext } from "./context";
import { calculateChainNetPrice } from "@/modules/customer-relationship-management/customer-hub/salesman-sales-order/utils/priceCalc";
import { z } from "zod";

export const dynamic = "force-dynamic";
type Row = Record<string, unknown>;
const json = (data: unknown) => NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
function failure(error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof ScopeError ? error.message : "Sales order service unavailable" }, { status: error instanceof ScopeError ? error.status : 503, headers: { "Cache-Control": "private, no-store" } });
}
function request(req: NextRequest, params: Record<string, unknown>) {
    const url = new URL(req.url);
    url.search = "";
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    return new NextRequest(url, { headers: req.headers });
}
async function readOrderData(req: NextRequest, params: Record<string, unknown>) {
    const response = await getSalesmanOrderData(request(req, params));
    const data = await response.json();
    if (!response.ok || data?.error) throw new ScopeError("Required catalog or inventory service unavailable", 503);
    return data;
}
async function scopedOrder(context: SalesmanContext, id?: unknown, number?: unknown) {
    if (!id && !number) throw new ScopeError("Order identifier required", 400);
    const orders = await directus<Row>("sales_order", id ? { order_id: { _eq: id } } : { order_no: { _eq: number } }, "*", 2);
    if (orders.length !== 1) throw new ScopeError("Order not found or access denied", 404);
    const order = orders[0];
    const account = requireAccount(context, order.salesman_id);
    await requireCustomer(account, order.customer_code);
    if (!["Draft", "For Approval"].includes(String(order.order_status))) throw new ScopeError("This order is no longer editable in salesman order entry");
    return order;
}
async function customers(context: SalesmanContext, params: URLSearchParams) {
    const id = params.get("salesman_id");
    if (!id) return [];
    const account = requireAccount(context, id);
    const links = await directus<{ customer_id: number }>("customer_salesmen", { salesman_id: { _eq: account.id } }, "customer_id");
    if (!links.length) return [];
    const search = (params.get("search") || "").slice(0, 150);
    const offset = Number(params.get("offset") || 0);
    if (!Number.isSafeInteger(offset) || offset < 0) throw new ScopeError("Invalid offset", 400);
    return directus("customer", { id: { _in: links.map(l => l.customer_id) }, isActive: { _eq: 1 }, ...(search ? { _or: ["customer_name", "store_name", "customer_code"].map(field => ({ [field]: { _icontains: search } })) } : {}) },
        "id,customer_code,customer_name,store_name,city,province,credit_limit,payment_term,price_type,price_type_id", 30, offset);
}

export async function GET(req: NextRequest) {
    try {
        const context = await resolveSalesmanContext();
        const params = req.nextUrl.searchParams;
        const action = params.get("action");
        if (action === "context") return json(context);
        if (action === "salesmen") return json([context.user]);
        if (action === "accounts") return json(context.accounts);
        if (action === "customers") return json(await customers(context, params));
        if (action === "all_customers") {
            // Saved-order auto-fill may resolve an exact code, never a broad search.
            const code = params.get("search");
            if (!code) throw new ScopeError("Unscoped customer lookup is disabled");
            const rows = await directus<Row>("customer", { customer_code: { _eq: code }, isActive: { _eq: 1 } }, "id,customer_code,customer_name,store_name,city,province,credit_limit,payment_term,price_type,price_type_id", 1);
            if (!rows.length) return json([]);
            const links = await directus("customer_salesmen", { customer_id: { _eq: rows[0].id }, salesman_id: { _in: context.accounts.map(a => a.id) } }, "id", 1);
            if (!links.length) throw new ScopeError("Customer access denied");
            return json(rows);
        }
        if (action === "salesman_by_id") return json(requireAccount(context, params.get("id")));
        if (action === "account_context") return json(await accountOptions(requireAccount(context, params.get("salesman_id"))));
        if (["branches", "price_types", "suppliers"].includes(action || "")) {
            const all = await Promise.all(context.accounts.map(accountOptions));
            const key = action === "price_types" ? "priceTypes" : action as "branches" | "suppliers";
            const rows = all.flatMap<Row>(options => options[key] as Row[]);
            return json([...new Map(rows.map(row => [row.id || row.price_type_id, row])).values()]);
        }
        if (action === "get_order") {
            const order = await scopedOrder(context, params.get("order_id") || params.get("id"), params.get("order_no"));
            return json(await readOrderData(req, { action, order_id: order.order_id }));
        }
        if (action === "get_attachment") {
            const rows = await directus<Row>("sales_order_attachment", { id: { _eq: params.get("id") } }, "*", 1);
            if (!rows.length) throw new ScopeError("Attachment access denied");
            const attachment = rows[0];
            const account = requireAccount(context, attachment.salesman_id);
            await requireCustomer(account, attachment.customer_code);
            if (attachment.sales_order_id) await scopedOrder(context, attachment.sales_order_id);
            return json({ salesman_id: attachment.salesman_id, customer_code: attachment.customer_code, sales_order_id: attachment.sales_order_id, sales_order_no: attachment.sales_order_no });
        }
        if (action === "products" || action === "cart_inventory") {
            const input = Object.fromEntries(params);
            const account = requireAccount(context, input.salesman_id);
            const options = await accountOptions(account);
            if (String(account.branch_code) !== input.branch_id || !options.suppliers.some(s => String(s.id) === input.supplier_id)) throw new ScopeError("Inventory context access denied");
            const verified = action === "products" ? await validateContext(context, input) : null;
            // Never forward alternate customerId/priceTypeId aliases or date overrides.
            return json(await readOrderData(req, { action, salesman_id: account.id, branch_id: account.branch_code,
                supplier_id: input.supplier_id, customer_id: verified?.customer.id, customer_code: verified?.customer.customer_code,
                search: (input.search || "").slice(0, 150), price_type_id: account.price_type_id, price_type: account.price_type, force_refresh: "true" }));
        }
        if (action === "receivable") {
            await requireCustomer(requireAccount(context, params.get("salesman_id")), params.get("customer_code"));
            return json(await receivable(req, String(params.get("customer_code"))));
        }
        if (["invoice_types", "operations", "payment_terms"].includes(action || "")) return json(await readOrderData(req, { action }));
        if (action === "general_setting" && params.get("key") === "sales_order_auto_approval") return json(await readOrderData(req, { action, key: "sales_order_auto_approval" }));
        throw new ScopeError("Unsupported salesman order action", 400);
    } catch (error) { return failure(error); }
}

// Verified live Spring contract: one row per invoice, outstandingBalance is numeric.
async function receivable(req: NextRequest, code: string) {
    const response = await receivableGet(request(req, { customerCode: code }));
    if (!response.ok) throw new ScopeError("Credit verification unavailable", 503);
    const data = await response.json();
    const field = "outstandingBalance";
    if (!Array.isArray(data)) throw new ScopeError("Invalid accounts-receivable response", 503);
    let amount = 0;
    for (const row of data) {
        if (row[field] === null || row[field] === undefined || !Number.isFinite(Number(row[field]))) throw new ScopeError("Invalid receivable balance", 503);
        amount += Number(row[field]);
    }
    return { amount };
}

const itemSchema = z.object({
    id: z.string().min(1), detail_id: z.union([z.number(), z.string().regex(/^\d+$/)]).transform(Number).pipe(z.number().int().positive()).optional(),
    quantity: z.number().int().positive(), allocated_quantity: z.number().int().nonnegative(),
    product: z.object({ product_id: z.number().int().positive() }),
    uom: z.string().optional(), remarks: z.string().max(2000).optional(),
});
const submissionSchema = z.object({ header: z.object({
    salesman_id: z.number().int().positive(), customer_id: z.number().int().positive(), customer_code: z.string().min(1),
    branch_id: z.number().int().positive(), supplier_id: z.number().int().positive(), price_type_id: z.number().nullable().optional(),
    order_id: z.number().int().positive().optional(), order_no: z.string().min(1).max(100),
    order_status: z.enum(["Draft", "For Approval", "For Consolidation"]),
    receipt_type: z.number().int().positive(), sales_type: z.number().int().positive(),
    payment_terms: z.number().int().positive().nullable().optional(), po_no: z.string().trim().min(1).max(255),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    remarks: z.string().max(5000).optional(), attachment_id: z.union([z.string(), z.number()]).nullable().optional(),
}), items: z.array(itemSchema).min(1).max(500) });

export async function POST(req: NextRequest) {
    try {
        if (req.headers.get("origin") && req.headers.get("origin") !== req.nextUrl.origin) throw new ScopeError("Cross-origin order submission denied");
        const context = await resolveSalesmanContext();
        const parsed = submissionSchema.safeParse(await req.json());
        if (!parsed.success) throw new ScopeError("Invalid sales order payload", 400);
        const { header, items } = parsed.data;
        const { account, customer } = await validateContext(context, header);
        const existing = header.order_id ? await scopedOrder(context, header.order_id) : null;
        // Legacy persistence resolves order_no to an existing order. Check that path too.
        const matches = await directus<Row>("sales_order", { order_no: { _eq: header.order_no } }, "order_id", 2);
        if (matches.length && (!existing || Number(matches[0].order_id) !== header.order_id)) throw new ScopeError("Order number already exists; open the authorized order explicitly", 409);
        if (existing && String(existing.order_no) !== header.order_no) throw new ScopeError("Existing order number cannot be changed", 409);
        if (existing && (Number(existing.salesman_id) !== account.id || String(existing.customer_code) !== customer.customer_code || Number(existing.branch_id) !== header.branch_id || Number(existing.supplier_id) !== header.supplier_id)) throw new ScopeError("Existing order context cannot be reassigned");
        const saved = existing ? await directus<Row>("sales_order_details", { order_id: { _eq: header.order_id } }, "detail_id,product_id,unit_price,ordered_quantity,net_amount,discount_type") : [];
        const catalog = await readOrderData(req, { action: "products", ...header, price_type_id: account.price_type_id, price_type: account.price_type, force_refresh: true });
        if (!Array.isArray(catalog)) throw new ScopeError("Invalid product catalog", 503);
        const inventory = await readOrderData(req, { action: "cart_inventory", branch_id: header.branch_id, supplier_id: header.supplier_id, salesman_id: account.id });
        const quantities = new Map<number, number>();
        const detailIds = new Set<string>();
        const verifiedItems = items.map(item => {
            const product = catalog.find((p: Row) => Number(p.product_id) === item.product.product_id);
            if (!product) throw new ScopeError("Product is not eligible for this order");
            const original = item.detail_id ? saved.find(row => Number(row.detail_id) === Number(item.detail_id)) : null;
            if (item.detail_id && (!original || Number(original.product_id) !== item.product.product_id || detailIds.has(String(item.detail_id)))) throw new ScopeError("Order detail access denied");
            if (item.detail_id) detailIds.add(String(item.detail_id));
            const preserve = existing && existing.order_status !== "Draft" && original;
            const unitPrice = preserve ? Number(original.unit_price) : Number(product.base_price);
            const netUnit = preserve ? Number(original.net_amount) / Number(original.ordered_quantity) : calculateChainNetPrice(unitPrice, product.discounts || []);
            if (!Number.isFinite(unitPrice) || !Number.isFinite(netUnit) || unitPrice < 0 || netUnit < 0) throw new ScopeError("Invalid authoritative price", 503);
            if (item.allocated_quantity > item.quantity) throw new ScopeError("Allocation exceeds ordered quantity", 400);
            const total = (quantities.get(item.product.product_id) || 0) + item.allocated_quantity;
            quantities.set(item.product.product_id, total);
            if (total > Math.max(0, Number(inventory[item.product.product_id]?.available) || 0)) throw new ScopeError("Stock changed. Refresh inventory before submitting.", 409);
            return { ...item, unitPrice, netAmount: netUnit * item.quantity, discounts: product.discounts,
                product: { product_id: item.product.product_id, discount_type: preserve ? original.discount_type : product.discount_type } };
        });
        if (verifiedItems.every(item => item.allocated_quantity === 0) && header.order_status !== "Draft") throw new ScopeError("Zero-allocation orders must remain Draft", 400);
        if (header.order_status === "For Consolidation") {
            const settings = await directus<{ setting_value: string }>("general_setting", { setting_key: { _eq: "sales_order_auto_approval" } }, "setting_value", 1);
            const balance = await receivable(req, customer.customer_code);
            const exposure = verifiedItems.reduce((sum, item) => sum + item.netAmount / item.quantity * item.allocated_quantity, 0);
            if (String(settings[0]?.setting_value) !== "1" || !(Number(customer.credit_limit) > 0) || balance.amount + exposure > Number(customer.credit_limit)) throw new ScopeError("This order requires credit approval");
        }
        for (const [collection, field, id] of [["sales_invoice_type", "id", header.receipt_type], ["operation", "id", header.sales_type], ["payment_terms", "id", header.payment_terms]] as const) {
            if (id && !(await directus(collection, { [field]: { _eq: id } }, field, 1)).length) throw new ScopeError("Invalid order reference", 400);
        }
        // Attachment linkage remains disabled until the legacy writer's group-update semantics are scoped.
        if (header.attachment_id) throw new ScopeError("Attachment submission is not enabled for salesman order entry");
        // Same header/detail contract, but whitelist fields against the live schema
        // and check EVERY write. The legacy writer can report success after a failed detail insert.
        // Match the original workflow's Asia/Manila wall-clock timestamps.
        const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
        const dateParts = Object.fromEntries(parts.map(part => [part.type, part.value]));
        const now = `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}`;
        const gross = verifiedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        const net = verifiedItems.reduce((sum, item) => sum + item.netAmount, 0);
        const allocated = verifiedItems.reduce((sum, item) => sum + item.netAmount / item.quantity * item.allocated_quantity, 0);
        const headerData = {
            po_no: header.po_no, due_date: header.due_date, delivery_date: header.delivery_date,
            receipt_type: header.receipt_type, sales_type: header.sales_type, payment_terms: header.payment_terms || null,
            order_status: header.order_status, total_amount: gross, discount_amount: Math.max(0, gross - net),
            net_amount: net, allocated_amount: allocated, remarks: header.remarks || "",
            ...(header.order_status === "Draft" ? { draft_at: now } : header.order_status === "For Approval" ? { for_approval_at: now } : { for_consolidation_at: now }),
            ...(existing ? { modified_by: context.user.user_id, modified_date: now } : {
                order_no: header.order_no, order_date: now.slice(0, 10), customer_code: customer.customer_code,
                salesman_id: account.id, branch_id: account.branch_code, supplier_id: header.supplier_id,
                created_by: context.user.user_id, created_date: now,
            }),
        };
        const result = await write("sales_order" + (existing ? `/${header.order_id}` : ""), existing ? "PATCH" : "POST", headerData);
        const orderId = Number(existing ? header.order_id : result?.order_id);
        if (!orderId) throw new ScopeError("Order save returned no identifier; do not retry without checking saved orders", 503);
        try {
            for (const item of verifiedItems) {
                const detail = {
                    order_id: orderId, product_id: item.product.product_id, unit_price: item.unitPrice,
                    ordered_quantity: item.quantity, allocated_quantity: item.allocated_quantity,
                    discount_type: item.product.discount_type || null,
                    discount_amount: Math.max(0, item.unitPrice * item.quantity - item.netAmount),
                    gross_amount: item.unitPrice * item.quantity, net_amount: item.netAmount,
                    allocated_amount: item.netAmount / item.quantity * item.allocated_quantity, remarks: item.remarks || "",
                    ...(item.detail_id ? { modified_date: now } : { served_quantity: 0, created_date: now }),
                };
                await write(`sales_order_details${item.detail_id ? `/${item.detail_id}` : ""}`, item.detail_id ? "PATCH" : "POST", detail);
            }
            for (const row of saved) if (!detailIds.has(String(row.detail_id))) await write(`sales_order_details/${row.detail_id}`, "DELETE");
        } catch {
            throw new ScopeError(`Order ${header.order_no} was partially saved. Contact an administrator before retrying.`, 503);
        }
        return json({ success: true, order_no: header.order_no, order_id: orderId });
    } catch (error) { return failure(error); }
}

async function write(resource: string, method: string, data?: object): Promise<Row | undefined> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "")}/items/${resource}`, {
        method, headers: { Authorization: `Bearer ${process.env.DIRECTUS_STATIC_TOKEN}`, "Content-Type": "application/json" },
        ...(data ? { body: JSON.stringify(data) } : {}), cache: "no-store", signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new ScopeError("Database write failed; inspect the order before retrying", 503);
    if (response.status === 204) return;
    const text = await response.text();
    return text ? JSON.parse(text).data : undefined;
}
