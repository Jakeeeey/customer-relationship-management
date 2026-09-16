"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    Loader2
} from "lucide-react";
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
import { useDealerSalesInvoice } from "./hooks/useDealerSalesInvoice";
import { calculateChainNetPrice, getPHTDate } from "./utils";
import { toast } from "sonner";
import { DealerSalesInvoiceHeader } from "./components/DealerSalesInvoiceHeader";
import { DealerSalesInvoiceEncoding } from "./components/DealerSalesInvoiceEncoding";
import { DealerCreatePrintPreviewModal } from "./components/DealerCreatePrintPreviewModal";

export default function DealerSalesInvoiceNewRecordPage() {
    const router = useRouter();
    const {
        fetchModalData,
        getSalesmanByCustomer,
        getAccounts,
        searchProducts,
        customers: allCustomers,
        fetchUtilityData,
        createInvoice,
        checkOrderIdExists
    } = useDealerSalesInvoice();

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
    const [selectedSalesType, setSelectedSalesType] = useState<string>("");
    const [selectedBranch, setSelectedBranch] = useState<string>("");
    const [manualInvoiceNo, setManualInvoiceNo] = useState<string>("");
    const [orderIdExists, setOrderIdExists] = useState<boolean>(false);
    const [isCheckingOrderId, setIsCheckingOrderId] = useState<boolean>(false);

    // Internal states for auto-calculated values
    const [dueDate, setDueDate] = useState<string>(format(getPHTDate(new Date()), "yyyy-MM-dd"));
    const [deliveryDate, setDeliveryDate] = useState<string>(format(getPHTDate(new Date()), "yyyy-MM-dd"));

    // UI State
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [catalogProducts, setCatalogProducts] = useState<SearchProduct[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [filteredSalesmen, setFilteredSalesmen] = useState<MasterUser[]>([]);

    // Print Preview Modal State
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

    // 0. Business Rules: Max Length Enforcement (Century's Best Practice)
    const currentMaxLength = useMemo(() => {
        if (!selectedInvoiceType) return Infinity;
        const type = invoiceTypes.find(t => t.id.toString() === selectedInvoiceType);
        return type?.max_length || Infinity;
    }, [selectedInvoiceType, invoiceTypes]);

    const isLimitReached = useMemo(() => {
        return cart.length >= currentMaxLength;
    }, [cart.length, currentMaxLength]);

    const isOfficial = useMemo(() => {
        if (!selectedInvoiceType) return false;
        const type = invoiceTypes.find(t => t.id.toString() === selectedInvoiceType);
        return type ? Number(type.isOfficial) === 1 : false;
    }, [selectedInvoiceType, invoiceTypes]);

    // Auto-generate preview ID
    const previewInvoiceNo = useMemo(() => {
        if (isOfficial) return manualInvoiceNo;
        if (!selectedAccount) return "DRAFT-INV";
        const prefix = selectedAccount.salesman_code || "INV";
        const now = new Date();
        const datePart = format(now, "yyyyMMddHHmmssSSS");
        return `${prefix}-${datePart}`;
    }, [isOfficial, manualInvoiceNo, selectedAccount]);

    // Debounce check for Order ID uniqueness
    useEffect(() => {
        if (!isOfficial || !manualInvoiceNo.trim()) {
            setOrderIdExists(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsCheckingOrderId(true);
            try {
                const exists = await checkOrderIdExists(manualInvoiceNo.trim());
                setOrderIdExists(exists);
            } catch (e) {
                console.error(e);
            } finally {
                setIsCheckingOrderId(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [manualInvoiceNo, isOfficial, checkOrderIdExists]);

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
                const res = await fetch(`${window.location.origin}/api/crm/site-sales-management/dealer-sales-invoice?type=sales_types`);
                const st = await res.json();
                setSalesTypes(st);

                const dealerOver = st.find((s: SalesType) => s.operation_name?.toUpperCase() === "DEALEROVER");
                if (dealerOver) {
                    setSelectedSalesType(dealerOver.id.toString());
                } else {
                    setSelectedSalesType("3");
                }

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

    // 1.1 Proactive Limit Notification (Century's Best Practice)
    useEffect(() => {
        if (selectedInvoiceType && invoiceTypes.length > 0) {
            const typeObj = invoiceTypes.find(t => t.id.toString() === selectedInvoiceType);
            if (typeObj) {
                const limit = typeObj.max_length || "unlimited";
                const label = typeObj.type || typeObj.shortcut || "Selected Type";
                
                // Only toast if it's a manual change (not initial load)
                if (!isLoadingData) {
                    toast.info(`${label} has a limit of ${limit} items.`);
                }
            }
        }
    }, [selectedInvoiceType, invoiceTypes, isLoadingData]);

    // 1.2 Cart Truncation Guard on Receipt Type Change
    useEffect(() => {
        if (selectedInvoiceType && invoiceTypes.length > 0 && cart.length > 0) {
            const typeObj = invoiceTypes.find(t => t.id.toString() === selectedInvoiceType);
            if (typeObj) {
                const limit = typeObj.max_length || Infinity;
                if (cart.length > limit) {
                    setCart(prev => prev.slice(0, limit));
                    toast.warning(`Receipt Type changed. Cart truncated to the limit of ${limit} items.`);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedInvoiceType, invoiceTypes]);

    // 2. Auto-fill logic when customer is selected
    const handleCustomerSelect = async (customer: Customer) => {
        setSelectedCustomer(customer);
        setSelectedSalesman(null);
        setSelectedAccount(null);
        setAccounts([]);
        setDueDate(format(getPHTDate(new Date()), "yyyy-MM-dd"));

        try {
            // Fetch linked salesmen (Master Users) for this customer
            const linkedUsers = await getSalesmanByCustomer(customer.id);
            const activeSalesmen = linkedUsers.length > 0 ? linkedUsers : masterUsers;
            setFilteredSalesmen(activeSalesmen);

            // Auto-fill logic: If exactly one salesman is found
            if (linkedUsers.length === 1) {
                const user = linkedUsers[0];
                setSelectedSalesman(user);

                setLoadingAccounts(true);
                // Robust ID resolution for fetching accounts
                const userIdToFetch = user.user_id || (user as { id?: number | string }).id || "";
                const userAccounts = await getAccounts(userIdToFetch);
                setAccounts(userAccounts);
                setLoadingAccounts(false);

                // Smart Account Resolution: 
                // If the salesman has exactly one linked account for this customer, select it.
                if (user.linked_account_ids && user.linked_account_ids.length === 1) {
                    const linkedId = user.linked_account_ids[0];
                    const account = userAccounts.find(a => a.id.toString() === linkedId.toString());
                    if (account) {
                        handleAccountSelect(account);
                    }
                } else if (userAccounts.length === 1) {
                    // Fallback to single account auto-select if no specific link but only one account
                    handleAccountSelect(userAccounts[0]);
                }
            }
        } catch (e) {
            console.error("Autofill error:", e);
            toast.error("Failed to resolve linked salesmen");
        }

        // Update dates based on payment term
        if (customer.payment_term) {
            const pt = paymentTerms.find(p => p.id === Number(customer.payment_term));
            if (pt) {
                const days = pt.payment_days ?? 0;
                const newDueDate = addDays(getPHTDate(new Date()), days);
                setDueDate(format(newDueDate, "yyyy-MM-dd"));
            }
        }
    };

    // 3. Handle Salesman selection
    const handleSalesmanSelect = async (user: MasterUser) => {
        setSelectedSalesman(user);
        setSelectedAccount(null);

        setLoadingAccounts(true);
        try {
            const userIdToFetch = user.user_id || (user as { id?: number | string }).id || "";
            const userAccounts = await getAccounts(userIdToFetch);
            setAccounts(userAccounts);

            // Smart Account Resolution on manual salesman change
            if (user.linked_account_ids && user.linked_account_ids.length === 1) {
                const linkedId = user.linked_account_ids[0];
                const account = userAccounts.find(a => a.id.toString() === linkedId.toString());
                if (account) {
                    handleAccountSelect(account);
                }
            } else if (userAccounts.length === 1) {
                handleAccountSelect(userAccounts[0]);
            }
        } catch (e) {
            console.error("Salesman accounts fetch error:", e);
            toast.error("Failed to fetch salesman accounts");
        } finally {
            setLoadingAccounts(false);
        }
    };

    const handleAccountSelect = (account: Salesman) => {
        setSelectedAccount(account);

        // Robust metadata resolution matching Sales Order patterns
        if (account.branch_code) {
            const bId = typeof account.branch_code === "object" && account.branch_code !== null
                ? (account.branch_code as { id?: number; branch_id?: number }).id || (account.branch_code as { id?: number; branch_id?: number }).branch_id
                : account.branch_code;
            if (bId) setSelectedBranch(bId.toString());
        }

        if (account.price_type_id) {
            setSelectedPriceType(account.price_type_id.toString());
        }
    };

    // 4. Product Catalog Fetching (Client-side filtering for 100% Sales Order parity)
    const fetchCatalogProducts = useCallback(async () => {
        if (!selectedPriceType || !selectedSupplier) return;

        setIsSearching(true);
        try {
            const results = await searchProducts({
                search: "", // Always fetch full list for instant client-side filtering
                priceTypeId: parseInt(selectedPriceType),
                supplierId: selectedSupplier.id,
                branchId: selectedBranch,
                customerCode: selectedCustomer?.customer_code
            });
            setCatalogProducts(results);
        } catch {
            toast.error("Failed to fetch product catalog");
        } finally {
            setIsSearching(false);
        }
    }, [selectedPriceType, selectedSupplier, selectedBranch, selectedCustomer, searchProducts]);

    // Auto-fetch catalog when supplier/price-type/customer changes
    useEffect(() => {
        if (selectedSupplier && selectedCustomer && selectedPriceType) {
            fetchCatalogProducts();
        } else {
            setCatalogProducts([]);
        }
    }, [selectedSupplier, selectedCustomer, selectedPriceType, fetchCatalogProducts]);

    // 5. Cart Actions & Sorting Logic (Century's Best Practice)
    const sortCartItems = (items: CartItem[]): CartItem[] => {
        return [...items].sort((a, b) => {
            // Primary Sort: Group by Product "Family" (parent_id or the product itself)
            const familyA = a.parent_id || a.product_id;
            const familyB = b.parent_id || b.product_id;

            if (familyA !== familyB) {
                // Keep families together and sort them alphabetically by name
                return (a.product_name || "").localeCompare(b.product_name || "");
            }

            // Secondary Sort: Highest UOM Count first (e.g., BOX (12) > PCS (1))
            return (b.unit_count || 0) - (a.unit_count || 0);
        });
    };

    const addToCart = (product: SearchProduct) => {
        const existing = cart.find(item => item.product_id === product.product_id);
        const netPrice = calculateChainNetPrice(product.unit_price, product.discounts || []);

        if (existing) {
            const newQty = existing.quantity + 1;
            setCart(prev => {
                const updated = prev.map(item =>
                    item.product_id === product.product_id
                        ? { ...item, quantity: newQty, total_amount: netPrice * newQty }
                        : item
                );
                return sortCartItems(updated);
            });
            toast.success("Added to list");
        } else {
            // Check limit only for NEW items (new rows)
            if (isLimitReached) {
                toast.error(`Maximum of ${currentMaxLength} items allowed for this receipt type.`);
                return;
            }

            setCart(prev => sortCartItems([...prev, {
                ...product,
                quantity: 1,
                discount_amount: product.unit_price - netPrice,
                total_amount: netPrice
            }]));
            toast.success("Added to list");
        }
    };

    const removeFromCart = (productId: number) => {
        setCart(cart.filter(item => item.product_id !== productId));
    };

    const updateCartQuantity = (productId: number, qty: number) => {
        if (qty < 1) return;
        setCart(prev => {
            const updated = prev.map(item => {
                if (item.product_id === productId) {
                    const netPrice = calculateChainNetPrice(item.unit_price, item.discounts || []);
                    return { ...item, quantity: qty, total_amount: netPrice * qty };
                }
                return item;
            });
            return sortCartItems(updated);
        });
    };

    // 6. Calculations (Aligned with Sales Order logic for 100% Accuracy)
    const totalGross = useMemo(() => cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0), [cart]);
    const totalNet = useMemo(() => cart.reduce((sum, item) => sum + item.total_amount, 0), [cart]);

    // VAT-Inclusive Back-out Logic (Parity with Sales Order) - Skip for Delivery Receipt (3)
    const isVatApplicable = useMemo(() => {
        const typeObj = invoiceTypes.find(t => t.id.toString() === selectedInvoiceType);
        const isDR = selectedInvoiceType === "3" || typeObj?.type === "Delivery Receipt";
        return !isDR;
    }, [selectedInvoiceType, invoiceTypes]);
    const totalVattable = useMemo(() => isVatApplicable ? totalNet / 1.12 : totalNet, [totalNet, isVatApplicable]);
    const totalVat = useMemo(() => isVatApplicable ? totalNet - totalVattable : 0, [totalNet, totalVattable, isVatApplicable]);

    const totalDiscount = totalGross - totalNet;

    const isHeaderComplete = !!(selectedCustomer && selectedAccount && selectedSupplier && selectedBranch && (!isOfficial || (manualInvoiceNo.trim() !== "" && !orderIdExists)));

    // Opens the Print Preview modal (validates header + cart first)
    const handleOpenPreview = () => {
        if (!selectedCustomer || !selectedAccount || !selectedSupplier || !selectedBranch) {
            toast.error("Please complete all header fields before previewing.");
            return;
        }
        if (isOfficial && !manualInvoiceNo.trim()) {
            toast.error("Please enter the Order ID.");
            return;
        }
        if (isOfficial && orderIdExists) {
            toast.error("This Order ID is already taken. Please enter a unique one.");
            return;
        }
        if (cart.length === 0) {
            toast.error("Please add at least one item to the cart.");
            return;
        }
        setIsPreviewModalOpen(true);
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
        <div className="flex flex-col h-screen bg-[#fafafa] dark:bg-slate-950 font-sans selection:bg-primary/10 overflow-hidden">
            {/* Minimal Header */}
            <header className="shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 px-8 py-4 flex items-center justify-between z-50">
                <div className="flex items-center gap-6">
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100" onClick={() => router.push('/crm/site-sales-management/dealer-sales-invoice')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2" />
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Create Sales Invoice</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Transaction Entry Workspace</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-8 pb-32 max-w-[1800px] mx-auto w-full flex flex-col gap-8">

                    {/* Header Configuration - Refactored Component */}
                    <DealerSalesInvoiceHeader
                        customers={allCustomers}
                        selectedCustomer={selectedCustomer}
                        onCustomerSelect={handleCustomerSelect}

                        masterUsers={filteredSalesmen}
                        selectedSalesman={selectedSalesman}
                        onSalesmanSelect={handleSalesmanSelect}

                        accounts={accounts}
                        selectedAccount={selectedAccount}
                        loadingAccounts={loadingAccounts}
                        onAccountSelect={handleAccountSelect}

                        suppliers={suppliers}
                        selectedSupplier={selectedSupplier}
                        onSupplierSelect={setSelectedSupplier}

                        invoiceTypes={invoiceTypes}
                        selectedInvoiceType={selectedInvoiceType}
                        onInvoiceTypeChange={setSelectedInvoiceType}

                        salesTypes={salesTypes}
                        selectedSalesType={selectedSalesType}
                        onSalesTypeChange={setSelectedSalesType}

                        branches={branches}
                        selectedBranch={selectedBranch}
                        onBranchChange={setSelectedBranch}

                        priceTypes={priceTypes}
                        selectedPriceType={selectedPriceType}
                        onPriceTypeChange={setSelectedPriceType}

                        paymentTerms={paymentTerms}

                        dueDate={dueDate}
                        onDueDateChange={setDueDate}

                        deliveryDate={deliveryDate}
                        onDeliveryDateChange={setDeliveryDate}

                        previewInvoiceNo={previewInvoiceNo}
                        onInvoiceNoChange={setManualInvoiceNo}
                        orderIdExists={orderIdExists}
                        isCheckingOrderId={isCheckingOrderId}
                    />

                    {/* Content Area - Encoding Component (100% Sales Order Parity) */}
                    <DealerSalesInvoiceEncoding
                        catalogProducts={catalogProducts}
                        isSearching={isSearching}

                        cart={cart}
                        addToCart={addToCart}
                        removeFromCart={removeFromCart}
                        updateCartQuantity={updateCartQuantity}

                        summary={{
                            totalGross,
                            totalDiscount,
                            totalVat,
                            totalVattable,
                            totalNet
                        }}
                        isVatApplicable={isVatApplicable}

                        isHeaderComplete={isHeaderComplete}
                        onPrintPreview={handleOpenPreview}

                        maxLength={currentMaxLength}
                        isLimitReached={isLimitReached}
                    />
                </div>
            </div>

            {/* Print Preview Modal (create flow) */}
            {selectedCustomer && selectedAccount && selectedSupplier && (
                <DealerCreatePrintPreviewModal
                    isOpen={isPreviewModalOpen}
                    onClose={() => setIsPreviewModalOpen(false)}

                    selectedCustomer={selectedCustomer}
                    selectedAccount={selectedAccount}
                    selectedBranch={selectedBranch}
                    branches={branches}

                    invoiceTypes={invoiceTypes}
                    selectedInvoiceType={selectedInvoiceType}
                    selectedSalesType={selectedSalesType}
                    priceTypes={priceTypes}
                    selectedPriceType={selectedPriceType}

                    cart={cart}
                    dueDate={dueDate}
                    previewInvoiceNo={previewInvoiceNo}

                    totalGross={totalGross}
                    totalDiscount={totalDiscount}
                    totalVat={totalVat}
                    totalNet={totalNet}
                    isVatApplicable={isVatApplicable}

                    onCreateAndPrint={createInvoice}
                />
            )}
        </div>
    );
}
