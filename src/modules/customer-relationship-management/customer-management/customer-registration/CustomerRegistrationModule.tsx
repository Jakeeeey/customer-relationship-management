"use client";

import React, { useState, useEffect } from "react";
import { useCustomerRegistration } from "./hooks/useCustomerRegistration";
import { CustomerRegistrationTable } from "./components/CustomerRegistrationTable";
import { CustomerRegistrationFormSheet } from "./components/CustomerRegistrationFormSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { 
    Plus, 
    Search, 
    RefreshCcw
} from "lucide-react";
import { CustomerRegistration, CustomerRegistrationFormValues } from "./types";
import { cn } from "@/lib/utils";

export default function CustomerRegistrationModule() {
    const {
        customers,
        isLoading,
        searchQuery,
        setSearchQuery,
        refetch,
        createCustomer,
        updateCustomer,
        page,
        setPage,
        metadata,
        pageSize,
        statusFilter,
        setStatusFilter,
        storeTypeFilter,
        setStoreTypeFilter,
        classificationFilter,
        setClassificationFilter,
    } = useCustomerRegistration();

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [viewingCustomer, setViewingCustomer] = useState<CustomerRegistration | null>(null);

    const [storeTypes, setStoreTypes] = useState<{ id: number; store_type: string }[]>([]);
    const [classifications, setClassifications] = useState<{ id: number; classification_name: string }[]>([]);

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [stRes, clRes] = await Promise.all([
                    fetch("/api/crm/customer-management/store-type"),
                    fetch("/api/crm/customer-management/classification")
                ]);
                if (stRes.ok) {
                    const json = await stRes.json();
                    if (json.ok) setStoreTypes(json.data);
                }
                if (clRes.ok) {
                    const json = await clRes.json();
                    if (json.ok) setClassifications(json.data);
                }
            } catch (err) {
                console.error("Error fetching filter options:", err);
            }
        };
        fetchOptions();
    }, []);

    const handleNewRegistration = () => {
        setViewingCustomer(null);
        setIsSheetOpen(true);
    };

    const handleViewCustomer = (customer: CustomerRegistration) => {
        setViewingCustomer(customer);
        setIsSheetOpen(true);
    };

    const handleSubmit = async (data: CustomerRegistrationFormValues) => {
        try {
            if (viewingCustomer) {
                await updateCustomer(viewingCustomer.id, data);
            } else {
                await createCustomer(data);
            }
        } catch (err) {
            console.error("Submit failed", err);
        }
    };

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 p-4 md:p-10 bg-background/50 h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar">
            {/* Header Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Customers</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your customer database and associated bank accounts.</p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => refetch()}
                    className="h-10 rounded-lg border-border/60 bg-background shadow-sm hover:bg-muted/50 transition-all flex items-center gap-2 text-xs font-medium"
                >
                    <RefreshCcw className={cn("h-4 w-4 text-muted-foreground", isLoading && "animate-spin")} />
                    Refresh Data
                </Button>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-2">
                <div className="relative w-full md:w-[350px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <Input
                        placeholder="Search by name, code, city, contact..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-11 bg-background border-border/60 rounded-lg shadow-sm focus-visible:ring-primary/20 text-sm"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2">
                        <SearchableSelect 
                            value={storeTypeFilter} 
                            onValueChange={setStoreTypeFilter}
                            options={[
                                { value: "all", label: "All Store Types" },
                                ...storeTypes.map(st => ({ value: st.id.toString(), label: st.store_type }))
                            ]}
                            placeholder="Store Type"
                            className="h-11 w-[160px] rounded-lg border-border/60 text-[10px] font-black uppercase tracking-widest px-4 shadow-sm bg-background"
                        />

                        <SearchableSelect 
                            value={classificationFilter} 
                            onValueChange={setClassificationFilter}
                            options={[
                                { value: "all", label: "All Classification" },
                                ...classifications.map(cl => ({ value: cl.id.toString(), label: cl.classification_name }))
                            ]}
                            placeholder="Classification"
                            className="h-11 w-[160px] rounded-lg border-border/60 text-[10px] font-black uppercase tracking-widest px-4 shadow-sm bg-background"
                        />

                        <SearchableSelect 
                            value={statusFilter} 
                            onValueChange={setStatusFilter}
                            options={[
                                { value: "all", label: "All Status" },
                                { value: "active", label: "Active" },
                                { value: "inactive", label: "Inactive" }
                            ]}
                            placeholder="Status"
                            className="h-11 w-[140px] rounded-lg border-border/60 text-[10px] font-black uppercase tracking-widest px-4 shadow-sm bg-background"
                        />
                    </div>
                    <Button
                        onClick={handleNewRegistration}
                        className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" /> 
                        Add Customer
                    </Button>
                </div>
            </div>

            {/* Table Section */}
            <div className="min-h-[500px] flex-1">
                <CustomerRegistrationTable
                    data={customers}
                    isLoading={isLoading}
                    onView={handleViewCustomer}
                    page={page}
                    setPage={setPage}
                    totalCount={metadata.total_count}
                    pageSize={pageSize}
                />
            </div>

            {/* Form Sheet */}
            <CustomerRegistrationFormSheet
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                customer={viewingCustomer}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
