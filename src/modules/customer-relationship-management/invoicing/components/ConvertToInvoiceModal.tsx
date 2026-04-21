"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SalesOrder, LogisticsData, ConversionData, DiscountType, ReceiptType, ORTemplate } from "../types";
import { InvoicingService, INVOICING_API_BASE } from "../services/InvoicingService";
import { generateInvoicingPDF, ReceiptData } from "../utils/generateInvoicingPDF";
import { format } from "date-fns";
import { ReceiptTemplateEditor } from "./ReceiptTemplateEditor";
import { jsPDF } from "jspdf";

import {
    Hash,
    Calendar,
    Truck,
    PackageSearch,
    Boxes,
    Lock,
    Eye,
    Plus,
    Trash2,
    FileText,
    ArrowRightCircle,
    CheckCircle,
    Printer,
    Settings2
} from "lucide-react";

import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import Barcode from "react-barcode";
import { cn } from "@/lib/utils";

interface ConvertToInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: SalesOrder;
}

interface ReceiptItem {
    product_id: number;
    product_name: string;
    order_no: string;
    allocated_qty: number;
    qty: number;
    unit_price: number;
    discount_type: number | null;
    discount_amount: number;
    net_amount: number;
    unit_shortcut: string;
    ordered_qty: number;
}

interface Receipt {
    id: string;
    receipt_no: string;
    items: ReceiptItem[];
    is_void_reference?: boolean; // Receipt 1 for void orders — read-only reference
    target_id?: number | null;
}


const THERMAL_LINE_WIDTH = 32; // Reverted back to 50mm width

