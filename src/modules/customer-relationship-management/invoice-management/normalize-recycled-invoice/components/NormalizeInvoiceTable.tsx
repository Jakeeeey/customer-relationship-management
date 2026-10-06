"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useNormalizeRecycledInvoice } from "../hooks/useNormalizeRecycledInvoice";
import { InvoiceDetailsModal } from "./InvoiceDetailsModal";
import { NormalizeInvoice } from "../types";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function NormalizeInvoiceTable() {
    const {
        invoices,
        isLoading,
        error,
        fetchInvoices,
        details,
        isDetailsLoading,
        fetchInvoiceDetails,
        requestNormalization
    } = useNormalizeRecycledInvoice();

    const [selectedInvoice, setSelectedInvoice] = useState<NormalizeInvoice | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const handleRowClick = (invoice: NormalizeInvoice) => {
        setSelectedInvoice(invoice);
        fetchInvoiceDetails(invoice.invoice_id);
    };

    const handleCloseModal = () => {
        setSelectedInvoice(null);
    };

    const customerOptions = useMemo(() => {
        const customers = new Set(invoices.map(inv => inv.customer_name).filter(Boolean));
        return Array.from(customers).sort().map(cust => ({
            value: cust as string,
            label: cust as string
        }));
    }, [invoices]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter((inv) => {
            const matchesSearch = !searchTerm || 
                (inv.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 inv.order_id?.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesCustomer = !selectedCustomer || selectedCustomer === "all" || inv.customer_name === selectedCustomer;
            return matchesSearch && matchesCustomer;
        });
    }, [invoices, searchTerm, selectedCustomer]);

    // Reset to first page when filters change
    const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
    const currentPage = Math.min(page, totalPages);

    const paginatedInvoices = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredInvoices.slice(start, start + pageSize);
    }, [filteredInvoices, currentPage, pageSize]);

    const startEntry = filteredInvoices.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endEntry = Math.min(currentPage * pageSize, filteredInvoices.length);

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                Error loading invoices: {error}
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <input
                    type="text"
                    placeholder="Search by Invoice No or Order ID..."
                    className="p-2 border border-gray-300 rounded-md w-full sm:max-w-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                />
                
                <div className="w-full sm:max-w-xs">
                    <SearchableSelect 
                        options={customerOptions}
                        value={selectedCustomer}
                        onValueChange={(v) => { setSelectedCustomer(v); setPage(1); }}
                        placeholder="All Customers"
                    />
                </div>
            </div>

            <div className="bg-white shadow-sm rounded-lg overflow-hidden border">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 border-b">
                            <tr>
                                <th className="px-4 py-3">Invoice No</th>
                                <th className="px-4 py-3">Order ID</th>
                                <th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3">Transaction Status</th>
                                <th className="px-4 py-3">Order Status</th>
                                <th className="px-4 py-3">Request Status</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        No invoices found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                paginatedInvoices.map((inv) => (
                                    <tr 
                                        key={inv.invoice_id} 
                                        className="border-b hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-4 py-3 font-medium">{inv.invoice_no || inv.invoice_id}</td>
                                        <td className="px-4 py-3 text-gray-600">{inv.order_id}</td>
                                        <td className="px-4 py-3 text-gray-800 font-medium">{inv.customer_name || '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                                {inv.transaction_status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{inv.order_status}</td>
                                        <td className="px-4 py-3">
                                            {inv.is_pending_request ? (
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                                    Pending
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs">Not Requested</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => handleRowClick(inv)}
                                            >
                                                View
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col gap-3 border-t bg-background/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                    Showing {startEntry}–{endEntry} of {filteredInvoices.length}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Rows</span>
                        <Select
                            value={String(pageSize)}
                            onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}
                            disabled={isLoading}
                        >
                            <SelectTrigger className="h-8 w-[86px] rounded-lg">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-start">
                        <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={() => setPage(Math.max(1, currentPage - 1))}
                                disabled={isLoading || currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                                disabled={isLoading || currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <InvoiceDetailsModal
                isOpen={!!selectedInvoice}
                onClose={handleCloseModal}
                invoice={selectedInvoice}
                details={details}
                isLoading={isDetailsLoading}
                onRequestNormalization={requestNormalization}
            />
        </div>
    );
}
