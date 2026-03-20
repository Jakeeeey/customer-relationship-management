"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useApprovals } from "./hooks/use-approval";
import { columns as pendingColumns } from "./components/data-table/columns";
import { approvedColumns } from "./components/data-table/approvedColumn";
import { ApprovalDataTable } from "./components/data-table";
import { InvoiceSummaryApprovalCard } from "./components/cards/InvoiceSummaryApprovalCard";
import { ActionConfirmationModal } from "./components/confirmation-modal";
import { mapRequestsToInvoiceRows } from "./lib/mapping";
import { mapToApprovalParams } from "./lib/utils";
import { ApprovalAction, InvoiceRow } from "./types";

export default function InvoiceCancellationApprovalPage() {
  const {
    pendingRequests,
    approvedRequests,
    isLoading,
    isProcessing,
    handleAction,
  } = useApprovals();

  const [activeTab, setActiveTab] = useState<string>("PENDING");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: ApprovalAction;
    data: InvoiceRow | InvoiceRow[];
  } | null>(null);

  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 1. Memoized Data Mapping
  const allRequests = useMemo(
    () => mapRequestsToInvoiceRows(pendingRequests, approvedRequests),
    [pendingRequests, approvedRequests],
  );

  // 2. Dashboard Statistics
  const stats = useMemo(
    () => ({
      approved: approvedRequests.length,
      pending: pendingRequests.length,
      highValue: pendingRequests.filter((r) => (r.total_amount || 0) > 20000)
        .length,
    }),
    [pendingRequests, approvedRequests],
  );

  // 3. Action Handlers
  const triggerActionConfirmation = useCallback(
    (type: ApprovalAction, data: InvoiceRow | InvoiceRow[]) => {
      setPendingAction({ type, data });
      setConfirmOpen(true);
    },
    [],
  );

  const confirmAndExecute = async () => {
    if (!pendingAction?.data) return;

    const itemsToProcess = Array.isArray(pendingAction.data)
      ? pendingAction.data
      : [pendingAction.data];
    const paramsArray = itemsToProcess.map((item) =>
      mapToApprovalParams(item, 1),
    );

    await handleAction(pendingAction.type, paramsArray);
    setConfirmOpen(false);
    setPendingAction(null);
  };

  // 4. Column Selection logic
  const columns = useMemo(() => {
    return activeTab === "APPROVED"
      ? approvedColumns
      : pendingColumns;
  }, [activeTab]);

  return (
    <div className="flex flex-1 flex-col px-4">
      <div className="@container/main flex flex-1 flex-col gap-2 py-4">
        <InvoiceSummaryApprovalCard stats={stats} />

        <ApprovalDataTable
          columns={columns}
          data={allRequests}
          isLoading={isLoading}
          onBulkAction={triggerActionConfirmation}
          currentTab={activeTab}
          onTabChange={(tab) => isMountedRef.current && setActiveTab(tab)}
        />

        <ActionConfirmationModal
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          pendingAction={pendingAction}
          isProcessing={isProcessing}
          onConfirm={confirmAndExecute}
        />
      </div>
    </div>
  );
}
