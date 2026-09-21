"use client";

import React, { useState, useCallback } from "react";
import { useNormalizeApproval } from "./hooks/useNormalizeApproval";
import { ApprovalTable } from "./components/ApprovalTable";
import { ApprovalConfirmationDialog } from "./components/ApprovalConfirmationDialog";
import { NormalizeRequest } from "./types";

export default function NormalizeApprovalModule() {
    const { requests, isLoading, isProcessing, approveRequest, rejectRequest } = useNormalizeApproval();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [target, setTarget] = useState<NormalizeRequest | null>(null);
    const [action, setAction] = useState<"Approved" | "Rejected" | null>(null);

    const handleApprove = useCallback((id: number) => {
        const req = requests.find(r => r.id === id) ?? null;
        setTarget(req);
        setAction("Approved");
        setDialogOpen(true);
    }, [requests]);

    const handleReject = useCallback((id: number) => {
        const req = requests.find(r => r.id === id) ?? null;
        setTarget(req);
        setAction("Rejected");
        setDialogOpen(true);
    }, [requests]);

    const handleConfirm = useCallback(async () => {
        if (!target || !action) return;
        const success = action === "Approved"
            ? await approveRequest(target.id)
            : await rejectRequest(target.id);
        if (success) {
            setDialogOpen(false);
            setTarget(null);
            setAction(null);
        }
    }, [target, action, approveRequest, rejectRequest]);

    return (
        <div className="p-2 sm:p-4 w-full flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Normalize Invoice Approval</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Review and approve or reject normalization requests for recycled invoices.
                </p>
            </div>

            <ApprovalTable
                data={requests}
                isLoading={isLoading}
                isProcessing={isProcessing}
                onApprove={handleApprove}
                onReject={handleReject}
            />

            <ApprovalConfirmationDialog
                isOpen={dialogOpen}
                onOpenChange={setDialogOpen}
                target={target}
                action={action}
                isProcessing={isProcessing}
                onConfirm={handleConfirm}
            />
        </div>
    );
}
