"use client";

import React from "react";
import { useCustomerProspects } from "./hooks/useCustomerProspects";
import { CustomerProspectTable } from "./components/CustomerProspectTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, RefreshCw, BadgeCheck } from "lucide-react";

export default function CustomerProspectApprovalModule() {
    const {
        prospects,
        discountTypes,
        salesmen,
        isLoading,
        isError,
        error,
        metadata,
        page,
        pageSize,
        searchQuery,
        statusFilter,
        salesmanFilter,
        setPage,
        setPageSize,
        setSearchQuery,
        setStatusFilter,
        setSalesmanFilter,
        refetch,
        approveProspect,
        rejectProspect,
        updateProspect,
        storeTypes,
        paymentTerms,
        classifications,
    } = useCustomerProspects();

    if (isError) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <Alert variant="destructive" className="max-w-2xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Connection Error</AlertTitle>
                    <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                        <span>
                            Failed to load prospects: {error?.message || "An unexpected error occurred."}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            className="bg-background"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-3xl font-bold tracking-tight text-foreground">
                          Prospect Approval
                      </h2>
                      <BadgeCheck className="h-6 w-6 text-primary mt-1" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Review and approve new customer registrations from the sales team.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="shadow-sm rounded-xl"
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        {isLoading ? "Refreshing..." : "Refresh"}
                    </Button>
                </div>
            </div>

            <Separator className="my-4 opacity-50" />

            <div className="w-full">
                <CustomerProspectTable
                    data={prospects}
                    discountTypes={discountTypes}
                    storeTypes={storeTypes}
                    salesmen={salesmen}
                    isLoading={isLoading}
                    metadata={metadata}
                    page={page}
                    pageSize={pageSize}
                    searchQuery={searchQuery}
                    statusFilter={statusFilter}
                    salesmanFilter={salesmanFilter}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    onSearchChange={setSearchQuery}
                    onStatusChange={setStatusFilter}
                    onSalesmanChange={setSalesmanFilter}
                    onApprove={approveProspect}
                    onReject={rejectProspect}
                    onUpdate={updateProspect}
                    paymentTerms={paymentTerms}
                    classifications={classifications}
                />
            </div>
        </div>
    );
}
