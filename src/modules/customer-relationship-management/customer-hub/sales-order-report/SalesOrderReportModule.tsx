"use client";

import React, { useEffect, useState } from "react";
import { SalesOrder, SalesOrderDetail, Customer, Salesman, Branch, Supplier } from "./types";
import { fetchSalesOrderData } from "./providers/fetchProvider";
import { SalesOrderFormFields } from "./components/SalesOrderFormFields";
import { SalesOrderTable } from "./components/SalesOrderTable";
import { SalesOrderDetailsModal } from "./components/SalesOrderDetailsModal";
import { Package2, Loader2, Info } from "lucide-react";

import { SalesOrderSkeleton } from "./components/SalesOrderSkeleton";

export default function SalesOrderReportModule() {
    const [loading, setLoading] = useState(false);
    const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
    const [order, setOrder] = useState<Partial<SalesOrder>>({});
    const [details, setDetails] = useState<SalesOrderDetail[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [salesmen, setSalesmen] = useState<Salesman[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 50;
    const [totalOrders, setTotalOrders] = useState(0);
    const [aggregates, setAggregates] = useState({ total_amount: 0, allocated_amount: 0 });
    const [error, setError] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [appliedFilters, setAppliedFilters] = useState({
        search: "",
        dateCreated: "",
        orderDate: "",
        deliveryDate: "",
        dueDate: "",
        startDate: "",
        endDate: "",
        salesmanId: "",
        branchId: "",
        status: "",
    });

    const loadData = async (page: number, filtersToUse: any) => {
        // Removed mandatory filter restriction to allow initial data load
        setLoading(true);
        try {
            // Clean up empty filters and "none" values
            const activeFilters = Object.fromEntries(
                Object.entries(filtersToUse).filter(([_, v]) => v !== "" && v !== "none")
            ) as Record<string, string>;

            const data = await fetchSalesOrderData(page, pageSize, activeFilters);
            setSalesOrders(data.salesOrders);
            setTotalOrders(data.meta.total_count);
            if (data.meta.aggregates) {
                setAggregates(data.meta.aggregates);
            }

            if (data.salesOrders.length > 0) {
                // By default, select the first order if none is currently selected 
                setOrder(data.salesOrders[0]);
                // Set details to empty as we're not fetching them for now
                setDetails([]);

                setCustomers(data.customers);
                setSalesmen(data.salesmen);
                setBranches(data.branches);
                setSuppliers(data.suppliers);
            } else {
                setOrder({});
                setDetails([]);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = (so: SalesOrder) => {
        setSelectedOrder(so);
        setIsModalOpen(true);
    };

    const handleSearch = (newFilters: any) => {
        setAppliedFilters(newFilters);
        setCurrentPage(1); // Reset to first page on new search
    };

    useEffect(() => {
        loadData(currentPage, appliedFilters);
    }, [currentPage, appliedFilters]);

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
                    order={order}
                    appliedFilters={appliedFilters}
                    onSearch={handleSearch}
                    salesmen={salesmen}
                    branches={branches}
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
                        currentPage={currentPage}
                        totalOrders={totalOrders}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
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
            />

            <div className="h-8" /> {/* Spacer */}
        </div>
    );
}
