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
    const [groupedCustomers, setGroupedCustomers] = useState<CustomerGroup[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState("For Approval");
    const [searchTerm, setSearchTerm] = useState("");

    const fetchOrders = async (isLoadMore = false, currentSearch = searchTerm, currentStatus = statusFilter, currentPage = page) => {
        const fetchPage = isLoadMore ? currentPage + 1 : 1;

        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoadingOrders(true);
        }

        try {
            const result = await getPendingOrders(currentStatus, currentSearch, fetchPage, 30);

            if (isLoadMore) {
                setGroupedCustomers(prev => [...prev, ...result.data]);
            } else {
                setGroupedCustomers(result.data);
            }

            setPage(result.metadata.page);
            setHasMore(result.metadata.hasMore);
        } catch (error) {
            console.error(error);
            toast.error("Error fetching orders", {
                description: "There was a problem loading the pending sales orders.",
            });
        } finally {
            setLoadingOrders(false);
            setLoadingMore(false);
        }
    };

    // Debounce search and status changes
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchOrders(false, searchTerm, statusFilter, 1);
        }, 400); // 400ms debounce
        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, searchTerm]);

    const handleApproveBulk = async (orderIds: (string | number)[]) => {
        try {
            await approveOrders(orderIds);
            toast.success("Orders Approved", {
                description: `Successfully moved ${orderIds.length} order(s) to For Consolidation.`,
            });
            // Refresh from page 1
            fetchOrders(false, searchTerm, statusFilter, 1);
            return true;
        } catch (error) {
            toast.error("Error", {
                description: "Failed to approve the orders. Please try again.",
            });
            return false;
        }
    };

    const loadNextPage = () => {
        if (!loadingMore && hasMore && !loadingOrders) {
            fetchOrders(true, searchTerm, statusFilter, page);
        }
    };

    const refreshOrders = () => fetchOrders(false, searchTerm, statusFilter, 1);

    return {
        // We no longer strictly need the flat orders list, but if UI expects it we could flatten it.
        // For now, the hook only returns groupedCustomers.
        groupedCustomers,
        loadingOrders,
        loadingMore,
        hasMore,
        loadNextPage,
        statusFilter,
        setStatusFilter,
        searchTerm,
        setSearchTerm,
        handleApproveBulk,
        refreshOrders,
    };
}
