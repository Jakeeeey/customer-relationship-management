"use client";

import React, { useState } from "react";
import { DataTable } from "@/components/ui/new-data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";

interface SnapshotListProps {
    snapshots: Record<string, unknown>[];
    loadingSnapshots: boolean;
    onAddSnapshot: () => void;
}

export function SnapshotList({ snapshots, loadingSnapshots, onAddSnapshot }: SnapshotListProps) {
    const [search, setSearch] = useState("");

    const columns: ColumnDef<Record<string, unknown>>[] = [
        {
            accessorKey: "order_no",
            header: "Order No",
            cell: ({ row }) => (
                <div className="font-bold text-slate-700">{row.getValue("order_no")}</div>
            ),
        },
        {
            accessorKey: "po_no",
            header: "PO No",
            cell: ({ row }) => (
                <div className="font-medium text-slate-600">{row.getValue("po_no") || "N/A"}</div>
            ),
        },
        {
            accessorKey: "salesman",
            header: "Salesman",
            cell: ({ row }) => {
                const salesman = row.getValue("salesman") as { salesman_name?: string } | undefined;
                return (
                    <div className="flex flex-col">
                        <span className="font-medium text-slate-700">{salesman?.salesman_name || "Unknown"}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: "customer",
            header: "Customer",
            cell: ({ row }) => {
                const customer = row.getValue("customer") as { customer_name?: string; customer_code?: string } | undefined;
                return (
                    <div className="flex flex-col">
                        <span className="font-medium text-slate-700">{customer?.customer_name || "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">{customer?.customer_code}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: "order_date",
            header: "Date",
            cell: ({ row }) => {
                const date = row.getValue("order_date") as string;
                return <div>{date ? new Date(date).toLocaleDateString() : "N/A"}</div>;
            },
        },
        {
            accessorKey: "order_status",
            header: "Status",
            cell: ({ row }) => (
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    {row.getValue("order_status")}
                </div>
            ),
        },
        {
            id: "actions",
            header: "Attachment",
            cell: ({ row }) => {
                const attachments = row.original.attachments as { file_id: string }[] | undefined;
                if (!attachments || attachments.length === 0) return <span className="text-muted-foreground text-xs">No file</span>;
                
                return (
                    <div className="flex flex-wrap gap-2">
                        {attachments.map((att, idx) => (
                            <Button 
                                key={idx}
                                variant="outline" 
                                size="sm" 
                                className="gap-2 h-8 text-xs font-medium"
                                onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${att.file_id}`, '_blank')}
                            >
                                <FileText className="w-3.5 h-3.5 text-primary" />
                                File {idx + 1}
                            </Button>
                        ))}
                    </div>
                );
            },
        },
    ];

    const filteredSnapshots = snapshots.filter((s: Record<string, unknown>) => {
        if (!search) return true;
        const lowerSearch = search.toLowerCase();
        
        const salesman = s.salesman as { salesman_name?: string } | undefined;
        const customer = s.customer as { customer_name?: string } | undefined;
        
        return (
            (s.order_no as string)?.toLowerCase().includes(lowerSearch) ||
            (s.po_no as string)?.toLowerCase().includes(lowerSearch) ||
            salesman?.salesman_name?.toLowerCase().includes(lowerSearch) ||
            customer?.customer_name?.toLowerCase().includes(lowerSearch)
        );
    });

    return (
        <div className="w-full flex flex-col gap-6 animate-in slide-in-from-bottom duration-700 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">
                        Order Snapshots
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium">
                        View and manage uploaded snapshot orders.
                    </p>
                </div>
                
                <Button 
                    className="gap-2 h-11 px-6 shadow-md shadow-primary/20 font-bold"
                    onClick={onAddSnapshot}
                >
                    <Plus className="w-5 h-5" />
                    Add Snapshot
                </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6">
                <DataTable
                    columns={columns}
                    data={filteredSnapshots}
                    searchKey="order_no"
                    onSearch={(val) => setSearch(val)}
                    isLoading={loadingSnapshots}
                    emptyTitle="No snapshots found"
                    emptyDescription="Try adjusting your search or add a new snapshot."
                />
            </div>
        </div>
    );
}
