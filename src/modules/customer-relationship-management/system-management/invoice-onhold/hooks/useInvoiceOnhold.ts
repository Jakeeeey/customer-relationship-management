import { useState, useEffect, useCallback } from "react";
import { invoiceOnholdService } from "../services/invoice-onhold.service";
import { InvoiceOnholdData } from "../types/invoice-onhold.schema";

export function useInvoiceOnhold() {
  const [orders, setOrders] = useState<InvoiceOnholdData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isPuttingOnHold, setIsPuttingOnHold] = useState<boolean>(false);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const data = await invoiceOnholdService.fetchForInvoicingOrders();
      setOrders(data || []);
    } catch (err: unknown) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error(String(err) || "Failed to fetch"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const putOnHold = async (orderId: string | number, remarks: string) => {
    setIsPuttingOnHold(true);
    try {
      await invoiceOnholdService.putOrderOnHold(orderId, remarks);
      await fetchOrders(); // Refresh the list after successfully putting an order on hold
    } catch (err) {
      throw err;
    } finally {
      setIsPuttingOnHold(false);
    }
  };

  return {
    orders,
    isLoading,
    isError,
    error,
    refetch: fetchOrders,
    putOnHold,
    isPuttingOnHold,
  };
}
