"use client";

import React, { useEffect, useState } from "react";
import { Plus, Search, PackageOpen, Activity, CreditCard, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useEmployeeStockPurchaseContext } from "./providers/EmployeeStockPurchaseProvider";
import { EmployeeStockPurchaseFormModal } from "./components/EmployeeStockPurchaseFormModal";
import { EmployeeStockPurchaseFormValues, EmployeeStockPurchase } from "./types";

export function EmployeeStockPurchaseModule() {
    const { data, metadata, isLoading, fetchPurchases, createPurchase } = useEmployeeStockPurchaseContext();
    const [searchQuery, setSearchQuery] = useState("");
    const [companyFilterId, setCompanyFilterId] = useState<string>("");
    const [employeeFilterName, setEmployeeFilterName] = useState<string>("");
    const [dateFilter, setDateFilter] = useState("");

    const [companies, setCompanies] = useState<{ value: string; label: string }[]>([]);
    const [users, setUsers] = useState<{ value: string; label: string }[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const [isSyncing, setIsSyncing] = useState(false);

    // Fetch companies for the filter
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const res = await fetch("/api/crm/employee-stock-purchase/options?type=companies");
                if (res.ok) {
                    const data = await res.json();
                    setCompanies(data.map((c: { company_id: string | number; company_name: string }) => ({ value: c.company_id.toString(), label: c.company_name })));
                }
            } catch (error) {
                console.error(error);
            }
        };
        fetchCompanies();
    }, []);

    // Fetch users for the filter when company changes
    useEffect(() => {
        const fetchUsers = async () => {
            if (!companyFilterId || companyFilterId === "all") {
                setUsers([]);
                setEmployeeFilterName("");
                return;
            }
            try {
                const res = await fetch(`/api/crm/employee-stock-purchase/options?type=users&companyId=${companyFilterId}`);
                if (res.ok) {
                    const data = await res.json();
                    setUsers(data.map((u: { user_fname: string; user_lname: string }) => ({
                        value: `${u.user_fname} ${u.user_lname}`,
                        label: `${u.user_fname} ${u.user_lname}`
                    })));
                }
            } catch (error) {
                console.error(error);
            }
        };
        fetchUsers();
    }, [companyFilterId]);

    const companyFilterName = companies.find(c => c.value === companyFilterId)?.label || "";

    useEffect(() => {
        fetchPurchases(currentPage, pageSize, searchQuery, companyFilterName, employeeFilterName, dateFilter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchPurchases, currentPage]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchPurchases(1, pageSize, searchQuery, companyFilterName, employeeFilterName, dateFilter);
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch("/api/crm/employee-stock-purchase/sync", { method: "POST" });
            if (res.ok) {
                await fetchPurchases(currentPage, pageSize, searchQuery, companyFilterName, employeeFilterName, dateFilter);
            }
        } catch (error) {
            console.error("Failed to sync", error);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleCreate = async (values: EmployeeStockPurchaseFormValues) => {
        return await createPurchase(values);
    };

    const totalPurchases = metadata?.total_count || 0;
    const pageTotalAmount = data.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const pendingCount = data.filter(item => item.status === "PENDING").length;

    return (
        <div className="flex-1 flex flex-col h-full bg-background/50">
            {/* Header Section */}
            <div className="shrink-0 p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-border/40 bg-background relative overflow-hidden z-10">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
                
                <div className="relative space-y-1">
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground italic flex items-center gap-3">
                        <span className="bg-blue-600 text-white p-2 rounded-xl">
                            <PackageOpen className="h-6 w-6" />
                        </span>
                        Employee Stock Purchase
                    </h1>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        Manage employee purchases and invoice tracking
                    </p>
                </div>
                
                <div className="relative w-full flex flex-wrap lg:flex-nowrap items-center gap-4 mt-4 sm:mt-0">
                    <form onSubmit={handleSearch} className="relative flex flex-1 items-center gap-3 w-full">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search..." 
                                className="h-12 w-full pl-11 pr-4 bg-muted/40 border-border/40 rounded-2xl focus-visible:ring-blue-500/20 text-sm font-bold shadow-sm transition-all placeholder:text-muted-foreground/50"
                            />
                        </div>
                        <div className="w-[180px] shrink-0">
                            <SearchableSelect
                                options={companies}
                                value={companyFilterId}
                                onValueChange={(val) => setCompanyFilterId(val)}
                                placeholder="Company..."
                                className="h-12 bg-muted/40 border-border/40 rounded-2xl focus-visible:ring-blue-500/20 text-sm font-bold shadow-sm w-full"
                            />
                        </div>
                        <div className="w-[180px] shrink-0">
                            <SearchableSelect
                                options={users}
                                value={employeeFilterName}
                                onValueChange={(val) => setEmployeeFilterName(val === "all" ? "" : val)}
                                placeholder="Employee..."
                                className="h-12 bg-muted/40 border-border/40 rounded-2xl focus-visible:ring-blue-500/20 text-sm font-bold shadow-sm w-full"
                                disabled={!companyFilterId || companyFilterId === "all"}
                            />
                        </div>
                        <Input 
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="h-12 w-36 bg-muted/40 border-border/40 rounded-2xl focus-visible:ring-blue-500/20 text-sm font-bold shadow-sm"
                        />
                        <Button type="submit" className="h-12 rounded-2xl px-6 font-bold">Filter</Button>
                    </form>
                    <Button 
                        onClick={handleSync}
                        disabled={isSyncing || isLoading}
                        variant="outline"
                        className="h-12 px-6 rounded-2xl border-blue-600/20 text-blue-600 hover:bg-blue-50 shadow-sm text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                        {isSyncing ? "Syncing..." : "Sync Status"}
                    </Button>
                    <Button 
                        onClick={() => setIsModalOpen(true)}
                        className="h-12 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Purchase
                    </Button>
                </div>
            </div>

            {/* Dashboard Cards Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 px-8 pt-8">
                <div className="bg-background rounded-3xl border border-border/40 p-6 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <PackageOpen className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Purchases</p>
                        <h3 className="text-2xl font-black">{totalPurchases}</h3>
                    </div>
                </div>
                <div className="bg-background rounded-3xl border border-border/40 p-6 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="h-12 w-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                        <Activity className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pending (This Page)</p>
                        <h3 className="text-2xl font-black">{pendingCount}</h3>
                    </div>
                </div>
                <div className="bg-background rounded-3xl border border-border/40 p-6 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="h-12 w-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                        <CreditCard className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Amount (This Page)</p>
                        <h3 className="text-2xl font-black">₱{pageTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 overflow-auto p-8 relative">
                <div className="bg-background rounded-3xl border border-border/40 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/30">
                                <tr>
                                    <th className="px-6 py-5 rounded-tl-3xl">ID</th>
                                    <th className="px-6 py-5">Employee</th>
                                    <th className="px-6 py-5">Company</th>
                                    <th className="px-6 py-5">Invoice No</th>
                                    <th className="px-6 py-5">Amount</th>
                                    <th className="px-6 py-5">Status</th>
                                    <th className="px-6 py-5">Date</th>
                                </tr>
                            </thead>
                            <tbody className="font-medium text-sm">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                                            Loading purchases...
                                        </td>
                                    </tr>
                                ) : data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center">
                                                <PackageOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                                <p className="font-bold">No purchases found</p>
                                                <p className="text-xs">Create a new stock purchase to get started.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    data.map((item: EmployeeStockPurchase) => (
                                        <tr key={item.purchase_id} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                                            <td className="px-6 py-4 font-bold text-muted-foreground">#{item.purchase_id}</td>
                                            <td className="px-6 py-4 font-bold">{item.employee_name || `User ${item.user_id}`}</td>
                                            <td className="px-6 py-4 text-muted-foreground">{item.company_name || `Company ${item.company_id}`}</td>
                                            <td className="px-6 py-4 text-muted-foreground">{item.manual_invoice_no || (item.invoice_id ? `INV-${item.invoice_id}` : "N/A")}</td>
                                            <td className="px-6 py-4 font-bold">₱{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.status === "PENDING" ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground">{item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A"}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination Footer */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-border/40 bg-muted/10">
                        <div className="text-xs font-medium text-muted-foreground">
                            {metadata && metadata.total_count > 0 ? (
                                <>
                                    Showing <span className="font-bold text-foreground">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-bold text-foreground">{Math.min(currentPage * pageSize, metadata.total_count)}</span> of <span className="font-bold text-foreground">{metadata.total_count}</span> entries
                                </>
                            ) : (
                                <>
                                    Page <span className="font-bold text-foreground">{currentPage}</span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage <= 1 || isLoading}
                                className="h-8 text-xs font-bold uppercase tracking-widest"
                            >
                                Previous
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                disabled={data.length < pageSize || isLoading}
                                className="h-8 text-xs font-bold uppercase tracking-widest"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <EmployeeStockPurchaseFormModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onSubmit={handleCreate}
            />
        </div>
    );
}
