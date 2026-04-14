import { useState, useEffect } from "react";
import { getPendingOrders, updateOrders, updateOrderDetails } from "../providers/fetchProvider";
import { toast } from "sonner";

export interface OrderDetail {
    detail_id: number;
    order_detail_id: number;
    product_id: { 
        product_id: number;
        product_name: string; 
        product_code: string; 
        description?: string; 
        uom?: { uom_name: string; uom_shortcut: string } 
    } | null;
    unit_price: number;
    ordered_quantity: number;
    allocated_quantity: number;
    available_qty?: number;
    discount_amount: number;
    discount_type: number | string | null;
    net_amount: number;
    allocated_amount?: number;
    gross_amount?: number;
    _recalculated_discount?: number;
    _recalculated_gross?: number;
}

export interface CustomerGroup {
    customer_code: string;
    customer_name: string;
    orders: SalesOrder[];
    total_net_amount: number;
}

export interface SalesOrder {
    order_id: number;
    order_no: string;
    po_no: string;
    customer_code: string;
    customer_name: string;
    salesman_id: string;
    supplier_id?: number | string;
    branch_id?: number | string;
    order_date: string;
    total_amount: number;
    allocated_amount?: number;
    discount_amount?: number;
    net_amount: number;
    order_status: string;
    payment_terms?: number | null;
    price_type_name?: string;
}



export function useSalesOrderApproval() {
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

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
            setOrders([]); // Clear list on fresh fetch to avoid ghosting
            setPage(1);
        }

        try {
            const result = await getPendingOrders(currentStatus, currentSearch, fetchPage, 30, currentStart, currentEnd);

            if (isLoadMore) {
                setOrders(prev => {
                    const combined = [...prev, ...result.data];
                    // Using a Map ensures uniqueness by order_id
                    return Array.from(new Map(combined.map(o => [o.order_id, o])).values());
                });
            } else {
                setOrders(result.data);
            }

            setPage(result.metadata.page);
            setHasMore(result.metadata.hasMore);
            setTotalCount(result.metadata.totalCount || 0);
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

    const handleApprove = async (orderIds: (string | number)[]) => {
        try {
            await updateOrders(orderIds, "approve");
            toast.success("Orders Approved");
            refreshOrders();
            return true;
        } catch {
            return false;
        }
    };

    const handleSubmitForApproval = async (orderIds: (string | number)[]) => {
        try {
            await updateOrders(orderIds, "submit_for_approval");
            toast.success("Orders Submitted for Approval");
            refreshOrders();
            return true;
        } catch {
            return false;
        }
    };

    const handleHold = async (orderIds: (string | number)[]) => {
        try {
            await updateOrders(orderIds, "hold");
            toast.success("Orders Put on Hold");
            refreshOrders();
            return true;
        } catch {
            return false;
        }
    };

    const handleCancel = async (orderIds: (string | number)[]) => {
        try {
            await updateOrders(orderIds, "cancel");
            toast.success("Orders Cancelled");
            refreshOrders();
            return true;
        } catch {
            return false;
        }
    };

    const handleSaveDetails = async (
        orderId: number,
        header: Record<string, string | number | boolean | null | undefined>,
        items: { detail_id: number; order_detail_id: number; allocated_quantity: number; net_amount: number; discount_amount: number; gross_amount: number }[]
    ) => {
        try {
            await updateOrderDetails(orderId, header, items);
            return true;
        } catch {
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
        totalCount,
        loadNextPage,
        statusFilter,
        setStatusFilter,
        searchTerm,
        setSearchTerm,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        handleApprove,
        handleSubmitForApproval,
        handleHold,
        handleCancel,
        handleSaveDetails,
        refreshOrders,
    };
}
