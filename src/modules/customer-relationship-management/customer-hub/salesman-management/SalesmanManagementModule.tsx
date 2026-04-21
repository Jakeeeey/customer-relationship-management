"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { salesmanProvider } from "./providers/fetchProvider";
import { Salesman } from "./types";
import { toast } from "sonner";

import { SalesmanHeader } from "./components/SalesmanHeader";
import { SalesmanFilterCard } from "./components/SalesmanFilterCard";
import { SalesmanTable } from "./components/SalesmanTable";
import { SuccessionModal } from "./components/modals/SuccessionModal";
import { SalesmanDetailSheet } from "./components/modals/SalesmanDetailSheet";

export default function SalesmanManagementModule() {
    const [salesmen, setSalesmen] = useState<Salesman[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("all");

    const [deactivateModal, setDeactivateModal] = useState(false);
    const [selectedSalesman, setSelectedSalesman] = useState<Salesman | null>(null);
    const [customerCount, setCustomerCount] = useState(0);

    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingSalesman, setEditingSalesman] = useState<Salesman | null>(null);

    const fetchData = useCallback(
        async (p: number, s: string, status: "active" | "inactive" | "all", reset: boolean = false) => {
            if (p === 1) setLoading(true);
            else setLoadingMore(true);

            try {
                const activeOnly = status === "all" ? undefined : status === "active";
                const result = await salesmanProvider.getSalesmen(p, 20, s, activeOnly);

                if (reset) {
                    setSalesmen(result.data);
                } else {
                    setSalesmen((prev) => [...prev, ...result.data]);
                }
                setHasMore(result.data.length === 20);
            } catch {
                toast.error("Failed to load agents");
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        []
    );

    const handleLoadMore = useCallback(() => {
        if (!loadingMore && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchData(nextPage, debouncedSearch, statusFilter);
        }
    }, [loadingMore, hasMore, page, debouncedSearch, statusFilter, fetchData]);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(handler);
    }, [search]);

    useEffect(() => {
        if (debouncedSearch !== undefined) {
            setPage(1);
            setSalesmen([]);
            setHasMore(true);
            fetchData(1, debouncedSearch, statusFilter, true);
        }
    }, [debouncedSearch, statusFilter, fetchData]);

    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback(
        (node: HTMLDivElement | null) => {
            if (loading || loadingMore) return;
            if (observer.current) observer.current.disconnect();

            observer.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    handleLoadMore();
                }
            });

            if (node) observer.current.observe(node);
        },
        [loading, loadingMore, hasMore, handleLoadMore]
    );

    const handleToggleActive = async (salesman: Salesman, checked: boolean) => {
        if (!checked) {
            setSelectedSalesman(salesman);
            const count = await salesmanProvider.getCustomerCount(salesman.id);
            setCustomerCount(count);
            setDeactivateModal(true);
        } else {
            try {
                const res = await salesmanProvider.updateSalesman(salesman.id, { isActive: 1 });
                if (res.success) {
                    toast.success(`${salesman.salesman_name} activated.`);
                    fetchData(1, debouncedSearch, statusFilter, true);
                }
            } catch {
                toast.error("Activation failed");
            }
        }
    };

    const handleSuccessRefresh = () => {
        fetchData(1, debouncedSearch, statusFilter, true);
    };

    return (
        <div className="w-full flex flex-col gap-8 animate-in slide-in-from-bottom duration-700">
            {/* 🚀 FIXED: New Salesman Header without the Create button */}
            <SalesmanHeader />

            <SalesmanFilterCard
                search={search}
                setSearch={setSearch}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
            />

            <SalesmanTable
                salesmen={salesmen}
                loading={loading}
                loadingMore={loadingMore}
                hasMore={hasMore}
                lastElementRef={lastElementRef}
                onToggleActive={handleToggleActive}
                onEditClick={(salesman) => {
                    setEditingSalesman(salesman);
                    setSheetOpen(true);
                }}
            />

            <SuccessionModal
                open={deactivateModal}
                onOpenChange={setDeactivateModal}
                selectedSalesman={selectedSalesman}
                customerCount={customerCount}
                onSuccess={handleSuccessRefresh}
            />

            <SalesmanDetailSheet
                salesman={editingSalesman}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                onSuccess={handleSuccessRefresh}
            />
        </div>
    );
}