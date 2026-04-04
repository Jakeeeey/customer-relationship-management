"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { targetSettingsProvider } from "@/modules/customer-relationship-management/target-settings/providers/fetchProvider";
import { SalesmanWithTarget, ProductSummary, ProductPricing, TacticalSKU } from "@/modules/customer-relationship-management/target-settings/types";
import { TargetFormDialog } from "@/modules/customer-relationship-management/target-settings/components/TargetFormDialog";
import { toast } from "sonner";
import { StatsCards } from "./components/StatsCards";
import { SalesmanCard } from "./components/SalesmanCard";
import { FilterHeader } from "./components/FilterHeader";

export function TargetSettingsModule() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initialize state from URL Search Params or current date
    const [month, setMonth] = useState<string>(searchParams.get("month") || String(new Date().getMonth() + 1));
    const [year, setYear] = useState<string>(searchParams.get("year") || String(new Date().getFullYear()));
    const [salesmen, setSalesmen] = useState<SalesmanWithTarget[]>([]);
    const [allProducts, setAllProducts] = useState<ProductSummary[]>([]);
    const [productPricing, setProductPricing] = useState<ProductPricing[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSalesman, setSelectedSalesman] = useState<SalesmanWithTarget | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleFilterChange = (newMonth: string, newYear: string) => {
        setMonth(newMonth);
        setYear(newYear);
        const params = new URLSearchParams(searchParams.toString());
        params.set("month", newMonth);
        params.set("year", newYear);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await targetSettingsProvider.getTargets(Number(month), Number(year));

            // Map targets to salesmen
            const mappedSalesmen = data.salesmen.map((s: SalesmanWithTarget) => {
                const target = data.targets.find((t: { salesman_id: number; id: number; tactical_skus?: TacticalSKU[] }) => t.salesman_id === s.id);
                if (target) {
                    target.tactical_skus = data.tacticalSkus.filter((ts: { salesman_target_setting_id: number }) => ts.salesman_target_setting_id === target.id);
                }
                return { ...s, current_target: target };
            });

            setSalesmen(mappedSalesmen);
            setAllProducts(data.allProducts || []);
            setProductPricing(data.productPricing || []);
        } catch {
            toast.error("Failed to fetch target settings");
        } finally {
            setLoading(false);
        }
    }, [month, year]);

    useEffect(() => {
        const m = searchParams.get("month");
        const y = searchParams.get("year");
        if (m) setMonth(m);
        if (y) setYear(y);
    }, [searchParams]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredSalesmen = salesmen.filter(s =>
        s.salesman_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.salesman_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEditTarget = (salesman: SalesmanWithTarget) => {
        setSelectedSalesman(salesman);
        setIsDialogOpen(true);
    };

    const calculateProgress = (current: number, target: number) => {
        if (!target || target === 0) return 0;
        return Math.min(100, Math.round((current / target) * 100));
    };

    const getOverallProgress = (salesman: SalesmanWithTarget) => {
        if (!salesman.current_target) return 0;

        const metrics = [];
        if (salesman.operation === 1) { // Booking
            metrics.push(calculateProgress(salesman.current_volume || 0, salesman.current_target.volume));
            metrics.push(calculateProgress(salesman.current_frequency || 0, salesman.current_target.frequency));
        } else { // Site Sales
            metrics.push(calculateProgress(salesman.current_volume || 0, salesman.current_target.volume));
            metrics.push(calculateProgress(salesman.current_new_accounts || 0, salesman.current_target.new_accounts));
        }

        const average = metrics.reduce((a, b) => a + b, 0) / (metrics.length || 1);
        return Math.round(average);
    };

    const bookingSalesmen = filteredSalesmen.filter(s => s.operation === 1);
    const siteSalesSalesmen = filteredSalesmen.filter(s => s.operation === 3);

    const salesmenWithTargets = salesmen.filter(s => s.current_target);
    const totalProgress = salesmenWithTargets.reduce((acc, s) => acc + getOverallProgress(s), 0);
    const averageProgress = salesmenWithTargets.length > 0
        ? Math.round(totalProgress / salesmenWithTargets.length)
        : 0;

    return (
        <div className="p-8 space-y-10 max-w-[1400px] mx-auto bg-slate-50/30 min-h-screen">
            <FilterHeader
                month={month}
                year={year}
                searchTerm={searchTerm}
                onFilterChange={handleFilterChange}
                onSearchChange={setSearchTerm}
            />

            <StatsCards
                totalSalesmen={salesmen.length}
                targetsSet={salesmenWithTargets.length}
                completionRate={averageProgress}
            />

            <div className="space-y-12">
                {/* Booking Section */}
                {bookingSalesmen.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold tracking-tight">Booking Salesmen</h2>
                            <Badge variant="secondary" className="px-2 h-5 rounded-full text-[10px] font-black bg-muted/60">
                                {bookingSalesmen.length}
                            </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {bookingSalesmen.map(s => (
                                <SalesmanCard key={s.id} salesman={s} onEditTarget={handleEditTarget} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Site Sales Section */}
                {siteSalesSalesmen.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold tracking-tight">Sites Sales Salesmen</h2>
                            <Badge variant="secondary" className="px-2 h-5 rounded-full text-[10px] font-black bg-muted/60">
                                {siteSalesSalesmen.length}
                            </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {siteSalesSalesmen.map(s => (
                                <SalesmanCard key={s.id} salesman={s} onEditTarget={handleEditTarget} />
                            ))}
                        </div>
                    </div>
                )}

                {!loading && filteredSalesmen.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-white rounded-3xl border border-dashed">
                        <Search className="w-12 h-12 mb-4 opacity-20" />
                        <p className="font-bold">No salesmen found</p>
                        <p className="text-xs">Try adjusting your search or filters</p>
                    </div>
                )}

                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-[300px] w-full rounded-2xl" />
                        ))}
                    </div>
                )}
            </div>

            {selectedSalesman && (
                <TargetFormDialog
                    key={`${selectedSalesman.id}-${month}-${year}`}
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    salesman={selectedSalesman}
                    allProducts={allProducts}
                    productPricing={productPricing}
                    month={Number(month)}
                    year={Number(year)}
                    onSuccess={fetchData}
                />
            )}
        </div>
    );
}
