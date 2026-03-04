import { useState, useEffect, useCallback, useMemo } from "react";
import { getPendingOrders, approveOrders } from "../providers/fetchProvider";
import { toast } from "sonner";

export interface SalesOrder {
    order_id: number;
    order_no: string;
    po_no: string;
    customer_code: string;
    customer_name: string;
    salesman_id: string;
    order_date: string;
    total_amount: number;
    net_amount: number;
    order_status: string;
}

export interface CustomerGroup {
    customer_code: string;
    customer_name: string;
    orders: SalesOrder[];
    total_net_amount: number;
}

export function useSalesOrderApproval() {
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState("For Approval");
    const [searchTerm, setSearchTerm] = useState("");

    const fetchOrders = useCallback(async () => {
        setLoadingOrders(true);
        try {
            const data = await getPendingOrders(statusFilter);
            setOrders(data);
        } catch (error) {
            console.error(error);
            toast.error("Error fetching orders", {
                description: "There was a problem loading the pending sales orders.",
            });
        } finally {
            setLoadingOrders(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleApproveBulk = async (orderIds: (string | number)[]) => {
        try {
            await approveOrders(orderIds);
            toast.success("Orders Approved", {
                description: `Successfully moved ${orderIds.length} order(s) to For Consolidation.`,
            });
            fetchOrders(); // Refresh grouped list
            return true;
        } catch (error) {
            toast.error("Error", {
                description: "Failed to approve the orders. Please try again.",
            });
            return false;
        }
    };

    // Prepare Customer Groups Data based on Filters
    const groupedCustomers = useMemo(() => {
        let filteredOrders = orders;

        if (searchTerm.trim() !== "") {
            const lowerTerm = searchTerm.toLowerCase();
            filteredOrders = orders.filter(o =>
                o.customer_code?.toLowerCase().includes(lowerTerm) ||
                o.customer_name?.toLowerCase().includes(lowerTerm) ||
                o.order_no?.toLowerCase().includes(lowerTerm) ||
                o.po_no?.toLowerCase().includes(lowerTerm)
            );
        }

        const groupsMap = new Map<string, CustomerGroup>();

        filteredOrders.forEach(order => {
            const code = order.customer_code || "UNKNOWN";
            if (!groupsMap.has(code)) {
                groupsMap.set(code, {
                    customer_code: code,
                    customer_name: order.customer_name,
                    orders: [],
                    total_net_amount: 0
                });
            }

            const group = groupsMap.get(code)!;
            group.orders.push(order);
            group.total_net_amount += (Number(order.net_amount) || 0);
        });

        // Convert Map to Array
        return Array.from(groupsMap.values());

    }, [orders, searchTerm]);

    const refreshOrders = () => fetchOrders();

    return {
        orders,
        loadingOrders,
        groupedCustomers,
        statusFilter,
        setStatusFilter,
        searchTerm,
        setSearchTerm,
        handleApproveBulk,
        refreshOrders,
    };
}
