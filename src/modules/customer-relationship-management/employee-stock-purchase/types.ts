import * as z from "zod";

export const employeeStockPurchaseSchema = z.object({
    purchase_id: z.number().optional(),
    company_id: z.preprocess(
        (val) => (val ? Number(val) : undefined),
        z.number({ message: "Company is required" })
    ),
    company_name: z.string().optional(),
    user_id: z.preprocess(
        (val) => (val ? Number(val) : undefined),
        z.number({ message: "Employee is required" })
    ),
    employee_name: z.string().optional(),
    invoice_id: z.preprocess(
        (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
        z.number().optional()
    ),
    invoice_date: z.string().optional(),
    manual_invoice_no: z.string().optional().or(z.literal("")),
    customer_code: z.string().optional(),
    dr_payment_id: z.number().optional(),
    amount: z.preprocess(
        (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
        z.number({ message: "Amount is required" }).min(0.01, "Amount must be greater than zero")
    ),
    status: z.string().default("PENDING"),
    remarks: z.string().optional().or(z.literal("")),
}).refine(data => data.invoice_id || data.manual_invoice_no, {
    message: "Either an invoice must be selected or a manual invoice number provided.",
    path: ["invoice_id"]
});

export type EmployeeStockPurchaseFormValues = z.infer<typeof employeeStockPurchaseSchema>;

export interface EmployeeStockPurchase {
    purchase_id: number;
    company_id: number;
    company_name?: string;
    user_id: number;
    employee_name?: string;
    invoice_id?: number;
    invoice_date?: string;
    manual_invoice_no?: string;
    customer_code?: string;
    dr_payment_id?: number;
    amount: number;
    status: string;
    remarks?: string;
    created_at?: string;
    updated_at?: string;
}

export interface EmployeeStockPurchaseAPIResponse {
    purchases: EmployeeStockPurchase[];
    metadata: {
        total_count: number;
        page: number;
        pageSize: number;
        lastUpdated: string;
    };
}