export const ConvertToInvoiceModal: React.FC<ConvertToInvoiceModalProps> = ({
    isOpen,
    onClose,
    order
}) => {
    const [logistics, setLogistics] = useState<LogisticsData[]>([]);
    const [conversionData, setConversionData] = useState<ConversionData | null>(null);
    const [discountTypes, setDiscountTypes] = useState<DiscountType[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([
        { id: "1", receipt_no: "", items: [] }
    ]);
    const [activeReceiptId, setActiveReceiptId] = useState<string>("1");
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [receiptToPreview, setReceiptToPreview] = useState<Receipt | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
    const [orTemplate, setOrTemplate] = useState<ORTemplate | undefined>(undefined);
    const [isHoldConfirmOpen, setIsHoldConfirmOpen] = useState(false);
    const [isHolding, setIsHolding] = useState(false);
    const [receiptTypes, setReceiptTypes] = useState<ReceiptType[]>([]);
    const [selectedTypeId, setSelectedTypeId] = useState<string>("");
    const [isPrintConfirmOpen, setIsPrintConfirmOpen] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [sourceProductIds, setSourceProductIds] = useState<Set<number> | null>(null);

    const componentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && order) {
            const typeId = order.receipt_type?.id;
            
            const basicPromises = [
                InvoicingService.getLogisticsData(order.order_id),
                InvoicingService.getConversionDetails(order.order_id),
                InvoicingService.getDiscountTypes(),
                InvoicingService.getReceiptTypes(),
                typeId ? InvoicingService.getTemplate(typeId).catch(() => null) : Promise.resolve(null),
            ];

            // Determine what existing invoice(s) to fetch
            const existingInvoicesToFetch: { id: number; display_no: string | null }[] = [];
            if (order.void_invoices && order.void_invoices.length > 0) {
                existingInvoicesToFetch.push(...order.void_invoices.map(inv => ({ id: inv.id, display_no: inv.display_no })));
            } else if (order.existing_invoices && order.existing_invoices.length > 0) {
                existingInvoicesToFetch.push(...order.existing_invoices.map(inv => ({ id: inv.id, display_no: inv.display_no })));
            } else if (order.existing_invoice_no) {
                existingInvoicesToFetch.push({ id: order.existing_invoice_no as number, display_no: order.existing_invoice_display_no });
            }

            Promise.all([
                ...basicPromises,
                Promise.all(existingInvoicesToFetch.map(inv => 
                    InvoicingService.getInvoiceDetails(inv.id)
                        .then(details => ({ ...inv, details: details as Record<string, unknown>[] }))
                        .catch(err => {
                            console.error(`[DEBUG] Failed to fetch details for invoice ${inv.id}:`, err);
                            return { ...inv, details: [] as Record<string, unknown>[] };
                        })
                ))
            ])
                .then((results) => {
                    const [logisticsData, convData, discTypes, rTypes, fetchedTemplate, allInvoiceDetails] = results as unknown as [
                        LogisticsData[], 
                        ConversionData, 
                        DiscountType[], 
                        ReceiptType[], 
                        ORTemplate | null, 
                        { id: number; display_no: string | null; details: Record<string, unknown>[] }[]
                    ];
                    
                    const invoiceDetails = allInvoiceDetails;
                    
                    setLogistics(Array.isArray(logisticsData) ? logisticsData : [logisticsData]);
                    setConversionData(convData as ConversionData);
                    setDiscountTypes(discTypes as DiscountType[]);
                    setReceiptTypes(rTypes as ReceiptType[]);
                    if (order.receipt_type?.id) {
                        setSelectedTypeId(order.receipt_type.id.toString());
                    }
                    if (fetchedTemplate) {
                        setOrTemplate(fetchedTemplate as ORTemplate);
                    }

                    if (order.void_invoices && order.void_invoices.length > 0 && invoiceDetails.length > 0) {
                        // ── Void order: multi-dual-receipt setup (Reference + New Editable Copy for each) ──
                        const voidReceipts: Receipt[] = [];
                        const allPids = new Set<number>();
                        
                        invoiceDetails.forEach((inv, index) => {
                            const voidItems: ReceiptItem[] = inv.details.map((d) => ({
                                product_id: d.product_id as number,
                                product_name: d.product_name as string,
                                order_no: order.order_no,
                                allocated_qty: d.quantity as number,
                                qty: d.quantity as number,
                                unit_price: d.unit_price as number,
                                discount_type: (d.discount_type as number) ?? null,
                                discount_amount: (d.discount_amount as number) ?? 0,
                                net_amount: (d.total_amount as number) ?? 0,
                                unit_shortcut: (d.unit_shortcut as string) ?? "",
                                ordered_qty: d.quantity as number,
                            }));

                            voidItems.forEach(i => allPids.add(i.product_id));

                            const baseId = (index * 2) + 1;
                            // Reference Tab
                            voidReceipts.push({
                                id: baseId.toString(),
                                receipt_no: inv.display_no ?? "",
                                items: voidItems,
                                is_void_reference: true,
                                target_id: inv.id
                            });
                            // Editable Copy Tab
                            voidReceipts.push({
                                id: (baseId + 1).toString(),
                                receipt_no: "",
                                items: [...voidItems],
                                is_void_reference: false,
                                target_id: inv.id
                            });
                        });

                        setReceipts(voidReceipts);
                        setSourceProductIds(allPids);
                        setActiveReceiptId("1");
                    } else if (invoiceDetails.length > 0) {
                        // ── Recycled order: pre-populate as multiple tabs ──
                        const allRecycledReceipts: Receipt[] = invoiceDetails.map((inv, index) => ({
                            id: (index + 1).toString(),
                            receipt_no: inv.display_no ?? "",
                            items: inv.details.map((d) => ({
                                product_id: d.product_id as number,
                                product_name: d.product_name as string,
                                order_no: order.order_no,
                                allocated_qty: d.quantity as number,
                                qty: d.quantity as number,
                                unit_price: d.unit_price as number,
                                discount_type: (d.discount_type as number) ?? null,
                                discount_amount: (d.discount_amount as number) ?? 0,
                                net_amount: (d.total_amount as number) ?? 0,
                                unit_shortcut: (d.unit_shortcut as string) ?? "",
                                ordered_qty: d.quantity as number,
                            }))
                        }));

                        setReceipts(allRecycledReceipts);
                        
                        // Collect all product IDs from all invoices for strict filtering
                        const allPids = new Set<number>();
                        allRecycledReceipts.forEach(r => r.items.forEach(i => allPids.add(i.product_id)));
                        setSourceProductIds(allPids);
                        
                        setActiveReceiptId("1");
                    } else {
                        // ── Normal order: auto-distribute ──
                        autoDistributeAllItems(convData as ConversionData);
                    }
                })
            .catch(err => {
                console.error("Error fetching data:", err);
                toast.error("Failed to load details");
            })
            .finally(() => {}); // removed 'setLoading(false)'
        }
    }, [isOpen, order]);

    const autoDistributeAllItems = (data: ConversionData) => {
        const availableItems = data.items.filter(item => {
            const isMatched = Number(item.total_allocated_quantity || 0) > 0 && 
                              Number(item.total_allocated_quantity || 0) === Number(item.picked_quantity || 0);
            return isMatched && item.remaining_quantity > 0;
        });

        if (availableItems.length === 0) {
            setReceipts([{ id: "1", receipt_no: "", items: [] }]);
            return;
        }

        const maxLen = data.max_receipt_length || 15;
        const newReceipts: Receipt[] = [];

        for (let i = 0; i < availableItems.length; i += maxLen) {
            const chunk = availableItems.slice(i, i + maxLen);
            const receiptItems: ReceiptItem[] = chunk.map(item => {
                const ordered = item.ordered_quantity || 0;
                const poolRemaining = item.remaining_quantity || 0;
                // Cap by both ordered amount and pool remaining
                const autoQty = Math.min(ordered, poolRemaining);
                return {
                    product_id: item.product_id,
                    product_name: item.product_name,
                    order_no: item.order_no,
                    allocated_qty: item.allocated_quantity || 0,
                    qty: autoQty,
                    unit_price: item.unit_price,
                    discount_type: item.discount_type,
                    discount_amount: (item.discount_amount / ordered) * autoQty,
                    net_amount: (item.unit_price * autoQty) - ((item.discount_amount / ordered) * autoQty),
                    unit_shortcut: item.unit_shortcut,
                    ordered_qty: ordered
                };
            });

            newReceipts.push({
                id: (newReceipts.length + 1).toString(),
                receipt_no: "",
                items: receiptItems
            });
        }

        setReceipts(newReceipts);
        setActiveReceiptId(newReceipts[0].id);
    };

    const addReceipt = () => {
        const newId = (Math.max(0, ...receipts.map(r => parseInt(r.id))) + 1).toString();
        setReceipts([...receipts, { id: newId, receipt_no: "", items: [] }]);
        setActiveReceiptId(newId);
    };

    const removeReceipt = (id: string) => {
        if (receipts.length === 1) return;
        const filtered = receipts.filter(r => r.id !== id);
        setReceipts(filtered);
        if (activeReceiptId === id) {
            setActiveReceiptId(filtered[0].id);
        }
    };

    const updateReceiptNo = (id: string, no: string) => {
        setReceipts(receipts.map(r => r.id === id ? { ...r, receipt_no: no } : r));
    };

    const isILCSupplier = order?.supplier_id?.supplier_name === "ISLA LPG CORPORATION" || 
                         order?.supplier_id?.supplier_shortcut === "ILC";

    const updateItemPrice = (receiptId: string, productId: number, newPrice: number) => {
        setReceipts(receipts.map(r => r.id === receiptId ? {
            ...r,
            items: r.items.map(i => {
                if (i.product_id === productId) {
                    const discount = i.discount_amount || 0;
                    return {
                        ...i,
                        unit_price: newPrice,
                        net_amount: (newPrice * i.qty) - discount
                    };
                }
                return i;
            })
        } : r));
    };

    const updateItemQty = (receiptId: string, productId: number, newQty: number) => {
        const data = conversionData;
        if (!data) return;

        const maxLen = data.max_receipt_length || 15;
        const convItem = data.items.find(i => i.product_id === productId);
        if (!convItem) return;

        const ordered = convItem.ordered_quantity || 0;
        const poolRemaining = convItem.remaining_quantity || 0;

        // Use total drafts across ALL receipts EXCEPT potentially the one being edited 
        // to see what's actually left for the order
        const totalOtherApplied = receipts
            .filter(r => r.id !== receiptId && !r.is_void_reference)
            .reduce((sum, r) => {
                const item = r.items.find(i => i.product_id === productId);
                return sum + (item?.qty || 0);
            }, 0);

        // Check if there's any pool available at all across all drafts
        const orderNeeded = Math.max(0, ordered - totalOtherApplied);
        const totalUsedAcrossAll = receipts.reduce((sum, r) => {
            if (r.is_void_reference) return sum;
            const item = r.items.find(i => i.product_id === productId);
            return sum + (item?.qty || 0);
        }, 0);

        const currentPoolRemaining = Math.max(0, poolRemaining - totalUsedAcrossAll);

        // If trying to add NEW quantity but pool is already empty
        if (newQty > 0 && currentPoolRemaining <= 0) {
            const isAlreadyInSomeReceipt = receipts.some(r => r.items.some(i => i.product_id === productId));
            if (!isAlreadyInSomeReceipt) {
                toast.error("Cannot add item: Out of stock / No remaining items available in pool.", {
                    duration: 4000,
                    style: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }
                });
                return;
            }
        }

        const poolAvail = Math.max(0, poolRemaining - totalOtherApplied);

        // Final qty is capped by what the order actually requires and what the pool has
        const cappedQty = Math.min(newQty, orderNeeded, poolAvail);
        const finalQty = Math.max(0, cappedQty);

        if (finalQty === 0) {
            setReceipts(receipts.map(r => r.id === receiptId ? {
                ...r,
                items: r.items.filter(i => i.product_id !== productId)
            } : r));
            return;
        }

        const targetR = receipts.find(r => r.id === receiptId);
        const isExistingInTarget = targetR?.items.find(i => i.product_id === productId);

        if (isExistingInTarget) {
            setReceipts(receipts.map(r => r.id === receiptId ? {
                ...r,
                items: r.items.map(i => i.product_id === productId ? {
                    ...i,
                    qty: finalQty,
                    allocated_qty: convItem.allocated_quantity || 0,
                    discount_amount: (convItem.discount_amount / ordered) * finalQty,
                    net_amount: (i.unit_price * finalQty) - ((convItem.discount_amount / ordered) * finalQty),
                    unit_shortcut: convItem.unit_shortcut,
                    ordered_qty: ordered
                } : i)
            } : r));
            return;
        }

        // New item addition - Logic: Auto overflow if target full
        const itemToAdd: ReceiptItem = {
            product_id: productId,
            product_name: convItem.product_name,
            order_no: convItem.order_no,
            allocated_qty: convItem.allocated_quantity || 0,
            qty: finalQty,
            unit_price: convItem.unit_price,
            discount_type: convItem.discount_type,
            discount_amount: (convItem.discount_amount / ordered) * finalQty,
            net_amount: (convItem.unit_price * finalQty) - ((convItem.discount_amount / ordered) * finalQty),
            unit_shortcut: convItem.unit_shortcut,
            ordered_qty: ordered
        };

        if (targetR && targetR.items.length < maxLen) {
            setReceipts(receipts.map(r => r.id === receiptId ? {
                ...r,
                items: [...r.items, itemToAdd]
            } : r));
        } else {
            // Find any receipt with space
            const firstWithSpace = receipts.find(r => r.items.length < maxLen);
            if (firstWithSpace) {
                setReceipts(receipts.map(r => r.id === firstWithSpace.id ? {
                    ...r,
                    items: [...r.items, itemToAdd]
                } : r));
                setActiveReceiptId(firstWithSpace.id);
                toast.success(`Item added to Receipt ${receipts.findIndex(r => r.id === firstWithSpace.id) + 1} (Full Limit reached)`);
            } else {
                // Create new
                const nextId = (Math.max(0, ...receipts.map(r => parseInt(r.id))) + 1).toString();
                setReceipts([...receipts, { id: nextId, receipt_no: "", items: [itemToAdd] }]);
                setActiveReceiptId(nextId);
                toast.success("New receipt created for overflowing items");
            }
        }
    };

    const removeItemFromReceipt = (receiptId: string, productId: number) => {
        setReceipts(receipts.map(r => r.id === receiptId ? {
            ...r,
            items: r.items.filter(i => i.product_id !== productId)
        } : r));
    };



    const handlePreviewReceipt = async () => {
        // Validate ALL receipts before opening preview
        // Validate ONLY non-void receipts before opening preview
        const validReceipts = receipts.filter(r => !r.is_void_reference);
        for (const r of validReceipts) {
            if (!r.receipt_no.trim()) {
                toast.error(`Receipt ${receipts.indexOf(r) + 1}: Receipt Number is required`, { duration: 4000 });
                setActiveReceiptId(r.id); 
                return;
            }
            if (r.items.length === 0) {
                toast.error(`Receipt ${receipts.indexOf(r) + 1}: Must have at least one item`, { duration: 4000 });
                setActiveReceiptId(r.id);
                return;
            }
        }

        setIsValidating(true);
        try {
            // Validate uniqueness of ALL replacement receipts (ignore void references)
            for (const r of validReceipts) {
                // ── Skip validation if this is an existing recycled invoice that we are just patching ──
                if (order.existing_invoice_no) continue;

                const exists = await InvoicingService.validateReceiptNo(r.receipt_no);
                if (exists) {
                    toast.error(`Receipt Number "${r.receipt_no}" already exists!`, {
                        description: `Check Receipt ${receipts.indexOf(r) + 1}`,
                        duration: 5000
                    });
                    setActiveReceiptId(r.id);
                    return;
                }
            }

            // All valid — open preview showing the REPLACEMENT receipt (default to first replacement)
            const firstReplacement = receipts.find(r => !r.is_void_reference);
            setReceiptToPreview(firstReplacement || receipts[0]);
            setIsPreviewOpen(true);
        } catch (err) {
            console.error(err);
            toast.error("Error validating receipt number");
        } finally {
            setIsValidating(false);
        }
    };



    const handleHoldOrder = async () => {
        if (!order) return;
        setIsHolding(true);
        try {
            await InvoicingService.updateSalesOrder(order.order_id, {
                order_status: "On Hold",
                on_hold_at: new Date().toISOString()
            });

            toast.warning("Order placed on hold successfully!");
            onClose();
            window.location.reload();
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "Error holding order");
        } finally {
            setIsHolding(false);
            setIsHoldConfirmOpen(false);
        }
    };

    /**
     * handlePrint now acts as the INITIAL validation trigger.
     * It checks for required fields and, if valid, opens the confirmation dialog.
     */
    const handlePrint = async () => {
        if (!order || receipts.length === 0) return;

        // 1. Basic UI Validation (Required fields)
        // 1. Basic UI Validation (Required fields) - Skip Void References
        const validReceipts = receipts.filter(r => !r.is_void_reference);
        for (const r of validReceipts) {
            if (!r.receipt_no.trim()) {
                toast.error(`Receipt ${receipts.indexOf(r) + 1}: Receipt Number is required`, { duration: 4000 });
                setActiveReceiptId(r.id); 
                return;
            }
            if (r.items.length === 0) {
                toast.error(`Receipt ${receipts.indexOf(r) + 1}: Must have at least one item`, { duration: 4000 });
                setActiveReceiptId(r.id);
                return;
            }
        }

        // 2. Open confirmation dialog
        setIsPrintConfirmOpen(true);
    };

    /**
     * executePrint performs the actual API submission and PDF generation.
     * Guaranteed to run only after user confirms in the dialog.
     */
    const executePrint = async () => {
        setIsValidating(true);
        setIsPrintConfirmOpen(false);

        try {
            // Validate uniqueness of ALL replacement receipts (skip void reference AND existing recycled invoices)
            for (const r of receipts) {
                if (r.is_void_reference) continue; 
                if (order.existing_invoice_no) continue;

                const exists = await InvoicingService.validateReceiptNo(r.receipt_no);
                if (exists) {
                    toast.error(`Receipt Number "${r.receipt_no}" already exists!`, {
                        description: `Check Receipt ${receipts.indexOf(r) + 1}`,
                        duration: 5000
                    });
                    setActiveReceiptId(r.id);
                    setIsValidating(false);
                    return;
                }
            }
        } catch {
            toast.error("Error validating receipt number");
            setIsValidating(false);
            return;
        }

        const fullName = conversionData?.customer?.customer_name || 'N/A';
        const storeName = conversionData?.customer?.store_name || fullName;
        const address = `${conversionData?.customer?.province || 'N/A'}, ${conversionData?.customer?.city || 'N/A'}, ${conversionData?.customer?.brgy || 'N/A'}`;

        try {
            // 1. Backend Update FIRST: Submit ALL receipts to generate-invoice API
            const updateRes = await fetch(`${INVOICING_API_BASE}/generate-invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order: order,
                    receipts: receipts.filter(r => !r.is_void_reference),
                    receipt_type_id: parseInt(selectedTypeId)
                })
            });

            if (!updateRes.ok) {
                const errText = await updateRes.text();
                console.error("Failed to update DB on print", errText);
                toast.error("Database update failed. Printing cancelled.", { duration: 5000 });
                setIsValidating(false);
                return;
            }

            const result = await updateRes.json();
            const createdInvoices = result.details?.createdInvoices || [];

            if (createdInvoices.length === 0) {
                console.warn("No invoices were created by the API.");
            }

            // 2. PDF Generation & Individual Downloads
            let mergedDoc: jsPDF | null = null;
            const archivedReceiptNos: string[] = [];
            const invoiceIdsToArchive: number[] = createdInvoices.map((inv: { id: number }) => inv.id);

            // Generate and download a separate PDF for EACH receipt (skip void references)
            for (let i = 0; i < receipts.length; i++) {
                const r = receipts[i];
                if (r.is_void_reference) continue;
                
                archivedReceiptNos.push(r.receipt_no);

                // Barcode logic removed - now handled via Vector in generateInvoicingPDF.ts
                const currentBarcodeUrl = undefined;

                const data: ReceiptData = {
                    receipt_no: r.receipt_no,
                    items: r.items,
                    customer_name: fullName,
                    store_name: storeName,
                    customer_tin: conversionData?.customer?.customer_tin || "N/A",
                    address: address,
                    payment_name: conversionData?.payment_name || "N/A",
                    po_no: order.po_no || "",
                    salesman_name: order.salesman_id?.salesman_name || "N/A",
                    is_official: isOfficialReceipt,
                    discountTypes: discountTypes,
                    barcodeDataUrl: currentBarcodeUrl,
                    template: orTemplate
                };

                const doc = await generateInvoicingPDF(data);
                const filename = `${order.order_no}-${r.receipt_no}.pdf`;
                doc.save(filename);

                mergedDoc = await generateInvoicingPDF(data, mergedDoc || undefined);
            }

            // 3. Automated PDF Archiving (Linked to Invoice IDs)
            if (mergedDoc && invoiceIdsToArchive.length > 0) {
                try {
                    const combinedFilename = `${order.order_no}-${archivedReceiptNos.join("-")}.pdf`;
                    const pdfBlob = mergedDoc.output('blob');
                    const uploadFormData = new FormData();
                    uploadFormData.append("file", pdfBlob, combinedFilename);
                    uploadFormData.append("invoice_ids", JSON.stringify(invoiceIdsToArchive));
                    uploadFormData.append("receipt_numbers", archivedReceiptNos.join(", "));
                    uploadFormData.append("width_mm", (orTemplate?.width || 210).toString());
                    uploadFormData.append("height_mm", (orTemplate?.height || 265).toString());

                    fetch(`${INVOICING_API_BASE}/save-pdf`, {
                        method: "POST",
                        body: uploadFormData
                    }).then(async (res) => {
                        const data = await res.json();
                        if (res.ok) {
                            console.log("[Archive] PDF successfully archived to server.");
                            if (data.warning) {
                                toast.info(data.warning, { duration: 8000 });
                            }
                        } else {
                            console.error("[Archive] Failed to archive PDF.");
                        }
                    }).catch(_e => console.error("[Archive] Network error during archiving:", _e));
                    
                } catch (archiveErr) {
                    console.error("Archiving initiation failed:", archiveErr);
                }
            }

            toast.success(`Processed ${archivedReceiptNos.length} receipt${archivedReceiptNos.length > 1 ? 's' : ''}`);
            
            if (result.warning) {
                toast.warning("DB Update had warnings: " + result.warning, { duration: 6000 });
            }

            onClose();
            window.location.reload();

        } catch (err) {
            console.error("Error in print/generate flow:", err);
            toast.error("Failed to complete processing");
            setIsValidating(false);
        }
    };

    // Derived: Remaining quantities per product after considering current receipt drafts
    const currentRemaining = useMemo(() => {
        if (!conversionData) return [];

        let itemsToProcess = conversionData.items;
        
        // Strictly limit available items to what was in the original source (for Voided or Recycled orders)
        if (sourceProductIds) {
            itemsToProcess = itemsToProcess.filter(it => sourceProductIds.has(it.product_id));
        }

        return itemsToProcess.map(item => {
            const totalAppliedInDrafts = receipts.reduce((sum, r) => {
                // Ignore items in the void reference receipt when calculating what's "applied" in the new draft
                if (r.is_void_reference) return sum;
                const rItem = r.items.find(i => i.product_id === item.product_id);
                return sum + (rItem?.qty || 0);
            }, 0);

            // pool_remaining = actual warehouse picked items minus those already in official receipts (applied_quantity)
            const pool_rem = item.picked_quantity - item.applied_quantity;

            return {
                ...item,
                pool_remaining: Math.max(0, pool_rem - totalAppliedInDrafts),
                order_needed: Math.max(0, item.ordered_quantity - totalAppliedInDrafts)
            };
        });
    }, [conversionData, receipts, sourceProductIds]);



    const formatDate = (dateStr: string) => {
        try {
            return format(new Date(dateStr), "MMM dd, yyyy");
        } catch {
            return dateStr;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
        }).format(amount).replace('PHP', '₱').trim();
    };

    const isOfficialReceipt = useMemo(() => {
        const selectedType = receiptTypes.find(t => t.id.toString() === selectedTypeId);
        if (selectedType) return String(selectedType.isOfficial) === "1";
        return String(conversionData?.is_official ?? order.receipt_type?.isOfficial ?? 1) === "1";
    }, [receiptTypes, selectedTypeId, conversionData, order]);

    const previewPaperWidth = isOfficialReceipt ? "210mm" : "58mm";
    const thermalPaperWidth = "58mm";
    const thermalContentWidth = "50mm"; // Reverted to 50mm width
    const previewPaperHeight = isOfficialReceipt ? "265mm" : "auto";
    const previewDialogWidthClass = isOfficialReceipt
        ? "!w-[min(calc(210mm+3rem),calc(100vw-1rem))] !max-w-[min(calc(210mm+3rem),calc(100vw-1rem))] sm:!max-w-[min(calc(210mm+3rem),calc(100vw-1rem))]"
        : "!w-[min(calc(58mm+2rem),calc(100vw-1rem))] !max-w-[min(calc(58mm+2rem),calc(100vw-1rem))] sm:!max-w-[min(calc(58mm+2rem),calc(100vw-1rem))]";

    const getReceiptTotals = (receipt: Receipt | null) => {
        const items = receipt?.items || [];
        const grossTotal = items.reduce((sum, item) => sum + (item.unit_price * item.qty), 0);
        const discountTotal = items.reduce((sum, item) => sum + item.discount_amount, 0);
        const netTotal = grossTotal - discountTotal;
        const vatableSales = netTotal / 1.12;
        const vatAmount = netTotal - vatableSales;

        return { grossTotal, discountTotal, netTotal, vatableSales, vatAmount };
    };

    const previewTotals = getReceiptTotals(receiptToPreview);

    const formatThermalAmount = (amount: number) =>
        new Intl.NumberFormat("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);

    const wrapThermalText = (value: string, width: number) => {
        const normalized = (value || "").replace(/\s+/g, " ").trim();
        if (!normalized) return ["N/A"];

        const words = normalized.split(" ");
        const lines: string[] = [];
        let current = "";

        for (const word of words) {
            if (!current) {
                current = word;
                continue;
            }

            if (`${current} ${word}`.length <= width) {
                current = `${current} ${word}`;
                continue;
            }

            lines.push(current);
            current = word;
        }

        if (current) lines.push(current);
        return lines;
    };

    const thermalKeyValue = (label: string, value: string, width = THERMAL_LINE_WIDTH) => {
        const cleanLabel = label.trim();
        const cleanValue = value.trim();
        const space = Math.max(1, width - cleanLabel.length - cleanValue.length);
        return `${cleanLabel}${" ".repeat(space)}${cleanValue}`.slice(0, width);
    };

    const thermalCenterText = (text: string, width = THERMAL_LINE_WIDTH) => {
        const clean = text.trim();
        if (clean.length >= width) return clean.slice(0, width);
        const left = Math.floor((width - clean.length) / 2);
        return " ".repeat(left) + clean;
    };

    // Group items by discount_type for grouped receipt layout
    const thermalItemBlocks: string[] = (() => {
        const items = receiptToPreview?.items || [];
        if (items.length === 0) return [];

        // Group by discount_type ID
        const groups = new Map<string, typeof items>();
        for (const item of items) {
            const key = item.discount_type !== null && item.discount_type !== undefined
                ? String(item.discount_type)
                : "NONE";
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(item);
        }

        const result: string[] = [];
        const groupKeys = [...groups.keys()];

        groupKeys.forEach((key, idx) => {
            const groupItems = groups.get(key)!;
            const dtName = key === "NONE"
                ? "NO DISCOUNT"
                : (discountTypes.find((d: { id: number; discount_type: string }) => d.id === Number(key))?.discount_type || key);

            // Group label
            result.push(thermalCenterText(`Discount: ${dtName}`));

            // Items in this group
            for (const item of groupItems) {
                const nameLines = wrapThermalText(item.product_name.toUpperCase(), THERMAL_LINE_WIDTH);
                const qtyPart = `${item.qty}${item.unit_shortcut} @${formatThermalAmount(item.unit_price)}`;
                const amtPart = formatThermalAmount(item.net_amount);
                const spaceCount = Math.max(1, THERMAL_LINE_WIDTH - qtyPart.length - amtPart.length);
                const detailLine = `${qtyPart}${" ".repeat(spaceCount)}${amtPart}`;
                result.push(...nameLines, detailLine, "");
            }

            // Add a dash-divider between groups (not after the last one)
            if (idx < groupKeys.length - 1) {
                result.push("-".repeat(THERMAL_LINE_WIDTH));
            }
        });

        return result;
    })();


    const thermalCheckerDivider = "=".repeat(THERMAL_LINE_WIDTH);
    const thermalTextLines = [
        thermalCheckerDivider,
        ...wrapThermalText(`Receipt#: ${receiptToPreview?.receipt_no || "N/A"}`, THERMAL_LINE_WIDTH),
        ...wrapThermalText(`PO#: ${order.po_no || "N/A"}`, THERMAL_LINE_WIDTH),
        ...wrapThermalText(`Salesman: ${order.salesman_id?.salesman_name || "N/A"}`, THERMAL_LINE_WIDTH),
        ...wrapThermalText(
            `Customer: ${order.customer_code?.customer_name || "N/A"}`,
            THERMAL_LINE_WIDTH
        ),
        ...wrapThermalText(
            `Address: ${conversionData?.customer?.province || "N/A"}, ${conversionData?.customer?.city || "N/A"}`,
            THERMAL_LINE_WIDTH
        ),

        thermalCheckerDivider,
        ...thermalItemBlocks,
        thermalCheckerDivider,
        thermalKeyValue("GROSS AMOUNT:", formatThermalAmount(previewTotals.grossTotal)),
        thermalKeyValue("DISCOUNT AMOUNT:", formatThermalAmount(previewTotals.discountTotal)),
        thermalKeyValue("NET AMOUNT:", formatThermalAmount(previewTotals.netTotal)),
        thermalCheckerDivider,
        "",
        "Received By: ___________________",
        "Date: __________________________",
        "Printed Name: __________________",
        "Position: ______________________",
        "",
        ...wrapThermalText("This Delivery Receipt confirms delivery of goods as listed above.", THERMAL_LINE_WIDTH),
        "",
        ...wrapThermalText("It is issued for delivery confirmation only and is not valid for claiming input VAT.", THERMAL_LINE_WIDTH),
        "",
        thermalCheckerDivider,
        "",
        thermalCenterText("--- THANK YOU ---"),
        thermalCenterText(format(new Date(), "yyyy-MM-dd HH:mm:ss")),
    ];

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] md:max-w-6xl p-0 overflow-hidden border-none shadow-2xl bg-background/95 backdrop-blur-xl flex flex-col h-[90vh]">
                <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-primary/10 via-background to-transparent border-b flex-shrink-0">
                    <DialogTitle className="sr-only">Convert to Invoice - {order.order_no}</DialogTitle>
                    <div className="space-y-4">
                        {/* Consolidated Header Row */}
                        <div className="flex items-center justify-between gap-6">
                            {/* Order Info */}
                            <div className="flex flex-col gap-3 min-w-[120px]">
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5 opacity-70">
                                        <Hash size={10} /> Order No
                                    </p>
                                    <p className="font-black text-xs text-primary">{order.order_no}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5 opacity-70">
                                        <FileText size={10} /> PO Ref
                                    </p>
                                    <p className="font-black text-xs text-foreground/80">{order.po_no || "—"}</p>
                                </div>
                            </div>

                            {/* Center Group: Logistics + KPIs */}
                            <div className="flex-1 flex items-center justify-center gap-8">
                                {/* Logistics Info */}
                                <div className="flex flex-col gap-2">
                                    {/* History Logistics (Optional) - SHOWN ONLY IF RECYCLED */}
                                    {logistics.length > 1 && (
                                        <div className="flex flex-row items-center gap-6 px-5 py-1.5 bg-orange-500/5 rounded-2xl border border-orange-500/20 shadow-inner group/history opacity-70">
                                            {(() => {
                                                const history = logistics[0];
                                                return (
                                                    <>
                                                        <div className="flex items-center gap-2">
                                                            <Truck size={10} className="text-orange-500/70" />
                                                            <div className="flex flex-col">
                                                                <span className="text-[7px] font-black uppercase text-orange-600/50 tracking-wider leading-tight">OLD PDP</span>
                                                                <span className="text-[9px] font-black text-orange-700/80">{history.dispatch_no || "—"}</span>
                                                            </div>
                                                        </div>
                                                        <div className="w-[1px] h-4 bg-orange-500/10" />
                                                        <div className="flex items-center gap-2">
                                                            <PackageSearch size={10} className="text-orange-500/70" />
                                                            <div className="flex flex-col">
                                                                <span className="text-[7px] font-black uppercase text-orange-600/50 tracking-wider leading-tight">OLD CONSOL</span>
                                                                <span className="text-[9px] font-black text-orange-700/80">{history.consolidation_no || "—"}</span>
                                                            </div>
                                                        </div>
                                                        <div className="w-[1px] h-4 bg-orange-500/10" />
                                                        <div className="flex items-center gap-2">
                                                            <Boxes size={10} className="text-orange-500/70" />
                                                            <div className="flex flex-col">
                                                                <span className="text-[7px] font-black uppercase text-orange-600/50 tracking-wider leading-tight">OLD DISPATCH</span>
                                                                <span className="text-[9px] font-black text-orange-700/80">{history.pdp_no || "—"}</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {/* Latest Logistics (Source of Truth) */}
                                    <div className="flex flex-row items-center gap-6 px-5 py-2.5 bg-green-500/5 rounded-2xl border border-green-500/20 shadow-inner group">
                                        {(() => {
                                            const latest = logistics[logistics.length - 1] || { dispatch_no: "—", consolidation_no: "—", pdp_no: "—" };
                                            return (
                                                <>
                                                    <div className="flex items-center gap-2 transition-all duration-300 hover:translate-x-0.5">
                                                        <Truck size={12} className="text-green-600/70" />
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-black uppercase text-green-600/50 tracking-wider leading-tight">PDP</span>
                                                            <span className="text-[10px] font-black text-green-700">{latest.dispatch_no}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="w-[1px] h-6 bg-green-500/10" />

                                                    <div className="flex items-center gap-2 transition-all duration-300 hover:translate-x-0.5">
                                                        <PackageSearch size={12} className="text-green-600/70" />
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-black uppercase text-green-600/50 tracking-wider leading-tight">CONSOL</span>
                                                            <span className="text-[10px] font-black text-green-700">{latest.consolidation_no}</span>
                                                        </div>
                                                    </div>

                                                    <div className="w-[1px] h-6 bg-green-500/10" />

                                                    <div className="flex items-center gap-2 transition-all duration-300 hover:translate-x-0.5">
                                                        <Boxes size={12} className="text-green-600/70" />
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-black uppercase text-green-600/50 tracking-wider leading-tight">DISPATCH</span>
                                                            <span className="text-[10px] font-black text-green-700">{latest.pdp_no}</span>
                                                        </div>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Dynamic KPI Header Overlay */}
                                <div className="hidden lg:flex flex-row items-center gap-6 px-5 py-2.5 bg-gradient-to-tr from-primary/10 to-transparent border border-primary/20 rounded-2xl shadow-inner transition-all duration-300">
                                    {(() => {
                                        const kpiItem = selectedProductId ? currentRemaining.find(i => i.product_id === selectedProductId) : null;
                                        const hasItem = !!kpiItem;
                                        
                                        return (
                                            <>
                                                <div className="flex flex-col items-center">
                                                    <span className={`text-[8px] font-black uppercase tracking-wider leading-tight transition-colors ${hasItem ? 'text-muted-foreground/50' : 'text-muted-foreground/30'}`}>TOTAL ALLOCATED</span>
                                                    <span className={`text-[10px] font-black leading-none transition-colors ${hasItem ? 'text-foreground/90' : 'text-muted-foreground/30'}`}>{hasItem ? kpiItem.total_allocated_quantity : '—'}</span>
                                                </div>
                                                
                                                <div className="w-[1px] h-6 bg-primary/10" />

                                                <div className="flex flex-col items-center">
                                                    <span className={`text-[8px] font-black uppercase tracking-wider leading-tight transition-colors ${hasItem ? 'text-blue-600/50' : 'text-muted-foreground/30'}`}>PICKED</span>
                                                    <span className={`text-[10px] font-black leading-none transition-colors ${hasItem ? 'text-blue-700' : 'text-muted-foreground/30'}`}>{hasItem ? kpiItem.picked_quantity : '—'}</span>
                                                </div>

                                                <div className="w-[1px] h-6 bg-primary/10" />

                                                <div className="flex flex-col items-center">
                                                    <span className={`text-[8px] font-black uppercase tracking-wider leading-tight transition-colors ${hasItem ? 'text-primary/50' : 'text-muted-foreground/30'}`}>REMAINING</span>
                                                    <span className={`text-[10px] font-black leading-none transition-colors ${hasItem ? 'text-primary' : 'text-muted-foreground/30'}`}>{hasItem ? kpiItem.pool_remaining : '—'}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Date Info */}
                            <div className="space-y-0.5 text-right min-w-[120px] pr-8">
                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center justify-end gap-1.5 opacity-70">
                                    <Calendar size={10} /> Order Date
                                </p>
                                <p className="font-bold text-xs">{order.order_date ? formatDate(order.order_date) : "N/A"}</p>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 min-h-0 flex overflow-hidden bg-muted/5">
                    {/* LEFT COLUMN: SOURCE DATA */}
                    <div className="w-80 flex-shrink-0 border-r flex flex-col min-h-0">
                        <div className="p-4 bg-background/50 border-b flex justify-between items-center">
                            <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <ArrowRightCircle size={14} /> Available Items
                            </h4>
                            <Badge variant="outline" className="text-[10px] font-mono">
                                {currentRemaining.filter(item => {
                                    const isInDraft = receipts.some(r => !r.is_void_reference && r.items.some(i => i.product_id === item.product_id));
                                    return !isInDraft && item.order_needed > 0;
                                }).length} Products
                            </Badge>
                        </div>
                        <ScrollArea className="flex-1 min-h-0">
                            <div className="p-4 space-y-3">
                                {currentRemaining.filter(item => {
                                    // Rule 1: Remove from left column if already added to ANY REPLACEMENT receipt (ignore void reference)
                                    const isInDraft = receipts.some(r => !r.is_void_reference && r.items.some(i => i.product_id === item.product_id));
                                    if (isInDraft) return false;

                                    // Rule 2: Also hide if no more order needed (standard logic)
                                    return item.order_needed > 0;
                                }).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                        <CheckCircle size={48} className="mb-4" />
                                        <p className="text-xs font-black uppercase tracking-widest">All items allocated</p>
                                    </div>
                                ) : (
                                    currentRemaining
                                        .filter(item => {
                                            const isInDraft = receipts.some(r => !r.is_void_reference && r.items.some(i => i.product_id === item.product_id));
                                            return !isInDraft && item.order_needed > 0;
                                        })
                                        .map((item) => (
                                            <div
                                                key={item.product_id}
                                                onClick={() => setSelectedProductId(item.product_id)}
                                                className={`group relative p-4 rounded-2xl border shadow-sm transition-all duration-300 overflow-hidden cursor-pointer ${
                                                    selectedProductId === item.product_id
                                                        ? 'bg-primary/5 border-primary/40 ring-2 ring-primary/20 shadow-md'
                                                        : 'bg-card border-primary/10 hover:shadow-md hover:border-primary/30'
                                                }`}
                                            >
                                                {/* Card Background Accent */}
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />

                                                <div className="relative z-10 flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                                            <p className="text-[11px] font-black text-primary uppercase tracking-wider">{item.product_name}</p>
                                                        </div>
                                                        <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                                            Price: <span className="text-foreground font-bold">{formatCurrency(item.unit_price)}</span>
                                                        </p>
                                                    </div>
                                                    <Button
                                                        size="icon"
                                                        className="h-8 w-8 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all duration-200"
                                                        onClick={() => updateItemQty(activeReceiptId, item.product_id, item.order_needed)}
                                                    >
                                                        <Plus size={16} strokeWidth={3} />
                                                    </Button>
                                                </div>

                                                <div className="relative z-10 grid grid-cols-3 gap-3">
                                                    {/* KPI: ALLOCATED */}
                                                    <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted/30 border border-transparent group-hover:bg-background group-hover:border-primary/5 transition-colors">
                                                        <p className="text-[8px] uppercase font-black text-muted-foreground mb-1">Allocated</p>
                                                        <p className="text-sm font-black text-foreground">{item.allocated_quantity}</p>
                                                    </div>

                                                    {/* KPI: PICKED (Prominent) */}
                                                    <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-50 border border-blue-100 group-hover:shadow-sm transition-all">
                                                        <p className="text-[8px] uppercase font-black text-blue-600 mb-1">Picked</p>
                                                        <p className="text-sm font-black text-blue-700">{item.picked_quantity}</p>
                                                    </div>

                                                    {/* KPI: REMAINING (Prominent) */}
                                                    <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-primary/10 border border-primary/20 group-hover:shadow-sm transition-all">
                                                        <p className="text-[8px] uppercase font-black text-primary mb-1">Remaining</p>
                                                        <p className="text-sm font-black text-primary">{item.pool_remaining}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* RIGHT COLUMN: RECEIPTS/TABS */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <Tabs value={activeReceiptId} onValueChange={setActiveReceiptId} className="flex flex-col flex-1 min-h-0">
                            <div className="bg-background/80 border-b p-1 flex items-center gap-1 flex-shrink-0">
                                <ScrollArea className="flex-1 min-w-0">
                                    <TabsList className="bg-transparent h-9 p-0 gap-1 flex w-max">
                                        {receipts.map((r, idx) => (
                                            <TabsTrigger
                                                key={r.id}
                                                value={r.id}
                                                className={cn(
                                                    "rounded-lg h-8 data-[state=active]:shadow-md border border-primary/10 text-[10px] font-black px-4 group flex-shrink-0 flex items-center gap-2 transition-all duration-300",
                                                    r.is_void_reference
                                                        ? "bg-red-50 text-red-600 border-red-200 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:border-red-600"
                                                        : "data-[state=active]:bg-primary data-[state=active]:text-white"
                                                )}
                                            >
                                                <FileText size={12} className={cn("flex-shrink-0", r.is_void_reference && "animate-pulse")} />
                                                <span className="truncate max-w-[150px]">
                                                    {(() => {
                                                        const displayIdx = receipts.filter((rec, i) => i < idx && !rec.is_void_reference).length + 1;
                                                        return r.is_void_reference ? `VOID: ${r.receipt_no}` : (r.receipt_no || `RECEIPT ${displayIdx}`);
                                                    })()}
                                                </span>
                                                {r.is_void_reference && (
                                                    <Badge variant="destructive" className="ml-1 h-3 px-1 text-[7px] font-black uppercase tracking-tighter bg-red-600 text-white border-none">REF ONLY</Badge>
                                                )}
                                                {!r.is_void_reference && receipts.length > 1 && !(order.void_invoices && order.void_invoices.length > 0) && !order.existing_invoice_no && (
                                                    <div
                                                        className="ml-2 p-1 rounded-md hover:bg-white/20 transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeReceipt(r.id);
                                                        }}
                                                    >
                                                        <Trash2 size={12} className="text-white/70 hover:text-white" />
                                                    </div>
                                                )}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                                {!(order.void_invoices && order.void_invoices.length > 0) && !order.existing_invoice_no && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg hover:bg-primary/10 text-primary"
                                        onClick={addReceipt}
                                    >
                                        <Plus size={16} />
                                    </Button>
                                )}
                            </div>

                            {receipts.map((r) => (
                                <TabsContent key={r.id} value={r.id} className="flex-1 flex flex-col min-h-0 overflow-hidden m-0 p-0">
                                    <div className={cn(
                                        "p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4",
                                        r.is_void_reference 
                                            ? "bg-red-50/60 dark:bg-red-950/20" 
                                            : order.existing_invoice_no 
                                                ? "bg-orange-50/60 dark:bg-orange-950/20" 
                                                : "bg-muted/30"
                                    )}>
                                        <div className="flex-grow space-y-1 w-full md:w-auto">
                                            <p className={cn(
                                                "text-[10px] font-black uppercase tracking-widest",
                                                r.is_void_reference ? "text-red-500" : order.existing_invoice_no ? "text-orange-600" : "text-muted-foreground"
                                            )}>
                                                {r.is_void_reference ? "Voided Receipt No" : order.existing_invoice_no ? "Recycled Receipt No" : "Receipt No (Required)"}
                                            </p>
                                            <Input
                                                placeholder="Enter Receipt Number..."
                                                value={r.receipt_no}
                                                onChange={(e) => updateReceiptNo(r.id, e.target.value)}
                                                readOnly={!!r.is_void_reference || !!order.existing_invoice_no}
                                                className={cn(
                                                    "h-9 rounded-xl border-primary/20 focus-visible:ring-primary/40 bg-white shadow-sm font-black text-sm",
                                                    r.is_void_reference 
                                                        ? "text-red-500 border-red-300 bg-red-50 cursor-default select-none" 
                                                        : order.existing_invoice_no
                                                            ? "text-orange-600 border-orange-300 bg-orange-50 cursor-default select-none"
                                                            : ""
                                                )}
                                            />
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase text-muted-foreground">Items</p>
                                                <p className="text-sm font-black text-foreground">
                                                    {r.items.length} / {conversionData?.max_receipt_length || "—"}
                                                </p>
                                            </div>
                                            <div className="text-right border-l pl-4">
                                                <p className="text-[10px] font-black uppercase text-primary">Total Amount</p>
                                                <p className="text-sm font-black text-primary">
                                                    {formatCurrency(r.items.reduce((sum, item) => sum + item.net_amount, 0))}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-grow overflow-hidden flex flex-col">
                                        <div className="grid grid-cols-12 gap-2 p-3 bg-muted/10 border-b text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
                                            <div className="col-span-3">Product</div>
                                            <div className="col-span-1 text-center">Allocated</div>
                                            <div className="col-span-1 text-center">Unit</div>
                                            <div className="col-span-1 text-center">Qty</div>
                                            <div className="col-span-2 text-center">Price</div>
                                            <div className="col-span-2 text-center">Discount Type</div>
                                            <div className="col-span-1 text-right">Total</div>
                                            <div className="col-span-1"></div>
                                        </div>
                                        <ScrollArea className="flex-1 min-h-0">
                                            <div className="p-2 space-y-1">
                                                {r.items.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-10 opacity-30">
                                                        <Boxes size={40} className="mb-2" />
                                                        <p className="text-xs font-bold uppercase italic">Receipt is empty</p>
                                                    </div>
                                                ) : (
                                                    r.items.map((item) => (
                                                        <div 
                                                            key={item.product_id} 
                                                            onClick={() => !r.is_void_reference && setSelectedProductId(item.product_id)}
                                                            className={cn(
                                                                "grid grid-cols-12 gap-2 p-3 items-center rounded-lg border transition-all",
                                                                r.is_void_reference
                                                                    ? "bg-red-50/40 dark:bg-red-950/10 border-red-200/30 cursor-default opacity-80"
                                                                    : cn(
                                                                        "cursor-pointer",
                                                                        selectedProductId === item.product_id 
                                                                            ? 'bg-primary/5 border-primary/30 shadow-sm ring-1 ring-primary/20' 
                                                                            : 'hover:bg-muted/50 border-transparent'
                                                                    )
                                                            )}
                                                        >
                                                            <div className="col-span-3">
                                                                <p className="text-xs font-normal text-foreground line-clamp-2">{item.product_name}</p>
                                                            </div>
                                                            <div className="col-span-1 text-center">
                                                                <p className="text-xs font-normal text-foreground">{item.allocated_qty}</p>
                                                            </div>
                                                            <div className="col-span-1 text-center">
                                                                <Badge variant="outline" className="text-[9px] font-normal px-1.5 py-0 h-4 min-w-[30px] justify-center bg-primary/5 text-primary border-primary/20">
                                                                    {item.unit_shortcut}
                                                                </Badge>
                                                            </div>
                                                            <div className="col-span-1 px-1 text-center">
                                                                <Input
                                                                    type="number"
                                                                    value={item.qty}
                                                                    onChange={(e) => updateItemQty(r.id, item.product_id, parseInt(e.target.value) || 0)}
                                                                    readOnly={!!r.is_void_reference || !!order.existing_invoice_no || (!!order.void_invoices && order.void_invoices.length > 0)}
                                                                    disabled={!!r.is_void_reference || !!order.existing_invoice_no || (!!order.void_invoices && order.void_invoices.length > 0)}
                                                                    className="h-7 w-full rounded-md text-center font-normal text-[10px] p-0"
                                                                />
                                                            </div>
                                                            <div className="col-span-2 text-center px-1 flex items-center justify-center">
                                                                {isILCSupplier && !r.is_void_reference && !order.existing_invoice_no ? (
                                                                    <div className="relative group/price flex items-center justify-center w-full max-w-[110px] mx-auto">
                                                                        <span className="absolute left-2 text-[10px] font-black text-primary/40 pointer-events-none select-none">₱</span>
                                                                        <Input
                                                                            type="number"
                                                                            value={item.unit_price}
                                                                            onChange={(e) => updateItemPrice(r.id, item.product_id, parseFloat(e.target.value) || 0)}
                                                                            onFocus={(e) => e.target.select()}
                                                                            className="h-8 w-full rounded-xl text-right font-normal text-xs tabular-nums pl-6 pr-2 bg-zinc-50 border-zinc-200 focus-visible:ring-primary/20 focus-visible:border-primary/40 transition-all hover:bg-white hover:border-primary/30 shadow-sm"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-[10px] font-medium whitespace-nowrap mx-auto">{formatCurrency(item.unit_price)}</p>
                                                                )}
                                                            </div>
                                                            <div className="col-span-2 text-center">
                                                                <p className="text-[9px] font-normal uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full inline-block truncate max-w-full">
                                                                    {(() => {
                                                                        const dt = discountTypes.find(d => d.id === item.discount_type);
                                                                        return dt ? dt.discount_type : "NONE";
                                                                    })()}
                                                                </p>
                                                            </div>
                                                            <div className="col-span-1 text-right">
                                                                <p className="text-[10px] font-normal text-primary whitespace-nowrap">{formatCurrency(item.net_amount)}</p>
                                                            </div>
                                                            <div className="col-span-1 flex justify-center">
                                                                {!r.is_void_reference && !order.existing_invoice_no && !(order.void_invoices && order.void_invoices.length > 0) && (
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                                        onClick={() => removeItemFromReceipt(r.id, item.product_id)}
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-muted/30 border-t flex flex-col sm:flex-row justify-end gap-3 flex-shrink-0">
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            className="flex-1 sm:flex-none h-11 rounded-xl font-bold uppercase text-[10px] tracking-widest bg-amber-500/5 border-amber-500/20 text-amber-600 hover:bg-amber-500 hover:text-white transition-all duration-300"
                            onClick={() => setIsHoldConfirmOpen(true)}
                        >
                            <Lock className="h-3.5 w-3.5 mr-2" /> Hold Order
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 sm:flex-none h-11 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-primary hover:text-white transition-all duration-300"
                            onClick={handlePreviewReceipt}
                            disabled={isValidating}
                        >
                            {isValidating ? (
                                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                            ) : (
                                <Eye className="h-3.5 w-3.5 mr-2" />
                            )}
                            Preview Receipt
                        </Button>
                        <Button
                            className="w-full sm:w-auto h-11 px-10 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-300 bg-gradient-to-r from-primary to-primary/80"
                            onClick={handlePrint}
                            disabled={isValidating}
                        >
                            {isValidating ? (
                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            ) : (
                                <Printer className="h-3.5 w-3.5 mr-2" />
                            )}
                            Print Receipt
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* RECEIPT PREVIEW MODAL */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogContent showCloseButton={false} className={cn("max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl bg-zinc-100 dark:bg-zinc-950 flex flex-col", previewDialogWidthClass)}>
                <DialogTitle className="sr-only">Receipt Preview</DialogTitle>
                <DialogHeader className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 flex flex-row items-center justify-between flex-shrink-0">
                    <DialogTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Eye size={14} className="text-primary" />
                        </div>
                        Receipt Preview
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1 min-h-0 bg-zinc-100/50 dark:bg-zinc-900/30 overflow-y-auto overflow-x-hidden">
                        <style>
                            {`
                                @page { size: ${isOfficialReceipt ? "210mm 265mm" : "58mm auto"}; margin: 0; }
                                @media print {
                                    .receipt-print-area { 
                                        padding: 0.2in !important; 
                                        width: ${previewPaperWidth} !important; 
                                        ${isOfficialReceipt ? `height: ${previewPaperHeight} !important;` : "height: auto !important;"}
                                        font-family: 'Courier New', Courier, monospace !important;
                                        color: #000 !important;
                                        background: #fff !important;
                                        line-height: 1.2 !important;
                                        -webkit-print-color-adjust: exact;
                                    }
                                    .header-container { position: relative; width: 100%; height: 4.3in; margin-bottom: 0in; overflow: hidden; }
                                    .header-row { position: absolute; width: 100%; font-weight: normal; font-size: 11pt; white-space: nowrap; overflow: hidden; }
                                    .row-1 { top: 2.45in; }
                                    .row-2 { top: 2.78in; }
                                    .row-3 { top: 3.13in; }
                                    .row-4 { top: 3.48in; }
                                    .indent-left-sm { padding-left: 0.8in; }
                                    .indent-left-md { padding-left: 1.3in; }
                                    .indent-left-lg { padding-left: 1.8in; }
                                    .text-right-aligned { float: right; padding-right: 0.3in; text-align: right; }
                                    .barcode-pos { position: absolute; top: 0; right: 0.2in; }
                                    .totals-table td, .totals-table th, table, tr, th, td { 
                                        border: none !important; 
                                        outline: none !important;
                                        box-shadow: none !important;
                                    }
                                    th { border: none !important; }
                                    .table-container { padding-top: 0 !important; margin-top: -0.16in !important; }
                                    .totals-section { margin-top: 0.2in !important; }
                                    
                                    /* Force Left Alignment for Thermal to avoid clipping on driver mismatch */
                                    @media print {
                                        @page { 
                                            margin: 0 !important; 
                                            size: 58mm auto; /* Explicit width to counter driver, auto height to prevent extra feed at bottom */
                                        }
                                        html, body { 
                                            margin: 0 !important; 
                                            padding: 0 !important; 
                                            /* Let the driver width be whatever it is (e.g. 72mm), we just stay on the extreme left */
                                            width: 100% !important; 
                                            text-align: left !important;
                                        }
                                        #receipt-print-area, .thermal-paper-sheet { 
                                            float: left !important;
                                            margin: 0 !important; /* Strip auto-centering that causes the huge left shift */
                                        }
                                        .thermal-receipt-area {
                                            float: left !important;
                                            margin: 0 !important;
                                        }
                                    }

                                    .thermal-paper-sheet {
                                        width: 58mm !important;
                                        height: auto !important;
                                        padding: 0 !important;
                                        margin: 0 auto !important;
                                        background: #fff !important;
                                    }
                                    .thermal-receipt-area {
                                        width: 50mm !important;
                                        height: auto !important;
                                        padding: 0 !important; /* Removed bottom padding as requested (0mm) */
                                        font-family: 'Consolas', 'Courier New', Courier, monospace !important;
                                        font-size: 9.5pt !important;
                                        font-weight: 400 !important;
                                        line-height: 1.15 !important;
                                        margin: 0 !important; /* Strict Left to avoid driver centering */
                                        letter-spacing: -0.2px !important;
                                        text-align: left !important;
                                    }
                                    .thermal-divider {
                                        border-top: 1px dashed #000 !important;
                                        margin: 2mm 0 !important;
                                    }
                                }

                                /* Preview Styles - Strict Border Free */
                                .header-container { position: relative; width: 100%; height: 3.7in; margin-bottom: 0in; overflow: hidden; }
                                .header-row { position: absolute; width: 100%; font-weight: normal; font-size: 11pt; white-space: nowrap; overflow: hidden; }
                                .row-1 { top: 2.15in; }
                                .row-2 { top: 2.43in; }
                                .row-3 { top: 2.71in; }
                                .row-4 { top: 2.99in; }
                                .indent-left-sm { padding-left: 0.8in; }
                                .indent-left-md { padding-left: 1.3in; }
                                .indent-left-lg { padding-left: 1.8in; }
                                .text-right-aligned { float: right; padding-right: 0.3in; text-align: right; }
                                .barcode-pos { position: absolute; top: 0in; right: 0.3in; }
                                .table-right-col { padding-right: 0.3in !important; text-align: right !important; }
                                    font-weight: normal; 
                                }
                                .table-container { padding-top: 0; margin-top: -0.16in; }
                                .totals-table { width: 100%; border-collapse: collapse; }
                                .totals-section { margin-top: 0.2in; }
                                .preview-shell { display: flex; justify-content: center; align-items: flex-start; padding: 48px 24px; width: 100%; min-height: 100%; box-sizing: border-box; }
                                .preview-sheet { box-shadow: 0 18px 48px rgba(0, 0, 0, 0.18); position: relative; }
                                .template-field { position: absolute; border: 1px dashed transparent; white-space: nowrap; pointer-events: none; }
                                .thermal-preview-sheet { width: 58mm; box-shadow: 0 18px 48px rgba(0, 0, 0, 0.18); }
                                .thermal-divider { border-top: 1px dashed #000; margin: 3mm 0; }
                                .thermal-pre {
                                    white-space: pre-wrap;
                                    word-break: break-word;
                                    margin: 0;
                                    font-size: 10px;
                                    line-height: 1.15;
                                    letter-spacing: -0.2px;
                                    font-weight: normal;
                                }
                            `}
                        </style>
                        <div className="preview-shell flex-col gap-8">
                            {isOfficialReceipt ? (
                                receipts.filter(r => !r.is_void_reference).map((currentReceipt, receiptIdx, filteredArray) => (
                                <div
                                    key={currentReceipt.id}
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}
                                >
                                    {filteredArray.length > 1 && (
                                        <div className="mb-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-normal uppercase tracking-widest text-primary">
                                            {`Receipt ${receiptIdx + 1} of ${filteredArray.length} — ${currentReceipt.receipt_no}`}
                                        </div>
                                    )}
                                <div 
                                    ref={receiptIdx === 0 ? componentRef : undefined} 
                                    id={receiptIdx === 0 ? "receipt-print-area" : `receipt-print-area-${receiptIdx}`}
                                    className="receipt-print-area preview-sheet px-0 py-0 text-zinc-900 font-mono tracking-tight bg-white overflow-hidden" 
                                    style={{ 
                                        width: `${orTemplate?.width || 210}mm`, 
                                        height: `${orTemplate?.height || 265}mm`, 
                                        boxSizing: 'border-box', 
                                        flexShrink: 0 
                                    }}
                                >
                                    {orTemplate?.backgroundImage && (
                                        <Image 
                                            src={InvoicingService.getImageUrl(orTemplate.backgroundImage)} 
                                            className="absolute inset-0 w-full h-full object-fill opacity-70 pointer-events-none" 
                                            alt="Template Background" 
                                            fill
                                            unoptimized
                                        />
                                    )}

                                    {/* Dynamic Fields Rendering */}
                                    {(() => {
                                        const fullName = conversionData?.customer?.customer_name || 'N/A';
                                        const storeName = conversionData?.customer?.store_name || fullName;
                                        const grossTotal = currentReceipt.items.reduce((s, i) => s + (i.unit_price * i.qty), 0) || 0;
                                        const discountTotal = currentReceipt.items.reduce((s, i) => s + i.discount_amount, 0) || 0;
                                        const netTotal = grossTotal - discountTotal;
                                        const vatableSales = netTotal / 1.12;
                                        const vatAmount = netTotal - vatableSales;

                                        const fieldValues: Record<string, string> = {
                                            customer_name: fullName.toUpperCase(),
                                            date: format(new Date(), "MMM dd, yyyy").toUpperCase(),
                                            store_name: storeName.toUpperCase(),
                                            payment_name: (conversionData?.payment_name || "N/A").toUpperCase(),
                                            customer_tin: conversionData?.customer?.customer_tin || 'N/A',
                                            address: `${conversionData?.customer?.province || 'N/A'}, ${conversionData?.customer?.city || 'N/A'}, ${conversionData?.customer?.brgy || 'N/A'}`.toUpperCase(),
                                            vatable_sales: formatCurrency(vatableSales),
                                            vat_amount: formatCurrency(vatAmount),
                                            gross_total: formatCurrency(grossTotal),
                                            discount_total: formatCurrency(discountTotal),
                                            net_total: formatCurrency(netTotal),
                                            po_no: `PO NO. : ${order.po_no || ""}`,
                                            salesman: `SALESMAN : ${order.salesman_id?.salesman_name || "N/A"}`,
                                            total_amount_due: formatCurrency(netTotal),
                                            net_total_footer: formatCurrency(netTotal),
                                            zero_rated: "0.00",
                                            exempt: "0.00",
                                            withholding_tax: "0.00"
                                        };

                                        return (
                                            <>
                                                {/* Specialized Barcode rendering - Synced with Template Designer */}
                                                {( !orTemplate?.fields?.barcode?.hidden || !orTemplate?.fields?.barcode?.hideBarcodeText ) && (
                                                    <div className="template-field" style={{ 
                                                        left: orTemplate?.fields?.barcode ? `${orTemplate.fields.barcode.x}mm` : 'auto',
                                                        right: orTemplate?.fields?.barcode ? 'auto' : '0.3in', 
                                                        top: orTemplate?.fields?.barcode ? `${orTemplate.fields.barcode.y}mm` : '0.1in',
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        width: orTemplate?.fields?.barcode?.barcodeModuleWidth ? 'auto' : 'auto',
                                                        pointerEvents: 'none',
                                                        zIndex: 20
                                                    }}>
                                                        <div className="inline-block text-center">
                                                            {!orTemplate?.fields?.barcode?.hidden ? (
                                                                <Barcode
                                                                    value={currentReceipt.receipt_no || "N/A"}
                                                                    height={(orTemplate?.fields?.barcode?.barcodeHeight ?? 9) * 3.78}
                                                                    width={(orTemplate?.fields?.barcode?.barcodeModuleWidth ?? 0.35) * 3.78}
                                                                    fontSize={orTemplate?.fields?.barcode?.fontSize ?? 10}
                                                                    displayValue={!orTemplate?.fields?.barcode?.hideBarcodeText}
                                                                    fontOptions={orTemplate?.fields?.barcode?.fontWeight || 'normal'}
                                                                    margin={0}
                                                                    background="transparent"
                                                                    renderer="canvas"
                                                                />
                                                            ) : (
                                                                <div 
                                                                    style={{ 
                                                                        fontSize: `${orTemplate?.fields?.barcode?.fontSize ?? 10}pt`,
                                                                        fontFamily: 'monospace',
                                                                        fontWeight: orTemplate?.fields?.barcode?.fontWeight || 'normal'
                                                                    }}
                                                                >
                                                                    {!orTemplate?.fields?.barcode?.hideBarcodeText && (currentReceipt.receipt_no || "N/A")}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Render template defined fields */}
                                                {orTemplate ? (
                                                    Object.entries(orTemplate.fields).map(([key, config]) => {
                                                        const val = fieldValues[key];
                                                        if (!val || key === 'barcode' || config.hidden) return null;
                                                        return (
                                                            <div 
                                                                key={key} 
                                                                className="template-field"
                                                                style={{
                                                                    left: `${config.x}mm`,
                                                                    top: `${config.y}mm`,
                                                                    width: config.maxWidth ? `${config.maxWidth}mm` : 'auto',
                                                                    fontSize: `${config.fontSize}pt`,
                                                                    fontFamily: config.fontFamily === 'courier' ? 'monospace' : config.fontFamily,
                                                                    fontWeight: config.fontWeight || 'normal',
                                                                    lineHeight: config.lineHeight ?? 1.2,
                                                                    letterSpacing: `${config.charSpacing ?? 0}pt`,
                                                                    transform: `scaleX(${config.scaleX ?? 1})`,
                                                                    transformOrigin: 'left center',
                                                                    whiteSpace: config.maxWidth ? 'pre-wrap' : 'nowrap'
                                                                }}
                                                            >
                                                                {val}
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    /* Fallback for no template */
                                                    <div className="p-8 text-center text-muted-foreground italic">
                                                        No template layout configured.
                                                    </div>
                                                )}

                                                {/* Table Rendering */}
                                                <div 
                                                    className="template-field w-full" 
                                                    style={{ 
                                                        left: 0, 
                                                        top: `${orTemplate?.tableSettings?.startY || 65}mm` 
                                                    }}
                                                >
                                                    <div className="w-full">
                                                        {(currentReceipt.items || []).map((item, idx) => {
                                                            const tableSet = orTemplate?.tableSettings;
                                                            const rowHeight = tableSet?.rowHeight || 12.2;
                                                            const fontSize = tableSet?.fontSize || 10;
                                                            const cols = tableSet?.columns;
                                                            
                                                            // Standardized widths to match designer assumptions
                                                            const w = {
                                                                product_name: 85,
                                                                quantity: 22,
                                                                unit_price: 28,
                                                                discount: 25,
                                                                net_amount: 30
                                                            };

                                                            return (
                                                                <div 
                                                                    key={idx} 
                                                                    className="relative w-full flex items-center" 
                                                                    style={{ 
                                                                        minHeight: `${rowHeight}mm`,
                                                                        fontFamily: 'monospace',
                                                                        fontSize: `${fontSize}pt`,
                                                                        padding: '1mm 0' // Small padding for breathability
                                                                    }}
                                                                >
                                                                    {/* Left Aligned (Relative to push container height) */}
                                                                    <div 
                                                                        className="relative font-normal uppercase whitespace-normal leading-[1.1]" 
                                                                        style={{ 
                                                                            marginLeft: `${cols?.product_name?.x || 10}mm`, 
                                                                            width: `${orTemplate?.tableSettings?.product_name_width || w.product_name}mm` 
                                                                        }}
                                                                    >
                                                                        {item.product_name}
                                                                    </div>
                                                                    
                                                                    {/* Center Aligned: Vertical Center using Absolute trick */}
                                                                    <div 
                                                                        className="absolute font-normal text-center top-1/2 -translate-y-1/2" 
                                                                        style={{ left: `${(cols?.quantity?.x || 105) - (w.quantity / 2)}mm`, width: `${w.quantity}mm` }}
                                                                    >
                                                                        {item.qty} {item.unit_shortcut}
                                                                    </div>
                                                                    
                                                                    {/* Right Aligned: Vertical Center using Absolute trick */}
                                                                    <div 
                                                                        className="absolute font-normal text-right top-1/2 -translate-y-1/2" 
                                                                        style={{ left: `${(cols?.unit_price?.x || 126) - w.unit_price}mm`, width: `${w.unit_price}mm` }}
                                                                    >
                                                                        {formatCurrency(item.unit_price)}
                                                                    </div>
                                                                    
                                                                    <div 
                                                                        className="absolute font-normal text-right uppercase top-1/2 -translate-y-1/2" 
                                                                        style={{ left: `${(cols?.discount?.x || 153) - w.discount}mm`, width: `${w.discount}mm` }}
                                                                    >
                                                                        {(() => {
                                                                            const dt = discountTypes.find(d => d.id === item.discount_type);
                                                                            if (dt) return dt.discount_type;
                                                                            return isOfficialReceipt ? "" : "NONE";
                                                                        })()}
                                                                    </div>
                                                                    
                                                                    <div 
                                                                        className="absolute font-normal text-right top-1/2 -translate-y-1/2" 
                                                                        style={{ left: `${(cols?.net_amount?.x || 184) - w.net_amount}mm`, width: `${w.net_amount}mm` }}
                                                                    >
                                                                        {formatCurrency(item.net_amount)}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                                </div>
                                ))
                            ) : (
                                <div
                                    ref={componentRef}
                                    id="receipt-print-area"
                                    className="receipt-print-area thermal-paper-sheet thermal-preview-sheet bg-white text-zinc-900 font-mono"
                                    style={{ boxSizing: "border-box", flexShrink: 0, width: thermalPaperWidth }}
                                >
                                    <div
                                        className="thermal-receipt-area"
                                        style={{ boxSizing: "border-box", width: thermalContentWidth }}
                                    >
                                        <div className="flex justify-start py-2">
                                            <Image 
                                                src="/men2.png" 
                                                alt="MEN2 Logo" 
                                                className="w-[45mm] max-w-full h-auto object-contain grayscale" 
                                                width={170}
                                                height={60}
                                            />
                                        </div>

                                        <pre className="thermal-pre">{thermalTextLines.join("\n")}</pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 flex-shrink-0">
                        {isOfficialReceipt && (
                            <Button 
                                variant="outline" 
                                className="flex-1 h-11 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 transition-all duration-200" 
                                onClick={() => setIsTemplateEditorOpen(true)}
                            >
                                <Settings2 className="w-4 h-4 mr-2" />
                                Configure Layout
                            </Button>
                        )}
                        <div className="flex flex-1 gap-3">
                            <Button 
                                variant="secondary" 
                                className="w-full h-11 rounded-xl font-bold text-[10px] uppercase tracking-[0.15em] bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 transition-all duration-200" 
                                onClick={() => setIsPreviewOpen(false)}
                            >
                                Close Preview
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ReceiptTemplateEditor 
                isOpen={isTemplateEditorOpen}
                initialTemplate={orTemplate}
                onClose={() => setIsTemplateEditorOpen(false)}
                onSave={async (newTemplate) => {
                    try {
                        const typeId = order?.receipt_type?.id;
                        if (!typeId) {
                            toast.error("Cannot save template: Receipt Type ID is missing.");
                            return;
                        }
                        await InvoicingService.saveTemplate(typeId, newTemplate);
                        setOrTemplate(newTemplate);
                        setIsTemplateEditorOpen(false);
                        toast.success("Template saved successfully to database");
                    } catch (err) {
                        console.error("Failed to save template:", err);
                        toast.error("Failed to save template to database");
                    }
                }}
            />

            {/* HOLD ORDER CONFIRMATION DIALOG */}
            <Dialog open={isHoldConfirmOpen} onOpenChange={setIsHoldConfirmOpen}>
                <DialogContent className="sm:max-w-[400px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
                    <DialogTitle className="sr-only">Confirm Hold Order</DialogTitle>
                    <div className="bg-amber-500 p-6 flex flex-col items-center text-white">
                        <div className="bg-white/20 p-4 rounded-full mb-4">
                            <Lock size={32} className="text-white" />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-widest">Hold Order?</h3>
                        <p className="text-amber-50 text-center text-xs mt-2 font-medium">Are you sure you want to place this order on hold? This will move it out of the invoicing list.</p>
                    </div>
                    <div className="p-6 bg-white flex flex-col gap-3">
                        <Button 
                            className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                            onClick={handleHoldOrder}
                            disabled={isHolding}
                        >
                            {isHolding ? (
                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            ) : null}
                            Confirm Hold
                        </Button>
                        <Button 
                            variant="ghost" 
                            className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest text-muted-foreground hover:bg-muted"
                            onClick={() => setIsHoldConfirmOpen(false)}
                            disabled={isHolding}
                        >
                            Cancel
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Print Confirmation Dialog */}
            <Dialog open={isPrintConfirmOpen} onOpenChange={setIsPrintConfirmOpen}>
                <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
                    <DialogTitle className="sr-only">Confirm Print Receipt</DialogTitle>
                    <div className="bg-primary p-6 flex flex-col items-center text-white">
                        <div className="bg-white/20 p-4 rounded-full mb-4">
                            <Printer size={32} className="text-white" />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-widest">Confirm Print?</h3>
                        <p className="text-primary-foreground/80 text-center text-xs mt-2 font-medium">
                            You are about to generate <span className="font-bold text-white">
                                {receipts.filter(r => !r.is_void_reference).length} invoice(s)
                            </span>. This will update the order and is irreversible.
                        </p>
                    </div>

                    <div className="p-6 bg-white dark:bg-zinc-950 flex flex-col gap-4">
                        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Total Amount</span>
                                <span className="font-black text-primary text-xl tracking-tighter">
                                    ₱{receipts
                                        .filter(r => !r.is_void_reference)
                                        .reduce((sum, r) => sum + r.items.reduce((iSum, item) => iSum + item.net_amount, 0), 0)
                                        .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Button 
                                className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95"
                                onClick={executePrint}
                            >
                                Confirm & Print
                            </Button>
                            <Button 
                                variant="ghost" 
                                className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest text-muted-foreground hover:bg-muted"
                                onClick={() => setIsPrintConfirmOpen(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
