// src/modules/business-intelligence-analytics/sales-report/types.ts

export type SalesmanAccount = {
  salesman_id: number;
  salesman_code: string;
  salesman_name: string;
};

export type EmployeeGroup = {
  employee_id: number;        // ✅ key for Salesman dropdown
  employee_name: string;      // ✅ display label
  accounts: SalesmanAccount[]; // ✅ Accounts are salesman_code under this employee_id
};

export type SalesReportLookups = {
  employees: EmployeeGroup[];
};

export type SalesReportKpis = {
  total_allocated: number;
  total_invoiced: number;
  unserved_balance: number;
};

export type SalesReportRow = {
  classification: string;
  customer_name: string;

  // Freq 1 (1-15)
  so_1_15: number;
  so_1_15_date: string;
  si_1_15: number;
  si_1_15_date: string;

  // Freq 2 (16-end)
  so_16_eom: number;
  so_16_eom_date: string;
  si_16_eom: number;
  si_16_eom_date: string;

  // Total SI (Freq1 + Freq2)
  total_si: number;
};

export type SalesInvoiceRow = {
  customer: string;
  po_date: string;
  si_date: string;
  net_amount: number;
};

export type SalesReportFilters = {
  employee_id: number | null; // ✅
  salesman_codes: string[];
  months: number[];
  year: number;
};


export type SalesReportResponse = {
  kpis: SalesReportKpis;
  rows: SalesReportRow[];
  invoices: SalesInvoiceRow[];
};
