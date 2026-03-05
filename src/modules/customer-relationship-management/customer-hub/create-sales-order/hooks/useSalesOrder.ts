"use client";

import { useState, useEffect, useMemo } from "react";
import { LineItem } from "../types";
import { salesOrderProvider } from "../providers/fetchProvider";
import { calculateChainNetPrice } from "../utils/priceCalc";
import { toast } from "sonner";

export function useSalesOrder() {
    // Selection State (IDs for dropdowns)
    const [salesmen, setSalesmen] = useState<any[]>([]);
    const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>("");

    const [accounts, setAccounts] = useState<any[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>("");
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [loadingCustomers, setLoadingCustomers] = useState(false);

    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);

    // Meta Settings
    const [receiptTypes, setReceiptTypes] = useState<any[]>([]);
    const [selectedReceiptTypeId, setSelectedReceiptTypeId] = useState<string>("");

    const [salesTypes, setSalesTypes] = useState<any[]>([]);
    const [selectedSalesTypeId, setSelectedSalesTypeId] = useState<string>("1");

    const [dueDate, setDueDate] = useState<string>("");
    const [poNo, setPoNo] = useState("");
    const [priceType, setPriceType] = useState<string>("A");

    // Product Results
    const [supplierProducts, setSupplierProducts] = useState<any[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Cart
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Checkout State
    const [isCheckout, setIsCheckout] = useState(false);
    const [orderNo, setOrderNo] = useState("");
    const [allocatedQuantities, setAllocatedQuantities] = useState<Record<string, number>>({});

    const selectedSalesman = useMemo(() => salesmen.find(s => (s.user_id || s.id)?.toString() === selectedSalesmanId), [salesmen, selectedSalesmanId]);
    const selectedAccount = useMemo(() => accounts.find(a => a.id.toString() === selectedAccountId), [accounts, selectedAccountId]);
    const selectedCustomer = useMemo(() => customers.find(c => c.id.toString() === selectedCustomerId), [customers, selectedCustomerId]);
    const selectedSupplier = useMemo(() => suppliers.find(s => s.id.toString() === selectedSupplierId), [suppliers, selectedSupplierId]);
    const selectedReceiptType = useMemo(() => receiptTypes.find(rt => rt.id.toString() === selectedReceiptTypeId), [receiptTypes, selectedReceiptTypeId]);
    const selectedSalesType = useMemo(() => salesTypes.find(st => st.id.toString() === selectedSalesTypeId), [salesTypes, selectedSalesTypeId]);

    // Initial Data Fetch
    useEffect(() => {
        salesOrderProvider.getSalesmen().then(setSalesmen);
        salesOrderProvider.getSuppliers().then(setSuppliers);
        fetch("/api/crm/customer-hub/create-sales-order?action=invoice_types")
            .then(r => r.json())
            .then(data => {
                setReceiptTypes(data);
                if (data.length > 0 && !selectedReceiptTypeId) setSelectedReceiptTypeId(data[0].id.toString());
            });
        fetch("/api/crm/customer-hub/create-sales-order?action=operations")
            .then(r => r.json())
            .then(data => {
                setSalesTypes(data);
                if (data.length > 0 && !selectedSalesTypeId) setSelectedSalesTypeId(data[0].id.toString());
            });
    }, []);

    // Change Handlers
    const handleSalesmanChange = async (id: string) => {
        setSelectedSalesmanId(id);
        setSelectedAccountId("");
        setSelectedCustomerId("");
        setAccounts([]);
        setCustomers([]);

        if (id) {
            setLoadingAccounts(true);
            try {
                const res = await fetch(`/api/crm/customer-hub/create-sales-order?action=accounts&user_id=${id}`);
                const data = await res.json();
                setAccounts(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingAccounts(false);
            }
        }
    };

    const handleAccountChange = async (id: string) => {
        setSelectedAccountId(id);
        setSelectedCustomerId("");
        setCustomers([]);

        const account = accounts.find(a => a.id.toString() === id);
        if (account) setPriceType(account.price_type || "A");

        if (id) {
            setLoadingCustomers(true);
            try {
                const data = await salesOrderProvider.getCustomers(Number(id));
                setCustomers(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingCustomers(false);
            }
        }
    };

    const handleCustomerChange = (id: string) => {
        setSelectedCustomerId(id);
        const customer = customers.find(c => c.id.toString() === id);
        if (customer?.price_type) setPriceType(customer.price_type);
    };

    const handleSupplierChange = (id: string) => {
        setSelectedSupplierId(id);
        setLineItems([]);
    };

    // Auto-fetch products when supplier is selected
    useEffect(() => {
        if (selectedCustomerId && selectedSupplierId) {
            const customer = customers.find(c => c.id.toString() === selectedCustomerId);
            if (customer) {
                setLoadingProducts(true);
                salesOrderProvider.searchProducts("", customer.customer_code, Number(selectedSupplierId), priceType, Number(selectedCustomerId))
                    .then(res => {
                        const productsWithMockStock = (Array.isArray(res) ? res : []).map(p => ({
                            ...p,
                            availableQty: Math.floor(Math.random() * 500) + 10 // Mock stock between 10 and 510
                        }));
                        setSupplierProducts(productsWithMockStock);
                    })
                    .finally(() => setLoadingProducts(false));
            }
        } else {
            setSupplierProducts([]);
        }
    }, [selectedCustomerId, selectedSupplierId, priceType, customers]);

    // Line Item Logic
    const addProduct = (product: any, quantity: number, uom: string) => {
        // Check if product already exists in cart with the same UOM
        const existingItem = lineItems.find(item =>
            item.product.product_id === product.product_id && item.uom === uom
        );

        if (existingItem) {
            updateLineItemQty(existingItem.id, existingItem.quantity + quantity);
            return;
        }

        const id = Math.random().toString(36).substr(2, 9);
        const basePrice = Number(product.base_price) || 0;
        const discounts = product.discounts || [];
        const netUnitPrice = calculateChainNetPrice(basePrice, discounts);
        const totalAmount = basePrice * quantity;
        const netAmount = netUnitPrice * quantity;

        const newItem: LineItem = {
            id,
            product,
            quantity,
            uom,
            unitPrice: basePrice,
            discountType: product.discount_level,
            discounts,
            netAmount,
            totalAmount,
            discountAmount: totalAmount - netAmount,
            availableQty: product.availableQty
        };

        setLineItems(prev => [...prev, newItem]);
    };

    const removeLineItem = (id: string) => {
        setLineItems(prev => prev.filter(item => item.id !== id));
    };

    const updateLineItemQty = (id: string, qty: number) => {
        setLineItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const totalAmount = item.unitPrice * qty;
            const netPrice = calculateChainNetPrice(item.unitPrice, item.discounts);
            const netAmount = netPrice * qty;
            return {
                ...item,
                quantity: qty,
                totalAmount,
                netAmount,
                discountAmount: totalAmount - netAmount
            };
        }));
    };

    const summary = useMemo(() => {
        const totalAmount = lineItems.reduce((sum, item) => sum + item.totalAmount, 0);
        const netAmount = lineItems.reduce((sum, item) => sum + item.netAmount, 0);

        // Allocated total
        const allocatedAmount = lineItems.reduce((sum, item) => {
            const qty = allocatedQuantities[item.id] ?? item.quantity;
            const netPrice = calculateChainNetPrice(item.unitPrice, item.discounts);
            return sum + (netPrice * qty);
        }, 0);

        return { totalAmount, netAmount, discountAmount: totalAmount - netAmount, allocatedAmount };
    }, [lineItems, allocatedQuantities]);

    const isValidAllocation = useMemo(() => {
        return lineItems.every(item => {
            const allocated = allocatedQuantities[item.id] ?? item.quantity;
            return allocated <= item.quantity && allocated >= 0;
        });
    }, [lineItems, allocatedQuantities]);

    const enterCheckout = () => {
        if (lineItems.length === 0) {
            toast.error("No items in order");
            return;
        }

        const now = new Date();
        const generatedNo = `SO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        setOrderNo(generatedNo);

        // Initialize allocated quantities with Option B: min(ordered, available)
        const initialAllocated: Record<string, number> = {};
        lineItems.forEach(item => {
            const available = item.availableQty ?? 999999;
            initialAllocated[item.id] = Math.min(item.quantity, available);
        });
        setAllocatedQuantities(initialAllocated);
        setIsCheckout(true);
    };

    const updateAllocatedQty = (id: string, qty: number) => {
        setAllocatedQuantities(prev => ({ ...prev, [id]: qty }));
    };

    const handleSubmitOrder = async () => {
        if (!selectedAccountId || !selectedCustomerId || !selectedSupplierId || !selectedReceiptTypeId) {
            toast.error("Please complete all header selections");
            return;
        }
        if (lineItems.length === 0) {
            toast.error("No items in order");
            return;
        }

        setSubmitting(true);
        try {
            const header = {
                salesman_id: Number(selectedAccountId),
                customer_code: selectedCustomer.customer_code,
                supplier_id: Number(selectedSupplierId),
                receipt_type: Number(selectedReceiptTypeId),
                sales_type: Number(selectedSalesTypeId),
                po_no: poNo,
                due_date: dueDate,
                total_amount: summary.totalAmount,
                discount_amount: summary.discountAmount,
                net_amount: summary.netAmount,
                allocated_amount: summary.allocatedAmount,
                order_no: orderNo,
                order_status: "For Approval",
                for_approval_at: new Date().toISOString()
            };

            const itemsWithAllocation = lineItems.map(item => ({
                ...item,
                allocated_quantity: allocatedQuantities[item.id] ?? item.quantity,
                allocated_amount: (calculateChainNetPrice(item.unitPrice, item.discounts)) * (allocatedQuantities[item.id] ?? item.quantity)
            }));

            const result = await salesOrderProvider.createOrder(header, itemsWithAllocation);
            if (result.success) {
                toast.success(`Order created: ${result.order_no}`);
                window.location.reload();
            } else {
                toast.error(result.error || "Failed to create order");
            }
        } catch (e) {
            toast.error("Submission error");
        } finally {
            setSubmitting(false);
        }
    };

    return {
        salesmen, selectedSalesmanId, handleSalesmanChange, selectedSalesman,
        accounts, selectedAccountId, handleAccountChange, selectedAccount, loadingAccounts,
        customers, selectedCustomerId, handleCustomerChange, selectedCustomer, loadingCustomers,
        suppliers, selectedSupplierId, handleSupplierChange, selectedSupplier, loadingSuppliers,
        receiptTypes, selectedReceiptTypeId, setSelectedReceiptTypeId, selectedReceiptType,
        salesTypes, selectedSalesTypeId, setSelectedSalesTypeId, selectedSalesType,
        dueDate, setDueDate,
        poNo, setPoNo,
        priceType,
        supplierProducts, loadingProducts,
        lineItems,
        addProduct, removeLineItem, updateLineItemQty,
        summary, isValidAllocation,
        isCheckout, setIsCheckout, orderNo, enterCheckout, allocatedQuantities, updateAllocatedQty,
        handleSubmitOrder, submitting
    };
}
