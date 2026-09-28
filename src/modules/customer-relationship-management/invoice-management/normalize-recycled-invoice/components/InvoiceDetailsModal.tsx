import React, { useState } from "react";
import { toast } from "sonner";
import { InvoiceDetail, NormalizeInvoice } from "../types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    invoice: NormalizeInvoice | null;
    details: InvoiceDetail[];
    isLoading: boolean;
    onRequestNormalization: (invoiceId: number, invoiceNo: string, orderId: number, remarks: string) => Promise<boolean>;
}

export function InvoiceDetailsModal({ isOpen, onClose, invoice, details, isLoading, onRequestNormalization }: Props) {
    const [remarks, setRemarks] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !invoice) return null;

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const success = await onRequestNormalization(invoice.invoice_id, invoice.invoice_no, invoice.sales_order_id ?? 0, remarks);
        setIsSubmitting(false);
        if (success) {
            toast.success("Normalization request submitted successfully.");
            onClose();
            setRemarks("");
        } else {
            toast.error("Failed to submit normalization request.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-semibold">Invoice Details: {invoice.invoice_no || invoice.invoice_id}</h2>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
                        <div><span className="text-gray-500">Order ID:</span> {invoice.order_id}</div>
                        <div><span className="text-gray-500">Transaction Status:</span> {invoice.transaction_status}</div>
                        <div><span className="text-gray-500">Order Status:</span> {invoice.order_status}</div>
                        <div><span className="text-gray-500">Not Fulfilled At:</span> {new Date(invoice.not_fulfilled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                    </div>

                    <h3 className="text-lg font-medium mb-4">Items</h3>
                    {isLoading ? (
                        <div className="py-8 text-center text-gray-500">Loading details...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border">
                                <thead className="bg-gray-50 text-gray-700 border-b">
                                    <tr>
                                        <th className="px-4 py-2">Product Name</th>
                                        <th className="px-4 py-2 text-right">Quantity</th>
                                        <th className="px-4 py-2 text-right">Unit Price</th>
                                        <th className="px-4 py-2 text-right">Total Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {details.map(d => (
                                        <tr key={d.detail_id} className="border-b">
                                            <td className="px-4 py-2">
                                                {d.product_name ? `${d.product_name} (${d.product_id})` : d.product_id}
                                            </td>
                                            <td className="px-4 py-2 text-right">{d.quantity}</td>
                                            <td className="px-4 py-2 text-right">₱{d.unit_price?.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-right">₱{d.total_amount?.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    {details.length === 0 && (
                                        <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No items found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!invoice.is_pending_request && (
                        <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Remarks (Optional)</label>
                            <textarea
                                className="w-full border rounded-md p-2 text-sm"
                                rows={3}
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="State reason for normalization..."
                            />
                        </div>
                    )}
                </div>

                <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-100"
                    >
                        Cancel
                    </button>
                    {invoice.is_pending_request ? (
                        <button disabled className="px-4 py-2 bg-gray-400 text-white rounded-md text-sm font-medium">
                            Request Pending
                        </button>
                    ) : (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
                                    Transform To Normal
                                </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action will initiate the normalization process for this invoice.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
                                        {isSubmitting ? "Submitting..." : "Confirm"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </div>
        </div>
    );
}
