import * as z from "zod";

export const customerRegistrationSchema = z.object({
    id: z.number().optional(),
    customer_code: z.string().optional().or(z.literal("")),
    customer_name: z.string().min(1, "Customer name is required"),
    image: z.string().optional().nullable(),
    store_name: z.string().min(1, "Store name is required"),
    store_signage: z.string().optional().or(z.literal("")),
    store_type: z.preprocess(
        (val) => (val === "" || val === null || val === undefined || val === 0 || val === "0" ? undefined : Number(val)),
        z.number({ error: "Store type is required" })
    ),
    classification: z.preprocess(
        (val) => (val === "" || val === null || val === undefined || val === 0 || val === "0" ? null : Number(val)),
        z.number().nullable().optional()
    ),
    contact_number: z.string().min(1, "Contact number is required").regex(/^[+0-9\s\-()]+$/, "Invalid characters. Only numbers, +, -, and () are allowed."),
    customer_email: z.string().trim().email("Please enter a valid email address").or(z.literal("")).optional(),
    brgy: z.string().min(1, "Barangay is required"),
    city: z.string().min(1, "City is required"),
    province: z.string().min(1, "Province is required"),
    location: z.string().optional().nullable(),
    type: z.enum(["Regular", "Employee"]).default("Regular"),
    tel_number: z.string().regex(/^[+0-9\s\-()]+$/, "Invalid characters. Only numbers, +, -, and () are allowed.").optional().or(z.literal("")).nullable(),
    customer_tin: z.string().optional().or(z.literal("")),
    isActive: z.coerce.number().default(1),
    isVAT: z.coerce.number().default(0),
    isEWT: z.coerce.number().default(0),
    price_type_id: z.preprocess(
        (val) => (val === "" || val === null || val === undefined || val === 0 || val === "0" ? null : Number(val)),
        z.number().nullable().optional()
    ),
    discount_type: z.preprocess(
        (val) => (val === "" || val === null || val === undefined || val === 0 || val === "0" ? null : Number(val)),
        z.number().nullable().optional()
    ),
    otherDetails: z.string().trim().optional().or(z.literal("")).nullable(),
    prospect_status: z.enum(["pending", "visited"]).nullable().optional(),
    encoder_id: z.number().optional(),
    date_entered: z.string().optional(),
});

export type CustomerRegistrationFormValues = z.infer<typeof customerRegistrationSchema>;

export interface CustomerRegistration extends CustomerRegistrationFormValues {
    id: number;
    salesman_name?: string;
    salesman_code?: string;
}

export interface CustomerRegistrationAPIResponse {
    customers: CustomerRegistration[];
    metadata: {
        total_count: number;
        page: number;
        pageSize: number;
        lastUpdated: string;
    };
}
