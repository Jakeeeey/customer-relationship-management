"use client";

import React from "react";
import { useCustomers } from "./hooks/useCustomers";
import { CustomerTable } from "./components/CustomerTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Customer } from "./types";

export default function CustomerModule() {
    const {
        customers,
        bankAccounts,
        isLoading,
        isError,
        error,
        metadata,
        page,
        pageSize,
        searchQuery,
        statusFilter,
        storeTypeFilter,          // 🚀 Extracted new state
        classificationFilter,     // 🚀 Extracted new state
        userMapping,
        setPage,
        setPageSize,
        setSearchQuery,
        setStatusFilter,
        setStoreTypeFilter,       // 🚀 Extracted new setter
        setClassificationFilter,  // 🚀 Extracted new setter
        refetch,
        createCustomer,
        updateCustomer,
    } = useCustomers();

    const handleCreate = async (data: Partial<Customer>) => {
        await createCustomer(data);
    };

    const handleUpdate = async (id: number, data: Partial<Customer>) => {
        await updateCustomer(id, data);
    };

    // 🚀 SHADCN-STYLE ERROR STATE
    if (isError) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <Alert variant="destructive" className="max-w-2xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-bold tracking-tight">Connection Error</AlertTitle>
                    <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                        <span className="text-sm">
                            Failed to load customers: {error?.message || "An unexpected error occurred while fetching data."}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            className="w-full sm:w-auto bg-background hover:bg-muted text-foreground"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry Connection
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        // 🚀 STANDARD SHADCN DASHBOARD LAYOUT
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 animate-in fade-in duration-500">

            {/* HEADER SECTION */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">
                        Customers
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage your customer database and associated bank accounts.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="shadow-sm"
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        {isLoading ? "Refreshing..." : "Refresh Data"}
                    </Button>
                </div>
            </div>

            <Separator className="my-4" />

            {/* MAIN CONTENT */}
            <div className="w-full">
                <CustomerTable
                    data={customers}
                    bankAccounts={bankAccounts}
                    userMapping={userMapping}
                    isLoading={isLoading}
                    metadata={metadata}
                    page={page}
                    pageSize={pageSize}
                    searchQuery={searchQuery}
                    statusFilter={statusFilter}
                    storeTypeFilter={storeTypeFilter}             // 🚀 Passed to Table
                    classificationFilter={classificationFilter}   // 🚀 Passed to Table
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    onSearchChange={setSearchQuery}
                    onStatusChange={setStatusFilter}
                    onStoreTypeChange={setStoreTypeFilter}             // 🚀 Passed to Table
                    onClassificationChange={setClassificationFilter}   // 🚀 Passed to Table
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                />
            </div>
        </div>
    );
}