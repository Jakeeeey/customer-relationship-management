"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, AlertCircle, Search, X } from "lucide-react";
import { useCallSheet } from "./hooks/useCallSheet";
import { CallSheetTable } from "./components/CallSheetTable";
import { FileDetailsModal } from "./components/FileDetailsModal";
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
    const [selectedItem, setSelectedItem] = useState<SalesOrderAttachment | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const handleFileClick = (row: SalesOrderAttachment) => {
        setSelectedItem(row);
        setModalOpen(true);
    };

    const handleModalClose = () => {
        setModalOpen(false);
        setSelectedItem(null);
    };

    const handleResetFilters = () => {
        setSearch("");
        setCustomerCode("");
        setSalesmanId("");
        setPage(1);
    };

    if (isError) {
        return (
            <Alert variant="destructive" className="m-0">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                    <span>Failed to load callsheets: {error?.message || "Unknown error"}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        className="ml-4"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Retry
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    const hasActiveFilters = search || customerCode || salesmanId;

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between lg:gap-8">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight">Call Sheet</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Manage your sales orders and customer information
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isLoading}
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                            {isLoading ? "Refreshing..." : "Refresh"}
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search sales order or name..."
                            className="pl-9 h-9"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Select
                            value={customerCode || "all"}
                            onValueChange={(value) => {
                                setCustomerCode(value === "all" ? "" : value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="h-9 w-[180px]">
                                <SelectValue placeholder="Filter Customer" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Customers</SelectItem>
                                {filterOptions?.customers.map((c) => (
                                    <SelectItem key={c.customer_code} value={c.customer_code}>
                                        {c.customer_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={salesmanId || "all"}
                            onValueChange={(value) => {
                                setSalesmanId(value === "all" ? "" : value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="h-9 w-[180px]">
                                <SelectValue placeholder="Filter Salesman" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Salesmen</SelectItem>
                                {filterOptions?.salesmen.map((s) => (
                                    <SelectItem key={s.id} value={s.id.toString()}>
                                        {s.salesman_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleResetFilters}
                                className="h-9 px-2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="mr-2 h-4 w-4" />
                                Clear
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
                    onFileClick={handleFileClick}
                    onCreateSalesOrder={() => router.push("/crm/customer-hub/sales-order")}
                />
            </div>

            {/* File Details Modal */}
            <FileDetailsModal
                item={selectedItem}
                open={modalOpen}
                onClose={handleModalClose}
            />
        </>
    );
}
