"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { SalesOrder, Customer, Salesman, Branch, Supplier } from "./types";
import { fetchSalesOrderData } from "./providers/fetchProvider";
import { SalesOrderFormFields } from "./components/SalesOrderFormFields";
import { SalesOrderTable } from "./components/SalesOrderTable";
import { SalesOrderDetailsModal } from "./components/SalesOrderDetailsModal";
import { Package2 } from "lucide-react";

import { SalesOrderSkeleton } from "./components/SalesOrderSkeleton";

interface AppliedFilters {
    search: string;
    dateCreated: string;
    orderDate: string;
    deliveryDate: string;
    dueDate: string;
    startDate: string;
    endDate: string;
    salesmanId: string;
    branchId: string;
    supplierId: string;
    status: string;
}

export default function SalesOrderReportModule() {
    const [loading, setLoading] = useState(false);
    const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [salesmen, setSalesmen] = useState<Salesman[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const pageSize = 50;
    const [totalOrders, setTotalOrders] = useState(0);
    const [aggregates, setAggregates] = useState({ total_amount: 0, allocated_amount: 0 });
    const [error, setError] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
        search: "",
        dateCreated: "",
        orderDate: "",
        deliveryDate: "",
        dueDate: "",
        startDate: "",
        endDate: "",
        salesmanId: "",
        branchId: "",
        supplierId: "",
        status: "",
    });

    // Use refs to track page and loading state for the infinite scroll observer
    const loadingRef = useRef(false);
    const currentPageRef = useRef(1);
    const hasMoreRef = useRef(true);

    const loadData = useCallback(async (page: number, filtersToUse: AppliedFilters) => {
        if (loadingRef.current) return; // Prevent double-fetch
        loadingRef.current = true;
        setLoading(true);
        try {
            const activeFilters = Object.fromEntries(
                Object.entries(filtersToUse).filter(([key, v]) => key && v !== "" && v !== "none")
            ) as Record<string, string>;

            const data = await fetchSalesOrderData(page, pageSize, activeFilters);
            if (page === 1) {
                setSalesOrders(data.salesOrders);
            } else {
                setSalesOrders(prev => {
                    const existingIds = new Set(prev.map(item => item.order_id));
                    const newUniqueOrders = data.salesOrders.filter(so => !existingIds.has(so.order_id));
                    return [...prev, ...newUniqueOrders];
                });
            }
            setTotalOrders(data.meta.total_count);
            // Update hasMore based on whether we got a full page of results
            hasMoreRef.current = data.salesOrders.length >= pageSize;
            if (data.meta.aggregates) {
                setAggregates(data.meta.aggregates);
            }

            if (data.salesOrders.length > 0) {
                setCustomers(data.customers);
                setSalesmen(data.salesmen);
                setBranches(data.branches);
                setSuppliers(data.suppliers);
            }
        } catch (err: unknown) {
            const e = err as Error;
            setError(e.message);
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, [pageSize]);

    const handleRowClick = (so: SalesOrder) => {
        setSelectedOrder(so);
        setIsModalOpen(true);
    };

    const handleSearch = useCallback((newFilters: AppliedFilters) => {
        setAppliedFilters(newFilters);
        currentPageRef.current = 1;
        hasMoreRef.current = true;
    }, []);

    // Load more function called by the infinite scroll observer
    const handleLoadMore = useCallback(() => {
        if (loadingRef.current || !hasMoreRef.current) return;
        currentPageRef.current += 1;
        loadData(currentPageRef.current, appliedFilters);
    }, [appliedFilters, loadData]);

    // Initial load + reload when filters change
    useEffect(() => {
        currentPageRef.current = 1;
        hasMoreRef.current = true;
        loadData(1, appliedFilters);
    }, [appliedFilters, loadData]);

    if (loading && salesOrders.length === 0) {
        return <SalesOrderSkeleton />;
    }

    if (error) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <p className="text-destructive font-bold text-lg">Report Error</p>
                <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20 max-w-2xl text-center">
                    <p className="text-destructive font-medium">{error}</p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                    Retry Loading
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Package2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight leading-tight">Sales Order Report</h1>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Customer Relationship Management</p>
                    </div>
                </div>
            </div>

            {/* Aggregates Summary Cards - More compact */}
            {salesOrders.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="bg-primary/5 rounded-lg border border-primary/20 p-3 shadow-none">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">Grand Total (Allocated)</p>
                        <p className="text-lg font-black text-primary">
                            {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(aggregates.allocated_amount)}
                        </p>
                    </div>
                    <div className="bg-card rounded-lg border p-3 shadow-none">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Total Ordered Amount</p>
                        <p className="text-lg font-bold">
                            {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(aggregates.total_amount)}
                        </p>
                    </div>
                    <div className="bg-card rounded-lg border p-3 shadow-none">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Total Orders</p>
                        <p className="text-lg font-bold">{totalOrders}</p>
                    </div>
                </div>
            )}

            {/* Form Fields - Compact container */}
            <section className="bg-card rounded-lg shadow-none">
                <SalesOrderFormFields
                    appliedFilters={appliedFilters}
                    onSearch={handleSearch}
                    salesmen={salesmen}
                    branches={branches}
                    suppliers={suppliers}
                />
            </section>

            {/* Main Content Area: Full Width Table - Tightened */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-base font-bold text-primary flex items-center gap-2 uppercase tracking-wide">
                        Sales Order List
                        <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border">
                            {totalOrders} RECORDS
                        </span>
                    </h2>
                </div>
                <section className="bg-card rounded-lg border shadow-sm overflow-hidden">
                    <SalesOrderTable
                        orders={salesOrders}
                        customers={customers}
                        salesmen={salesmen}
                        branches={branches}
                        suppliers={suppliers}
                        totalOrders={totalOrders}
                        pageSize={pageSize}
                        onLoadMore={handleLoadMore}
                        isLoading={loading}
                        hasActiveDate={true}
                        selectedOrderId={selectedOrder?.order_id || undefined}
                        onRowClick={handleRowClick}
                    />
                </section>
            </div>

            {/* Details Modal */}
            <SalesOrderDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                order={selectedOrder}
                customers={customers}
                salesmen={salesmen}
                branches={branches}
                suppliers={suppliers}
            />

            <div className="h-8" /> {/* Spacer */}
        </div>
    );
}
