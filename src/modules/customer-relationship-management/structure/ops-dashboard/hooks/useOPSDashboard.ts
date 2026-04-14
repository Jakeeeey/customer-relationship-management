import { useCallback, useEffect, useState } from "react";
import { opsDashboardProvider } from "../providers/fetchProvider";
import { OPS_STATUSES, OPSOrder, StatusGroupedOrders, CustomerGroupedOrders } from "../types";

const REFRESH_INTERVAL = 120000; // 2 minutes

export function useOPSDashboard() {
    const [data, setData] = useState<StatusGroupedOrders[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const orders = await opsDashboardProvider.getAllOrders();
            
            // Group and Sort Data
            const grouped = OPS_STATUSES.map((status) => {
                const ordersInStatus = orders.filter((o) => o.status === status);
                
                // Group by Customer within status
                const customerMap = new Map<string, OPSOrder[]>();
                ordersInStatus.forEach((o) => {
                    if (!customerMap.has(o.customerName)) {
                        customerMap.set(o.customerName, []);
                    }
                    customerMap.get(o.customerName)!.push(o);
                });

                const customerGroups: CustomerGroupedOrders[] = Array.from(customerMap.entries()).map(
                    ([customerName, customerOrders]) => ({
                        customerName,
                        orders: customerOrders,
                    })
                );

                return {
                    status,
                    customerGroups,
                };
            });

            setData(grouped);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Fetch Error:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch data");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial Fetch & Auto Refresh
    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            fetchData();
        }, REFRESH_INTERVAL);

        return () => clearInterval(interval);
    }, [fetchData]);

    return {
        data,
        isLoading,
        lastUpdated,
        error,
        refresh: fetchData,
    };
}
