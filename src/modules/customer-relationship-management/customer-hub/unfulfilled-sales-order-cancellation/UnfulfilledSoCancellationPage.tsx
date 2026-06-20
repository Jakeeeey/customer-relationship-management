"use client";

import { Skeleton } from "@/components/ui/skeleton";

import { useCallback, useMemo, useState } from "react";
import { SummaryCards } from "./components/cards/SummaryCards";
import { OrderDataTable } from "./components/data-table";
import { CancelOrderModal } from "./components/cancel-modal";
import { OrderDetailsModal } from "./components/data-table/order-details-modal";
import { useUnfulfilledOrders } from "./hooks/use-unfulfilled-orders";
import { SalesOrder } from "./types";

export default function UnfulfilledSoCancellationPage() {
  const { orders, isLoading, refresh } = useUnfulfilledOrders();
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [remarks, setRemarks] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const handleViewDetails = useCallback((order: SalesOrder) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  }, []);

  const handleRequestClick = useCallback((order: SalesOrder, cancellationRemarks: string) => {
    setSelectedOrder(order);
    setRemarks(cancellationRemarks);
    setIsModalOpen(true);
  }, []);

  const stats = useMemo(() => {
    const totalAmount = orders.reduce(
      (sum, order) => sum + (order.net_amount || 0),
      0
    );

    return {
      totalEligible: orders.length,
      totalAmount,
    };
  }, [orders]);

  return (
    <div className="flex flex-1 flex-col px-4 md:px-6 lg:px-8 py-6 w-full max-w-full space-y-8 animate-in fade-in duration-500">
      {/* Premium Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground">
          Unfulfilled Sales Order Cancellation
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
          Review and cancel sales orders that are marked for consolidation but have not yet been fulfilled. 
          Actioning a cancellation here will permanently update the database status.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {isLoading ? (
          <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
            {/* Skeleton Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-[180px] rounded-2xl col-span-2 lg:col-span-1" />
              <Skeleton className="h-[180px] rounded-2xl col-span-1" />
              <Skeleton className="h-[180px] rounded-2xl col-span-1" />
            </div>
            
            {/* Skeleton Table */}
            <div className="rounded-2xl border bg-card/50 shadow-sm backdrop-blur-sm overflow-hidden p-1">
              <div className="p-4 space-y-4 bg-background/50">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-9 w-[250px] rounded-lg" />
                </div>
                <div className="space-y-2 border rounded-xl overflow-hidden p-2">
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-16 w-full rounded-md" />
                  <Skeleton className="h-16 w-full rounded-md" />
                  <Skeleton className="h-16 w-full rounded-md" />
                  <Skeleton className="h-16 w-full rounded-md" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <SummaryCards stats={stats} />
            
            <div className="rounded-2xl border bg-card/50 shadow-sm backdrop-blur-sm overflow-hidden p-1">
              <OrderDataTable data={orders} onViewDetails={handleViewDetails} />
            </div>
          </>
        )}

        <OrderDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          order={selectedOrder}
          onCancelOrder={(order, remarks) => {
            handleRequestClick(order, remarks);
          }}
        />

        <CancelOrderModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          order={selectedOrder}
          remarks={remarks}
          onSuccess={() => {
            refresh();
            setIsDetailsModalOpen(false);
          }}
        />
      </div>
    </div>
  );
}
