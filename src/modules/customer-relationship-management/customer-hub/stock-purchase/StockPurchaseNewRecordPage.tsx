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
import { useStockPurchase } from "./hooks/useStockPurchase";
import { calculateChainNetPrice } from "./utils";
import { toast } from "sonner";
import { StockPurchaseHeader } from "./components/StockPurchaseHeader";
import { StockPurchaseEncoding } from "./components/StockPurchaseEncoding";
import { StockPurchaseCreatePrintPreviewModal } from "./components/StockPurchaseCreatePrintPreviewModal";
import { DiscountType, ORTemplate } from "./types/print";
import { StockPurchasePrintService } from "./services/StockPurchasePrintService";

export default function StockPurchaseNewRecordPage() {
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
    } = useStockPurchase();

    // Utility Data State
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [invoiceTypes, setInvoiceTypes] = useState<InvoiceType[]>([]);
    const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
    const [masterUsers, _setMasterUsers] = useState<MasterUser[]>([]);
    const [salesTypes, setSalesTypes] = useState<SalesType[]>([]);

    // Pre-fetched print data
    const [discountTypes, setDiscountTypes] = useState<DiscountType[]>([]);
    const [templatesMap, setTemplatesMap] = useState<Record<number, ORTemplate | null>>({});
    const [backgroundImagesMap, setBackgroundImagesMap] = useState<Record<string, string>>({});

    const convertImageToBase64 = async (url: string): Promise<string> => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch image");
            const blob = await response.blob();
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("Failed to convert image to base64:", e);
            return "";
        }
    };

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
    const [dueDate, setDueDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
    const [deliveryDate, setDeliveryDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

    // UI State
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [catalogProducts, setCatalogProducts] = useState<SearchProduct[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [filteredSalesmen, setFilteredSalesmen] = useState<MasterUser[]>([]);

    // Print Preview Modal State
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

    const currentMaxLength = useMemo(() => {
        if (!selectedInvoiceType) return Infinity;
        const type = invoiceTypes.find(t => t.id.toString() === selectedInvoiceType);
        return type?.max_length || Infinity;
    }, [selectedInvoiceType, invoiceTypes]);

    const isLimitReached = useMemo(() => {
        return cart.length >= currentMaxLength;
    }, [cart.length, currentMaxLength]);


    // Auto-generate preview ID (Simply return manualInvoiceNo directly)
    const previewInvoiceNo = useMemo(() => {
        return manualInvoiceNo;
    }, [manualInvoiceNo]);

    // Debounce check for Order ID uniqueness (Always check manualInvoiceNo)
    useEffect(() => {
        if (!manualInvoiceNo.trim()) {
            setOrderIdExists(false);
            setIsCheckingOrderId(false);
            return;
        }

        setIsCheckingOrderId(true);
        setOrderIdExists(false);

        const timer = setTimeout(async () => {
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
    }, [manualInvoiceNo, checkOrderIdExists]);

    // 1. Initial Data Fetch
    useEffect(() => {
        const loadData = async () => {
            setIsLoadingData(true);
            try {
                await fetchUtilityData();
                const data = await fetchModalData();

                setSuppliers(data.suppliers);
                
                // Filter to only include Delivery Receipt
                const filteredInvoiceTypes = data.invoiceTypes.filter(
                    t => t.type?.toUpperCase() === "DELIVERY RECEIPT" || t.shortcut?.toUpperCase() === "DR"
                );
                setInvoiceTypes(filteredInvoiceTypes);
                
                setPriceTypes(data.priceTypes);
                setBranches(data.branches);
                setPaymentTerms(data.payment_terms);
                _setMasterUsers(data.masterUsers);
                setFilteredSalesmen(data.masterUsers);

                const res = await fetch(`${window.location.origin}/api/crm/customer-hub/stock-purchase?type=sales_types`);
                const st = await res.json();
                setSalesTypes(st);

                const dealer = st.find((s: SalesType) => s.operation_name?.toUpperCase() === "DEALER");
                const dealerOver = st.find((s: SalesType) => s.operation_name?.toUpperCase() === "DEALEROVER");
                const firstValid = st.find((s: SalesType) => s.operation_name?.toUpperCase() !== "SITE SALES" && s.id !== 3);

                if (dealer) {
                    setSelectedSalesType(dealer.id.toString());
                } else if (dealerOver) {
                    setSelectedSalesType(dealerOver.id.toString());
                } else if (firstValid) {
                    setSelectedSalesType(firstValid.id.toString());
                } else {
                    setSelectedSalesType("");
                }

                if (filteredInvoiceTypes.length > 0) {
                    setSelectedInvoiceType(filteredInvoiceTypes[0].id.toString());
                } else if (data.invoiceTypes.length > 0) {
                    setSelectedInvoiceType(data.invoiceTypes[0].id.toString());
                }
                
                if (data.priceTypes.length > 0) setSelectedPriceType(data.priceTypes[0].price_type_id.toString());

                // Pre-fetch print templates and discount types
                let preFetchedDiscountTypes: DiscountType[] = [];
                try {
                    preFetchedDiscountTypes = await StockPurchasePrintService.getDiscountTypes();
                    setDiscountTypes(preFetchedDiscountTypes);
                } catch (e) {
                    console.error("Failed to pre-fetch discount types:", e);
                }

                const tplMap: Record<number, ORTemplate | null> = {};
                const bgMap: Record<string, string> = {};
                const allTypes = data.invoiceTypes || [];

                await Promise.all(allTypes.map(async (t) => {
                    const typeId = t.id;
                    try {
                        const tpl = await StockPurchasePrintService.getTemplate(typeId);
                        tplMap[typeId] = tpl;
                        if (tpl?.backgroundImage) {
                            const imgUrl = StockPurchasePrintService.getImageUrl(tpl.backgroundImage);
                            const base64 = await convertImageToBase64(imgUrl);
                            if (base64) {
                                bgMap[tpl.backgroundImage] = base64;
                            }
                        }
                    } catch (e) {
                        console.error(`Failed to pre-fetch template for type ID ${typeId}:`, e);
                    }
                }));

                setTemplatesMap(tplMap);
                setBackgroundImagesMap(bgMap);
            } catch (_err) {
                console.error("Load error:", _err);
                toast.error("Failed to load necessary data");
            } finally {
                setIsLoadingData(false);
            }
        };
        loadData();
    }, [fetchModalData, fetchUtilityData]);

    useEffect(() => {
        if (selectedInvoiceType && invoiceTypes.length > 0) {
            const typeObj = invoiceTypes.find(t => t.id.toString() === selectedInvoiceType);
            if (typeObj) {
                const limit = typeObj.max_length || "unlimited";
                const label = typeObj.type || typeObj.shortcut || "Selected Type";
                
                if (!isLoadingData) {
                    toast.info(`${label} has a limit of ${limit} items.`);
                }
            }
        }
    }, [selectedInvoiceType, invoiceTypes, isLoadingData]);

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
    }, [selectedInvoiceType, invoiceTypes, cart.length]);

    const handleCustomerSelect = async (customer: Customer) => {
        setSelectedCustomer(customer);
        setSelectedSalesman(null);
        setSelectedAccount(null);
        setAccounts([]);
        setDueDate(format(new Date(), "yyyy-MM-dd"));

        try {
            const linkedUsers = await getSalesmanByCustomer(customer.id);
            const activeSalesmen = linkedUsers.length > 0 ? linkedUsers : masterUsers;
            setFilteredSalesmen(activeSalesmen);

            if (linkedUsers.length === 1) {
                const user = linkedUsers[0];
                setSelectedSalesman(user);

                setLoadingAccounts(true);
                const userIdToFetch = user.user_id || (user as { id?: number | string }).id || "";
                const userAccounts = await getAccounts(userIdToFetch);
                setAccounts(userAccounts);
                setLoadingAccounts(false);

                if (user.linked_account_ids && user.linked_account_ids.length === 1) {
                    const linkedId = user.linked_account_ids[0];
                    const account = userAccounts.find(a => a.id.toString() === linkedId.toString());
                    if (account) {
                        handleAccountSelect(account);
                    }
                } else if (userAccounts.length === 1) {
                    handleAccountSelect(userAccounts[0]);
                }
            }
        } catch (e) {
            console.error("Autofill error:", e);
            toast.error("Failed to resolve linked salesmen");
        }

        if (customer.payment_term) {
            const pt = paymentTerms.find(p => p.id === Number(customer.payment_term));
            if (pt) {
                const days = pt.payment_days ?? 0;
                const newDueDate = addDays(new Date(), days);
                setDueDate(format(newDueDate, "yyyy-MM-dd"));
            }
        }
    };

    const handleSalesmanSelect = async (user: MasterUser) => {
        setSelectedSalesman(user);
        setSelectedAccount(null);

        setLoadingAccounts(true);
        try {
            const userIdToFetch = user.user_id || (user as { id?: number | string }).id || "";
            const userAccounts = await getAccounts(userIdToFetch);
            setAccounts(userAccounts);

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

    const fetchCatalogProducts = useCallback(async () => {
        if (!selectedPriceType || !selectedSupplier) return;

        setIsSearching(true);
        try {
            const results = await searchProducts({
                search: "",
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

    useEffect(() => {
        if (selectedSupplier && selectedCustomer && selectedPriceType && manualInvoiceNo.trim() && !isCheckingOrderId && !orderIdExists) {
            fetchCatalogProducts();
        } else {
            setCatalogProducts([]);
        }
    }, [selectedSupplier, selectedCustomer, selectedPriceType, manualInvoiceNo, isCheckingOrderId, orderIdExists, fetchCatalogProducts]);

    const sortCartItems = (items: CartItem[]): CartItem[] => {
        return [...items].sort((a, b) => {
            const familyA = a.parent_id || a.product_id;
            const familyB = b.parent_id || b.product_id;

            if (familyA !== familyB) {
                return (a.product_name || "").localeCompare(b.product_name || "");
            }

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

    const totalGross = useMemo(() => cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0), [cart]);
    const totalNet = useMemo(() => cart.reduce((sum, item) => sum + item.total_amount, 0), [cart]);

    const isVatApplicable = useMemo(() => {
        const typeObj = invoiceTypes.find(t => t.id.toString() === selectedInvoiceType);
        const isDR = selectedInvoiceType === "3" || typeObj?.type === "Delivery Receipt";
        return !isDR;
    }, [selectedInvoiceType, invoiceTypes]);
    const totalVattable = useMemo(() => isVatApplicable ? totalNet / 1.12 : totalNet, [totalNet, isVatApplicable]);
    const totalVat = useMemo(() => isVatApplicable ? totalNet - totalVattable : 0, [totalNet, totalVattable, isVatApplicable]);

    const totalDiscount = totalGross - totalNet;

    const isHeaderComplete = !!(selectedCustomer && selectedAccount && selectedSupplier && selectedBranch && selectedSalesType && manualInvoiceNo.trim() !== "" && !isCheckingOrderId && !orderIdExists);

    const handleOpenPreview = () => {
        if (!selectedCustomer || !selectedAccount || !selectedSupplier || !selectedBranch || !selectedSalesType) {
            toast.error("Please complete all header fields before previewing.");
            return;
        }
        if (!manualInvoiceNo.trim()) {
            toast.error("Please enter the Order ID.");
            return;
        }
        if (orderIdExists) {
            toast.error("This Order ID is already taken. Please enter a unique one.");
            return;
        }
        if (cart.length === 0) {
            toast.error("Please add at least one item to the cart.");
            return;
        }
        setIsPreviewModalOpen(true);
    };

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
            <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b shadow-sm bg-background sm:h-16 px-4 sm:px-6 overflow-hidden">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 bg-white" onClick={() => router.push('/crm/customer-hub/stock-purchase')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2" />
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Create Stock Purchase</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Transaction Entry Workspace</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-8 pb-32 max-w-[1800px] mx-auto w-full flex flex-col gap-8">
                    <StockPurchaseHeader
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

                    <StockPurchaseEncoding
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

            {selectedCustomer && selectedAccount && selectedSupplier && (
                <StockPurchaseCreatePrintPreviewModal
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

                    preFetchedDiscountTypes={discountTypes}
                    preFetchedTemplate={templatesMap[Number(selectedInvoiceType)] || null}
                    preFetchedBackgroundImageDataUrl={
                        templatesMap[Number(selectedInvoiceType)]?.backgroundImage
                            ? backgroundImagesMap[templatesMap[Number(selectedInvoiceType)]!.backgroundImage!]
                            : undefined
                    }
                />
            )}
        </div>
    );
}
