"use client";

import React, { useEffect, useState } from "react";
import { SalesOrder, SalesOrderDetail, Customer, Salesman, Branch, Supplier } from "./types";
import { fetchSalesOrderData } from "./providers/fetchProvider";
import { SalesOrderFormFields } from "./components/SalesOrderFormFields";
import { SalesOrderTable } from "./components/SalesOrderTable";
import { SalesOrderSummary } from "./components/SalesOrderSummary";
import { Button } from "@/components/ui/button";
import { Package2, Plus, Loader2 } from "lucide-react";

import { SalesOrderSkeleton } from "./components/SalesOrderSkeleton";

export default function SalesOrderModule() {
    const [loading, setLoading] = useState(false);
    const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
    const [order, setOrder] = useState<Partial<SalesOrder>>({});
    const [details, setDetails] = useState<SalesOrderDetail[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [salesmen, setSalesmen] = useState<Salesman[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;
    const [totalOrders, setTotalOrders] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [appliedFilters, setAppliedFilters] = useState({
        search: "",
        dateCreated: "",
        orderDate: "",
        deliveryDate: "",
        dueDate: "",
    });

    const loadData = async (page: number, filtersToUse: any) => {
        const hasDateFilter = filtersToUse.dateCreated ||
            filtersToUse.orderDate ||
            filtersToUse.deliveryDate ||
            filtersToUse.dueDate;

        if (!hasDateFilter) {
            setSalesOrders([]);
            setTotalOrders(0);
            setOrder({});
            setDetails([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Clean up empty filters
            const activeFilters = Object.fromEntries(
                Object.entries(filtersToUse).filter(([_, v]) => v !== "")
            ) as Record<string, string>;

            const data = await fetchSalesOrderData(page, pageSize, activeFilters);
            setSalesOrders(data.salesOrders);
            setTotalOrders(data.meta.total_count);

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
            <div className="flex h-[60vh] items-center justify-center">
                <p className="text-destructive font-medium">Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Package2 className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Sales Order</h1>
                        <p className="text-sm text-muted-foreground">Manage and review sales order details</p>
                    </div>
                </div>
            </div>

            {/* Form Fields */}
            <section className="bg-card rounded-xl border p-6 shadow-sm">
                <SalesOrderFormFields
                    order={order}
                    appliedFilters={appliedFilters}
                    onSearch={handleSearch}
                />
            </section>

            {/* Main Content Area: Table and Summary side-by-side */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
                {/* Product Table - Takes 3/4 width on large screens */}
                <section className="space-y-4 xl:col-span-3 order-2 xl:order-1">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                            Sales Order List
                            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {totalOrders} total
                            </span>
                        </h2>
                    </div>
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
                        hasActiveDate={!!(appliedFilters.dateCreated || appliedFilters.orderDate || appliedFilters.deliveryDate || appliedFilters.dueDate)}
                        selectedOrderId={order.order_id}
                        onRowClick={setOrder}
                    />
                </section>

                {/* Summary Section - Takes 1/4 width on large screens */}
                <section className="space-y-4 xl:col-span-1 order-1 xl:order-2 self-start">
                    <div className="flex items-center px-1">
                        <h2 className="text-xl font-bold text-primary">
                            Order Summary
                        </h2>
                    </div>
                    <div className="bg-card rounded-xl border p-6 shadow-sm">
                        <SalesOrderSummary order={order} />
                    </div>
                </section>
            </div>

            <div className="h-8" /> {/* Spacer */}
        </div>
    );
}
