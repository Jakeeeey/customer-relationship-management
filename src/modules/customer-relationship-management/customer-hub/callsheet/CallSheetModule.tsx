"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, AlertCircle } from "lucide-react";
import { useCallSheet } from "./hooks/useCallSheet";
import { CallSheetTable } from "./components/CallSheetTable";
import { FileDetailsModal } from "./components/FileDetailsModal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { SalesOrderAttachment } from "./types";

export default function CallSheetModule() {
    const {
        callsheets,
        isLoading,
        isError,
        error,
        metadata,
        page,
        pageSize,
        setPage,
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

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Sales Call Sheet</h1>
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

                {/* Table */}
                <CallSheetTable
                    data={callsheets}
                    isLoading={isLoading}
                    metadata={metadata}
                    page={page}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onFileClick={handleFileClick}
                    onCreateSalesOrder={(row) => router.push("/crm/customer-hub/sales-order")}
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
