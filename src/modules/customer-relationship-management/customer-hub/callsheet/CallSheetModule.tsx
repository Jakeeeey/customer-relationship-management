"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, AlertCircle, Search, X } from "lucide-react";
import { useCallSheet } from "./hooks/useCallSheet";
import { CallSheetTable } from "./components/CallSheetTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { SalesOrderAttachment } from "./types";

export default function CallSheetModule() {
    const {
        callsheets,
        isLoading,
        isError,
        error,
        metadata,
        filterOptions,
        page,
        pageSize,
        search,
        customerCode,
        salesmanId,
        setPage,
        setSearch,
        setCustomerCode,
        setSalesmanId,
        refetch,
    } = useCallSheet();

    const router = useRouter();
    const hasActiveFilters = search || customerCode || salesmanId;
    const handleResetFilters = () => {
        setSearch("");
        setCustomerCode("");
        setSalesmanId("");
        setPage(1);
    };

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
            <div className="p-2 border rounded-2xl bg-muted/30 backdrop-blur-sm flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Search by order #, customer or salesman..."
                        className="pl-10 h-11 bg-background/50 border-none shadow-inner focus-visible:ring-1 focus-visible:ring-primary/20 transition-all font-medium"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="h-11 flex items-center px-1 bg-background/50 rounded-xl border border-border/40 shadow-sm">
                        <Select
                            value={customerCode || "all"}
                            onValueChange={(value) => {
                                setCustomerCode(value === "all" ? "" : value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="h-9 w-[200px] border-none bg-transparent focus:ring-0 font-bold text-xs uppercase tracking-tight">
                                <SelectValue placeholder="All Customers" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/40 shadow-2xl">
                                <SelectItem value="all" className="font-bold text-xs">All Customers</SelectItem>
                                {filterOptions?.customers.map((c) => (
                                    <SelectItem key={c.customer_code} value={c.customer_code} className="text-xs font-medium">
                                        {c.customer_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="w-px h-4 bg-border/60 mx-1" />

                        <Select
                            value={salesmanId || "all"}
                            onValueChange={(value) => {
                                setSalesmanId(value === "all" ? "" : value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="h-9 w-[180px] border-none bg-transparent focus:ring-0 font-bold text-xs uppercase tracking-tight">
                                <SelectValue placeholder="All Salesmen" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/40 shadow-2xl">
                                <SelectItem value="all" className="font-bold text-xs">All Salesmen</SelectItem>
                                {filterOptions?.salesmen.map((s) => (
                                    <SelectItem key={s.id} value={s.id.toString()} className="text-xs font-medium">
                                        {s.salesman_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleResetFilters}
                            className="h-11 px-4 text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all rounded-xl gap-2"
                        >
                            <X className="h-4 w-4" />
                            Reset
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
