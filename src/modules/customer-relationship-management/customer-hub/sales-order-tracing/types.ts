// src/modules/customer-relationship-management/customer-hub/sales-order-tracing/types.ts

export interface AuditingFilters {
  search?: string;
  customerName?: string;
  startDate?: string;
  endDate?: string;
  orderStatus?: string;
  page?: number;
  size?: number;
}

export interface AuditingRow {
  orderId: number;
  orderNo: string;
  customerCode: string;
  customerName: string;
  orderStatus: string;
  orderDate: string;
  soCreatedDate?: string;
  invoiceList: string | string[] | null;
  invoiceCreatedDates?: string | string[] | null;
  pdpList: string | string[] | null;
  pdpCreatedDates?: string | string[] | null;
  cldtoList: string | string[] | null;
  cldtoCreatedDates?: string | string[] | null;
  dpList: string | string[] | null;
  dpCreatedDates?: string | string[] | null;
}

export interface AuditingPaginatedResponse {
  content: AuditingRow[];
  totalElements: number;
  totalPages: number;
  customerNames: string[];
}

export type AuditingApiResponse = AuditingPaginatedResponse | null;
