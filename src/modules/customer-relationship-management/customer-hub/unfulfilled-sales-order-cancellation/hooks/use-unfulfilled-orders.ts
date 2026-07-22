"use client";

import { useState, useCallback, useEffect } from "react";
import { SalesOrder } from "../types";
import { toast } from "sonner";
import { SalesOrderService } from "../services/sales-order-service";

export function useUnfulfilledOrders() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await SalesOrderService.getUnfulfilledOrders();
      setOrders(data);
    } catch (err) {
      console.error("Fetch error detailed:", err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to load orders: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    isLoading,
    refresh: fetchOrders,
  };
}
