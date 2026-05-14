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
import { calculateChainNetPrice } from "./utils";
import { toast } from "sonner";
import { DealerSalesInvoiceHeader } from "./components/DealerSalesInvoiceHeader";
import { DealerSalesInvoiceEncoding } from "./components/DealerSalesInvoiceEncoding";

export const DealerSalesInvoiceNewRecordPage = () => {
    const router = useRouter();
    const {
        fetchModalData,
        getSalesmanByCustomer,
        getAccounts,
        searchProducts,
        customers: allCustomers,
        fetchUtilityData,
        createInvoice
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
    const [selectedSalesType, setSelectedSalesType] = useState<string>("3"); // Default to Dealer Sale (match parity)
    const [selectedBranch, setSelectedBranch] = useState<string>("");
    // Internal states for auto-calculated values
    const [dueDate, setDueDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
    const [deliveryDate, setDeliveryDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

    // UI State
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [catalogProducts, setCatalogProducts] = useState<SearchProduct[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const [filteredSalesmen, setFilteredSalesmen] = useState<MasterUser[]>([]);

    // Auto-generate preview ID
    const previewInvoiceNo = useMemo(() => {
        if (!selectedAccount) return "DRAFT-INV";
        const prefix = selectedAccount.salesman_code || "INV";
        const now = new Date();
        const datePart = format(now, "yyyyMMddHHmmssSSS");
        return `${prefix}-${datePart}`;
    }, [selectedAccount]);

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

                // Fetch extra data like operation types
                const res = await fetch(`${window.location.origin}/api/crm/site-sales-management/dealer-sales-invoice?type=sales_types`);
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
        setSelectedSalesman(null);
        setSelectedAccount(null);
        setAccounts([]);
        setDueDate(format(new Date(), "yyyy-MM-dd"));

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
                const userIdToFetch = user.user_id || (user as { id?: number | string }).id || "";
                const userAccounts = await getAccounts(userIdToFetch);
                setAccounts(userAccounts);
                setLoadingAccounts(false);

                // Smart Account Resolution: 
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

        // Update dates based on payment term
        if (customer.payment_term) {
            const pt = paymentTerms.find(p => p.id === Number(customer.payment_term));
            if (pt) {
                const days = pt.payment_days ?? 0;
                const newDueDate = addDays(new Date(), days);
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

    // 4. Product Catalog Fetching
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
        if (selectedSupplier && selectedCustomer && selectedPriceType) {
            fetchCatalogProducts();
        } else {
            setCatalogProducts([]);
        }
    }, [selectedSupplier, selectedCustomer, selectedPriceType, fetchCatalogProducts]);

    // 5. Cart Actions & Sorting Logic
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
        } else {
            setCart(prev => sortCartItems([...prev, {
                ...product,
                quantity: 1,
                discount_amount: product.unit_price - netPrice,
                total_amount: netPrice
            }]));
        }
        toast.success("Added to list");
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

    // 6. Calculations
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

    const isHeaderComplete = !!(selectedCustomer && selectedAccount && selectedSupplier && selectedBranch);

    const handleSave = async () => {
        if (!selectedCustomer || !selectedAccount || !selectedSupplier || cart.length === 0) {
            toast.error("Please complete all required fields and add items to cart.");
            return;
        }

        setIsSaving(true);
        try {
            const now = new Date();
            const timestamp = format(now, "yyyyMMddHHmmssSSS");
            const prefix = selectedAccount.salesman_code || "INV";
            const generatedId = `${prefix}-${timestamp}`;

            const priceTypeName = priceTypes.find(pt => pt.price_type_id.toString() === selectedPriceType)?.price_type_name || "";

            const payload = {
                order_id: generatedId,
                invoice_no: generatedId,
                customer_code: selectedCustomer.customer_code,
                salesman_id: selectedAccount.id,
                branch_id: Number(selectedBranch) || null,
                invoice_date: format(now, "yyyy-MM-dd HH:mm:ss"),
                due_date: dueDate,
                payment_terms: (selectedCustomer.payment_term && selectedCustomer.payment_term > 0) ? Number(selectedCustomer.payment_term) : null,
                sales_type: Number(selectedSalesType) || null,
                invoice_type: Number(selectedInvoiceType) || null,
                price_type: priceTypeName,
                gross_amount: totalGross,
                discount_amount: totalDiscount,
                vat_amount: isVatApplicable ? totalVat : 0,
                net_amount: totalNet,
                total_amount: totalNet,
                remarks: "Auto-generated dealer invoice",
                items: cart.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    discount_amount: (item.unit_price - calculateChainNetPrice(item.unit_price, item.discounts || [])) * item.quantity,
                    total_amount: item.total_amount,
                    unit_id: item.unit_id,
                    discount_type: item.discount_type
                }))
            };

            const result = await createInvoice(payload);

            if (result.success) {
                toast.success(`Dealer Invoice ${generatedId} created successfully!`);
                router.push("/crm/site-sales-management/dealer-sales-invoice");
            } else {
                throw new Error("API failure");
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to create dealer invoice");
        } finally {
            setIsSaving(false);
        }
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
            {/* Minimal Header */}
            <header className="shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 px-8 py-4 flex items-center justify-between z-50">
                <div className="flex items-center gap-6">
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100" onClick={() => router.push('/crm/site-sales-management/dealer-sales-invoice')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2" />
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Create Dealer Sales Invoice</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Dealer Transaction Entry Workspace</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-8 pb-32 max-w-[1800px] mx-auto w-full flex flex-col gap-8">
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
                    />

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
                        onSave={handleSave}
                        isSaving={isSaving}
                    />
                </div>
            </div>
        </div>
    );
}
