"use client";

import React, { useState, useEffect } from "react";
import { 
    Card, 
    CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
    Search, 
    TrendingUp,
    Target,
    Users,
    Mail
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { targetSettingsProvider } from "@/modules/customer-relationship-management/target-settings/providers/fetchProvider";
import { SalesmanWithTarget, ProductSummary, ProductPricing, TacticalSKU } from "@/modules/customer-relationship-management/target-settings/types";
import { TargetFormDialog } from "@/modules/customer-relationship-management/target-settings/components/TargetFormDialog";
import { toast } from "sonner";

export function TargetSettingsModule() {
    const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1));
    const [year, setYear] = useState<string>(String(new Date().getFullYear()));
    const [salesmen, setSalesmen] = useState<SalesmanWithTarget[]>([]);
    const [allProducts, setAllProducts] = useState<ProductSummary[]>([]);
    const [productPricing, setProductPricing] = useState<ProductPricing[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSalesman, setSelectedSalesman] = useState<SalesmanWithTarget | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const months = [
        { value: "1", label: "January" },
        { value: "2", label: "February" },
        { value: "3", label: "March" },
        { value: "4", label: "April" },
        { value: "5", label: "May" },
        { value: "6", label: "June" },
        { value: "7", label: "July" },
        { value: "8", label: "August" },
        { value: "9", label: "September" },
        { value: "10", label: "October" },
        { value: "11", label: "November" },
        { value: "12", label: "December" },
    ];

    const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 2 + i));

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
        
        return Math.round(metrics.reduce((a, b) => a + b, 0) / metrics.length || 1);
    };

    const bookingSalesmen = filteredSalesmen.filter(s => s.operation === 1);
    const siteSalesSalesmen = filteredSalesmen.filter(s => s.operation === 3);

    const stats = {
        total: salesmen.length,
        set: salesmen.filter(s => s.current_target).length,
        rate: salesmen.length > 0 ? Math.round((salesmen.filter(s => s.current_target).length / salesmen.length) * 100) : 0
    };

    function SalesmanCard({ salesman }: { salesman: SalesmanWithTarget }) {
        const target = salesman.current_target;
        const progress = getOverallProgress(salesman);
        
        const volumeProgress = target ? calculateProgress(salesman.current_volume || 0, target.volume) : 0;
        const secondaryProgress = target ? (
            salesman.operation === 1 
                ? calculateProgress(salesman.current_frequency || 0, target.frequency)
                : calculateProgress(salesman.current_new_accounts || 0, target.new_accounts)
        ) : 0;

        const secondaryLabel = salesman.operation === 1 ? "Frequency" : "New Accounts";
        const secondaryCurrent = salesman.operation === 1 ? (salesman.current_frequency || 0) : (salesman.current_new_accounts || 0);
        const secondaryTarget = target ? (salesman.operation === 1 ? target.frequency : target.new_accounts) : 0;

        return (
            <Card className="shadow-sm hover:shadow-md transition-all border border-muted/60 overflow-hidden">
                <CardContent className="p-5 space-y-6">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <h3 className="font-bold text-lg leading-none">{salesman.salesman_name}</h3>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                                <Mail className="w-3 h-3" /> {salesman.email || `${salesman.salesman_code.toLowerCase()}@vos.com`}
                            </div>
                        </div>
                        <Badge variant="secondary" className="px-3 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold tracking-wide uppercase">
                            {salesman.operation === 1 ? "Booking" : "Sites Sales"}
                        </Badge>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-muted-foreground uppercase tracking-wider">Overall Progress</span>
                                <span className="font-bold">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-1.5 bg-muted" />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Volume</span>
                                <span className="font-mono text-[10px] font-bold">
                                    {target ? `${(salesman.current_volume || 0).toLocaleString()} / ${target.volume.toLocaleString()}` : "No target"}
                                </span>
                            </div>
                            <Progress value={volumeProgress} className="h-1 bg-muted" />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">{secondaryLabel}</span>
                                <span className="font-mono text-[10px] font-bold">
                                    {target ? `${secondaryCurrent} / ${secondaryTarget}` : "No target"}
                                </span>
                            </div>
                            <Progress value={secondaryProgress} className="h-1 bg-muted" />
                        </div>
                    </div>

                    <div className="pt-2 border-t flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            {target ? (
                                <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase">
                                    <div className="w-4 h-4 rounded-full border border-emerald-500/30 flex items-center justify-center">
                                        <TrendingUp className="w-2.5 h-2.5" />
                                    </div>
                                    On Track
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-muted-foreground/50 font-bold text-[10px] uppercase italic">
                                    <Target className="w-3 h-3" />
                                    No target set for this month
                                </div>
                            )}
                        </div>
                        
                        {target ? (
                            <Button 
                                variant="outline" 
                                className="w-full rounded-lg h-9 gap-2 text-xs font-bold border-muted/50 hover:bg-muted/30"
                                onClick={() => handleEditTarget(salesman)}
                            >
                                <Target className="w-3.5 h-3.5" /> Update Target
                            </Button>
                        ) : (
                            <Button 
                                className="w-full rounded-lg h-9 gap-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                                onClick={() => handleEditTarget(salesman)}
                            >
                                <Target className="w-3.5 h-3.5" /> Set Target
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="p-8 space-y-10 max-w-[1400px] mx-auto bg-slate-50/30 min-h-screen">
            <header className="flex justify-between items-start">
                <div className="space-y-1.5">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Target Settings</h1>
                    <p className="text-sm text-muted-foreground font-medium">Manage and track salesman targets and performance</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white rounded-lg border shadow-sm px-4 h-10">
                        <Select value={month} onValueChange={setMonth}>
                            <SelectTrigger className="w-[120px] border-none focus:ring-0 shadow-none text-sm font-medium">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map(m => (
                                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center bg-white rounded-lg border shadow-sm px-1 h-10">
                        <Select value={year} onValueChange={setYear}>
                            <SelectTrigger className="w-[80px] border-none focus:ring-0 shadow-none text-sm font-medium">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(y => (
                                    <SelectItem key={y} value={y}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-sm border border-muted/50 rounded-2xl h-[120px]">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1.5">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Salesmen</p>
                            <p className="text-3xl font-black">{stats.total}</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <Users className="w-7 h-7 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border border-muted/50 rounded-2xl h-[120px]">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1.5">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Targets Set</p>
                            <p className="text-3xl font-black">{stats.set}</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                            <Target className="w-7 h-7 text-emerald-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border border-muted/50 rounded-2xl h-[120px]">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1.5">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Completion Rate</p>
                            <p className="text-3xl font-black">{stats.rate}%</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center">
                            <TrendingUp className="w-7 h-7 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                            placeholder="Enter salesman name or code..." 
                            className="pl-9 h-10 bg-white border-muted/60"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

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
                                {bookingSalesmen.map(s => <SalesmanCard key={s.id} salesman={s} />)}
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
                                {siteSalesSalesmen.map(s => <SalesmanCard key={s.id} salesman={s} />)}
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
