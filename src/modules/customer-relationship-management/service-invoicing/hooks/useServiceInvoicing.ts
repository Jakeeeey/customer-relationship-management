"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Salesman,
    Customer,
    Supplier,
    ReceiptType,
    SalesType,
    Branch,
    PriceTypeModel,
    PaymentTerm,
    ServiceInvoiceDetailOther,
    ServiceInvoiceHeaderRecord,
    ServiceInvoiceSummary,
} from "../types";
import { serviceInvoicingProvider } from "../providers/fetchProvider";
import { toast } from "sonner";

export type VatMode = "inclusive" | "exclusive" | "exempt";

function createBlankLineItem(): ServiceInvoiceDetailOther {
    return {
        id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        item_description: "",
        unit: "LOT",
        quantity: 1,
        unit_price: 0,
        gross_amount: 0,
        discount_amount: 0,
        vat_amount: 0,
        ewt_amount: 0,
        total_amount: 0,
        remarks: "",
    };
}

function recalculateLine(
    line: ServiceInvoiceDetailOther,
    vatMode: VatMode,
    ewtRatePercent: number
): ServiceInvoiceDetailOther {
    const qty = Math.max(0, Number(line.quantity) || 0);
    const unitPrice = Math.max(0, Number(line.unit_price) || 0);
    const discount = Math.max(0, Number(line.discount_amount) || 0);
    const gross = qty * unitPrice;
    const netBeforeTax = Math.max(0, gross - discount);

    let vatAmount = 0;
    let totalAmount = netBeforeTax;
    let taxBase = netBeforeTax;

    if (vatMode === "inclusive") {
        taxBase = netBeforeTax / 1.12;
        vatAmount = netBeforeTax - taxBase;
        totalAmount = netBeforeTax;
    } else if (vatMode === "exclusive") {
        taxBase = netBeforeTax;
        vatAmount = netBeforeTax * 0.12;
        totalAmount = netBeforeTax + vatAmount;
    } else {
        taxBase = netBeforeTax;
        vatAmount = 0;
        totalAmount = netBeforeTax;
    }

    const ewtAmount = ewtRatePercent > 0 ? taxBase * (ewtRatePercent / 100) : 0;

    return {
        ...line,
        gross_amount: Number(gross.toFixed(2)),
        vat_amount: Number(vatAmount.toFixed(2)),
        ewt_amount: Number(ewtAmount.toFixed(2)),
        total_amount: Number(totalAmount.toFixed(2)),
    };
}

