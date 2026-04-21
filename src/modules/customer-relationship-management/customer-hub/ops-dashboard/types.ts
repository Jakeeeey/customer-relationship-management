export interface OPSOrder {
    salesOrderNo: string;
    poNo: string;
    poDate: string;
    status: OPSStatus;
    customerName: string;
    amount: number;
}

export type OPSStatus =
    | "For Approval"
    | "For Consolidation"
    | "For Picking"
    | "For Invoicing"
    | "For Loading"
    | "For Shipping"
    | "En Route"
    | "Delivered"
    | "On Hold"
    | "Cancelled"
    | "Not Fulfilled";

export const OPS_STATUSES: OPSStatus[] = [
    "For Approval",
    "For Consolidation",
    "For Picking",
    "For Invoicing",
    "For Loading",
    "For Shipping",
    "En Route",
    "Delivered",
    "On Hold",
    "Cancelled",
    "Not Fulfilled",
];

export const STATUS_COLORS: Record<OPSStatus, string> = {
    "For Approval": "blue",
    "For Consolidation": "cyan",
    "For Picking": "indigo",
    "For Invoicing": "purple",
    "For Loading": "violet",
    "For Shipping": "sky",
    "En Route": "emerald",
    "Delivered": "green",
    "On Hold": "amber",
    "Cancelled": "red",
    "Not Fulfilled": "slate",
};

export interface CustomerGroupedOrders {
    customerName: string;
    orders: OPSOrder[];
}

export interface StatusGroupedOrders {
    status: OPSStatus;
    customerGroups: CustomerGroupedOrders[];
}

export type BulkAction = { type: 'expand' | 'collapse'; id: number } | null;
