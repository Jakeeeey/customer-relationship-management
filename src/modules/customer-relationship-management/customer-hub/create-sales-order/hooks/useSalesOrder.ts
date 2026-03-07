"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { LineItem, Salesman, Customer, Supplier, Product, ReceiptType, SalesType } from "../types";
import { salesOrderProvider } from "../providers/fetchProvider";
import { calculateChainNetPrice } from "../utils/priceCalc";
import { toast } from "sonner";

export function useSalesOrder() {
    // Selection State (IDs for dropdowns)
    const [salesmen, setSalesmen] = useState<Salesman[]>([]);
    const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>("");

    const [accounts, setAccounts] = useState<Salesman[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>("");
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [loadingCustomers, setLoadingCustomers] = useState(false);

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
    const loadingSuppliers = false;

    // Meta Settings
    const [receiptTypes, setReceiptTypes] = useState<ReceiptType[]>([]);
    const [selectedReceiptTypeId, setSelectedReceiptTypeId] = useState<string>("");

    const [salesTypes, setSalesTypes] = useState<SalesType[]>([]);
    const [selectedSalesTypeId, setSelectedSalesTypeId] = useState<string>("1");

    const [dueDate, setDueDate] = useState<string>("");
    const [deliveryDate, setDeliveryDate] = useState<string>("");
    const [poNo, setPoNo] = useState("");
    const [priceType, setPriceType] = useState<string>("A");
    const [priceTypeId, setPriceTypeId] = useState<number | null>(null);

    // Product Results
    const [supplierProducts, setSupplierProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [inventory, setInventory] = useState<Record<number, number>>({});

    // Cart
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Checkout State
    const [isCheckout, setIsCheckout] = useState(false);
    const [orderNo, setOrderNo] = useState("");
    const [allocatedQuantities, setAllocatedQuantities] = useState<Record<string, number>>({});
    const [orderRemarks, setOrderRemarks] = useState("");

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
        // We only want this to run once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        if (account) {
            setPriceType(account.price_type || "A");
            setPriceTypeId(account.price_type_id || null);
        }

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
            const customerCode = customer?.customer_code;
            const customerId = selectedCustomerId;
            const supplierId = selectedSupplierId;
            const sSalesmanId = selectedSalesmanId;

            if (customerCode) {
                setLoadingProducts(true);

                // Concurrent fetch for products and inventory
                Promise.all([
                    salesOrderProvider.searchProducts("", customerCode, Number(supplierId), priceType, Number(customerId), priceTypeId || undefined, sSalesmanId),
                    salesOrderProvider.getInventory().catch(err => {
                        console.error("Inventory fetch failed:", err);
                        return [];
                    })
                ]).then(([productsData, inventoryData]) => {
                    setSupplierProducts(Array.isArray(productsData) ? productsData : []);

                    const invMap: Record<number, number> = {};
                    if (Array.isArray(inventoryData)) {
                        inventoryData.forEach(item => {
                            invMap[item.productId] = item.unitCount;
                        });
                    }
                    setInventory(invMap);
                }).finally(() => setLoadingProducts(false));
            }
        } else {
            setSupplierProducts([]);
            setInventory({});
        }
    }, [selectedCustomerId, selectedSupplierId, priceType, priceTypeId, selectedSalesmanId, customers]);

    // Line Item Logic
    const addProduct = (product: Product, quantity: number, uom: string) => {
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
            discountType: product.discount_level || undefined,
            discounts,
            netAmount,
            totalAmount,
            discountAmount: totalAmount - netAmount
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
        // Ordered totals (Base sa buong order na kinuha)
        const orderedGross = lineItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        const orderedNet = lineItems.reduce((sum, item) => {
            const netPrice = calculateChainNetPrice(item.unitPrice, item.discounts);
            return sum + (netPrice * item.quantity);
        }, 0);
        // const orderedDiscount = orderedGross - orderedNet;

        // Allocated totals (Base lang sa kung ano ang ibibigay o "allocated")
        const allocatedGross = lineItems.reduce((sum, item) => {
            const qty = allocatedQuantities[item.id] ?? item.quantity;
            return sum + (item.unitPrice * qty);
        }, 0);

        const allocatedNet = lineItems.reduce((sum, item) => {
            const qty = allocatedQuantities[item.id] ?? item.quantity;
            const netPrice = calculateChainNetPrice(item.unitPrice, item.discounts);
            return sum + (netPrice * qty);
        }, 0);

        const allocatedDiscount = allocatedGross - allocatedNet;

        return {
            totalAmount: orderedNet, // Ito ang ipapasa sa total_amount sa API (Ordered Net)
            netAmount: orderedNet,
            orderedGross,
            orderedNet,
            allocatedGross,
            allocatedNet,
            allocatedDiscount,
            allocatedAmount: allocatedNet,
            discountAmount: allocatedDiscount // Ito ang ipapasa sa discount_amount sa API (Allocated Discount)
        };
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
        if (!dueDate) {
            toast.error("Due Date is required");
            return;
        }
        if (!deliveryDate) {
            toast.error("Delivery Date is required");
            return;
        }
        if (!poNo.trim()) {
            toast.error("PO Number is required");
            return;
        }

        const now = new Date();
        const generatedNo = `SO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        setOrderNo(generatedNo);

        // Initialize allocated quantities with Option B: min(ordered, available)
        const initialAllocated: Record<string, number> = {};
        lineItems.forEach(item => {
            initialAllocated[item.id] = item.quantity;
        });
        setAllocatedQuantities(initialAllocated);
        setIsCheckout(true);
    };

    const updateAllocatedQty = (id: string, qty: number) => {
        setAllocatedQuantities(prev => ({ ...prev, [id]: qty }));
    };

    const handleSubmitOrder = useCallback(async () => {
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
            // I-prepare ang final payload para sa pag-save ng order
            const payload = {
                customer_id: Number(selectedCustomerId),
                customer_code: selectedCustomer?.customer_code,
                salesman_id: Number(selectedAccountId),
                supplier_id: Number(selectedSupplierId),
                receipt_type: Number(selectedReceiptTypeId),
                sales_type: Number(selectedSalesTypeId),
                po_no: poNo,
                due_date: dueDate,
                delivery_date: deliveryDate,
                // Ito yung bagong logic: total_amount = ordered, net_amount = allocated
                total_amount: summary.orderedNet,
                discount_amount: summary.allocatedDiscount,
                net_amount: summary.allocatedNet,
                allocated_amount: summary.allocatedNet,
                order_no: orderNo,
                order_status: "For Approval",
                for_approval_at: new Date().toISOString(),
                remarks: orderRemarks || ""
            };

            const itemsWithAllocation = lineItems.map(item => ({
                ...item,
                allocated_quantity: allocatedQuantities[item.id] ?? item.quantity,
                allocated_amount: (calculateChainNetPrice(item.unitPrice, item.discounts)) * (allocatedQuantities[item.id] ?? item.quantity)
            }));

            const res = await salesOrderProvider.createOrder(payload, itemsWithAllocation);
            if (res.success) {
                toast.success(`Order created: ${res.order_no}`);
                // Instead of reload, reset the local state
                setLineItems([]);
                setAllocatedQuantities({});
                setOrderRemarks("");
                setIsCheckout(false);
                setPoNo("");
                setDueDate("");
                setDeliveryDate("");
                // Clear selection IDs to reset dropdowns
                setSelectedSalesmanId("");
                setSelectedAccountId("");
                setSelectedCustomerId("");
                setSelectedSupplierId("");
                setSelectedReceiptTypeId("");

                // Optional: Force a refresh of product inventory if needed
                // But definitely avoid the jarring reload
            } else {
                toast.error(res.error || "Failed to create order");
            }
        } catch (e: unknown) {
            const err = e as Error;
            toast.error(err.message || "Submission error");
        } finally {
            setSubmitting(false);
        }
    }, [selectedAccountId, selectedCustomerId, selectedSupplierId, selectedReceiptTypeId, lineItems, selectedCustomer, selectedSalesTypeId, poNo, dueDate, deliveryDate, summary, orderNo, orderRemarks, allocatedQuantities]);

    return {
        salesmen, selectedSalesmanId, handleSalesmanChange, selectedSalesman,
        accounts, selectedAccountId, handleAccountChange, selectedAccount, loadingAccounts,
        customers, selectedCustomerId, handleCustomerChange, selectedCustomer, loadingCustomers,
        suppliers, selectedSupplierId, handleSupplierChange, selectedSupplier, loadingSuppliers,
        receiptTypes, selectedReceiptTypeId, setSelectedReceiptTypeId, selectedReceiptType,
        salesTypes, selectedSalesTypeId, setSelectedSalesTypeId, selectedSalesType,
        dueDate, setDueDate,
        deliveryDate, setDeliveryDate,
        poNo, setPoNo,
        priceType,
        supplierProducts, loadingProducts,
        inventory, // Add inventory to the returned object
        lineItems,
        addProduct, removeLineItem, updateLineItemQty,
        summary, isValidAllocation,
        isCheckout, setIsCheckout, orderNo, enterCheckout, allocatedQuantities, updateAllocatedQty,
        orderRemarks, setOrderRemarks,
        handleSubmitOrder, submitting
    };
}
