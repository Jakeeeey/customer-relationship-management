// src/modules/customer-relationship-management/customer-hub/auditing/types.ts

export interface AuditingFilters {
  startDate?: string;
  endDate?: string;
  orderStatus?: string;
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
  cldtoList: string | string[] | null;
  dpList: string | string[] | null;
  dpCreatedDates?: string | string[] | null;
}

export type AuditingApiResponse = AuditingRow[] | null;
