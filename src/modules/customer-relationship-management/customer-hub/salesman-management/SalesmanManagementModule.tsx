"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Users, Search, Truck, CheckCircle2, AlertTriangle, Loader2, ChevronsUpDown, Check, UserPlus, Hash, Building2, MapPin, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { salesmanProvider } from "./providers/fetchProvider";
import { Salesman, Branch, Division, Operation, User } from "./types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SalesmanManagementModule() {
    // Data State
    const [salesmen, setSalesmen] = useState<Salesman[]>([]);

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("all");
    const [activeSalesmenForSuccession, setActiveSalesmenForSuccession] = useState<Salesman[]>([]);
    const [loadingActive, setLoadingActive] = useState(false);

    // Deactivation State
    const [deactivateModal, setDeactivateModal] = useState(false);
    const [selectedSalesman, setSelectedSalesman] = useState<Salesman | null>(null);
    const [customerCount, setCustomerCount] = useState(0);
    const [reassignmentSalesmanId, setReassignmentSalesmanId] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);

    // New Salesman Modal State
    const [createModal, setCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [loadingSupportingData, setLoadingSupportingData] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [operations, setOperations] = useState<Operation[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    // New Agent Form State
    const [newAgent, setNewAgent] = useState({
        salesman_name: "",
        salesman_code: "",
        employee_id: "",
        truck_plate: "",
        division_id: "",
        branch_code: "",
        operation: "",
        company_code: "",
        supplier_code: "",
        price_type: "",
        encoder_id: "",
        inventory_day: "",
        isActive: true,
        isInventory: false,
        canCollect: false,
    });

    // Popover open states for searchable dropdowns
    const [openEncoder, setOpenEncoder] = useState(false);
    const [openDivision, setOpenDivision] = useState(false);
    const [openBranch, setOpenBranch] = useState(false);
    const [openOperation, setOpenOperation] = useState(false);
    const [openPriceType, setOpenPriceType] = useState(false);
    const [openInventoryDay, setOpenInventoryDay] = useState(false);

    const fetchData = useCallback(async (p: number, s: string, status: "active" | "inactive" | "all", reset: boolean = false) => {
        if (p === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            const activeOnly = status === "all" ? undefined : status === "active";
            const result = await salesmanProvider.getSalesmen(p, 20, s, activeOnly);
            if (reset) {
                setSalesmen(result.data);
            } else {
                setSalesmen(prev => [...prev, ...result.data]);
            }
            setHasMore(result.data.length === 20);
        } catch {
            toast.error("Failed to load agents");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    const handleLoadMore = useCallback(() => {
        if (!loadingMore && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchData(nextPage, debouncedSearch, statusFilter);
        }
    }, [loadingMore, hasMore, page, debouncedSearch, statusFilter, fetchData]);


    // Debounce search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

    // Handle search or status change - reset pagination
    useEffect(() => {
        if (debouncedSearch !== undefined) {
            setPage(1);
            setSalesmen([]);
            setHasMore(true);
            fetchData(1, debouncedSearch, statusFilter, true);
        }
    }, [debouncedSearch, statusFilter, fetchData]);

    const loadActiveSalesmen = useCallback(async () => {
        setLoadingActive(true);
        try {
            // Fetch a large enough batch of active salesmen for the dropdown
            const res = await salesmanProvider.getSalesmen(1, 500, "", true);
            setActiveSalesmenForSuccession(res.data.filter(s => s.id !== selectedSalesman?.id));
        } catch {
            toast.error("Failed to load active handlers");
        } finally {
            setLoadingActive(false);
        }
    }, [selectedSalesman]);

    // Load active salesmen for succession when modal opens
    useEffect(() => {
        if (deactivateModal) {
            loadActiveSalesmen();
        } else {
            setActiveSalesmenForSuccession([]);
            setReassignmentSalesmanId("");
        }
    }, [deactivateModal, loadActiveSalesmen]);

    // Load supporting data when create modal opens
    useEffect(() => {
        if (createModal) {
            setLoadingSupportingData(true);
            salesmanProvider.getSupportingData()
                .then((data) => {
                    setBranches(data.branches);
                    setDivisions(data.divisions);
                    setOperations(data.operations);
                    setUsers(data.users);
                })
                .catch(() => toast.error("Failed to load form data"))
                .finally(() => setLoadingSupportingData(false));
        }
    }, [createModal]);

    const resetCreateForm = () => {
        setNewAgent({
            salesman_name: "",
            salesman_code: "",
            employee_id: "",
            truck_plate: "",
            division_id: "",
            branch_code: "",
            operation: "",
            company_code: "",
            supplier_code: "",
            price_type: "",
            encoder_id: "",
            inventory_day: "",
            isActive: true,
            isInventory: false,
            canCollect: false,
        });
    };

    const handleCreateSalesman = async () => {
        // Validation
        if (!newAgent.salesman_name.trim()) {
            toast.error("Salesman name is required.");
            return;
        }
        if (!newAgent.salesman_code.trim()) {
            toast.error("Salesman code is required.");
            return;
        }
        if (!newAgent.employee_id) {
            toast.error("Employee ID is required.");
            return;
        }

        setIsCreating(true);
        try {
            const payload: Partial<Salesman> = {
                salesman_name: newAgent.salesman_name.trim().toUpperCase(),
                salesman_code: newAgent.salesman_code.trim().toUpperCase(),
                employee_id: Number(newAgent.employee_id),
                isActive: newAgent.isActive ? 1 : 0,
                isInventory: newAgent.isInventory ? 1 : 0,
                canCollect: newAgent.canCollect ? 1 : 0,
            };

            if (newAgent.truck_plate.trim()) payload.truck_plate = newAgent.truck_plate.trim().toUpperCase();
            if (newAgent.division_id) payload.division_id = Number(newAgent.division_id);
            if (newAgent.branch_code) payload.branch_code = Number(newAgent.branch_code);
            if (newAgent.operation) payload.operation = Number(newAgent.operation);
            if (newAgent.company_code) payload.company_code = Number(newAgent.company_code);
            if (newAgent.supplier_code) payload.supplier_code = Number(newAgent.supplier_code);
            if (newAgent.price_type) payload.price_type = newAgent.price_type;
            if (newAgent.encoder_id) payload.encoder_id = Number(newAgent.encoder_id);
            if (newAgent.inventory_day) payload.inventory_day = Number(newAgent.inventory_day);

            const res = await salesmanProvider.createSalesman(payload);

            if (res.success) {
                toast.success(`Salesman ${newAgent.salesman_name.toUpperCase()} has been enlisted.`);
                setCreateModal(false);
                resetCreateForm();
                fetchData(1, debouncedSearch, statusFilter, true);
            } else {
                toast.error(res.error || "Failed to create salesman.");
            }
        } catch {
            toast.error("Critical error during creation.");
        } finally {
            setIsCreating(false);
        }
    };

    // Infinite Scroll Implementation
    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback((node: HTMLDivElement | null) => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                handleLoadMore();
            }
        });

        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore, handleLoadMore]);

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

    const confirmDeactivation = async () => {
        if (!selectedSalesman) return;
        if (customerCount > 0 && !reassignmentSalesmanId) {
            toast.error("Successor required.");
            return;
        }

        setIsProcessing(true);
        try {
            const res = await salesmanProvider.deactivateAndReassign(
                selectedSalesman.id,
                Number(reassignmentSalesmanId)
            );

            if (res.success) {
                toast.success(`Agent retired. Customers transferred.`);
                setDeactivateModal(false);
                fetchData(1, debouncedSearch, statusFilter, true);
            } else {
                toast.error(res.error || "Deactivation failed");
            }
        } catch {
            toast.error("Critical error");
        } finally {
            setIsProcessing(false);
        }
    };


    return (
        <div className="w-full flex flex-col gap-8 animate-in slide-in-from-bottom duration-700">
            {/* Standard Header Style */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                        <Users className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Salesman Management</h1>
                        <p className="text-sm text-muted-foreground font-medium">Configure salesmen, logistics, and account succession</p>
                    </div>
                </div>
                <Button className="font-bold uppercase tracking-wider h-11 px-6 shadow-md transition-all" onClick={() => setCreateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Salesman
                </Button>
            </div>

            {/* Filter Section - Based on SalesOrderHeader aesthetic */}
            <Card className="shadow-sm border-muted-foreground/10 overflow-hidden">
                <CardHeader className="py-4 px-6 flex flex-row items-center justify-between border-b bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Search & Filter</span>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="relative flex-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1">Salesman Identity</label>
                            <Search className="absolute left-3 top-[34px] h-4 w-4 text-muted-foreground opacity-50" />
                            <Input
                                placeholder="Search by name or code..."
                                className="pl-9 h-10 text-xs font-semibold border-muted-foreground/20 rounded-xl"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block px-1">Engagement Status</label>
                            <Select value={statusFilter} onValueChange={(v: "active" | "inactive" | "all") => setStatusFilter(v)}>
                                <SelectTrigger className="h-10 text-xs font-black uppercase tracking-widest border-muted-foreground/20 rounded-xl shadow-sm bg-white">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                                    <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest py-3">All</SelectItem>
                                    <SelectItem value="active" className="text-[10px] font-black uppercase tracking-widest py-3">Active Only</SelectItem>
                                    <SelectItem value="inactive" className="text-[10px] font-black uppercase tracking-widest py-3">Inactive Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Main Content - Table Card */}
            <Card className="shadow-sm border-muted-foreground/10 overflow-hidden">
                <CardHeader className="py-4 px-6 flex flex-row items-center justify-between border-b bg-primary/5">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm font-bold uppercase tracking-wider">Salesman Roster</CardTitle>
                    </div>
                    <Badge variant="default" className="text-[10px]">{salesmen.length} Loaded</Badge>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                                <TableRow>
                                    <TableHead className="text-[10px] font-black uppercase bg-muted/50 h-10 px-6">Identifier</TableHead>
                                    <TableHead className="text-center text-[10px] font-black uppercase bg-muted/50 h-10 w-[80px]">Status</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase bg-muted/50 h-10">Logistics / Territory</TableHead>
                                    <TableHead className="text-right text-[10px] font-black uppercase bg-muted/50 h-10 px-6 w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-64 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="w-6 h-6 animate-spin text-primary opacity-50" />
                                                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Loading salesmen...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : salesmen.map((s: Salesman) => (
                                    <TableRow key={s.id} className={`hover:bg-muted/10 ${!s.isActive && 'opacity-60 bg-muted/5'}`}>
                                        <TableCell className="py-4 px-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-800 uppercase leading-none">{s.salesman_name}</span>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge variant="outline" className="text-[9px] font-bold px-1.5 h-4 border-slate-200 text-slate-400">
                                                        {s.salesman_code}
                                                    </Badge>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">EMP ID: {s.employee_id}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <Checkbox
                                                    checked={!!s.isActive}
                                                    onCheckedChange={(checked) => handleToggleActive(s, !!checked)}
                                                    className="w-5 h-5"
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex flex-wrap gap-x-6 gap-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Truck className="w-3.5 h-3.5 text-primary opacity-60" />
                                                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{s.truck_plate || "No Truck"}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] px-1.5 h-4 font-black">P{s.price_type || "A"}</Badge>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                        {(s.branch_code && typeof s.branch_code === 'object') ? (s.branch_code as Branch).branch_name : "Central Office"}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right px-6">
                                            <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-primary hover:bg-primary/10 transition-colors">Config</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {hasMore && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="p-0">
                                            <div ref={lastElementRef} className="h-10 flex items-center justify-center">
                                                {loadingMore && <Loader2 className="w-4 h-4 animate-spin text-primary/40" />}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!loading && salesmen.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-64 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground opacity-30">
                                                <Users className="w-12 h-12" />
                                                <span className="font-bold uppercase text-xs">No salesmen found</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Deactivation & Succession Dialog */}
            <Dialog open={deactivateModal} onOpenChange={(open) => !open && setDeactivateModal(false)}>
                <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white animate-in zoom-in-95 duration-200">
                    <DialogHeader className="p-8 border-b bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-inner shrink-0">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">Succession Handover</DialogTitle>
                                <DialogDescription className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1 leading-none">
                                    Operational Continuity Protocol
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-8 space-y-8">
                        {customerCount > 0 ? (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Retiring Salesman</p>
                                        <p className="text-[11px] font-black text-slate-900 uppercase truncate tracking-tight">{selectedSalesman?.salesman_name}</p>
                                    </div>
                                    <div className="space-y-1.5 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg shadow-slate-200">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Impact Exposure</p>
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-[13px] font-black text-white tracking-tighter">{customerCount} ACCOUNTS</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Assign New Handler</label>
                                        <Badge variant="outline" className="text-[8px] font-black text-primary border-primary/20 h-4 px-1.5">REQUIRED</Badge>
                                    </div>

                                    <Popover modal={true}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-full h-14 justify-between font-black uppercase text-[11px] tracking-widest border-2 border-slate-100 rounded-xl px-4 hover:bg-slate-50 hover:border-slate-200 transition-all shadow-sm"
                                            >
                                                <div className="flex flex-col items-start min-w-0">
                                                    <span className="truncate opacity-50 text-[9px] font-bold tracking-normal leading-none mb-1">Select Successor</span>
                                                    <span className="truncate leading-none">
                                                        {reassignmentSalesmanId
                                                            ? activeSalesmenForSuccession.find(s => s.id.toString() === reassignmentSalesmanId)?.salesman_name
                                                            : loadingActive ? "RETRIEVING SALESMAN LIST..." : "SCAN FOR AVAILABLE SALESMEN..."}
                                                    </span>
                                                </div>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[376px] p-0 shadow-2xl rounded-xl border-slate-100" align="start" sideOffset={8}>
                                            <Command className="rounded-xl overflow-hidden" onWheel={(e) => e.stopPropagation()}>
                                                <div className="flex items-center border-b px-3 bg-slate-50/50">
                                                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-40" />
                                                    <CommandInput
                                                        placeholder="SEARCH ACTIVE SALESMEN..."
                                                        className="h-12 text-[11px] font-black uppercase tracking-widest bg-transparent border-none outline-none ring-0 focus:ring-0"
                                                    />
                                                </div>
                                                <CommandList className="max-h-[280px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-200">
                                                    {loadingActive ? (
                                                        <div className="py-12 flex flex-col items-center gap-2">
                                                            <Loader2 className="w-5 h-5 animate-spin text-primary opacity-50" />
                                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Compiling active roster...</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <CommandEmpty className="py-12 text-[10px] font-black uppercase text-slate-300 tracking-[0.3em] text-center italic">No operators identified.</CommandEmpty>
                                                            <CommandGroup className="px-1 py-1">
                                                                {activeSalesmenForSuccession.map((s) => (
                                                                    <CommandItem
                                                                        key={s.id}
                                                                        value={s.salesman_name}
                                                                        onSelect={() => setReassignmentSalesmanId(s.id.toString())}
                                                                        className="flex items-center gap-3 py-3.5 px-3 rounded-lg font-black uppercase text-[11px] tracking-[0.1em] aria-selected:bg-slate-900 aria-selected:text-white transition-all cursor-pointer group"
                                                                    >
                                                                        <div className={cn(
                                                                            "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                                                            reassignmentSalesmanId === s.id.toString() ? "bg-white border-white" : "border-slate-200 group-aria-selected:border-white/30"
                                                                        )}>
                                                                            <Check className={cn("h-2.5 w-2.5 text-slate-900 transition-all", reassignmentSalesmanId === s.id.toString() ? "opacity-100 scale-100" : "opacity-0 scale-50")} />
                                                                        </div>
                                                                        <div className="flex flex-col min-w-0">
                                                                            <span className="truncate">{s.salesman_name}</span>
                                                                            <span className={cn("text-[8px] font-bold tracking-normal opacity-40 mt-0.5", reassignmentSalesmanId === s.id.toString() ? "text-white" : "text-slate-500")}>
                                                                                CODE: {s.salesman_code}
                                                                            </span>
                                                                        </div>
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </>
                                                    )}
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </>
                        ) : (
                            <div className="py-6 text-center flex flex-col items-center gap-6">
                                <div className="p-5 rounded-3xl bg-emerald-50 text-emerald-500 shadow-inner">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-base font-black text-slate-900 uppercase tracking-tight">Direct Deactivation</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-[200px] leading-relaxed">
                                        Zero customer impact detected. Salesman can be retired immediately.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-8 pt-0 flex gap-3">
                        <Button
                            variant="ghost"
                            className="flex-1 font-black uppercase text-[10px] tracking-widest h-12 rounded-xl text-slate-400 hover:text-slate-900 transition-all"
                            onClick={() => setDeactivateModal(false)}
                            disabled={isProcessing}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-[2] font-black uppercase text-[10px] tracking-widest h-12 rounded-xl shadow-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-20 transition-all"
                            onClick={confirmDeactivation}
                            disabled={isProcessing || (customerCount > 0 && !reassignmentSalesmanId)}
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {isProcessing ? "PROCESSING TRANSFERS..." : customerCount > 0 ? "CONFIRM SUCCESSION" : "CONFIRM RETIREMENT"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* NEW SALESMAN CREATION DIALOG                               */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <Dialog open={createModal} onOpenChange={(open) => { if (!open) { setCreateModal(false); resetCreateForm(); } }}>
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white animate-in zoom-in-95 duration-200">
                    <DialogHeader className="p-8 pb-6 border-b bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0">
                                <UserPlus className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">Enlist New Salesman</DialogTitle>
                                <DialogDescription className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1 leading-none">
                                    Salesman Onboarding Protocol
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {loadingSupportingData ? (
                        <div className="py-20 flex flex-col items-center gap-3">
                            <Loader2 className="w-6 h-6 animate-spin text-primary opacity-50" />
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Initializing onboarding form...</span>
                        </div>
                    ) : (
                        <ScrollArea className="max-h-[60vh]">
                            <div className="p-8 space-y-8">
                                {/* ── Section 1: Identity ── */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2">
                                        <Hash className="w-3.5 h-3.5 text-primary" />
                                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Identity</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Salesman Name <span className="text-red-400">*</span></Label>
                                            <Input
                                                placeholder="Full name of the salesman"
                                                className="h-11 text-xs font-bold uppercase border-muted-foreground/20 rounded-xl"
                                                value={newAgent.salesman_name}
                                                onChange={(e) => setNewAgent(prev => ({ ...prev, salesman_name: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Salesman Code <span className="text-red-400">*</span></Label>
                                            <Input
                                                placeholder="e.g. SM001"
                                                className="h-11 text-xs font-bold uppercase border-muted-foreground/20 rounded-xl"
                                                value={newAgent.salesman_code}
                                                onChange={(e) => setNewAgent(prev => ({ ...prev, salesman_code: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Employee ID <span className="text-red-400">*</span></Label>
                                            <Input
                                                type="number"
                                                placeholder="Numeric ID"
                                                className="h-11 text-xs font-bold border-muted-foreground/20 rounded-xl"
                                                value={newAgent.employee_id}
                                                onChange={(e) => setNewAgent(prev => ({ ...prev, employee_id: e.target.value }))}
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Encoder / Linked User</Label>
                                            <Popover open={openEncoder} onOpenChange={setOpenEncoder}>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="w-full h-11 justify-between text-xs font-bold uppercase border-muted-foreground/20 rounded-xl px-3">
                                                        <span className={cn("truncate", !newAgent.encoder_id && "text-muted-foreground")}>
                                                            {newAgent.encoder_id ? users.find(u => u.user_id.toString() === newAgent.encoder_id)?.user_fname + " " + users.find(u => u.user_id.toString() === newAgent.encoder_id)?.user_lname : "Select linked user (optional)"}
                                                        </span>
                                                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-30" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-2xl rounded-xl border-slate-100" align="start" sideOffset={4}>
                                                    <Command className="rounded-xl" onWheel={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center border-b px-3 bg-slate-50/50">
                                                            <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-40" />
                                                            <CommandInput placeholder="Search users..." className="h-10 text-xs font-bold uppercase border-none outline-none ring-0 focus:ring-0" />
                                                        </div>
                                                        <CommandList className="max-h-[200px]">
                                                            <CommandEmpty className="py-6 text-[10px] font-bold uppercase text-slate-300 text-center">No user found.</CommandEmpty>
                                                            <CommandGroup>
                                                                {users.map((u) => (
                                                                    <CommandItem key={u.user_id} value={`${u.user_fname} ${u.user_lname}`} onSelect={() => { setNewAgent(prev => ({ ...prev, encoder_id: u.user_id.toString() })); setOpenEncoder(false); }} className="text-xs font-bold uppercase py-2.5 cursor-pointer">
                                                                        <Check className={cn("mr-2 h-3.5 w-3.5", newAgent.encoder_id === u.user_id.toString() ? "opacity-100" : "opacity-0")} />
                                                                        {u.user_fname} {u.user_lname} — {u.user_position}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* ── Section 2: Assignment ── */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-3.5 h-3.5 text-primary" />
                                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Assignment</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Division</Label>
                                            <Popover open={openDivision} onOpenChange={setOpenDivision}>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="w-full h-11 justify-between text-xs font-bold uppercase border-muted-foreground/20 rounded-xl px-3">
                                                        <span className={cn("truncate", !newAgent.division_id && "text-muted-foreground")}>
                                                            {newAgent.division_id ? divisions.find(d => d.division_id.toString() === newAgent.division_id)?.division_name : "Select division"}
                                                        </span>
                                                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-30" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-2xl rounded-xl border-slate-100" align="start" sideOffset={4}>
                                                    <Command className="rounded-xl" onWheel={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center border-b px-3 bg-slate-50/50">
                                                            <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-40" />
                                                            <CommandInput placeholder="Search divisions..." className="h-10 text-xs font-bold uppercase border-none outline-none ring-0 focus:ring-0" />
                                                        </div>
                                                        <CommandList className="max-h-[200px]">
                                                            <CommandEmpty className="py-6 text-[10px] font-bold uppercase text-slate-300 text-center">No division found.</CommandEmpty>
                                                            <CommandGroup>
                                                                {divisions.map((d) => (
                                                                    <CommandItem key={d.division_id} value={d.division_name} onSelect={() => { setNewAgent(prev => ({ ...prev, division_id: d.division_id.toString() })); setOpenDivision(false); }} className="text-xs font-bold uppercase py-2.5 cursor-pointer">
                                                                        <Check className={cn("mr-2 h-3.5 w-3.5", newAgent.division_id === d.division_id.toString() ? "opacity-100" : "opacity-0")} />
                                                                        {d.division_name}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Branch</Label>
                                            <Popover open={openBranch} onOpenChange={setOpenBranch}>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="w-full h-11 justify-between text-xs font-bold uppercase border-muted-foreground/20 rounded-xl px-3">
                                                        <span className={cn("truncate", !newAgent.branch_code && "text-muted-foreground")}>
                                                            {newAgent.branch_code ? branches.find(b => b.id.toString() === newAgent.branch_code)?.branch_name : "Select branch"}
                                                        </span>
                                                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-30" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-2xl rounded-xl border-slate-100" align="start" sideOffset={4}>
                                                    <Command className="rounded-xl" onWheel={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center border-b px-3 bg-slate-50/50">
                                                            <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-40" />
                                                            <CommandInput placeholder="Search branches..." className="h-10 text-xs font-bold uppercase border-none outline-none ring-0 focus:ring-0" />
                                                        </div>
                                                        <CommandList className="max-h-[200px]">
                                                            <CommandEmpty className="py-6 text-[10px] font-bold uppercase text-slate-300 text-center">No branch found.</CommandEmpty>
                                                            <CommandGroup>
                                                                {branches.map((b) => (
                                                                    <CommandItem key={b.id} value={b.branch_name} onSelect={() => { setNewAgent(prev => ({ ...prev, branch_code: b.id.toString() })); setOpenBranch(false); }} className="text-xs font-bold uppercase py-2.5 cursor-pointer">
                                                                        <Check className={cn("mr-2 h-3.5 w-3.5", newAgent.branch_code === b.id.toString() ? "opacity-100" : "opacity-0")} />
                                                                        {b.branch_name}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Operation</Label>
                                            <Popover open={openOperation} onOpenChange={setOpenOperation}>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="w-full h-11 justify-between text-xs font-bold uppercase border-muted-foreground/20 rounded-xl px-3">
                                                        <span className={cn("truncate", !newAgent.operation && "text-muted-foreground")}>
                                                            {newAgent.operation ? operations.find(o => o.id.toString() === newAgent.operation)?.operation_name : "Select operation"}
                                                        </span>
                                                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-30" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-2xl rounded-xl border-slate-100" align="start" sideOffset={4}>
                                                    <Command className="rounded-xl" onWheel={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center border-b px-3 bg-slate-50/50">
                                                            <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-40" />
                                                            <CommandInput placeholder="Search operations..." className="h-10 text-xs font-bold uppercase border-none outline-none ring-0 focus:ring-0" />
                                                        </div>
                                                        <CommandList className="max-h-[200px]">
                                                            <CommandEmpty className="py-6 text-[10px] font-bold uppercase text-slate-300 text-center">No operation found.</CommandEmpty>
                                                            <CommandGroup>
                                                                {operations.map((o) => (
                                                                    <CommandItem key={o.id} value={o.operation_name || ""} onSelect={() => { setNewAgent(prev => ({ ...prev, operation: o.id.toString() })); setOpenOperation(false); }} className="text-xs font-bold uppercase py-2.5 cursor-pointer">
                                                                        <Check className={cn("mr-2 h-3.5 w-3.5", newAgent.operation === o.id.toString() ? "opacity-100" : "opacity-0")} />
                                                                        {o.operation_name}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Price Type</Label>
                                            <Popover open={openPriceType} onOpenChange={setOpenPriceType}>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="w-full h-11 justify-between text-xs font-bold uppercase border-muted-foreground/20 rounded-xl px-3">
                                                        <span className={cn("truncate", !newAgent.price_type && "text-muted-foreground")}>
                                                            {newAgent.price_type ? `Price ${newAgent.price_type}` : "Select pricing"}
                                                        </span>
                                                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-30" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-2xl rounded-xl border-slate-100" align="start" sideOffset={4}>
                                                    <Command className="rounded-xl" onWheel={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center border-b px-3 bg-slate-50/50">
                                                            <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-40" />
                                                            <CommandInput placeholder="Search pricing..." className="h-10 text-xs font-bold uppercase border-none outline-none ring-0 focus:ring-0" />
                                                        </div>
                                                        <CommandList className="max-h-[200px]">
                                                            <CommandEmpty className="py-6 text-[10px] font-bold uppercase text-slate-300 text-center">No match.</CommandEmpty>
                                                            <CommandGroup>
                                                                {["A", "B", "C", "D", "E"].map((p) => (
                                                                    <CommandItem key={p} value={`Price ${p}`} onSelect={() => { setNewAgent(prev => ({ ...prev, price_type: p })); setOpenPriceType(false); }} className="text-xs font-bold uppercase py-2.5 cursor-pointer">
                                                                        <Check className={cn("mr-2 h-3.5 w-3.5", newAgent.price_type === p ? "opacity-100" : "opacity-0")} />
                                                                        Price {p}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Company Code</Label>
                                            <Input
                                                type="number"
                                                placeholder="Optional"
                                                className="h-11 text-xs font-bold border-muted-foreground/20 rounded-xl"
                                                value={newAgent.company_code}
                                                onChange={(e) => setNewAgent(prev => ({ ...prev, company_code: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Supplier Code</Label>
                                            <Input
                                                type="number"
                                                placeholder="Optional"
                                                className="h-11 text-xs font-bold border-muted-foreground/20 rounded-xl"
                                                value={newAgent.supplier_code}
                                                onChange={(e) => setNewAgent(prev => ({ ...prev, supplier_code: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* ── Section 3: Logistics & Capabilities ── */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2">
                                        <Settings2 className="w-3.5 h-3.5 text-primary" />
                                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Logistics & Capabilities</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Truck Plate</Label>
                                            <Input
                                                placeholder="e.g. ABC-1234"
                                                className="h-11 text-xs font-bold uppercase border-muted-foreground/20 rounded-xl"
                                                value={newAgent.truck_plate}
                                                onChange={(e) => setNewAgent(prev => ({ ...prev, truck_plate: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Inventory Day</Label>
                                            <Popover open={openInventoryDay} onOpenChange={setOpenInventoryDay}>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="w-full h-11 justify-between text-xs font-bold uppercase border-muted-foreground/20 rounded-xl px-3">
                                                        <span className={cn("truncate", !newAgent.inventory_day && "text-muted-foreground")}>
                                                            {newAgent.inventory_day ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][Number(newAgent.inventory_day) - 1] : "Select day"}
                                                        </span>
                                                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-30" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-2xl rounded-xl border-slate-100" align="start" sideOffset={4}>
                                                    <Command className="rounded-xl" onWheel={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center border-b px-3 bg-slate-50/50">
                                                            <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-40" />
                                                            <CommandInput placeholder="Search day..." className="h-10 text-xs font-bold uppercase border-none outline-none ring-0 focus:ring-0" />
                                                        </div>
                                                        <CommandList className="max-h-[200px]">
                                                            <CommandEmpty className="py-6 text-[10px] font-bold uppercase text-slate-300 text-center">No match.</CommandEmpty>
                                                            <CommandGroup>
                                                                {[{ v: "1", l: "Monday" }, { v: "2", l: "Tuesday" }, { v: "3", l: "Wednesday" }, { v: "4", l: "Thursday" }, { v: "5", l: "Friday" }, { v: "6", l: "Saturday" }, { v: "7", l: "Sunday" }].map((d) => (
                                                                    <CommandItem key={d.v} value={d.l} onSelect={() => { setNewAgent(prev => ({ ...prev, inventory_day: d.v })); setOpenInventoryDay(false); }} className="text-xs font-bold uppercase py-2.5 cursor-pointer">
                                                                        <Check className={cn("mr-2 h-3.5 w-3.5", newAgent.inventory_day === d.v ? "opacity-100" : "opacity-0")} />
                                                                        {d.l}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>

                                    {/* Toggle Switches */}
                                    <div className="grid grid-cols-1 gap-3 pt-2">
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                                            <div className="space-y-0.5">
                                                <Label className="text-[11px] font-black uppercase text-slate-700 tracking-wide">Active Status</Label>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Salesman can take orders and be assigned customers</p>
                                            </div>
                                            <Switch
                                                checked={newAgent.isActive}
                                                onCheckedChange={(checked) => setNewAgent(prev => ({ ...prev, isActive: checked }))}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                                            <div className="space-y-0.5">
                                                <Label className="text-[11px] font-black uppercase text-slate-700 tracking-wide">Inventory Access</Label>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Salesman can manage truck inventory</p>
                                            </div>
                                            <Switch
                                                checked={newAgent.isInventory}
                                                onCheckedChange={(checked) => setNewAgent(prev => ({ ...prev, isInventory: checked }))}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                                            <div className="space-y-0.5">
                                                <Label className="text-[11px] font-black uppercase text-slate-700 tracking-wide">Collection Rights</Label>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Salesman can collect payments from customers</p>
                                            </div>
                                            <Switch
                                                checked={newAgent.canCollect}
                                                onCheckedChange={(checked) => setNewAgent(prev => ({ ...prev, canCollect: checked }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    )}

                    <DialogFooter className="p-8 pt-0 flex gap-3 border-t bg-slate-50/30">
                        <div className="flex gap-3 w-full pt-6">
                            <Button
                                variant="ghost"
                                className="flex-1 font-black uppercase text-[10px] tracking-widest h-12 rounded-xl text-slate-400 hover:text-slate-900 transition-all"
                                onClick={() => { setCreateModal(false); resetCreateForm(); }}
                                disabled={isCreating}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-[2] font-black uppercase text-[10px] tracking-widest h-12 rounded-xl shadow-2xl bg-primary hover:bg-primary/90 disabled:opacity-20 transition-all"
                                onClick={handleCreateSalesman}
                                disabled={isCreating || loadingSupportingData}
                            >
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                                {isCreating ? "ENLISTING SALESMAN..." : "CONFIRM ENLISTMENT"}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