export function useServiceInvoicing() {
    // Master / Lookup State (Sales Order Header pattern)
    const [allSalesmen, setAllSalesmen] = useState<Salesman[]>([]);
    const [salesmen, setSalesmen] = useState<Salesman[]>([]);
    const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>("");

    const [accounts, setAccounts] = useState<Salesman[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>("");
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");
    const [hasMoreCustomers, setHasMoreCustomers] = useState(true);
    const [loadingMoreCustomers, setLoadingMoreCustomers] = useState(false);
    const [customerReceivable, setCustomerReceivable] = useState<number | null>(null);
    const [loadingReceivable, setLoadingReceivable] = useState(false);

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
    const loadingSuppliers = false;

    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>("");

    const [priceTypeModels, setPriceTypeModels] = useState<PriceTypeModel[]>([]);
    const [priceType, setPriceType] = useState<string>("A");
    const [priceTypeId, setPriceTypeId] = useState<number | null>(null);

    const [receiptTypes, setReceiptTypes] = useState<ReceiptType[]>([]);
    const [selectedReceiptTypeId, setSelectedReceiptTypeId] = useState<string>("");

    const [salesTypes, setSalesTypes] = useState<SalesType[]>([]);
    const [selectedSalesTypeId, setSelectedSalesTypeId] = useState<string>("1");

    const [paymentTerms, setPaymentTerms] = useState<number | null>(null);
    const [paymentTermsList, setPaymentTermsList] = useState<PaymentTerm[]>([]);

    // Dates & Numbers
    const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
    const [invoiceDate, setInvoiceDate] = useState<string>(todayStr);
    const [dueDate, setDueDate] = useState<string>(todayStr);
    const [dispatchDate, setDispatchDate] = useState<string>(todayStr);
    const [orderId, setOrderId] = useState<string>("");
    const [invoiceNo, setInvoiceNo] = useState<string>("");
    const [invoiceNoExists, setInvoiceNoExists] = useState<boolean>(false);
    const [checkingInvoiceNo, setCheckingInvoiceNo] = useState<boolean>(false);

    const [transactionStatus, setTransactionStatus] = useState<string>("New Invoice");
    const [paymentStatus, setPaymentStatus] = useState<string>("Unpaid");
    const [invoiceRemarks, setInvoiceRemarks] = useState<string>("");

    // Tax Settings
    const [vatMode, setVatMode] = useState<VatMode>("inclusive");
    const [ewtRate, setEwtRate] = useState<number>(0);

    // Dynamic Line Items (`sales_invoice_details_other`)
    const [lineItems, setLineItems] = useState<ServiceInvoiceDetailOther[]>(() => [createBlankLineItem()]);
    const [deletedDetailIds, setDeletedDetailIds] = useState<number[]>([]);
    const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);

    // Existing Service Invoices History
    const [serviceInvoices, setServiceInvoices] = useState<ServiceInvoiceHeaderRecord[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState<boolean>(false);
    const [invoiceSearch, setInvoiceSearch] = useState<string>("");

    // Selected Objects
    const selectedSalesman = useMemo(
        () => (Array.isArray(salesmen) ? salesmen.find((s) => (s.user_id || s.id)?.toString() === selectedSalesmanId) : undefined),
        [salesmen, selectedSalesmanId]
    );
    const selectedAccount = useMemo(
        () => (Array.isArray(accounts) ? accounts.find((a) => a.id.toString() === selectedAccountId) : undefined),
        [accounts, selectedAccountId]
    );
    const selectedCustomer = useMemo(
        () => (Array.isArray(customers) ? customers.find((c) => c.id.toString() === selectedCustomerId) : undefined),
        [customers, selectedCustomerId]
    );
    const selectedSupplier = useMemo(
        () => (Array.isArray(suppliers) ? suppliers.find((s) => s.id.toString() === selectedSupplierId) : undefined),
        [suppliers, selectedSupplierId]
    );
    const selectedReceiptType = useMemo(
        () => (Array.isArray(receiptTypes) ? receiptTypes.find((rt) => rt.id.toString() === selectedReceiptTypeId) : undefined),
        [receiptTypes, selectedReceiptTypeId]
    );
    const selectedSalesType = useMemo(
        () => (Array.isArray(salesTypes) ? salesTypes.find((st) => st.id.toString() === selectedSalesTypeId) : undefined),
        [salesTypes, selectedSalesTypeId]
    );
    const selectedBranch = useMemo(
        () => (Array.isArray(branches) ? branches.find((b) => b.id.toString() === selectedBranchId) : undefined),
        [branches, selectedBranchId]
    );

    // Auto-calculate Due Date based on Payment Terms & Invoice Date
    useEffect(() => {
        const selectedTerm = paymentTermsList.find((pt) => Number(pt.id) === Number(paymentTerms));
        const days = selectedTerm?.payment_days || 0;
        const base = invoiceDate ? new Date(invoiceDate) : new Date();
        if (!isNaN(base.getTime())) {
            const future = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
            setDueDate(future.toISOString().split("T")[0]);
        }
    }, [paymentTerms, paymentTermsList, invoiceDate]);

    // Auto-generate Draft/Suggested Invoice No when account or supplier changes (if user hasn't typed a custom one)
    const generateSuggestedInvoiceNo = useCallback(() => {
        const prefix = selectedAccount?.salesman_code || selectedSupplier?.supplier_shortcut || "SRV";
        const now = new Date();
        const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
        const timePart = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
        const generated = `${prefix}-${datePart}-${timePart}`;
        setInvoiceNo(generated);
        if (!orderId) {
            setOrderId(`SO-${generated}`);
        }
    }, [selectedAccount?.salesman_code, selectedSupplier?.supplier_shortcut, orderId]);

    // Check Invoice No uniqueness (debounced)
    useEffect(() => {
        if (!invoiceNo.trim() || editingInvoiceId) {
            setInvoiceNoExists(false);
            return;
        }
        const timer = setTimeout(async () => {
            setCheckingInvoiceNo(true);
            try {
                const exists = await serviceInvoicingProvider.checkInvoiceNoExists(invoiceNo.trim());
                setInvoiceNoExists(exists);
            } catch {
                setInvoiceNoExists(false);
            } finally {
                setCheckingInvoiceNo(false);
            }
        }, 450);
        return () => clearTimeout(timer);
    }, [invoiceNo, editingInvoiceId]);

    // Fetch Customer Accounts Receivable (AR) just like Sales Order
    useEffect(() => {
        const customerCode = selectedCustomer?.customer_code;
        if (!customerCode) {
            setCustomerReceivable(null);
            setLoadingReceivable(false);
            return;
        }

        let isMounted = true;
        setLoadingReceivable(true);

        fetch(`/api/crm/customer-hub/accounts-receivable?customerCode=${encodeURIComponent(customerCode)}`)
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch AR");
                return res.json();
            })
            .then((data) => {
                if (isMounted) {
                    setCustomerReceivable(typeof data?.amount === "number" ? data.amount : Number(data?.amount || 0));
                }
            })
            .catch(() => {
                if (isMounted) setCustomerReceivable(0);
            })
            .finally(() => {
                if (isMounted) setLoadingReceivable(false);
            });

        return () => {
            isMounted = false;
        };
    }, [selectedCustomer?.customer_code]);

    // Initial Lookup Load
    useEffect(() => {
        const init = async () => {
            try {
                const [sm, sup, br, pt, rec, ops, pterms] = await Promise.all([
                    serviceInvoicingProvider.getSalesmen(),
                    serviceInvoicingProvider.getSuppliers(),
                    serviceInvoicingProvider.getBranches(),
                    serviceInvoicingProvider.getPriceTypes(),
                    serviceInvoicingProvider.getInvoiceTypes(),
                    serviceInvoicingProvider.getOperations(),
                    serviceInvoicingProvider.getPaymentTerms(),
                ]);

                const smArray = Array.isArray(sm) ? sm : [];
                setAllSalesmen(smArray);
                setSalesmen(smArray);
                setSuppliers(Array.isArray(sup) ? sup : []);
                setBranches(Array.isArray(br) ? br : []);
                setPriceTypeModels(Array.isArray(pt) ? pt : []);
                setReceiptTypes(Array.isArray(rec) ? rec : []);
                setSalesTypes(Array.isArray(ops) ? ops : []);
                setPaymentTermsList(Array.isArray(pterms) ? pterms : []);

                if (Array.isArray(rec) && rec.length > 0) setSelectedReceiptTypeId(rec[0].id.toString());
                if (Array.isArray(ops) && ops.length > 0) setSelectedSalesTypeId(ops[0].id.toString());
                if (Array.isArray(pt) && pt.length > 0) {
                    setPriceTypeId(pt[0].price_type_id);
                    setPriceType(pt[0].price_type_name);
                }
            } catch (err) {
                console.error("[useServiceInvoicing] Init failed:", err);
                toast.error("Failed to load header reference data.");
            }
        };
        init();
    }, []);

    // Debounced Customer Search
    useEffect(() => {
        const fetchCustomers = async () => {
            setLoadingCustomers(true);
            setHasMoreCustomers(true);
            try {
                const data = await serviceInvoicingProvider.getAllCustomers(customerSearch, 0);
                const results = Array.isArray(data) ? data : [];
                setCustomers((prev) => {
                    if (selectedCustomerId) {
                        const existing = prev.find((c) => c.id.toString() === selectedCustomerId);
                        if (existing && !results.some((r) => r.id.toString() === existing.id.toString())) {
                            return [existing, ...results];
                        }
                    }
                    return results;
                });
                if (results.length < 30) setHasMoreCustomers(false);
            } catch (err) {
                console.error("Customer search error", err);
            } finally {
                setLoadingCustomers(false);
            }
        };

        const timer = setTimeout(fetchCustomers, 350);
        return () => clearTimeout(timer);
    }, [customerSearch, selectedCustomerId]);

    const loadMoreCustomers = useCallback(async () => {
        if (loadingMoreCustomers || !hasMoreCustomers) return;
        setLoadingMoreCustomers(true);
        try {
            const currentCount = customers.length;
            const data = await serviceInvoicingProvider.getAllCustomers(customerSearch, currentCount);
            const moreResults = Array.isArray(data) ? data : [];
            if (moreResults.length > 0) {
                setCustomers((prev) => [...prev, ...moreResults]);
                if (moreResults.length < 30) setHasMoreCustomers(false);
            } else {
                setHasMoreCustomers(false);
            }
        } catch (err) {
            console.error("Customer pagination error", err);
        } finally {
            setLoadingMoreCustomers(false);
        }
    }, [customers.length, customerSearch, loadingMoreCustomers, hasMoreCustomers]);

    // Fetch Service Invoices History
    const fetchServiceInvoices = useCallback(async (search?: string) => {
        setLoadingInvoices(true);
        try {
            const list = await serviceInvoicingProvider.getServiceInvoices(search);
            setServiceInvoices(list);
        } catch (err) {
            console.error("Failed to load service invoices:", err);
        } finally {
            setLoadingInvoices(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchServiceInvoices(invoiceSearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [invoiceSearch, fetchServiceInvoices]);

    // Sales Order Header Selection Handlers
    const handleAccountChange = async (id: string, providedAccount?: Salesman) => {
        setSelectedAccountId(id);

        const account = providedAccount || accounts.find((a) => a.id.toString() === id);
        if (account) {
            if (account.price_type) setPriceType(account.price_type);
            if (account.price_type_id) setPriceTypeId(account.price_type_id);
            if (account.branch_code) {
                const bId =
                    typeof account.branch_code === "object"
                        ? (account.branch_code as { id?: number | string }).id
                        : account.branch_code;
                if (bId) setSelectedBranchId(bId.toString());
            }
            if (!invoiceNo && account.salesman_code) {
                const now = new Date();
                const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
                const timePart = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
                const generated = `${account.salesman_code}-${datePart}-${timePart}`;
                setInvoiceNo(generated);
                if (!orderId) setOrderId(`SO-${generated}`);
            }
        }

        if (id) {
            setLoadingCustomers(true);
            try {
                const data = await serviceInvoicingProvider.getCustomers(Number(id));
                setCustomers((prev) => {
                    const dataSafe = Array.isArray(data) ? data : [];
                    if (!selectedCustomerId) return dataSafe;
                    const selected = prev.find((c) => c.id.toString() === selectedCustomerId);
                    if (selected && !dataSafe.some((c) => c.id.toString() === selected.id.toString())) {
                        return [selected, ...dataSafe];
                    }
                    return dataSafe;
                });
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingCustomers(false);
            }
        }
    };

    const handleSalesmanChange = async (id: string) => {
        setSelectedSalesmanId(id);
        setSelectedAccountId("");
        setAccounts([]);

        if (id) {
            setLoadingAccounts(true);
            try {
                const data = await serviceInvoicingProvider.getAccounts(id);
                const safeAccounts = Array.isArray(data) ? data : [];
                setAccounts(safeAccounts);

                const masterUser = salesmen.find((s) => (s.user_id || s.id)?.toString() === id);
                if (masterUser?.linked_account_ids && masterUser.linked_account_ids.length === 1) {
                    const linkedId = masterUser.linked_account_ids[0].toString();
                    const linkedAccount = safeAccounts.find((a) => a.id.toString() === linkedId);
                    handleAccountChange(linkedId, linkedAccount);
                } else if (safeAccounts.length === 1) {
                    handleAccountChange(safeAccounts[0].id.toString(), safeAccounts[0]);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingAccounts(false);
            }
        }
    };

    const handleCustomerChange = async (id: string) => {
        setSelectedCustomerId(id);
        const customer = customers.find((c) => c.id.toString() === id);

        if (customer) {
            if (customer.price_type) setPriceType(customer.price_type);
            if (customer.price_type_id) setPriceTypeId(Number(customer.price_type_id));
            if (customer.payment_term !== undefined) setPaymentTerms(customer.payment_term);
        }

        if (id) {
            try {
                const linkedUsers = await serviceInvoicingProvider.getSalesmanByCustomer(Number(id));
                const activeSalesmen = Array.isArray(linkedUsers) && linkedUsers.length > 0 ? linkedUsers : allSalesmen;
                setSalesmen(activeSalesmen);

                const isCurrentValid = activeSalesmen.some((s) => (s.user_id || s.id)?.toString() === selectedSalesmanId);

                if (activeSalesmen.length === 1) {
                    const sm = activeSalesmen[0];
                    const uid = (sm.user_id || sm.id)?.toString();
                    if (uid && (!selectedSalesmanId || !isCurrentValid)) {
                        setSelectedSalesmanId(uid);
                        const acctsData = await serviceInvoicingProvider.getAccounts(uid);
                        const safeAccts = Array.isArray(acctsData) ? acctsData : [];
                        setAccounts(safeAccts);

                        if (sm.linked_account_ids && sm.linked_account_ids.length === 1) {
                            const aid = sm.linked_account_ids[0].toString();
                            const linkedAccount = safeAccts.find((a) => a.id.toString() === aid);
                            handleAccountChange(aid, linkedAccount);
                        } else if (safeAccts.length === 1) {
                            handleAccountChange(safeAccts[0].id.toString(), safeAccts[0]);
                        }
                    }
                } else if (!isCurrentValid) {
                    setSelectedSalesmanId("");
                    setSelectedAccountId("");
                    setAccounts([]);
                }
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handlePriceTypeIdChange = (idStr: string) => {
        const idNum = Number(idStr);
        setPriceTypeId(idNum);
        const found = priceTypeModels.find((m) => m.price_type_id === idNum);
        if (found) {
            setPriceType(found.price_type_name);
        }
    };

    // Recalculate all lines when VAT mode or EWT rate changes
    useEffect(() => {
        setLineItems((prev) => prev.map((line) => recalculateLine(line, vatMode, ewtRate)));
    }, [vatMode, ewtRate]);

    // Dynamic Line Item Handlers
    const addLineItem = useCallback(() => {
        setLineItems((prev) => [...prev, recalculateLine(createBlankLineItem(), vatMode, ewtRate)]);
    }, [vatMode, ewtRate]);

    const removeLineItem = useCallback((rowId: string) => {
        setLineItems((prev) => {
            const target = prev.find((l) => l.id === rowId);
            if (target?.detail_id) {
                setDeletedDetailIds((ids) => [...ids, target.detail_id!]);
            }
            const remaining = prev.filter((l) => l.id !== rowId);
            return remaining.length > 0 ? remaining : [createBlankLineItem()];
        });
    }, []);

    const duplicateLineItem = useCallback((rowId: string) => {
        setLineItems((prev) => {
            const idx = prev.findIndex((l) => l.id === rowId);
            if (idx === -1) return prev;
            const source = prev[idx];
            const copy: ServiceInvoiceDetailOther = {
                ...source,
                id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                detail_id: undefined,
            };
            const next = [...prev];
            next.splice(idx + 1, 0, copy);
            return next;
        });
    }, []);

    const updateLineItem = useCallback(
        (rowId: string, field: keyof ServiceInvoiceDetailOther, value: string | number) => {
            setLineItems((prev) =>
                prev.map((line) => {
                    if (line.id !== rowId) return line;
                    const updated = { ...line, [field]: value };
                    if (field === "quantity" || field === "unit_price" || field === "discount_amount") {
                        return recalculateLine(updated, vatMode, ewtRate);
                    }
                    return updated;
                })
            );
        },
        [vatMode, ewtRate]
    );

    // Financial Summary
    const summary: ServiceInvoiceSummary = useMemo(() => {
        let grossAmount = 0;
        let discountAmount = 0;
        let vatAmount = 0;
        let ewtAmount = 0;
        let totalAmount = 0;
        let validItems = 0;

        lineItems.forEach((item) => {
            grossAmount += Number(item.gross_amount) || 0;
            discountAmount += Number(item.discount_amount) || 0;
            vatAmount += Number(item.vat_amount) || 0;
            ewtAmount += Number(item.ewt_amount) || 0;
            totalAmount += Number(item.total_amount) || 0;
            if (item.item_description.trim() || Number(item.total_amount) > 0) {
                validItems += 1;
            }
        });

        const netAmount = Math.max(0, totalAmount - ewtAmount);

        return {
            grossAmount: Number(grossAmount.toFixed(2)),
            discountAmount: Number(discountAmount.toFixed(2)),
            vatAmount: Number(vatAmount.toFixed(2)),
            ewtAmount: Number(ewtAmount.toFixed(2)),
            netAmount: Number(netAmount.toFixed(2)),
            totalAmount: Number(totalAmount.toFixed(2)),
            itemCount: validItems,
        };
    }, [lineItems]);

    // Reset Form
    const resetForm = useCallback(() => {
        setEditingInvoiceId(null);
        setDeletedDetailIds([]);
        setSelectedCustomerId("");
        setCustomerSearch("");
        setCustomerReceivable(null);
        setSelectedSalesmanId("");
        setSalesmen(allSalesmen);
        setSelectedAccountId("");
        setAccounts([]);
        setSelectedBranchId("");
        setPaymentTerms(null);
        if (priceTypeModels.length > 0) {
            setPriceTypeId(priceTypeModels[0].price_type_id);
            setPriceType(priceTypeModels[0].price_type_name);
        }
        if (receiptTypes.length > 0) {
            setSelectedReceiptTypeId(receiptTypes[0].id.toString());
        }
        if (salesTypes.length > 0) {
            setSelectedSalesTypeId(salesTypes[0].id.toString());
        }
        setLineItems([createBlankLineItem()]);
        setInvoiceNo("");
        setOrderId("");
        setInvoiceRemarks("");
        setTransactionStatus("New Invoice");
        setPaymentStatus("Unpaid");
        setInvoiceDate(todayStr);
        setDueDate(todayStr);
        setDispatchDate(todayStr);
        setVatMode("inclusive");
        setEwtRate(0);
    }, [todayStr, allSalesmen, priceTypeModels, receiptTypes, salesTypes]);

    // Load Existing Service Invoice into Editor
    const loadInvoiceForEdit = useCallback(
        async (record: ServiceInvoiceHeaderRecord) => {
            setEditingInvoiceId(record.invoice_id);
            setDeletedDetailIds([]);
            setInvoiceNo(record.invoice_no || "");
            setOrderId(record.order_id || "");
            setInvoiceRemarks(record.remarks || "");
            setTransactionStatus(record.transaction_status || "New Invoice");
            setPaymentStatus(record.payment_status || "Unpaid");
            if (record.invoice_date) setInvoiceDate(record.invoice_date.split("T")[0]);
            if (record.due_date) setDueDate(record.due_date.split("T")[0]);
            if (record.dispatch_date) setDispatchDate(record.dispatch_date.split("T")[0]);
            if (record.payment_terms) setPaymentTerms(Number(record.payment_terms));
            if (record.price_type) setPriceType(record.price_type);

            const branchIdVal =
                typeof record.branch_id === "object" && record.branch_id !== null
                    ? record.branch_id.id
                    : record.branch_id;
            if (branchIdVal) setSelectedBranchId(branchIdVal.toString());

            const invTypeVal =
                typeof record.invoice_type === "object" && record.invoice_type !== null
                    ? record.invoice_type.id
                    : record.invoice_type;
            if (invTypeVal) setSelectedReceiptTypeId(invTypeVal.toString());

            const salesTypeVal =
                typeof record.sales_type === "object" && record.sales_type !== null
                    ? record.sales_type.id
                    : record.sales_type;
            if (salesTypeVal) setSelectedSalesTypeId(salesTypeVal.toString());

            // Match customer by customer_code
            if (record.customer_code) {
                const foundCust = customers.find((c) => c.customer_code === record.customer_code);
                if (foundCust) {
                    setSelectedCustomerId(foundCust.id.toString());
                } else {
                    const searchRes = await serviceInvoicingProvider.getAllCustomers(record.customer_code, 0);
                    if (Array.isArray(searchRes) && searchRes.length > 0) {
                        setCustomers((prev) => [searchRes[0], ...prev]);
                        setSelectedCustomerId(searchRes[0].id.toString());
                    }
                }
            }

            if (record.details_other && record.details_other.length > 0) {
                setLineItems(
                    record.details_other.map((d, idx) => ({
                        id: `edit-${d.detail_id || idx}-${Date.now()}`,
                        detail_id: d.detail_id,
                        invoice_id: record.invoice_id,
                        order_id: d.order_id || record.order_id,
                        item_description: d.item_description || "",
                        unit: d.unit || "LOT",
                        quantity: Number(d.quantity) || 1,
                        unit_price: Number(d.unit_price) || 0,
                        gross_amount: Number(d.gross_amount) || 0,
                        discount_amount: Number(d.discount_amount) || 0,
                        vat_amount: Number(d.vat_amount) || 0,
                        ewt_amount: Number(d.ewt_amount) || 0,
                        total_amount: Number(d.total_amount) || 0,
                        remarks: d.remarks || "",
                    }))
                );
            } else {
                setLineItems([createBlankLineItem()]);
            }
        },
        [customers]
    );

    // Submit Service Invoice (Create or Update)
    const handleSubmitInvoice = async () => {
        if (!selectedCustomer) {
            toast.error("Please select a Customer.");
            return false;
        }
        if (!selectedBranchId) {
            toast.error("Please select a Branch.");
            return false;
        }
        if (!invoiceNo.trim()) {
            toast.error("Please provide an Invoice Number.");
            return false;
        }
        if (!editingInvoiceId && invoiceNoExists) {
            toast.error("Invoice Number already exists. Please use a unique Invoice Number.");
            return false;
        }

        const nonEmptyLines = lineItems.filter(
            (l) => l.item_description.trim() !== "" || Number(l.unit_price) > 0 || Number(l.total_amount) > 0
        );
        if (nonEmptyLines.length === 0) {
            toast.error("Please enter at least one dynamic service item with a description and amount.");
            return false;
        }

        const missingDescription = nonEmptyLines.some((l) => !l.item_description.trim());
        if (missingDescription) {
            toast.error("Every line item must have a Description / Particulars.");
            return false;
        }

        setSubmitting(true);
        try {
            const isOfficialReceipt = selectedReceiptType
                ? Number(selectedReceiptType.isOfficial) === 1
                : false;

            const headerPayload = {
                order_id: orderId.trim() || invoiceNo.trim(),
                customer_code: selectedCustomer.customer_code,
                invoice_no: invoiceNo.trim(),
                salesman_id: selectedAccountId ? Number(selectedAccountId) : null,
                branch_id: selectedBranchId ? Number(selectedBranchId) : null,
                invoice_date: invoiceDate,
                dispatch_date: dispatchDate || null,
                due_date: dueDate || null,
                payment_terms: paymentTerms ? Number(paymentTerms) : null,
                transaction_status: transactionStatus || "New Invoice",
                payment_status: paymentStatus || "Unpaid",
                total_amount: summary.totalAmount,
                sales_type: selectedSalesTypeId ? Number(selectedSalesTypeId) : null,
                invoice_type: selectedReceiptTypeId ? Number(selectedReceiptTypeId) : null,
                price_type: priceType || "A",
                vat_amount: summary.vatAmount,
                gross_amount: summary.grossAmount,
                discount_amount: summary.discountAmount,
                net_amount: summary.netAmount,
                ewt_amount: summary.ewtAmount,
                remarks: invoiceRemarks,
                isReceipt: isOfficialReceipt ? 1 : 0,
                isPosted: transactionStatus === "Posted" ? 1 : 0,
                isDispatched: transactionStatus === "Dispatched" ? 1 : 0,
            };

            if (editingInvoiceId) {
                const res = await fetch("/api/crm/service-invoicing", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "update_invoice",
                        invoice_id: editingInvoiceId,
                        header: headerPayload,
                        items: nonEmptyLines,
                        deletedDetailIds,
                    }),
                });
                const json = await res.json();
                if (!res.ok || json.error) {
                    throw new Error(json.error || "Failed to update service invoice.");
                }
                toast.success(`Service Invoice #${invoiceNo} updated successfully!`);
            } else {
                const res = await fetch("/api/crm/service-invoicing", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        header: headerPayload,
                        items: nonEmptyLines,
                    }),
                });
                const json = await res.json();
                if (!res.ok || json.error) {
                    throw new Error(json.error || "Failed to create service invoice.");
                }
                toast.success(`Service Invoice #${json.invoice_no} created (ID: ${json.invoice_id})!`);
            }

            resetForm();
            fetchServiceInvoices(invoiceSearch);
            return true;
        } catch (err: unknown) {
            console.error("[useServiceInvoicing] Submit Error:", err);
            toast.error((err as Error).message || "Failed to save Service Invoice.");
            return false;
        } finally {
            setSubmitting(false);
        }
    };

    const handlePostInvoice = async (invoiceId: number) => {
        try {
            const res = await fetch("/api/crm/service-invoicing", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "post_invoice",
                    invoice_id: invoiceId,
                }),
            });
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error || "Failed to post invoice");
            }
            toast.success("Service Invoice posted!");
            fetchServiceInvoices(invoiceSearch);
        } catch (err: unknown) {
            toast.error((err as Error).message || "Failed to post invoice");
        }
    };

    return {
        // Header Lookups & Selections
        salesmen,
        selectedSalesmanId,
        selectedSalesman,
        handleSalesmanChange,

        accounts,
        selectedAccountId,
        selectedAccount,
        loadingAccounts,
        handleAccountChange,

        customers,
        selectedCustomerId,
        selectedCustomer,
        loadingCustomers,
        handleCustomerChange,
        customerSearch,
        setCustomerSearch,
        hasMoreCustomers,
        loadingMoreCustomers,
        loadMoreCustomers,

        suppliers,
        selectedSupplierId,
        selectedSupplier,
        loadingSuppliers,
        setSelectedSupplierId,

        branches,
        selectedBranchId,
        selectedBranch,
        setSelectedBranchId,

        receiptTypes,
        selectedReceiptTypeId,
        selectedReceiptType,
        setSelectedReceiptTypeId,

        salesTypes,
        selectedSalesTypeId,
        selectedSalesType,
        setSelectedSalesTypeId,

        priceType,
        priceTypeId,
        priceTypeModels,
        handlePriceTypeIdChange,

        paymentTerms,
        setPaymentTerms,
        paymentTermsList,

        customerReceivable,
        loadingReceivable,

        // Dates & Invoice Metadata
        invoiceDate,
        setInvoiceDate,
        dueDate,
        setDueDate,
        dispatchDate,
        setDispatchDate,
        orderId,
        setOrderId,
        invoiceNo,
        setInvoiceNo,
        invoiceNoExists,
        checkingInvoiceNo,
        generateSuggestedInvoiceNo,
        transactionStatus,
        setTransactionStatus,
        paymentStatus,
        setPaymentStatus,
        invoiceRemarks,
        setInvoiceRemarks,

        // Tax Config
        vatMode,
        setVatMode,
        ewtRate,
        setEwtRate,

        // Dynamic Line Items (`sales_invoice_details_other`)
        lineItems,
        addLineItem,
        removeLineItem,
        duplicateLineItem,
        updateLineItem,
        summary,

        // Actions & History
        editingInvoiceId,
        submitting,
        handleSubmitInvoice,
        resetForm,
        loadInvoiceForEdit,
        handlePostInvoice,
        serviceInvoices,
        loadingInvoices,
        invoiceSearch,
        setInvoiceSearch,
        fetchServiceInvoices,
    };
}

