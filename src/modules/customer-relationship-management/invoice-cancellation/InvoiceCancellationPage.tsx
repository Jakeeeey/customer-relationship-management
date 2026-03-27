"use client";

import { useCallback, useMemo, useState } from "react";
import { InvoiceSummaryCards } from "./components/cards/InvoiceSummaryCards";
import { InvoiceDataTable } from "./components/data-table";
import { RequestCancellationModal } from "./components/request-modal";
import { useInvoices } from "./hooks/use-invoices";
import { SalesInvoice } from "./types";
import { useApprovals } from "../invoice-cancellation-approval/hooks/use-approval";

export default function InvoiceCancellationPage() {
  const { pendingRequests } = useApprovals();
  const { invoices, refresh } = useInvoices();
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Optimized: Stable function reference for the child DataTable
  const handleRequestClick = useCallback((invoice: SalesInvoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  }, []);

  // Optimized: Memoized stats with explicit type for 'i' to fix TS errors
  const stats = useMemo(() => {
    return {
      totalEligible: invoices.length,
      // Change: We now use the real-time pendingCount from the hook
      pending: pendingRequests.length,
    };
  }, [invoices, pendingRequests]);

  return (
    <div className="flex flex-1 flex-col px-4 ">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4">
          <InvoiceSummaryCards stats={stats} />
          <InvoiceDataTable data={invoices} onRequest={handleRequestClick} />
          {/* Action Modal */}
          <RequestCancellationModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            invoice={selectedInvoice}
            onSuccess={refresh}
          />
        </div>
      </div>
    </div>
  );
}
