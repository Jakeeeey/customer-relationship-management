import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

type AnyRec = Record<string, unknown>;

function json(res: unknown, init?: ResponseInit) {
  return NextResponse.json(res, init);
}

function requireEnv() {
  if (!DIRECTUS_BASE) return "NEXT_PUBLIC_API_BASE_URL is not set";
  if (!DIRECTUS_TOKEN) return "DIRECTUS_STATIC_TOKEN is not set";
  return null;
}

function toISODateOnly(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function parseCsvInts(s: string | null): number[] {
  if (!s) return [];
  return s
    .split(",")
    .map((x) => Number(String(x).trim()))
    .filter((n) => Number.isFinite(n));
}

function parseCsvStrings(s: string | null): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((x) => String(x).trim())
    .filter((v) => !!v);
}

function parseCsvMonths(s: string | null): number[] {
  const xs = parseCsvInts(s);
  return xs.filter((m) => m >= 1 && m <= 12);
}

function monthStart(year: number, month: number) {
  const mm = String(month).padStart(2, "0");
  return `${year}-${mm}-01`;
}
function monthEnd(year: number, month: number) {
  const d = new Date(year, month, 0);
  const mm = String(month).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function dayOfMonth(iso: string | null): number | null {
  if (!iso) return null;
  const m = iso.match(/^\d{4}-\d{2}-(\d{2})$/);
  if (!m) return null;
  const d = Number(m[1]);
  return Number.isFinite(d) ? d : null;
}

function inSelectedMonths(dateISO: string | null, year: number, months: number[]) {
  if (!dateISO) return false;
  const m = dateISO.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  return y === year && months.includes(mo);
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function isNotCancelled(so: AnyRec) {
  const v = so?.isCancelled;
  const os = String(so?.order_status ?? "").trim();
  const cancelled =
    v === true ||
    v === 1 ||
    v === "1" ||
    v === "true" ||
    v === "TRUE" ||
    v === "yes" ||
    v === "YES";
  return !cancelled && os !== "Cancelled";
}

function dateLabel(min: string | null, max: string | null) {
  if (!min && !max) return "—";
  if (min && max && min !== max) return `${min} → ${max}`;
  return min ?? max ?? "—";
}

function bumpDateMinMax(curMin: string | null, curMax: string | null, d: string) {
  const min = !curMin || d < curMin ? d : curMin;
  const max = !curMax || d > curMax ? d : curMax;
  return { min, max };
}

async function directusGET(path: string, params?: Record<string, string>) {
  const url = new URL(`${DIRECTUS_BASE}${path.startsWith("/") ? "" : "/"}${path}`);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

  if (!res.ok) return { ok: false, status: res.status, body, url: url.toString() } as const;
  return { ok: true, status: res.status, body, url: url.toString() } as const;
}

async function fetchAllItems(collection: string, fields: string, filterObj?: AnyRec) {
  // NOTE: Directus may impose server-side max; you can paginate later if needed.
  const r = await directusGET(`/items/${collection}`, {
    fields,
    limit: "-1",
    ...(filterObj ? { filter: JSON.stringify(filterObj) } : {}),
  });

  if (!r.ok) {
    return { ok: false as const, status: r.status, error: r.body, url: r.url, data: [] as AnyRec[] };
  }

  return { ok: true as const, status: r.status, data: (r.body?.data ?? []) as AnyRec[] };
}

export async function GET(req: NextRequest) {
  const envErr = requireEnv();
  if (envErr) return json({ success: false, message: envErr, data: null }, { status: 500 });

  const warnings: string[] = [];
  const sp = req.nextUrl.searchParams;
  const mode = (sp.get("mode") || "report").toLowerCase();

  // =========================================
  // LOOKUPS: group accounts by employee_id
  // =========================================
  // =========================================
  // LOOKUPS: group accounts by employee_id
  // - Display name comes from salesman.salesman_name
  // - NO /items/users call (Directus users is special)
  // =========================================
  if (mode === "lookups") {
    const sm = await fetchAllItems(
      "salesman",
      "id,employee_id,salesman_name,salesman_code",
      undefined,
    );

    if (!sm.ok) {
      return json(
        { success: false, message: "Failed to fetch salesman lookups", error: sm.error, data: null },
        { status: sm.status },
      );
    }

    // group by employee_id
    const groups = new Map<number, { employee_id: number; employee_name: string; accounts: AnyRec[] }>();

    for (const s of sm.data) {
      const empId = Number(s?.employee_id ?? 0);
      if (!Number.isFinite(empId) || empId <= 0) continue;

      const salesmanName = String(s?.salesman_name ?? "").trim() || `Employee #${empId}`;

      const acc = {
        salesman_id: Number(s?.id),
        employee_id: empId,
        salesman_code: String(s?.salesman_code ?? "").trim(),
        salesman_name: salesmanName,
      };

      if (!Number.isFinite(acc.salesman_id)) continue;

      const g = groups.get(empId) ?? {
        employee_id: empId,
        employee_name: salesmanName, // ✅ SHOW THIS IN DROPDOWN
        accounts: [],
      };

      // keep the first non-empty name as the employee display
      if (!g.employee_name || g.employee_name.startsWith("Employee #")) {
        g.employee_name = salesmanName;
      }

      g.accounts.push(acc);
      groups.set(empId, g);
    }

    const employees = Array.from(groups.values())
      .sort((a, b) => String(a.employee_name).localeCompare(String(b.employee_name)))
      .map((g) => ({
        employee_id: g.employee_id,
        employee_name: g.employee_name,
        accounts: g.accounts
          .slice()
          .sort((a, b) => String(a.salesman_code).localeCompare(String(b.salesman_code))),
      }));

    return json({ success: true, message: "OK", data: { employees } }, { status: 200 });
  }


  // =========================================
  // REPORT: replicate BOTH views in JS
  // =========================================
  const year = Number(sp.get("year") || "");
  const months = parseCsvMonths(sp.get("months"));
  const employeeId = Number(sp.get("employee_id") || "");
  const salesmanCodes = parseCsvStrings(sp.get("salesman_codes"));

  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return json({ success: false, message: "Invalid year", data: null }, { status: 400 });
  }
  if (!months.length) {
    return json({ success: false, message: "Please select at least 1 month", data: null }, { status: 400 });
  }
  if (!Number.isFinite(employeeId) || employeeId <= 0) {
    return json({ success: false, message: "Please select an employee", data: null }, { status: 400 });
  }
  if (!salesmanCodes.length) {
    return json({ success: false, message: "Please select at least 1 account", data: null }, { status: 400 });
  }

  const minM = Math.min(...months);
  const maxM = Math.max(...months);
  const rangeStart = monthStart(year, minM);
  const rangeEnd = monthEnd(year, maxM);

  // 1) get salesmen matching (employee_id + selected salesman_code)
  const smRes = await fetchAllItems(
    "salesman",
    "id,employee_id,salesman_code,salesman_name",
    {
      _and: [
        { employee_id: { _eq: employeeId } },
        { salesman_code: { _in: salesmanCodes } },
      ],
    },
  );

  if (!smRes.ok) {
    return json(
      { success: false, message: "Failed to fetch salesman accounts", error: smRes.error, data: null },
      { status: smRes.status },
    );
  }

  const salesmanRows = smRes.data;
  const salesmanIds = salesmanRows
    .map((s) => Number(s?.id))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!salesmanIds.length) {
    return json(
      { success: true, message: "OK", data: { warnings: ["No salesman accounts matched your selection."], kpis: { total_allocated: 0, total_invoiced: 0, unserved_balance: 0 }, rows: [], invoices: [] } },
      { status: 200 },
    );
  }

  // 2) customer + classification lookups
  const [custRes, clsRes] = await Promise.all([
    fetchAllItems("customer", "customer_code,customer_name,classification", undefined),
    fetchAllItems("customer_classification", "id,classification_name", undefined),
  ]);

  if (!custRes.ok) {
    return json({ success: false, message: "Failed to fetch customers", error: custRes.error, data: null }, { status: custRes.status });
  }
  if (!clsRes.ok) {
    return json({ success: false, message: "Failed to fetch classifications", error: clsRes.error, data: null }, { status: clsRes.status });
  }

  const clsNameById = new Map<number, string>();
  for (const c of clsRes.data) {
    const id = Number(c?.id);
    if (!Number.isFinite(id)) continue;
    clsNameById.set(id, String(c?.classification_name ?? "").trim() || "—");
  }

  const customerByCode = new Map<string, AnyRec>();
  for (const c of custRes.data) {
    const code = String(c?.customer_code ?? "").trim();
    if (!code) continue;
    customerByCode.set(code, c);
  }

  // 3) SALES ORDERS (same filter as your view)
  const soRes = await fetchAllItems(
    "sales_order",
    "order_no,salesman_id,customer_code,order_date,allocated_amount,isCancelled,order_status",
    {
      _and: [
        { salesman_id: { _in: salesmanIds } },
        { order_date: { _between: [rangeStart, rangeEnd] } },
        {
          _or: [
            { isCancelled: { _null: true } },
            { isCancelled: { _eq: false } },
            { isCancelled: { _eq: 0 } },
            { isCancelled: { _eq: "0" } },
          ],
        },
        { order_status: { _neq: "Cancelled" } },
      ],
    },
  );

  if (!soRes.ok) {
    return json({ success: false, message: "Failed to fetch sales orders", error: soRes.error, data: null }, { status: soRes.status });
  }

  const salesOrders = soRes.data.filter(isNotCancelled);
  const soByOrderNo = new Map<string, AnyRec>();
  for (const so of salesOrders) {
    const k = String(so?.order_no ?? "").trim();
    if (k) soByOrderNo.set(k, so);
  }

  // 4) SALES INVOICES (same date window; later filtered by salesman via coalesce logic)
  const siRes = await fetchAllItems(
    "sales_invoice",
    "invoice_id,salesman_id,customer_code,invoice_date,dispatch_date,created_date,net_amount,order_id",
    {
      _and: [
        {
          _or: [
            { invoice_date: { _between: [rangeStart, rangeEnd] } },
            { dispatch_date: { _between: [rangeStart, rangeEnd] } },
            { created_date: { _between: [rangeStart, rangeEnd] } },
          ],
        },
      ],
    },
  );

  if (!siRes.ok) {
    return json({ success: false, message: "Failed to fetch sales invoices", error: siRes.error, data: null }, { status: siRes.status });
  }

  const salesInvoices = siRes.data;

  // 5) RETURNS: same as your views
  //   sales_invoice_sales_return: invoice_no -> return_no
  //   sales_return: return_id -> total_amount
  const invoiceIds = salesInvoices
    .map((x) => x?.invoice_id)
    .map((x) => (x === null || x === undefined ? "" : String(x).trim()))
    .filter(Boolean);

  const returnedTotalByInvoice = new Map<string, number>();

  if (invoiceIds.length) {
    const linksAll: AnyRec[] = [];
    const invoiceChunks = chunk(invoiceIds, 200);

    for (const part of invoiceChunks) {
      const linkRes = await fetchAllItems(
        "sales_invoice_sales_return",
        "invoice_no,return_no",
        { invoice_no: { _in: part } },
      );

      if (!linkRes.ok) {
        warnings.push(`Failed invoice-return link chunk (status ${linkRes.status}). Returns may be incomplete.`);
        continue;
      }
      linksAll.push(...linkRes.data);
    }

    const invoiceToReturnIds = new Map<string, string[]>();
    for (const l of linksAll) {
      const inv = String(l?.invoice_no ?? "").trim();
      const rid = String(l?.return_no ?? "").trim();
      if (!inv || !rid) continue;
      const arr = invoiceToReturnIds.get(inv) ?? [];
      arr.push(rid);
      invoiceToReturnIds.set(inv, arr);
    }

    const returnIds = Array.from(new Set(Array.from(invoiceToReturnIds.values()).flat()));

    if (returnIds.length) {
      const returnAmountById = new Map<string, number>();
      const returnChunks = chunk(returnIds, 200);

      for (const part of returnChunks) {
        const srRes = await fetchAllItems(
          "sales_return",
          "return_id,total_amount",
          { return_id: { _in: part } },
        );

        if (!srRes.ok) {
          warnings.push(`Failed sales_return chunk (status ${srRes.status}). Returns may be incomplete.`);
          continue;
        }

        for (const r of srRes.data) {
          const id = String(r?.return_id ?? "").trim();
          if (!id) continue;
          returnAmountById.set(id, Number(r?.total_amount ?? 0) || 0);
        }
      }

      for (const [inv, rids] of invoiceToReturnIds.entries()) {
        let sum = 0;
        for (const rid of rids) sum += Number(returnAmountById.get(rid) ?? 0) || 0;
        returnedTotalByInvoice.set(inv, sum);
      }
    }
  }

  // =========================================
  // Replicate VIEW: sales_report_salesman
  // Aggregation per customer (across selected months)
  // =========================================
  type Agg = {
    customer_code: string;
    classification: string;
    customer_name: string;

    so_1_15: number;
    so_1_15_date_min: string | null;
    so_1_15_date_max: string | null;

    si_1_15: number;
    si_1_15_date_min: string | null;
    si_1_15_date_max: string | null;

    so_16_eom: number;
    so_16_eom_date_min: string | null;
    so_16_eom_date_max: string | null;

    si_16_eom: number;
    si_16_eom_date_min: string | null;
    si_16_eom_date_max: string | null;
  };

  const aggByCustomer = new Map<string, Agg>();

  function ensureAgg(customer_code: string): Agg {
    const code = String(customer_code ?? "").trim();
    const c = customerByCode.get(code);

    const classificationId = Number(c?.classification ?? 0);
    const classification = clsNameById.get(classificationId) ?? "—";
    const customer_name = String(c?.customer_name ?? "").trim() || code || "—";

    const existing = aggByCustomer.get(code);
    if (existing) return existing;

    const a: Agg = {
      customer_code: code,
      classification,
      customer_name,

      so_1_15: 0,
      so_1_15_date_min: null,
      so_1_15_date_max: null,

      si_1_15: 0,
      si_1_15_date_min: null,
      si_1_15_date_max: null,

      so_16_eom: 0,
      so_16_eom_date_min: null,
      so_16_eom_date_max: null,

      si_16_eom: 0,
      si_16_eom_date_min: null,
      si_16_eom_date_max: null,
    };

    aggByCustomer.set(code, a);
    return a;
  }

  // SO accumulation
  for (const so of salesOrders) {
    const soDate = toISODateOnly(so?.order_date);
    if (!inSelectedMonths(soDate, year, months)) continue;

    const code = String(so?.customer_code ?? "").trim();
    if (!code) continue;

    const dom = dayOfMonth(soDate);
    if (!dom) continue;

    const a = ensureAgg(code);
    const amt = Number(so?.allocated_amount ?? 0) || 0;

    if (dom >= 1 && dom <= 15) {
      a.so_1_15 += amt;
      if (soDate) {
        const mm = bumpDateMinMax(a.so_1_15_date_min, a.so_1_15_date_max, soDate);
        a.so_1_15_date_min = mm.min;
        a.so_1_15_date_max = mm.max;
      }
    } else {
      a.so_16_eom += amt;
      if (soDate) {
        const mm = bumpDateMinMax(a.so_16_eom_date_min, a.so_16_eom_date_max, soDate);
        a.so_16_eom_date_min = mm.min;
        a.so_16_eom_date_max = mm.max;
      }
    }
  }

  // SI accumulation using “effective date” same idea as view (invoice_date/dispatch_date/created_date/so.order_date)
  function invoiceEffectiveDate(si: AnyRec, so: AnyRec | null): string | null {
    return (
      toISODateOnly(si?.invoice_date) ||
      toISODateOnly(si?.dispatch_date) ||
      toISODateOnly(si?.created_date) ||
      toISODateOnly(so?.order_date) ||
      null
    );
  }

  for (const si of salesInvoices) {
    const orderId = String(si?.order_id ?? "").trim();
    const so = (orderId ? soByOrderNo.get(orderId) : null) ?? null;

    const effSalesmanId = Number(si?.salesman_id ?? so?.salesman_id ?? 0);
    if (!salesmanIds.includes(effSalesmanId)) continue;

    const effDate = invoiceEffectiveDate(si, so);
    if (!inSelectedMonths(effDate, year, months)) continue;

    const code = String(si?.customer_code ?? so?.customer_code ?? "").trim();
    if (!code) continue;

    const invId = String(si?.invoice_id ?? "").trim();
    const ret = Number(returnedTotalByInvoice.get(invId) ?? 0) || 0;
    const net = (Number(si?.net_amount ?? 0) || 0) - ret;

    const dom = dayOfMonth(effDate);
    if (!dom) continue;

    const a = ensureAgg(code);

    if (dom >= 1 && dom <= 15) {
      a.si_1_15 += net;
      if (effDate) {
        const mm = bumpDateMinMax(a.si_1_15_date_min, a.si_1_15_date_max, effDate);
        a.si_1_15_date_min = mm.min;
        a.si_1_15_date_max = mm.max;
      }
    } else {
      a.si_16_eom += net;
      if (effDate) {
        const mm = bumpDateMinMax(a.si_16_eom_date_min, a.si_16_eom_date_max, effDate);
        a.si_16_eom_date_min = mm.min;
        a.si_16_eom_date_max = mm.max;
      }
    }
  }

  const rows = Array.from(aggByCustomer.values())
    .map((a) => {
      const totalSI = (a.si_1_15 || 0) + (a.si_16_eom || 0);
      return {
        classification: a.classification,
        customer_name: a.customer_name,

        so_1_15: a.so_1_15,
        so_1_15_date: dateLabel(a.so_1_15_date_min, a.so_1_15_date_max),
        si_1_15: a.si_1_15,
        si_1_15_date: dateLabel(a.si_1_15_date_min, a.si_1_15_date_max),

        so_16_eom: a.so_16_eom,
        so_16_eom_date: dateLabel(a.so_16_eom_date_min, a.so_16_eom_date_max),
        si_16_eom: a.si_16_eom,
        si_16_eom_date: dateLabel(a.si_16_eom_date_min, a.si_16_eom_date_max),

        total_si: totalSI,
      };
    })
    .sort(
      (x, y) =>
        (x.classification || "").localeCompare(y.classification || "") ||
        (x.customer_name || "").localeCompare(y.customer_name || ""),
    );

  const totalAllocated = rows.reduce((s, r) => s + (Number(r.so_1_15) || 0) + (Number(r.so_16_eom) || 0), 0);
  const totalInvoiced = rows.reduce((s, r) => s + (Number(r.si_1_15) || 0) + (Number(r.si_16_eom) || 0), 0);
  const unservedBalance = totalAllocated - totalInvoiced;

  // =========================================
  // Replicate VIEW: salesman_so_si_date (Invoices list)
  // =========================================
  const invoiceRows = salesInvoices
    .map((si) => {
      const orderId = String(si?.order_id ?? "").trim();
      const so = (orderId ? soByOrderNo.get(orderId) : null) ?? null;

      const effSalesmanId = Number(si?.salesman_id ?? so?.salesman_id ?? 0);
      if (!salesmanIds.includes(effSalesmanId)) return null;

      const siDate = toISODateOnly(si?.invoice_date);
      // table view uses invoice_date for SI list (matches your view)
      if (!inSelectedMonths(siDate, year, months)) return null;

      const custCode = String(si?.customer_code ?? so?.customer_code ?? "").trim();
      const cust = custCode ? customerByCode.get(custCode) : null;
      const customerName = String(cust?.customer_name ?? "").trim() || custCode || "—";

      const poDate = toISODateOnly(so?.order_date);
      const invId = String(si?.invoice_id ?? "").trim();
      const ret = Number(returnedTotalByInvoice.get(invId) ?? 0) || 0;
      const net = (Number(si?.net_amount ?? 0) || 0) - ret;

      return {
        customer: customerName,
        po_date: poDate ?? "—",
        si_date: siDate ?? "—",
        net_amount: net,
      };
    })
    .filter(Boolean) as Array<{ customer: string; po_date: string; si_date: string; net_amount: number }>;

  invoiceRows.sort(
    (a, b) =>
      (a.customer || "").localeCompare(b.customer || "") ||
      (a.po_date || "").localeCompare(b.po_date || "") ||
      (a.si_date || "").localeCompare(b.si_date || ""),
  );

  return json(
    {
      success: true,
      message: "OK",
      data: {
        warnings,
        kpis: {
          total_allocated: totalAllocated,
          total_invoiced: totalInvoiced,
          unserved_balance: unservedBalance,
        },
        rows,
        invoices: invoiceRows,
      },
    },
    { status: 200 },
  );
}
