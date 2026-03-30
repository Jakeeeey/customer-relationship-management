"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useApprovals } from "./hooks/use-approval";
import { columns as pendingColumns } from "./components/data-table/columns";
import { approvedColumns } from "./components/data-table/approvedColumn";
import { ApprovalDataTable } from "./components/data-table";
import { InvoiceSummaryApprovalCard } from "./components/cards/InvoiceSummaryApprovalCard";
import { ActionConfirmationModal } from "./components/confirmation-modal";
import { mapRequestsToInvoiceRows } from "./lib/mapping";
import { ApprovalAction, InvoiceRow, ApprovalParams } from "./types";

export default function InvoiceCancellationApprovalPage() {
  const {
    allRequests,
    isLoading,
    isProcessing,
    handleAction,
  } = useApprovals();

  const pendingRequests = useMemo(() => {
    return (allRequests || []).filter((r) => r.status === "PENDING");
  }, [allRequests]);

  const approvedRequests = useMemo(() => {
    return (allRequests || []).filter((r) => r.status === "APPROVED");
  }, [allRequests]);

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

  const mappedRequests = useMemo(
      () => mapRequestsToInvoiceRows(pendingRequests, approvedRequests),
      [pendingRequests, approvedRequests],
  );

  // 🚀 Perfectly typed! TS knows 'total_amount' exists now.
  const stats = useMemo(
      () => ({
        approved: approvedRequests.length,
        pending: pendingRequests.length,
        highValue: pendingRequests.filter((r) => (r.total_amount || 0) > 20000).length,
      }),
      [pendingRequests, approvedRequests],
  );

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

    // 🚀 Perfectly typed! Maps the UI Row to the exact ApprovalParams interface
    const paramsArray: ApprovalParams[] = itemsToProcess.map((item) => ({
      requestId: item.id,
      auditorId: 1,
      rejectionReason: pendingAction.type === "REJECT" ? "Rejected via Audit UI" : undefined,
    }));

    await handleAction(pendingAction.type, paramsArray);
    setConfirmOpen(false);
    setPendingAction(null);
  };

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
              data={mappedRequests}
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