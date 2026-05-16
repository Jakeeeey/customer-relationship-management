import { z } from 'zod';

export const ORFieldConfigSchema = z.object({
    x: z.number(),
    y: z.number(),
    fontSize: z.number(),
    fontFamily: z.string(),
    fontWeight: z.enum(['normal', 'bold', 'italic', 'bolditalic']),
    label: z.string().optional(),
    alignment: z.enum(['left', 'center', 'right']).optional(),
    hidden: z.boolean().optional(),
    maxWidth: z.number().optional(),
    scaleX: z.number().optional(),
    lineHeight: z.number().optional(),
    charSpacing: z.number().optional(),
    barcodeHeight: z.number().optional(),
    barcodeModuleWidth: z.number().optional(),
    hideBarcodeText: z.boolean().optional(),
});

export type ORFieldConfig = z.infer<typeof ORFieldConfigSchema>;

export const ORTemplateSchema = z.object({
    id: z.union([z.number(), z.string()]),
    template_name: z.string().optional(),
    name: z.string().optional(),
    width: z.number(),
    height: z.number(),
    backgroundImage: z.string().nullable().optional(),
    fields: z.record(z.string(), ORFieldConfigSchema),
    tableSettings: z.object({
        startY: z.number(),
        rowHeight: z.number(),
        fontSize: z.number(),
        product_name_width: z.number().optional(),
        columns: z.record(z.string(), z.object({
            x: z.number(),
            width: z.number().optional()
        }))
    }).optional()
});

export type ORTemplate = z.infer<typeof ORTemplateSchema>;

export interface ReceiptItem {
    product_id: number;
    product_name: string;
    order_no: string;
    ordered_qty: number;
    qty: number;
    unit_price: number;
    discount_type: number | null;
    discount_amount: number;
    net_amount: number;
    gross_amount: number;
    unit_shortcut: string;
    brand_name?: string;
    category_name?: string;
}

export interface DiscountType {
    id: number;
    discount_type: string;
    total_percent: number;
}

export interface ReceiptData {
    receipt_no: string;
    items: ReceiptItem[];
    customer_name: string;
    store_name: string;
    customer_tin: string;
    address: string;
    payment_name: string;
    po_no: string;
    salesman_name: string;
    is_official: boolean;
    discountTypes: DiscountType[];
    barcodeDataUrl?: string;
    template?: ORTemplate;
    vat_amount?: number;
    gross_amount?: number;
    discount_amount?: number;
    net_amount?: number;
}
