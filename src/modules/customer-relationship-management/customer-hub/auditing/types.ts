// src/modules/customer-relationship-management/customer-hub/auditing/types.ts

export interface AuditingFilters {
  startDate?: string;
  endDate?: string;
  customerCode?: string;
  orderStatus?: string;
  orderNo?: string;
}

export interface AuditingRow {
  orderId: number;
  orderNo: string;
  customerCode: string;
  orderStatus: string;
  orderDate: string;
  pdpList: string | string[] | null;
  cldtoList: string | string[] | null;
  dpList: string | string[] | null;
}

export type AuditingApiResponse = AuditingRow[] | null;
