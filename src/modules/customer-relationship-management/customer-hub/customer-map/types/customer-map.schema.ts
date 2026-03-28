import { z } from "zod";
// dummy for recompile 283746


/**
 * Schema for a single customer record from the Map API
 */
export const customerMapRecordSchema = z.object({
  id: z.number(),
  customerCode: z.string(),
  customerName: z.string(),
  type: z.string().optional(),
  storeName: z.string(),
  storeSignage: z.string().optional(),
  brgy: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  contactNumber: z.string().optional(),
  storeType: z.string().optional(),
  isActive: z.number(),
  classification: z.string().optional(),
  location: z.any().nullable().optional(), // "POINT(lng lat)" or {x, y} or similar <!-- id: 24 -->
  cluster: z.string().optional(),
  salesman: z.string().optional(),
});

/**
 * Filter schema for the Map API
 */
export const customerMapFilterSchema = z.object({
  cluster: z.string().optional(),
  storeType: z.string().optional(),
  classification: z.string().optional(),
  salesman: z.string().optional(),
});

export type CustomerMapRecord = z.infer<typeof customerMapRecordSchema>;
export type CustomerMapFilter = z.infer<typeof customerMapFilterSchema>;

/**
 * Standardized response for the Map module
 */
export const customerMapResponseSchema = z.object({
  data: z.array(customerMapRecordSchema),
  count: z.number().optional(),
});

export type CustomerMapResponse = z.infer<typeof customerMapResponseSchema>;
