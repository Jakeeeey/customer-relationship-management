import { useState, useCallback } from "react";
import { NormalizeInvoice, InvoiceDetail } from "../types";

export function useNormalizeRecycledInvoice() {
    const [invoices, setInvoices] = useState<NormalizeInvoice[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [details, setDetails] = useState<InvoiceDetail[]>([]);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);

    const fetchInvoices = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/crm/invoice-management/normalize-recycled-invoice");
            if (!res.ok) throw new Error("Failed to fetch invoices");
            const json = await res.json();
            setInvoices(json.data || []);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Unknown error";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchInvoiceDetails = useCallback(async (invoiceId: number) => {
        setIsDetailsLoading(true);
        try {
            const res = await fetch(`/api/crm/invoice-management/normalize-recycled-invoice?invoiceId=${invoiceId}`);
            if (!res.ok) throw new Error("Failed to fetch invoice details");
            const json = await res.json();
            setDetails(json.data || []);
        } catch (err: unknown) {
            console.error(err);
        } finally {
            setIsDetailsLoading(false);
        }
    }, []);

    const requestNormalization = useCallback(async (invoiceId: number, invoiceNo: string, orderId: number, remarks: string) => {
        try {
            const res = await fetch("/api/crm/invoice-management/normalize-recycled-invoice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invoice_id: invoiceId, invoice_no: invoiceNo, order_id: orderId, remarks })
            });
            if (!res.ok) throw new Error("Failed to request normalization");
            
            // Optimistic update
            setInvoices(prev => prev.map(inv => inv.invoice_id === invoiceId ? { ...inv, is_pending_request: true } : inv));
            return true;
        } catch (err: unknown) {
            console.error(err);
            return false;
        }
    }, []);

    return {
        invoices,
        isLoading,
        error,
        fetchInvoices,
        details,
        isDetailsLoading,
        fetchInvoiceDetails,
        requestNormalization
    };
}
