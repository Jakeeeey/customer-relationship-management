"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Search, X } from "lucide-react";
import { useCallSheet } from "./hooks/useCallSheet";
import { CallSheetTable } from "./components/CallSheetTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";

export default function CallSheetModule() {
    const {
        callsheets,
        isLoading,
        metadata,
        filterOptions,
        page,
        pageSize,
        search,
        customerCode,
        salesmanId,
        status,
        setPage,
        setSearch,
        setCustomerCode,
        setSalesmanId,
        setStatus,
        refetch,
    } = useCallSheet();

    const router = useRouter();
    const hasActiveFilters = search || customerCode || salesmanId || status;
    const handleResetFilters = () => {
        setSearch("");
        setCustomerCode("");
        setSalesmanId("");
        setStatus("pending");
        setPage(1);
    };

    const statusOptions = [
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between lg:gap-8">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-1 bg-primary rounded-full" />
                        <h1 className="text-3xl font-black tracking-tight text-foreground">Call Sheet</h1>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium pl-3">
                        Monitor and process incoming sales orders from the field.
                    </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:flex flex-col items-end mr-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sync Status</span>
                        <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Connected to Directus
                        </span>
                    </div>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="h-10 px-5 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 gap-2 font-bold"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        {isLoading ? "Syncing..." : "Refresh Hub"}
                    </Button>
                </div>
            </div>

            {/* Search & Filter Bar - Glassmorphism */}
            <div className="p-2 border rounded-3xl bg-card /50 backdrop-blur-xl shadow-2xl shadow-border/10 flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Search by order #, customer or salesman..."
                        className="pl-11 h-12 bg-background/50 border-none shadow-inner focus-visible:ring-1 focus-visible:ring-primary/20 transition-all font-semibold rounded-2xl"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3 lg:w-auto h-auto">
                    <div className="flex flex-wrap items-center gap-2.5 p-1 bg-muted/40 rounded-2xl border border-border/40 backdrop-blur-md">
                        <div className="min-w-[180px]">
                            <SearchableSelect
                                options={[
                                    { value: "", label: "All Customers" },
                                    ...(filterOptions?.customers.map(c => ({ value: c.customer_code, label: c.customer_name })) || [])
                                ]}
                                value={customerCode}
                                onValueChange={(val) => {
                                    setCustomerCode(val);
                                    setPage(1);
                                }}
                                placeholder="Select Customer"
                                className="h-10 bg-background/80 border-none shadow-sm font-bold text-[11px] uppercase"
                            />
                        </div>

                        <div className="w-px h-5 bg-border/50 mx-0.5 hidden sm:block" />

                        <div className="min-w-[170px]">
                            <SearchableSelect
                                options={[
                                    { value: "", label: "All Salesmen" },
                                    ...(filterOptions?.salesmen.map(s => ({ value: s.id.toString(), label: `${s.salesman_name} (${s.salesman_code})` })) || [])
                                ]}
                                value={salesmanId}
                                onValueChange={(val) => {
                                    setSalesmanId(val);
                                    setPage(1);
                                }}
                                placeholder="Select salesman"
                                className="h-10 bg-background/80 border-none shadow-sm font-bold text-[11px] uppercase"
                            />
                        </div>

                        <div className="w-px h-5 bg-border/50 mx-0.5 hidden sm:block" />

                        <div className="min-w-[140px]">
                            <SearchableSelect
                                options={statusOptions}
                                value={status || "pending"}
                                onValueChange={(val) => {
                                    setStatus(val);
                                    setPage(1);
                                }}
                                placeholder="Status"
                                className="h-10 bg-background/80 border-none shadow-sm font-bold text-[11px] uppercase"
                            />
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleResetFilters}
                            className="h-12 w-12 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all rounded-2xl bg-muted/20 border border-transparent hover:border-destructive/20"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Table */}
            <CallSheetTable
                data={callsheets}
                isLoading={isLoading}
                metadata={metadata}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onCreateSalesOrder={(row) => router.push(`/crm/customer-hub/create-sales-order?attachment_id=${row.id}`)}
            />
        </div>
    );
}
