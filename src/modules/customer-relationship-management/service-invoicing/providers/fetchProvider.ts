"use client";

import {
    Salesman,
    Customer,
    Supplier,
    Branch,
    PriceTypeModel,
    ReceiptType,
    SalesType,
    PaymentTerm,
    ServiceInvoiceHeaderRecord,
} from "../types";

const API_BASE = "/api/crm/service-invoicing";

export const serviceInvoicingProvider = {
    API_BASE,

    getSalesmen: async (): Promise<Salesman[]> => {
        const res = await fetch(`${API_BASE}?action=salesmen`);
        return res.json();
    },

    getAccounts: async (userId: string | number): Promise<Salesman[]> => {
        const res = await fetch(`${API_BASE}?action=accounts&user_id=${userId}`);
        return res.json();
    },

    getCustomers: async (salesmanId: number): Promise<Customer[]> => {
        const res = await fetch(`${API_BASE}?action=customers&salesman_id=${salesmanId}`);
        return res.json();
    },

    getAllCustomers: async (search?: string, offset?: number): Promise<Customer[]> => {
        let url = `${API_BASE}?action=all_customers`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (offset) url += `&offset=${offset}`;
        const res = await fetch(url);
        return res.json();
    },

    getSalesmanByCustomer: async (customerId: number): Promise<Salesman[]> => {
        const res = await fetch(`${API_BASE}?action=salesman_by_customer&customer_id=${customerId}`);
        return res.json();
    },

    getSuppliers: async (): Promise<Supplier[]> => {
        const res = await fetch(`${API_BASE}?action=suppliers`);
        return res.json();
    },

    getBranches: async (): Promise<Branch[]> => {
        const res = await fetch(`${API_BASE}?action=branches`);
        return res.json();
    },

    getPriceTypes: async (): Promise<PriceTypeModel[]> => {
        const res = await fetch(`${API_BASE}?action=price_types`);
        return res.json();
    },

    getInvoiceTypes: async (): Promise<ReceiptType[]> => {
        const res = await fetch(`${API_BASE}?action=invoice_types`);
        return res.json();
    },

    getOperations: async (): Promise<SalesType[]> => {
        const res = await fetch(`${API_BASE}?action=operations`);
        return res.json();
    },

    getPaymentTerms: async (): Promise<PaymentTerm[]> => {
        const res = await fetch(`${API_BASE}?action=payment_terms`);
        return res.json();
    },

    checkInvoiceNoExists: async (invoiceNo: string): Promise<boolean> => {
        const res = await fetch(`${API_BASE}?action=check_invoice_no&invoice_no=${encodeURIComponent(invoiceNo)}`);
        const data = await res.json();
        return Boolean(data?.exists);
    },

    getServiceInvoices: async (search?: string): Promise<ServiceInvoiceHeaderRecord[]> => {
        let url = `${API_BASE}?action=service_invoices`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        const res = await fetch(url);
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    },
};

