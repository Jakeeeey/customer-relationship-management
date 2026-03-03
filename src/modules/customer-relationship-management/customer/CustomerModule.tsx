"use client";

import React from "react";
import { useCustomers } from "./hooks/useCustomers";
import { CustomerTable } from "./components/CustomerTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
        setPage,
        setPageSize,
        setSearchQuery,
        setStatusFilter,
        refetch,
        createCustomer,
        updateCustomer,
    } = useCustomers();

    const handleCreate = async (data: any) => {
        await createCustomer(data);
    };

    const handleUpdate = async (id: number, data: any) => {
        await updateCustomer(id, data);
    };



    if (isError) {
        return (
            <Alert variant="destructive" className="m-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                    <span>
                        Failed to load customers: {error?.message || "Unknown error"}
                    </span>
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

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customer</h1>
                    <p className="text-muted-foreground">
                        Manage your customer database and bank accounts
                    </p>
                </div>
                <div className="flex gap-2">
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

            <CustomerTable
                data={customers}
                bankAccounts={bankAccounts}
                isLoading={isLoading}
                metadata={metadata}
                page={page}
                pageSize={pageSize}
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                onSearchChange={setSearchQuery}
                onStatusChange={setStatusFilter}
                onCreate={handleCreate}
                onUpdate={handleUpdate}
            />
        </div>
    );
}
