"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { LineItem, Salesman, Customer, Supplier, Product, ReceiptType, SalesType, Branch, PriceTypeModel } from "../types";
import { salesOrderProvider } from "../providers/fetchProvider";
import { calculateChainNetPrice } from "../utils/priceCalc";
import { toast } from "sonner";


export function useSalesOrder() {
    const searchParams = useSearchParams();
    const attachmentId = searchParams.get("attachment_id");
    const externalSalesOrderId = searchParams.get("sales_order_id");
    const isAutoFilled = useRef(false);

    // Selection State (IDs for dropdowns)
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

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
    const loadingSuppliers = false;

    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>("");

    const [priceTypeModels, setPriceTypeModels] = useState<PriceTypeModel[]>([]);

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

    // Cart
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Checkout State
    const [isCheckout, setIsCheckout] = useState(false);
    const [orderNo, setOrderNo] = useState("");
    const [existingOrderNo, setExistingOrderNo] = useState("");
    const [allocatedQuantities, setAllocatedQuantities] = useState<Record<string, number>>({});
    const [orderRemarks, setOrderRemarks] = useState("");

    const selectedSalesman = useMemo(() => Array.isArray(salesmen) ? salesmen.find(s => (s.user_id || s.id)?.toString() === selectedSalesmanId) : undefined, [salesmen, selectedSalesmanId]);
    const selectedAccount = useMemo(() => Array.isArray(accounts) ? accounts.find(a => a.id.toString() === selectedAccountId) : undefined, [accounts, selectedAccountId]);
    const selectedCustomer = useMemo(() => Array.isArray(customers) ? customers.find(c => c.id.toString() === selectedCustomerId) : undefined, [customers, selectedCustomerId]);
    const selectedSupplier = useMemo(() => Array.isArray(suppliers) ? suppliers.find(s => s.id.toString() === selectedSupplierId) : undefined, [suppliers, selectedSupplierId]);
    const selectedReceiptType = useMemo(() => Array.isArray(receiptTypes) ? receiptTypes.find(rt => rt.id.toString() === selectedReceiptTypeId) : undefined, [receiptTypes, selectedReceiptTypeId]);
    const selectedSalesType = useMemo(() => Array.isArray(salesTypes) ? salesTypes.find(st => st.id.toString() === selectedSalesTypeId) : undefined, [salesTypes, selectedSalesTypeId]);
    const selectedBranch = useMemo(() => Array.isArray(branches) ? branches.find(b => b.id.toString() === selectedBranchId) : undefined, [branches, selectedBranchId]);

    // Auto-generate preview SO# (Not the final one yet - that's set on enterCheckout)
    const previewOrderNo = useMemo(() => {
        if (existingOrderNo) return existingOrderNo;
        if (!selectedSupplierId) return "DRAFT-SO";
        const prefix = selectedSupplier?.supplier_shortcut || "SO";
        const now = new Date();
        const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        return `${prefix}-${datePart}XXXXX`;
    }, [existingOrderNo, selectedSupplier, selectedSupplierId]);

    // Initial Data Fetch
    useEffect(() => {
        const init = async () => {
            const [sm, sup, br, pt, rec, ops] = await Promise.all([
                salesOrderProvider.getSalesmen(),
                salesOrderProvider.getSuppliers(),
                salesOrderProvider.getBranches(),
                salesOrderProvider.getPriceTypes(),
                fetch("/api/crm/customer-hub/create-sales-order?action=invoice_types").then(r => r.json()),
                fetch("/api/crm/customer-hub/create-sales-order?action=operations").then(r => r.json())
            ]);

            setSalesmen(Array.isArray(sm) ? sm : []);
            setSuppliers(Array.isArray(sup) ? sup : []);
            setBranches(Array.isArray(br) ? br : []);
            setPriceTypeModels(Array.isArray(pt) ? pt : []);
            setReceiptTypes(Array.isArray(rec) ? rec : []);
            setSalesTypes(Array.isArray(ops) ? ops : []);

            if (Array.isArray(rec) && rec.length > 0) setSelectedReceiptTypeId(rec[0].id.toString());
            if (Array.isArray(ops) && ops.length > 0) setSelectedSalesTypeId(ops[0].id.toString());

            // Check for Auto-fill from URL
            if ((attachmentId || externalSalesOrderId) && !isAutoFilled.current) {
                isAutoFilled.current = true;
                try {
                    let finalSalesOrderId = externalSalesOrderId;

                    if (attachmentId) {
                        const attachment = await fetch(`/api/crm/customer-hub/create-sales-order?action=get_attachment&id=${attachmentId}`).then(r => r.json());
                        if (attachment && attachment.sales_order_id) {
                            finalSalesOrderId = attachment.sales_order_id.toString();
                        } else if (attachment) {
                            // Pre-fill header metadata from attachment if no order linked yet
                            if (attachment.customer_code) {
                                setCustomerSearch(attachment.customer_code);
                                const custs = await salesOrderProvider.getAllCustomers(attachment.customer_code, 0);
                                if (custs.length > 0) {
                                    setCustomers(custs);
                                    setSelectedCustomerId(custs[0].id.toString());

                                    // If we have a customer, we can resolve the salesman from the linkage
                                    const sLink = await salesOrderProvider.getSalesmanByCustomer(Number(custs[0].id));
                                    if (sLink) {
                                        const uid = (sLink.employee_id || sLink.encoder_id || sLink.user_id)?.toString();
                                        if (uid) {
                                            setSelectedSalesmanId(uid);
                                            const accts = await fetch(`${salesOrderProvider.API_BASE}?action=accounts&user_id=${uid}`).then(r => r.json());
                                            setAccounts(accts);
                                            setSelectedAccountId(sLink.id.toString());
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (finalSalesOrderId) {
                        const { header, items } = await fetch(`/api/crm/customer-hub/create-sales-order?action=get_order&order_id=${finalSalesOrderId}`).then(r => r.json());
                        if (header) {
                            setExistingOrderNo(header.order_no || "");
                            setPoNo(header.po_no || "");
                            setDueDate(header.due_date ? header.due_date.split('T')[0] : "");
                            setDeliveryDate(header.delivery_date ? header.delivery_date.split('T')[0] : "");
                            setOrderRemarks(header.remarks || "");
                            
                            if (header.salesman_id) {
                                // We need to resolve the user_id for this salesman record
                                const smUser = await fetch(`${salesOrderProvider.API_BASE}?action=salesman_by_id&id=${header.salesman_id}`).then(r => r.json());
                                if (smUser) {
                                    const uid = (smUser.employee_id || smUser.encoder_id || smUser.user_id)?.toString();
                                    if (uid) {
                                        setSelectedSalesmanId(uid);
                                        const accts = await fetch(`${salesOrderProvider.API_BASE}?action=accounts&user_id=${uid}`).then(r => r.json());
                                        setAccounts(accts);
                                        setSelectedAccountId(header.salesman_id.toString());
                                    }
                                }
                            }

                            if (header.customer_code) {
                                const custs = await salesOrderProvider.getAllCustomers(header.customer_code, 0);
                                if (custs.length > 0) {
                                    setCustomers(custs);
                                    setSelectedCustomerId(custs[0].id.toString());
                                }
                            }

                            if (header.supplier_id) setSelectedSupplierId(header.supplier_id.toString());
                            if (header.branch_id) setSelectedBranchId(header.branch_id.toString());
                            if (header.receipt_type) setSelectedReceiptTypeId(header.receipt_type.toString());
                            if (header.sales_type) setSelectedSalesTypeId(header.sales_type.toString());

                            if (items && Array.isArray(items)) {
                                const mappedItems = items.map(it => ({
                                    id: Math.random().toString(36).substr(2, 9),
                                    product: it.product_id, // This is expected to be the full product object from our new API
                                    quantity: Number(it.ordered_quantity || it.quantity),
                                    uom: it.uom || "PCS",
                                    unitPrice: Number(it.unit_price),
                                    discounts: it.product_id?.discounts || [],
                                    netAmount: Number(it.net_amount),
                                    totalAmount: Number(it.gross_amount || (it.unit_price * it.ordered_quantity)),
                                    discountAmount: Number(it.discount_amount || 0)
                                }));
                                setLineItems(mappedItems);
                            }
                        }
                    }
                } catch (err) {
                    console.error("Auto-fill error", err);
                    toast.error("Failed to load auto-fill data");
                }
            }
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Debounced Customer Search
    useEffect(() => {
        const fetchCustomers = async () => {
            setLoadingCustomers(true);
            setHasMoreCustomers(true);
            try {
                const data = await salesOrderProvider.getAllCustomers(customerSearch, 0);
                const results = Array.isArray(data) ? data : [];
                setCustomers(results);
                if (results.length < 30) setHasMoreCustomers(false);
            } catch (err) {
                console.error("Search error", err);
            } finally {
                setLoadingCustomers(false);
            }
        };

        const timer = setTimeout(fetchCustomers, 400); 
        return () => clearTimeout(timer);
    }, [customerSearch]);

    const loadMoreCustomers = useCallback(async () => {
        if (loadingMoreCustomers || !hasMoreCustomers) return;
        setLoadingMoreCustomers(true);
        try {
            const currentCount = customers.length;
            const data = await salesOrderProvider.getAllCustomers(customerSearch, currentCount);
            const moreResults = Array.isArray(data) ? data : [];
            if (moreResults.length > 0) {
                setCustomers(prev => [...prev, ...moreResults]);
                if (moreResults.length < 30) setHasMoreCustomers(false);
            } else {
                setHasMoreCustomers(false);
            }
        } catch (err) {
            console.error("Pagination error", err);
        } finally {
            setLoadingMoreCustomers(false);
        }
    }, [customers.length, customerSearch, loadingMoreCustomers, hasMoreCustomers]);

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
            if (account.branch_code) {
                const bId = typeof account.branch_code === "object" 
                    ? (account.branch_code as { id?: number | string }).id 
                    : account.branch_code;
                if (bId) setSelectedBranchId(bId.toString());
            }
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

    const handleCustomerChange = async (id: string) => {
        setSelectedCustomerId(id);
        const customer = customers.find(c => c.id.toString() === id);
        if (customer) {
            if (customer.price_type) setPriceType(customer.price_type);
            if (customer.price_type_id) setPriceTypeId(Number(customer.price_type_id));
        }

        if (id) {
            try {
                const s = await salesOrderProvider.getSalesmanByCustomer(Number(id));
                if (s) {
                    const sid = s.id.toString();
                    const sUser_id = (s.employee_id || s.encoder_id || s.user_id)?.toString();
                    if (sUser_id) {
                        setSelectedSalesmanId(sUser_id);
                        setLoadingAccounts(true);
                        const accts = await fetch(`/api/crm/customer-hub/create-sales-order?action=accounts&user_id=${sUser_id}`).then(r => r.json());
                        setAccounts(accts);
                        setLoadingAccounts(false);
                    }
                    setSelectedAccountId(sid);
                    setPriceType(s.price_type || "A");
                    setPriceTypeId(s.price_type_id || null);
                    if (s.branch_code) {
                        const bId = typeof s.branch_code === "object" 
                            ? (s.branch_code as { id?: number | string }).id 
                            : s.branch_code;
                        if (bId) setSelectedBranchId(bId.toString());
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }
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
            const sSalesmanId = selectedAccountId; // Use the selected account (salesman record PK)
            const sBranchId = selectedBranchId;

            if (customerCode) {
                setLoadingProducts(true);

                // Concurrent fetch for products
                salesOrderProvider.searchProducts("", customerCode, Number(supplierId), priceType, Number(customerId), priceTypeId || undefined, sSalesmanId, sBranchId)
                    .then((productsData) => {
                        setSupplierProducts(Array.isArray(productsData) ? productsData : []);
                    }).finally(() => setLoadingProducts(false));
            }
        } else {
            setSupplierProducts([]);
        }
    }, [selectedCustomerId, selectedSupplierId, priceType, priceTypeId, selectedAccountId, selectedBranchId, customers]);

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

        const vattableSales = allocatedNet / 1.12;
        const vatAmount = allocatedNet - vattableSales;

        return {
            totalAmount: orderedNet, // Ito ang ipapasa sa total_amount sa API (Ordered Net)
            netAmount: orderedNet,
            orderedGross,
            orderedNet,
            allocatedGross,
            allocatedNet,
            allocatedDiscount,
            allocatedAmount: allocatedNet,
            discountAmount: allocatedDiscount, // Ito ang ipapasa sa discount_amount sa API (Allocated Discount)
            vattableSales,
            vatAmount
        };
    }, [lineItems, allocatedQuantities]);

    const isValidAllocation = useMemo(() => {
        return lineItems.every(item => {
            const allocated = allocatedQuantities[item.id] ?? item.quantity;
            const available = Number(item.product.available_qty) || 0;
            // Valid if non-negative, <= ordered AND <= available
            return allocated >= 0 && allocated <= item.quantity && allocated <= available;
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

        if (existingOrderNo) {
            setOrderNo(existingOrderNo);
        } else {
            const now = new Date();
            const prefix = selectedSupplier?.supplier_shortcut || "SO";
            const generatedNo = `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            setOrderNo(generatedNo);
        }

        // UOM Decomposition Logic:
        // Before entering checkout, we "explode" the existing line items into the 
        // most efficient UOMs (Box, Pack/Tie, Pieces) using sibling product variants.
        // Initialize allocated quantities with total fulfillment
        const initialAllocated: Record<string, number> = {};
        lineItems.forEach(item => {
            const available = Number(item.product.available_qty) || 0;
            // Default to 0 if no stock, otherwise cap at available stock or ordered quantity
            initialAllocated[item.id] = available > 0 ? Math.min(item.quantity, available) : 0;
        });
        setAllocatedQuantities(initialAllocated);
        setIsCheckout(true);
    };

    const updateAllocatedQty = (id: string, qty: number) => {
        setAllocatedQuantities(prev => ({ ...prev, [id]: qty }));
    };

    const handleSubmitOrder = useCallback(async () => {
        if (!selectedAccountId || !selectedCustomerId || !selectedSupplierId || !selectedReceiptTypeId || !selectedBranchId) {
            toast.error("Please complete all header selections");
            return;
        }
        if (lineItems.length === 0) {
            toast.error("No items in order");
            return;
        }
        if (!isValidAllocation) {
            toast.error("Allocation exceeds order limits or inventory availability.");
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
                branch_id: Number(selectedBranchId),
                price_type_id: priceTypeId ? Number(priceTypeId) : null,
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
                setSelectedBranchId("");

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
    }, [selectedAccountId, selectedCustomerId, selectedSupplierId, selectedReceiptTypeId, selectedBranchId, priceTypeId, lineItems, selectedCustomer, selectedSalesTypeId, poNo, dueDate, deliveryDate, summary, orderNo, orderRemarks, allocatedQuantities, isValidAllocation]);

    return {
        salesmen, selectedSalesmanId, handleSalesmanChange, selectedSalesman,
        accounts, selectedAccountId, handleAccountChange, selectedAccount, loadingAccounts,
        customers, selectedCustomerId, handleCustomerChange, selectedCustomer, loadingCustomers,
        customerSearch, setCustomerSearch, hasMoreCustomers, loadingMoreCustomers, loadMoreCustomers,
        suppliers, selectedSupplierId, handleSupplierChange, selectedSupplier, loadingSuppliers,
        branches, selectedBranchId, setSelectedBranchId, selectedBranch,
        receiptTypes, selectedReceiptTypeId, setSelectedReceiptTypeId, selectedReceiptType,
        salesTypes, selectedSalesTypeId, setSelectedSalesTypeId, selectedSalesType,
        dueDate, setDueDate,
        deliveryDate, setDeliveryDate,
        poNo, setPoNo,
        priceType, priceTypeId, priceTypeModels,
        supplierProducts, loadingProducts,
        lineItems,
        addProduct, removeLineItem, updateLineItemQty,
        summary, isValidAllocation,
        isCheckout, setIsCheckout, orderNo, previewOrderNo, enterCheckout, allocatedQuantities, updateAllocatedQty,
        orderRemarks, setOrderRemarks,
        handleSubmitOrder, submitting
    };
}
