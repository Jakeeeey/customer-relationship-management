"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { 
    Command, 
    CommandEmpty, 
    CommandGroup, 
    CommandInput, 
    CommandItem, 
    CommandList 
} from "@/components/ui/command";
import { 
    Popover, 
    PopoverContent, 
    PopoverTrigger 
} from "@/components/ui/popover";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { 
    Plus, 
    Search, 
    Trash2, 
    Calendar as CalendarIcon, 
    Check, 
    ChevronsUpDown,
    RotateCw,
    X,
    ShoppingCart,
    Info,
    Package,
    ArrowLeft,
    CalendarCheck,
    Receipt,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { 
    Customer, 
    Salesman, 
    MasterUser,
    Supplier, 
    InvoiceType, 
    PriceType, 
    Branch, 
    PaymentTerm,
    SearchProduct,
    CartItem,
    SalesType
} from "./types";
import { useSiteSalesPosting } from "./hooks/useSiteSalesPosting";
import { calculateChainNetPrice, formatCurrency } from "./utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SiteSalesNewRecordPage() {
    const router = useRouter();
    const { 
        fetchModalData, 
        getSalesmanByCustomer, 
        getAccounts,
        searchProducts,
        customers: allCustomers,
        fetchUtilityData
    } = useSiteSalesPosting();

    // Utility Data State
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [invoiceTypes, setInvoiceTypes] = useState<InvoiceType[]>([]);
    const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
    const [masterUsers, _setMasterUsers] = useState<MasterUser[]>([]);
    const [salesTypes, setSalesTypes] = useState<SalesType[]>([]);

    // Form State
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedSalesman, setSelectedSalesman] = useState<MasterUser | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<Salesman | null>(null);
    const [accounts, setAccounts] = useState<Salesman[]>([]);
    
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [selectedPriceType, setSelectedPriceType] = useState<string>("");
    const [selectedInvoiceType, setSelectedInvoiceType] = useState<string>("");
    const [selectedSalesType, setSelectedSalesType] = useState<string>("3"); // Default to Site Sale (3)
    const [selectedBranch, setSelectedBranch] = useState<string>("");
    const [invoiceDate, setInvoiceDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
    const [dueDate, setDueDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
    const [deliveryDate, setDeliveryDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
    const [remarks, setRemarks] = useState<string>("");

    // UI State
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [openCustomer, setOpenCustomer] = useState(false);
    const [openSalesman, setOpenSalesman] = useState(false);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);

    const [filteredSalesmen, setFilteredSalesmen] = useState<MasterUser[]>([]);

    // 1. Initial Data Fetch
    useEffect(() => {
        const loadData = async () => {
            setIsLoadingData(true);
            try {
                // Fetch basic utilities from hook and local provider
                await fetchUtilityData();
                const data = await fetchModalData();
                
                setSuppliers(data.suppliers);
                setInvoiceTypes(data.invoiceTypes);
                setPriceTypes(data.priceTypes);
                setBranches(data.branches);
                setPaymentTerms(data.payment_terms);
                _setMasterUsers(data.masterUsers);
                setFilteredSalesmen(data.masterUsers);

                // Fetch extra data like operation types (if not in fetchUtilityData)
                const res = await fetch(`${window.location.origin}/api/crm/site-sales-management/site-sales-posting?type=sales_types`);
                const st = await res.json();
                setSalesTypes(st);
                
                if (data.invoiceTypes.length > 0) setSelectedInvoiceType(data.invoiceTypes[0].id.toString());
                if (data.priceTypes.length > 0) setSelectedPriceType(data.priceTypes[0].price_type_id.toString());
            } catch (_err) {
                console.error("Load error:", _err);
                toast.error("Failed to load necessary data");
            } finally {
                setIsLoadingData(false);
            }
        };
        loadData();
    }, [fetchModalData, fetchUtilityData]);

    // 2. Auto-fill logic when customer is selected
    const handleCustomerSelect = async (customer: Customer) => {
        setSelectedCustomer(customer);
        setOpenCustomer(false);
        setSelectedSalesman(null);
        setSelectedAccount(null);
        setAccounts([]);
        
        try {
            // Fetch linked salesmen (Master Users) for this customer
            const linkedUsers = await getSalesmanByCustomer(customer.id);
            const activeSalesmen = linkedUsers.length > 0 ? linkedUsers : masterUsers;
            setFilteredSalesmen(activeSalesmen);

            // Auto-fill logic similar to Create Sales Order
            if (linkedUsers.length === 1) {
                const user = linkedUsers[0];
                setSelectedSalesman(user);
                
                setLoadingAccounts(true);
                const userAccounts = await getAccounts(user.user_id);
                setAccounts(userAccounts);
                setLoadingAccounts(false);

                if (userAccounts.length === 1) {
                    const account = userAccounts[0];
                    setSelectedAccount(account);
                    
                    // Auto-fill secondary details
                    if (account.branch_code) setSelectedBranch(account.branch_code.toString());
                    if (account.price_type_id) setSelectedPriceType(account.price_type_id.toString());
                }
            }
        } catch {
            toast.error("Failed to resolve linked salesmen");
        }

        // Update dates based on payment term
        if (customer.payment_term) {
            const term = paymentTerms.find(t => t.id === customer.payment_term);
            if (term && term.payment_days) {
                setDueDate(format(addDays(new Date(), term.payment_days), "yyyy-MM-dd"));
            }
        }
    };

    // 3. Handle Salesman selection
    const handleSalesmanSelect = async (user: MasterUser) => {
        setSelectedSalesman(user);
        setOpenSalesman(false);
        setSelectedAccount(null);
        
        setLoadingAccounts(true);
        try {
            const userAccounts = await getAccounts(user.user_id);
            setAccounts(userAccounts);
            if (userAccounts.length === 1) {
                const account = userAccounts[0];
                setSelectedAccount(account);
                if (account.branch_code) setSelectedBranch(account.branch_code.toString());
                if (account.price_type_id) setSelectedPriceType(account.price_type_id.toString());
            }
        } catch {
            toast.error("Failed to fetch salesman for this customer");
        } finally {
            setLoadingAccounts(false);
        }
    };

    const handleAccountSelect = (account: Salesman) => {
        setSelectedAccount(account);
        if (account.branch_code) setSelectedBranch(account.branch_code.toString());
        if (account.price_type_id) setSelectedPriceType(account.price_type_id.toString());
    };

    // 4. Product Search
    const handleSearch = async () => {
        if (!searchQuery.trim() || !selectedPriceType || !selectedSupplier) return;
        
        setIsSearching(true);
        try {
            const results = await searchProducts({
                search: searchQuery,
                priceTypeId: parseInt(selectedPriceType),
                supplierId: selectedSupplier.id,
                branchId: selectedBranch,
                customerCode: selectedCustomer?.customer_code
            });
            setSearchResults(results);
        } catch {
            toast.error("Search failed");
        } finally {
            setIsSearching(false);
        }
    };

    // 5. Cart Actions
    const addToCart = (product: SearchProduct) => {
        const existing = cart.find(item => item.product_id === product.product_id);
        const netPrice = calculateChainNetPrice(product.unit_price, product.discounts || []);
        
        if (existing) {
            const newQty = existing.quantity + 1;
            setCart(cart.map(item => 
                item.product_id === product.product_id 
                    ? { ...item, quantity: newQty, total_amount: netPrice * newQty }
                    : item
            ));
        } else {
            setCart([...cart, { 
                ...product, 
                quantity: 1, 
                discount_amount: product.unit_price - netPrice,
                total_amount: netPrice 
            }]);
        }
        toast.success("Added to list");
    };

    const removeFromCart = (productId: number) => {
        setCart(cart.filter(item => item.product_id !== productId));
    };

    const updateCartQuantity = (productId: number, qty: number) => {
        if (qty < 1) return;
        setCart(cart.map(item => {
            if (item.product_id === productId) {
                const netPrice = calculateChainNetPrice(item.unit_price, item.discounts || []);
                return { ...item, quantity: qty, total_amount: netPrice * qty };
            }
            return item;
        }));
    };

    // 6. Calculations
    const totalGross = useMemo(() => cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0), [cart]);
    const totalNet = useMemo(() => cart.reduce((sum, item) => sum + item.total_amount, 0), [cart]);
    const totalDiscount = totalGross - totalNet;

    const isHeaderComplete = selectedCustomer && selectedAccount && selectedSupplier && selectedBranch;

    const handleSave = async () => {
        // Validation logic here
        toast.info("Saving integration coming soon...");
    };

    // Effect to update filtered salesmen when initial load completes
    useEffect(() => {
        if (masterUsers.length > 0 && filteredSalesmen.length === 0) {
            setFilteredSalesmen(masterUsers);
        }
    }, [masterUsers, filteredSalesmen.length]);

    if (isLoadingData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Warming up Workspace...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#fafafa] dark:bg-slate-950 font-sans selection:bg-primary/10">
            {/* Minimal Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2" />
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Create Sales Invoice</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Transaction Entry Workspace</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="h-9 px-4 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm font-black text-[10px] uppercase tracking-widest gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Session Active
                    </Badge>
                </div>
            </header>

            <ScrollArea className="flex-1">
                <div className="p-8 pb-32 max-w-[1800px] mx-auto w-full flex flex-col gap-8">
                    
                    {/* Header Configuration - Modern Grid */}
                    <section className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-10 shadow-sm hover:shadow-md transition-shadow duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-10">
                            
                            {/* Column 1: Customer & Logistics */}
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                        Customer <span className="text-rose-500">*</span>
                                    </Label>
                                    <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-between h-12 rounded-xl bg-slate-50/30 border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-tight shadow-sm hover:bg-white transition-all text-left">
                                                <span className="truncate">
                                                    {selectedCustomer 
                                                        ? `${selectedCustomer.customer_name}${selectedCustomer.city || selectedCustomer.province ? ` (${[selectedCustomer.city, selectedCustomer.province].filter(Boolean).join(", ")})` : ""}`
                                                        : "Select Customer..."}
                                                </span>
                                                <ChevronsUpDown className="h-4 w-4 opacity-30 shrink-0" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[350px] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Search customer code or name..." />
                                                <CommandList className="max-h-[300px]">
                                                    <CommandEmpty>No customer found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {allCustomers.filter(c => c.isActive !== 0).map(c => (
                                                            <CommandItem 
                                                                key={c.id} 
                                                                value={`${c.customer_name} ${c.customer_code} ${c.city || ""} ${c.province || ""}`}
                                                                onSelect={() => handleCustomerSelect(c)} 
                                                                className="py-3 cursor-pointer"
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", selectedCustomer?.id === c.id ? "opacity-100" : "opacity-0")} />
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="font-black text-[11px] uppercase text-slate-900">{c.customer_name}</span>
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                                                                        {c.customer_code} • {[c.city, c.province].filter(Boolean).join(", ")}
                                                                    </span>
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Receipt Type</Label>
                                    <Select value={selectedInvoiceType} onValueChange={setSelectedInvoiceType}>
                                        <SelectTrigger className="h-12 rounded-xl bg-slate-50/30 border-slate-200 dark:border-slate-800 font-black text-[11px] uppercase tracking-tight shadow-sm">
                                            <SelectValue placeholder="Receipt Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {invoiceTypes.map(t => (
                                                <SelectItem key={t.id} value={t.id.toString()} className="font-black text-[10px] uppercase">
                                                    {t.type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Branch <span className="text-rose-500">*</span></Label>
                                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                                        <SelectTrigger className="h-12 rounded-xl bg-slate-50/30 border-slate-200 dark:border-slate-800 font-black text-[11px] uppercase tracking-tight shadow-sm">
                                            <SelectValue placeholder="Select Branch..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {branches.map(b => (
                                                <SelectItem key={b.id} value={b.id.toString()} className="font-black text-[10px] uppercase">
                                                    {b.branch_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Column 2: Salesman & Accounts */}
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Salesman (User)</Label>
                                    <Popover open={openSalesman} onOpenChange={setOpenSalesman}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-between h-12 rounded-xl bg-slate-50/30 border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-tight shadow-sm hover:bg-white transition-all text-left">
                                                <span className="truncate">
                                                    {selectedSalesman ? `${selectedSalesman.user_fname} ${selectedSalesman.user_lname}` : "Select User..."}
                                                </span>
                                                <ChevronsUpDown className="h-4 w-4 opacity-30 shrink-0" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Search salesman..." />
                                                <CommandList>
                                                    <CommandEmpty>No results found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {filteredSalesmen.map(s => (
                                                            <CommandItem key={s.user_id} onSelect={() => handleSalesmanSelect(s)} className="py-3 cursor-pointer">
                                                                <span className="font-black text-[11px] uppercase">{s.user_fname} {s.user_lname}</span>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Account (Link) <span className="text-rose-500">*</span></Label>
                                    <Select 
                                        value={selectedAccount?.id.toString() || ""} 
                                        onValueChange={(val) => handleAccountSelect(accounts.find(a => a.id.toString() === val)!)}
                                        disabled={!selectedSalesman || loadingAccounts}
                                    >
                                        <SelectTrigger className="h-12 rounded-xl bg-slate-50/30 border-slate-200 dark:border-slate-800 font-black text-[11px] uppercase tracking-tight shadow-sm disabled:opacity-30">
                                            {loadingAccounts ? <RotateCw className="h-3 w-3 animate-spin mx-auto" /> : <SelectValue placeholder="Select Account..." />}
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accounts.map(a => (
                                                <SelectItem key={a.id} value={a.id.toString()} className="font-black text-[10px] uppercase">
                                                    {a.salesman_name} ({a.salesman_code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Sales Type</Label>
                                    <Select value={selectedSalesType} onValueChange={setSelectedSalesType}>
                                        <SelectTrigger className="h-12 rounded-xl bg-slate-50/30 border-slate-200 dark:border-slate-800 font-black text-[11px] uppercase tracking-tight shadow-sm">
                                            <SelectValue placeholder="Sales Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {salesTypes.map(st => (
                                                <SelectItem key={st.id} value={st.id.toString()} className="font-black text-[10px] uppercase">
                                                    {st.operation_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Column 3: Dates & Financials */}
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Invoice Date <span className="text-rose-500">*</span></Label>
                                    <div className="relative group">
                                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="h-12 pl-12 rounded-xl bg-slate-50/30 border-slate-200 dark:border-slate-800 font-black text-xs shadow-sm focus-visible:ring-primary/20" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Due Date</Label>
                                    <div className="relative group opacity-80">
                                        <CalendarCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-12 pl-12 rounded-xl bg-slate-50/30 border-slate-200 dark:border-slate-800 font-black text-xs shadow-sm bg-slate-50/50" />
                                    </div>
                                </div>
                                <div className="space-y-2 p-4 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block">Price Type & Terms</Label>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Receipt className="h-4 w-4 text-primary" />
                                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">Price Type</span>
                                        </div>
                                        <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 text-[10px] font-black uppercase">
                                            {selectedPriceType ? priceTypes.find(p => p.price_type_id === parseInt(selectedPriceType))?.price_type_name : "NONE"}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 mt-3">
                                        <Info className="h-4 w-4 text-blue-400" />
                                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">
                                            {selectedCustomer?.payment_term ? paymentTerms.find(t => t.id === selectedCustomer.payment_term)?.payment_name : "N/A"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Column 4: Supplier & Delivery */}
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Supplier <span className="text-rose-500">*</span></Label>
                                    <Select onValueChange={(val) => setSelectedSupplier(suppliers.find(s => s.id.toString() === val) || null)}>
                                        <SelectTrigger className="h-12 rounded-xl bg-slate-50/30 border-slate-200 dark:border-slate-800 font-black text-[11px] uppercase tracking-tight shadow-sm">
                                            <SelectValue placeholder="Select Supplier..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers.filter(s => s.supplier_type === "Trade" && s.isActive === 1).map(s => (
                                                <SelectItem key={s.id} value={s.id.toString()} className="font-black text-[10px] uppercase">
                                                    {s.supplier_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Delivery Date <span className="text-rose-500">*</span></Label>
                                    <div className="relative group">
                                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="h-12 pl-12 rounded-xl bg-slate-50/30 border-slate-200 dark:border-slate-800 font-black text-xs shadow-sm" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Remarks</Label>
                                    <Input 
                                        value={remarks} 
                                        onChange={(e) => setRemarks(e.target.value)} 
                                        placeholder="Add notes..." 
                                        className="h-12 rounded-xl bg-slate-50/30 border-slate-200 dark:border-slate-800 text-xs font-medium" 
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Content Area - Catalog & Items (Mirroring Create Sales Order Layout) */}
                    <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-3 gap-8 mt-4 min-h-[600px]">
                        
                        {/* Left Column: Product Catalog */}
                        <div className="xl:col-span-1 lg:col-span-1">
                            <Card className="flex flex-col h-full shadow-sm border-slate-100 overflow-hidden rounded-[32px]">
                                <CardHeader className="p-5 border-b bg-slate-50/50">
                                    <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-500">Product Catalog</CardTitle>
                                </CardHeader>
                                
                                <div className="p-4 border-b space-y-4">
                                    <div className="relative group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <Input 
                                            placeholder="Search products..." 
                                            className="pl-10 h-11 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                            disabled={!isHeaderComplete}
                                        />
                                        <Button 
                                            size="sm"
                                            className="absolute right-1 top-1 h-9 rounded-lg bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest"
                                            onClick={handleSearch}
                                            disabled={isSearching || !isHeaderComplete}
                                        >
                                            {isSearching ? <RotateCw className="w-3 h-3 animate-spin" /> : "Find"}
                                        </Button>
                                    </div>
                                    {!isHeaderComplete && (
                                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-tighter text-center italic opacity-70">Complete header details to enable search</p>
                                    )}
                                </div>

                                <CardContent className="p-0 flex-1 overflow-hidden">
                                    <ScrollArea className="h-[600px]">
                                        <div className="divide-y divide-slate-50">
                                            {searchResults.length === 0 ? (
                                                <div className="p-12 text-center space-y-3 opacity-20">
                                                    <Package className="h-10 w-10 mx-auto" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest">No Results</p>
                                                </div>
                                            ) : (
                                                searchResults.map(product => {
                                                    const netPrice = calculateChainNetPrice(product.unit_price, product.discounts || []);
                                                    const hasDiscount = netPrice < product.unit_price;

                                                    return (
                                                        <div 
                                                            key={product.product_id}
                                                            className="p-5 hover:bg-slate-50 transition-all cursor-pointer group relative border-l-4 border-transparent hover:border-primary"
                                                            onClick={() => addToCart(product)}
                                                        >
                                                            <div className="flex flex-col pr-10">
                                                                <span className="font-black text-[11px] uppercase text-slate-900 leading-tight truncate">{product.product_name}</span>
                                                                <div className="flex gap-2 mt-2">
                                                                    <Badge variant="outline" className="text-[8px] font-black uppercase px-1.5 py-0 border-slate-200 text-slate-400">{product.product_code}</Badge>
                                                                    <Badge variant="secondary" className="text-[8px] font-black uppercase px-1.5 py-0 bg-blue-50 text-blue-500">{product.unit}</Badge>
                                                                </div>
                                                                <div className="mt-3 flex items-end justify-between">
                                                                    <div className="flex flex-col">
                                                                        {hasDiscount && (
                                                                            <span className="text-[9px] text-slate-400 line-through font-bold mb-0.5">{formatCurrency(product.unit_price)}</span>
                                                                        )}
                                                                        <span className="text-sm font-black text-emerald-600">{formatCurrency(netPrice)}</span>
                                                                    </div>
                                                                    <span className="text-[9px] font-black text-indigo-500 italic opacity-60">Stock: {product.available_qty}</span>
                                                                </div>
                                                            </div>
                                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 scale-90 group-hover:scale-100 transition-transform">
                                                                    <Plus className="h-4 w-4" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Order Items Table */}
                        <div className="xl:col-span-3 lg:col-span-2">
                            <Card className="flex flex-col h-full shadow-sm border-primary/10 overflow-hidden rounded-[32px]">
                                <CardHeader className="p-6 border-b bg-primary/5 flex flex-row items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                            <ShoppingCart className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900">Order Items</CardTitle>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Summary of pending transaction</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black px-4 py-1.5 rounded-lg uppercase tracking-widest">{cart.length} ITEMS</Badge>
                                </CardHeader>

                                <CardContent className="p-0 flex-1 flex flex-col min-h-[500px]">
                                    <div className="flex-1 overflow-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-50/50 sticky top-0 z-10 shadow-sm backdrop-blur-md">
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-5 pl-8">Product Desc</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Unit</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Qty</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Unit Price</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Discounts</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-8">Total</TableHead>
                                                    <TableHead className="w-[80px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {cart.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={7} className="h-[400px]">
                                                            <div className="flex flex-col items-center justify-center gap-4 opacity-20">
                                                                <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center">
                                                                    <ShoppingCart className="h-8 w-8 text-slate-400" />
                                                                </div>
                                                                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Cart is Empty</p>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    cart.map(item => (
                                                        <TableRow key={item.product_id} className="group hover:bg-slate-50/50 transition-colors">
                                                            <TableCell className="py-5 pl-8">
                                                                <div className="flex flex-col">
                                                                    <span className="font-black text-[11px] uppercase text-slate-900 leading-tight">{item.product_name}</span>
                                                                    <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{item.product_code}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Badge variant="outline" className="text-[9px] font-black uppercase bg-white border-slate-100 text-slate-400 px-2">{item.unit}</Badge>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <div className="flex items-center justify-center gap-3">
                                                                    <Button 
                                                                        size="icon" 
                                                                        variant="ghost" 
                                                                        className="h-7 w-7 rounded-lg hover:bg-white hover:shadow-sm" 
                                                                        onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)}
                                                                    >
                                                                        <X className="h-2.5 w-2.5 rotate-45" />
                                                                    </Button>
                                                                    <Input 
                                                                        type="number" 
                                                                        className="h-9 w-16 text-center font-black text-xs bg-slate-50 border-none rounded-lg p-0 focus-visible:ring-primary/20" 
                                                                        value={item.quantity} 
                                                                        onChange={(e) => updateCartQuantity(item.product_id, parseInt(e.target.value) || 0)} 
                                                                    />
                                                                    <Button 
                                                                        size="icon" 
                                                                        variant="ghost" 
                                                                        className="h-7 w-7 rounded-lg hover:bg-white hover:shadow-sm" 
                                                                        onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                                                                    >
                                                                        <Plus className="h-2.5 w-2.5" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right text-[11px] font-black text-slate-500 tabular-nums">{formatCurrency(item.unit_price)}</TableCell>
                                                            <TableCell className="text-center">
                                                                <div className="flex flex-wrap justify-center gap-1">
                                                                    {item.discounts && item.discounts.length > 0 ? (
                                                                        item.discounts.map((d, idx) => (
                                                                            <Badge key={idx} variant="secondary" className="text-[8px] font-black bg-emerald-50 text-emerald-600 border-emerald-100 px-1 py-0">
                                                                                {d}%
                                                                            </Badge>
                                                                        ))
                                                                    ) : (
                                                                        <span className="text-[9px] font-black text-slate-300 uppercase italic">NONE</span>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right pr-8">
                                                                <span className="text-sm font-black text-slate-900 tabular-nums">{formatCurrency(item.total_amount)}</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-8 w-8 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 rounded-lg" 
                                                                    onClick={() => removeFromCart(item.product_id)}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Table Footer / Summary */}
                                    <div className="p-10 bg-slate-50/50 border-t flex flex-col md:flex-row justify-between items-center gap-10">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-12 w-full md:w-auto">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Gross Total</span>
                                                <span className="font-black text-xl text-slate-900 tabular-nums">{formatCurrency(totalGross)}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase text-rose-400 tracking-[0.2em] mb-1">Total Savings</span>
                                                <span className="font-black text-xl text-rose-500 tabular-nums">-{formatCurrency(totalDiscount)}</span>
                                            </div>
                                            <div className="flex flex-col bg-slate-900 text-white p-6 rounded-3xl shadow-xl shadow-slate-900/10 min-w-[200px]">
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-2">Net Amount</span>
                                                <span className="text-3xl font-black tabular-nums tracking-tighter">{formatCurrency(totalNet)}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-4 w-full md:w-auto">
                                            <Button 
                                                variant="outline" 
                                                className="flex-1 md:flex-none h-16 px-10 rounded-2xl font-black text-[11px] uppercase tracking-widest border-slate-200 hover:bg-slate-50 transition-all active:scale-95" 
                                                onClick={() => router.back()}
                                            >
                                                Discard Order
                                            </Button>
                                            <Button 
                                                disabled={cart.length === 0} 
                                                className="flex-1 md:flex-none h-16 px-16 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-slate-900/30 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-30" 
                                                onClick={handleSave}
                                            >
                                                Create Invoice
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
