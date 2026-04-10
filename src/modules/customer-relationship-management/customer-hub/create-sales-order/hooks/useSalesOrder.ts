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
    const externalSalesOrderId = searchParams.get("orderId") || searchParams.get("sales_order_id");
    const isAutoFilled = useRef(false);

    // Selection State (IDs for dropdowns)
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

    const [dueDate, setDueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [deliveryDate, setDeliveryDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
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
    const [existingOrderId, setExistingOrderId] = useState<number | null>(null);
    const [existingOrderStatus, setExistingOrderStatus] = useState<string>("");
    const [paymentTerms, setPaymentTerms] = useState<number | null>(null);

    // --- AUTO-DATE CALCULATION ---
    useEffect(() => {
        // If paymentTerms is a number (including 0 for COD), calculate due date
        if (paymentTerms !== null && paymentTerms !== undefined) {
            const today = new Date();
            const futureDate = new Date(today.getTime() + (paymentTerms * 24 * 60 * 60 * 1000));
            setDueDate(futureDate.toISOString().split('T')[0]);
        }
    }, [paymentTerms]);

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

            const smArray = Array.isArray(sm) ? sm : [];
            setAllSalesmen(smArray);
            setSalesmen(smArray);
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
                                    const sLinks = await salesOrderProvider.getSalesmanByCustomer(Number(custs[0].id));
                                    if (sLinks && sLinks.length > 0) {
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        const uid = (sLinks[0] as any).employee_id || (sLinks[0] as any).encoder_id || (sLinks[0] as any).user_id;
                                        if (uid && uid.toString()) {
                                            const uidStr = uid.toString();
                                            setSelectedSalesmanId(uidStr);
                                            const accts = await fetch(`${salesOrderProvider.API_BASE}?action=accounts&user_id=${uidStr}`).then(r => r.json());
                                            setAccounts(accts);
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            const sId = (sLinks[0] as any).id;
                                            if (sId) setSelectedAccountId(sId.toString());
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (finalSalesOrderId) {
                        setExistingOrderId(Number(finalSalesOrderId));
                        const orderData = await fetch(`/api/crm/customer-hub/create-sales-order?action=get_order&order_id=${finalSalesOrderId}`).then(r => r.json());
                        const { header, items } = orderData;
                        console.log("[useSalesOrder] Fetched Order Data:", { header, items });

                        if (header) {
                            setExistingOrderStatus(header.order_status || "");
                            setExistingOrderNo(header.order_no || "");
                            setPoNo(header.po_no || "");

                            const parseDate = (d: unknown) => {
                                if (!d) return "";
                                const str = String(d);
                                return str.includes('T') ? str.split('T')[0] : str;
                            };

                            const dDate = parseDate(header.due_date);
                            const delDate = parseDate(header.delivery_date);
                            console.log("[useSalesOrder] Setting Dates:", { dDate, delDate });

                            setDueDate(dDate);
                            setDeliveryDate(delDate);
                            setOrderRemarks(header.remarks || "");

                            if (header.salesman_id) {
                                console.log("[useSalesOrder] Resolving Salesman:", header.salesman_id);
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
                                console.log("[useSalesOrder] Resolving Customer:", header.customer_code);
                                const custs = await salesOrderProvider.getAllCustomers(header.customer_code, 0);
                                if (custs.length > 0) {
                                    setCustomers(custs);
                                    setSelectedCustomerId(custs[0].id.toString());
                                    if (custs[0].payment_term !== undefined) setPaymentTerms(custs[0].payment_term);
                                }
                            }

                            if (header.payment_terms !== undefined) setPaymentTerms(header.payment_terms);

                            console.log("[useSalesOrder] Setting Other IDs:", {
                                supplier: header.supplier_id,
                                branch: header.branch_id,
                                receipt: header.receipt_type,
                                sales: header.sales_type
                            });
                            if (header.supplier_id) setSelectedSupplierId(header.supplier_id.toString());
                            if (header.branch_id) setSelectedBranchId(header.branch_id.toString());
                            if (header.receipt_type) setSelectedReceiptTypeId(header.receipt_type.toString());
                            if (header.sales_type) setSelectedSalesTypeId(header.sales_type.toString());

                            if (items && Array.isArray(items)) {
                                console.log("[useSalesOrder] Mapping Items with Enrichment:", items.length);
                                
                                // 1. Fetch full product metadata for enriched information (discounts, categories)
                                // We use the current header context to get the same discount logic as the catalog
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const enrichedProductsMap = new Map<number, any>();
                                try {
                                    const pUrl = `${salesOrderProvider.API_BASE}?action=products&customer_code=${header.customer_code}&supplier_id=${header.supplier_id}&branch_id=${header.branch_id}`;
                                    const pData = await fetch(pUrl).then(r => r.json());
                                    if (Array.isArray(pData)) {
                                        pData.forEach(p => enrichedProductsMap.set(Number(p.product_id), p));
                                    }
                                } catch (e) {
                                    console.error("[useSalesOrder] Product enrichment failed:", e);
                                }

                                const allocMap: Record<string, number> = {};
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const mappedItems = items.map((it: any) => {
                                    const tempId = Math.random().toString(36).substr(2, 9);
                                    allocMap[tempId] = Number(it.allocated_quantity ?? 0);

                                    // Preserve original Detail ID for Smart Update logic
                                    const originalPK = it.detail_id || it.order_detail_id || it.id;

                                    const pid = Number(typeof it.product_id === 'object' ? it.product_id?.product_id : it.product_id);
                                    const enrichedP = enrichedProductsMap.get(pid);
                                    const p = enrichedP || it.product || (typeof it.product_id === 'object' ? it.product_id : { product_id: it.product_id });

                                    const rawOrdered = it.ordered_quantity;
                                    const rawQty = it.quantity;
                                    const qty = (rawOrdered !== undefined && rawOrdered !== null) ? Number(rawOrdered) : Number(rawQty ?? 0);
                                    const uPrice = Number(it.unit_price || 0);

                                    // Always prefer enriched product discounts from catalog
                                    const discounts = (enrichedP?.discounts && enrichedP.discounts.length > 0)
                                        ? enrichedP.discounts
                                        : (p.discounts || []);
                                    
                                    let netUnitPrice: number;
                                    if (discounts.length > 0) {
                                        // Best case: recalculate from actual discount percentages
                                        netUnitPrice = calculateChainNetPrice(uPrice, discounts);
                                    } else {
                                        // Fallback: use gross vs net from DB based on ORDERED qty (not allocated)
                                        // This preserves the discount even if allocated was 0
                                        const dbGross = Number(it.gross_amount || 0);
                                        const dbOrdered = Number(it.ordered_quantity || it.quantity || 0);
                                        const dbNet = Number(it.net_amount || 0);
                                        if (dbGross > 0 && dbNet > 0 && dbOrdered > 0 && dbGross !== dbNet) {
                                            netUnitPrice = uPrice * (dbNet / dbGross);
                                        } else {
                                            netUnitPrice = uPrice;
                                        }
                                    }

                                    const calcTotal = uPrice * qty;
                                    const calcNet = netUnitPrice * qty;

                                    console.log(`[useSalesOrder] Item PID=${pid}, ordQty=${qty}, allocQty=${allocMap[tempId]}, uPrice=${uPrice}, discounts=${JSON.stringify(discounts)}, netUnit=${netUnitPrice}, calcNet=${calcNet}`);

                                    return {
                                        id: tempId,
                                        detail_id: originalPK, // Bida to! 🚀
                                        uom: it.uom || "PCS",
                                        unitPrice: uPrice,
                                        quantity: qty,
                                        discountType: p.discount_level || (typeof it.discount_type === 'number' && it.discount_type !== 0 ? String(it.discount_type) : (it.discount_type || "none")),
                                        product: {
                                            ...p,
                                            discount_type: it.discount_type || p.discount_type,
                                            id: p.id || p.product_id,
                                            product_id: p.product_id || pid,
                                            display_name: p.display_name || p.product_name,
                                            product_name: p.product_name,
                                            description: p.description,
                                            available_qty: p.available_qty ?? 0,
                                            unit_count: p.unit_count || p.unit_of_measurement_count || 1
                                        },
                                        discounts: discounts,
                                        netAmount: calcNet,
                                        totalAmount: calcTotal,
                                        discountAmount: calcTotal - calcNet,
                                        savedNetAmount: Number(it.net_amount || 0),
                                        savedDiscountAmount: Number(it.discount_amount || 0),
                                        savedAllocatedQty: Number(it.allocated_quantity || 0)
                                    };
                                });
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                setLineItems(mappedItems as any);
                                setAllocatedQuantities(allocMap);
                            }
                        }
                    }
                } catch (err) {
                    console.error("[useSalesOrder] Auto-fill error", err);
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
        // Do not clear customer selection or list
        setAccounts([]);

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
        // Do not clear customer selection

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
                setCustomers(prev => {
                    const dataSafe = Array.isArray(data) ? data : [];
                    if (!selectedCustomerId) return dataSafe;
                    const selected = prev.find(c => c.id.toString() === selectedCustomerId);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (selected && !dataSafe.find((c: any) => c.id.toString() === selected.id.toString())) {
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

    const handleCustomerChange = async (id: string) => {
        setSelectedCustomerId(id);
        const customer = customers.find(c => c.id.toString() === id);
        if (customer) {
            if (customer.price_type) setPriceType(customer.price_type);
            if (customer.price_type_id) setPriceTypeId(Number(customer.price_type_id));
            if (customer.payment_term !== undefined) setPaymentTerms(customer.payment_term);
        }

        if (id) {
            try {
                const linkedUsers = await salesOrderProvider.getSalesmanByCustomer(Number(id));
                const activeSalesmen = Array.isArray(linkedUsers) && linkedUsers.length > 0 ? linkedUsers : allSalesmen;
                setSalesmen(activeSalesmen);

                // Check if current user is still valid, else reset
                const isCurrentValid = activeSalesmen.some(s => (s.user_id || s.id)?.toString() === selectedSalesmanId);
                
                if (linkedUsers.length === 1) {
                    const singleId = (linkedUsers[0].user_id || linkedUsers[0].id)?.toString();
                    if (singleId && (!selectedSalesmanId || !isCurrentValid)) {
                        handleSalesmanChange(singleId);
                    }
                } else if (!isCurrentValid) {
                    setSelectedSalesmanId("");
                    setSelectedAccountId("");
                    setAccounts([]);
                }
            } catch (e) {
                console.error("Failed to fetch customer salesmen:", e);
                setSalesmen(allSalesmen);
                setSelectedSalesmanId("");
                setSelectedAccountId("");
                setAccounts([]);
            }
        } else {
            setSalesmen(allSalesmen);
            setSelectedSalesmanId("");
            setSelectedAccountId("");
            setAccounts([]);
        }
    };
    
    const handlePriceTypeIdChange = (id: string) => {
        const nid = id ? Number(id) : null;
        setPriceTypeId(nid);
        if (nid) {
            const model = priceTypeModels.find(p => p.price_type_id === nid);
            if (model) setPriceType(model.price_type_name);
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

    // Sync cart items with freshly fetched products (especially 'available' stock info)
    useEffect(() => {
        if (supplierProducts.length > 0 && lineItems.length > 0) {
            // Price Sync Logic: Only auto-update if it's a new order or still in Draft status
            const isEditable = !existingOrderId || existingOrderStatus === "Draft";

            setLineItems(prev => {
                let changed = false;
                const next = prev.map(li => {
                    const match = supplierProducts.find(sp => Number(sp.product_id) === Number(li.product.product_id));
                    if (!match) return li;

                    const newBasePrice = Number(match.base_price) || 0;
                    const newDiscounts = match.discounts || [];
                    
                    const priceChanged = isEditable && (newBasePrice !== li.unitPrice || JSON.stringify(newDiscounts) !== JSON.stringify(li.discounts));
                    const metaChanged = match.available_qty !== li.product.available_qty || match.display_name !== li.product.display_name;

                    if (priceChanged || metaChanged) {
                        changed = true;
                        
                        let updatedUnitPrice = li.unitPrice;
                        let updatedDiscounts = li.discounts;
                        let updatedNetAmount = li.netAmount;
                        let updatedTotalAmount = li.totalAmount;
                        let updatedDiscountAmount = li.discountAmount;

                        if (priceChanged) {
                            updatedUnitPrice = newBasePrice;
                            updatedDiscounts = newDiscounts;
                            const netPrice = calculateChainNetPrice(newBasePrice, newDiscounts);
                            updatedTotalAmount = newBasePrice * li.quantity;
                            updatedNetAmount = netPrice * li.quantity;
                            updatedDiscountAmount = updatedTotalAmount - updatedNetAmount;
                        }

                        return {
                            ...li,
                            unitPrice: updatedUnitPrice,
                            discounts: updatedDiscounts,
                            netAmount: updatedNetAmount,
                            totalAmount: updatedTotalAmount,
                            discountAmount: updatedDiscountAmount,
                            discountType: (match.discount_level || match.discount_type || li.discountType) as string | undefined,
                            product: {
                                ...li.product,
                                base_price: newBasePrice, // Keep catalog price in sync
                                discounts: newDiscounts,
                                available_qty: (match.available_qty ?? match.available ?? 0) as number,
                                display_name: match.display_name || match.product_name || li.product.display_name,
                                description: match.description || li.product.description,
                                unit_count: (match.unit_count || li.product.unit_count) as number | null
                            }
                        };
                    }
                    return li;
                });
                return changed ? next : prev;
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supplierProducts]);

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
        // Also initialize allocation for the new item - but GUARD against 0/negative stock
        const initialAlloc = Math.max(0, Math.min(quantity, Number(product.available_qty) || 0));
        setAllocatedQuantities(prev => ({ ...prev, [id]: initialAlloc }));
    };

    const removeLineItem = async (id: string) => {
        const item = lineItems.find(i => i.id === id);
        
        // --- REAL-TIME DELETION ---
        // If the item exists in the DB (has detail_id), force delete it now
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((item as any)?.detail_id) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            console.log(`[RemoveItem] Force deleting detail_id=${(item as any).detail_id} from DB...`);
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const res = await salesOrderProvider.deleteOrderItem((item as any).detail_id);
                if (res.success) {
                    toast.success("Item removed from database");
                } else {
                    console.error("[RemoveItem] DB Deletion failed:", res.error);
                }
            } catch (err) {
                console.error("[RemoveItem] DB Deletion Exception:", err);
            }
        }

        setLineItems(prev => {
            console.log(`[RemoveItem] Removing from local state: tempId=${id}`);
            return prev.filter(item => item.id !== id);
        });
        setAllocatedQuantities(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const updateLineItemQty = useCallback((id: string, qty: number) => {
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
        const matchedItem = lineItems.find(li => li.id === id);
        if (!matchedItem) return;

        // Sync with allocation quantities so checkout sees the same number - with Stock Guard
        const available = Number(matchedItem.product.available_qty) || 0;
        const initialAlloc = Math.max(0, Math.min(qty, available));
        setAllocatedQuantities(prev => ({ ...prev, [id]: initialAlloc }));
    }, [lineItems]);

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
            const qty = allocatedQuantities[item.id] !== undefined ? allocatedQuantities[item.id] : item.quantity;
            return sum + (item.unitPrice * qty);
        }, 0);

        const allocatedNet = lineItems.reduce((sum, item) => {
            const qty = allocatedQuantities[item.id] !== undefined ? allocatedQuantities[item.id] : item.quantity;
            // Exact Mapping: If qty matches saved allocation, use saved net amount
            if (item.savedAllocatedQty !== undefined && qty === item.savedAllocatedQty && item.savedNetAmount !== undefined) {
                return sum + item.savedNetAmount;
            }
            const netPrice = calculateChainNetPrice(item.unitPrice, item.discounts);
            return sum + (netPrice * qty);
        }, 0);

        const allocatedDiscount = lineItems.reduce((sum, item) => {
            const qty = allocatedQuantities[item.id] !== undefined ? allocatedQuantities[item.id] : item.quantity;
            // Exact Mapping: If qty matches saved allocation, use saved discount amount
            if (item.savedAllocatedQty !== undefined && qty === item.savedAllocatedQty && item.savedDiscountAmount !== undefined) {
                return sum + item.savedDiscountAmount;
            }
            const gross = item.unitPrice * qty;
            const net = calculateChainNetPrice(item.unitPrice, item.discounts) * qty;
            return sum + (gross - net);
        }, 0);

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

        // Ensure all line items have an entry in allocatedQuantities - with Stock Guard 🛡️
        lineItems.forEach(item => {
            if (allocatedQuantities[item.id] === undefined) {
                const initialAlloc = Math.max(0, Math.min(item.quantity, Number(item.product.available_qty) || 0));
                setAllocatedQuantities(prev => ({ ...prev, [item.id]: initialAlloc }));
            }
        });
        setIsCheckout(true);
    };

    const updateAllocatedQty = (id: string, qty: number) => {
        const item = lineItems.find(li => li.id === id);
        if (!item) return;

        const available = Number(item.product.available_qty) || 0;
        const maxAllowed = Math.max(0, Math.min(item.quantity, available));
        
        let finalQty = qty;
        if (finalQty > maxAllowed) finalQty = maxAllowed;
        if (finalQty < 0) finalQty = 0;

        setAllocatedQuantities(prev => ({ ...prev, [id]: finalQty }));
    };

    const handleSubmitOrder = useCallback(async (forcedStatus?: string) => {
        if (!selectedAccountId || !selectedCustomerId || !selectedSupplierId || !selectedReceiptTypeId || !selectedBranchId) {
            toast.error("Please complete all header selections");
            return;
        }
        if (lineItems.length === 0) {
            toast.error("No items in order");
            return;
        }

        const hasZeroAllocation = Object.values(allocatedQuantities).some(v => v === 0);
        // Priority: Manual Force > Existing Draft (Elevate to For Approval) > Allocation-based default
        const finalStatus = forcedStatus || (existingOrderId ? "For Approval" : (hasZeroAllocation ? "Draft" : "For Approval"));

        setSubmitting(true);
        try {
            const now = new Date().toISOString();
            // I-prepare ang final payload para sa pag-save ng order
            const payload = {
                ...(existingOrderId ? { order_id: existingOrderId } : {}),
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
                total_amount: summary.orderedNet,
                discount_amount: summary.allocatedDiscount,
                net_amount: summary.allocatedNet,
                allocated_amount: summary.allocatedNet,
                order_no: orderNo,
                order_status: finalStatus,
                // Align with DB Schema timestamps
                draft_at: finalStatus === "Draft" ? now : null,
                pending_date: finalStatus === "Pending" ? now : null,
                for_approval_at: finalStatus === "For Approval" ? now : null,
                remarks: orderRemarks || "",
                attachment_id: attachmentId ? Number(attachmentId) : null,
                payment_terms: paymentTerms ? Number(paymentTerms) : null
            };

            const itemsWithAllocation = lineItems.map(item => {
                const qtyVal = allocatedQuantities[item.id] !== undefined ? allocatedQuantities[item.id] : item.quantity;
                return {
                    ...item,
                    allocated_quantity: qtyVal,
                    allocated_amount: (calculateChainNetPrice(item.unitPrice, item.discounts)) * (qtyVal ?? 0)
                };
            });

            console.log(`[SubmitOrder] Sending ${itemsWithAllocation.length} item(s) to API. Existing order: ${!!existingOrderId}`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            itemsWithAllocation.forEach((item: any, idx: number) => {
                console.log(`  [Item ${idx}] detail_id=${item.detail_id}, product=${item.product?.display_name || item.product?.product_id}`);
            });

            const res = await salesOrderProvider.createOrder(payload, itemsWithAllocation);
            if (res.success) {
                console.log(`[SubmitOrder] SUCCESS: ${res.order_no}`);
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
                setExistingOrderId(null);
                setExistingOrderStatus("");
                setExistingOrderNo("");

                // Just confirmation, since state is already reset
            } else {
                console.error(`[SubmitOrder] FAILED: ${res.error}`);
                toast.error(res.error || "Failed to create order");
            }
        } catch (e: unknown) {
            const err = e as Error;
            console.error(`[SubmitOrder] EXCEPTION:`, err);
            toast.error(err.message || "Submission error");
        } finally {
            setSubmitting(false);
        }
    }, [selectedAccountId, selectedCustomerId, selectedSupplierId, selectedReceiptTypeId, selectedBranchId, priceTypeId, lineItems, selectedCustomer, selectedSalesTypeId, poNo, dueDate, deliveryDate, summary, orderNo, orderRemarks, allocatedQuantities, existingOrderId, attachmentId, paymentTerms]);

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
        paymentTerms, setPaymentTerms,
        handlePriceTypeIdChange,
        handleSubmitOrder, submitting,
        existingOrderId, existingOrderStatus
    };
}
