"use client";

import React, { useState, useMemo } from "react";
import { NormalizeRequest, RequestStatus } from "../types";
import { Button } from "@/components/ui/button";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
    data: NormalizeRequest[];
    isLoading: boolean;
    onApprove: (id: number) => void;
    onReject: (id: number) => void;
    isProcessing: boolean;
}

const STATUS_TABS: { label: string; value: string }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "Pending" },
    { label: "Approved", value: "Approved" },
    { label: "Rejected", value: "Rejected" }
];

const statusBadge: Record<RequestStatus, string> = {
    Pending: "bg-yellow-100 text-yellow-800",
    Approved: "bg-green-100 text-green-800",
    Rejected: "bg-red-100 text-red-800"
};

export function ApprovalTable({ data, isLoading, onApprove, onReject, isProcessing }: Props) {
    const [activeTab, setActiveTab] = useState("Pending");
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    const filteredData = useMemo(() => {
        return data.filter(r => {
            const matchesTab = activeTab === "all" || r.status === activeTab;
            const matchesSearch = !searchTerm ||
                r.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesTab && matchesSearch;
        });
    }, [data, activeTab, searchTerm]);

    const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
    const currentPage = Math.min(page, totalPages);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredData.slice(start, start + pageSize);
    }, [filteredData, currentPage, pageSize]);

    const startEntry = filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endEntry = Math.min(currentPage * pageSize, filteredData.length);

    return (
        <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b px-4">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => { setActiveTab(tab.value); setPage(1); }}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === tab.value
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        {tab.label}
                        {tab.value !== "all" && (
                            <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">
                                {data.filter(r => r.status === tab.value).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b">
                <input
                    type="text"
                    placeholder="Search by Invoice No..."
                    className="p-2 border border-gray-300 rounded-md w-full sm:max-w-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 border-b">
                        <tr>
                            <th className="px-4 py-3">Invoice No</th>
                            <th className="px-4 py-3">Order ID</th>
                            <th className="px-4 py-3">Requested By</th>
                            <th className="px-4 py-3">Requested Date</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Remarks</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                    Loading...
                                </td>
                            </tr>
                        ) : paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                    No requests found.
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map(r => (
                                <tr key={r.id} className="border-b hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-medium">{r.invoice_no}</td>
                                    <td className="px-4 py-3 text-gray-600">{r.order_id}</td>
                                    <td className="px-4 py-3 text-gray-800">{r.requested_by_name ?? `User #${r.requested_by}`}</td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {new Date(r.requested_date).toLocaleString("en-US", {
                                            month: "short", day: "numeric", year: "numeric",
                                            hour: "numeric", minute: "2-digit", hour12: true
                                        })}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge[r.status]}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                                        {r.remarks || <span className="text-gray-300 italic">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {r.status === "Pending" && (
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-green-700 border-green-300 hover:bg-green-50"
                                                    onClick={() => onApprove(r.id)}
                                                    disabled={isProcessing}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-700 border-red-300 hover:bg-red-50"
                                                    onClick={() => onReject(r.id)}
                                                    disabled={isProcessing}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col gap-3 border-t bg-background/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                    Showing {startEntry}–{endEntry} of {filteredData.length}
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
                                variant="outline" size="icon" className="h-8 w-8 rounded-lg"
                                onClick={() => setPage(Math.max(1, currentPage - 1))}
                                disabled={isLoading || currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline" size="icon" className="h-8 w-8 rounded-lg"
                                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                                disabled={isLoading || currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
