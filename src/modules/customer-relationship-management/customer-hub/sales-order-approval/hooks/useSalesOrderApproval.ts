import { useState, useEffect } from "react";
import { getPendingOrders, updateOrders, updateOrderDetails } from "../providers/fetchProvider";
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
    discount_amount: number;
    net_amount: number;
    allocated_amount: number;
    order_status: string;
}

export interface OrderDetail {
    order_detail_id?: number;
    order_id: number;
    product_id: any;
    unit_price: number;
    ordered_quantity: number;
    allocated_quantity: number;
    discount_amount: number;
    net_amount: number;
    remarks: string;
}

export function useSalesOrderApproval() {
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState("For Approval");
    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const fetchOrders = async (isLoadMore = false, currentSearch = searchTerm, currentStatus = statusFilter, currentPage = page, currentStart = startDate, currentEnd = endDate) => {
        const fetchPage = isLoadMore ? currentPage + 1 : 1;

        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoadingOrders(true);
        }

        try {
            const result = await getPendingOrders(currentStatus, currentSearch, fetchPage, 30, currentStart, currentEnd);

            if (isLoadMore) {
                setOrders(prev => [...prev, ...result.data]);
            } else {
                setOrders(result.data);
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
            fetchOrders(false, searchTerm, statusFilter, 1, startDate, endDate);
        }, 400); // 400ms debounce
        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, searchTerm, startDate, endDate]);

    const handleApproveBulk = async (orderIds: (string | number)[]) => {
        try {
            await updateOrders(orderIds, "approve");
            toast.success("Order(s) Approved", {
                description: `Successfully moved ${orderIds.length} order(s) to For Consolidation.`,
            });
            fetchOrders(false, searchTerm, statusFilter, 1, startDate, endDate);
            return true;
        } catch {
            toast.error("Error", {
                description: "Failed to approve the orders. Please try again.",
            });
            return false;
        }
    };

    const handleHoldBatch = async (orderIds: (string | number)[]) => {
        try {
            await updateOrders(orderIds, "hold");
            toast.success("Order(s) Put On Hold", {
                description: `Successfully moved ${orderIds.length} order(s) to On Hold.`,
            });
            fetchOrders(false, searchTerm, statusFilter, 1, startDate, endDate);
            return true;
        } catch {
            toast.error("Error", {
                description: "Failed to put orders on hold.",
            });
            return false;
        }
    };

    const handleCancelBatch = async (orderIds: (string | number)[]) => {
        try {
            await updateOrders(orderIds, "cancel");
            toast.success("Order(s) Cancelled", {
                description: `Successfully cancelled ${orderIds.length} order(s).`,
            });
            fetchOrders(false, searchTerm, statusFilter, 1, startDate, endDate);
            return true;
        } catch {
            toast.error("Error", {
                description: "Failed to cancel orders.",
            });
            return false;
        }
    };

    const handleDetailUpdate = async (orderId: number, header: any, items: any[]) => {
        try {
            await updateOrderDetails(orderId, header, items);
            toast.success("Update Successful", {
                description: "Order details and allocations updated.",
            });
            fetchOrders(false, searchTerm, statusFilter, 1, startDate, endDate);
            return true;
        } catch (e) {
            console.error(e);
            toast.error("Update Failed", {
                description: "Failed to update order details.",
            });
            return false;
        }
    };

    const loadNextPage = () => {
        if (!loadingMore && hasMore && !loadingOrders) {
            fetchOrders(true, searchTerm, statusFilter, page, startDate, endDate);
        }
    };

    const refreshOrders = () => fetchOrders(false, searchTerm, statusFilter, 1, startDate, endDate);

    return {
        orders,
        loadingOrders,
        loadingMore,
        hasMore,
        loadNextPage,
        statusFilter,
        setStatusFilter,
        searchTerm,
        setSearchTerm,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        handleApproveBulk,
        handleHoldBatch,
        handleCancelBatch,
        handleDetailUpdate,
        refreshOrders,
    };
}
