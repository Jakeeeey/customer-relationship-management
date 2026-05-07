"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SalesInvoiceHeader, SalesInvoiceDetail, LinkedDocument, SalesReturn, SearchProduct, Salesman, CustomerMemo } from '../types';
import { siteSalesPostingProvider } from '../providers/fetchProvider';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

import {
    ChevronLeft,
    FileText,
    User,
    MapPin,
    Plus,
    CheckCircle2,
    PlusCircle,
    RotateCw,
    Link2,
    Search,
    Trash
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { SiteSalesAddProductModal } from './SiteSalesAddProductModal';

interface SiteSalesDetailsProps {
    id: string;
}

export const SiteSalesDetails: React.FC<SiteSalesDetailsProps> = ({ id }) => {
    const router = useRouter();
    const [header, setHeader] = useState<SalesInvoiceHeader | null>(null);
    const [details, setDetails] = useState<SalesInvoiceDetail[]>([]);
    const [linkedDocs, setLinkedDocs] = useState<LinkedDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [activeTab, setActiveTab] = useState('items');

    // Return Linking States
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [availableReturns, setAvailableReturns] = useState<SalesReturn[]>([]);
    const [isFetchingReturns, setIsFetchingReturns] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    const [isItemsModified, setIsItemsModified] = useState(false);

    // Initial Financials (from DB)
    const [initialVat, setInitialVat] = useState(0);
    const [initialGross, setInitialGross] = useState(0);
    const [initialDiscount, setInitialDiscount] = useState(0);
    const [initialNet, setInitialNet] = useState(0);

    // Memo Linking States
    const [isMemoLinkModalOpen, setIsMemoLinkModalOpen] = useState(false);
    const [availableMemos, setAvailableMemos] = useState<CustomerMemo[]>([]);
    const [isFetchingMemos, setIsFetchingMemos] = useState(false);
    const [returnSearch, setReturnSearch] = useState('');



    const { computedGross, computedDiscount, computedVat, computedNet, returnAmount, creditMemoAmount, debitMemoAmount, balance, isVatApplicable } = React.useMemo(() => {
        const g = details.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unit_price)), 0);
        const d = details.reduce((acc, item) => acc + Number(item.discount_amount || 0), 0);
        const net = g - d;
        const invoiceTypeId = (header?.invoice_type as { id?: number })?.id || header?.invoice_type;
        const invoiceTypeName = (header?.invoice_type as { type?: string })?.type || "";

        // Hide VAT if ID is 3 OR the type name is "Delivery Receipt"
        const isVatApplicable = Number(invoiceTypeId) !== 3 && invoiceTypeName !== "Delivery Receipt";
        const v = isVatApplicable ? (net / 1.12) * 0.12 : 0; // VAT-Inclusive calculation (12%)

        // Sum of all linked returns
        const r = linkedDocs
            .filter(doc => doc.type === "RETURN")
            .reduce((acc, doc) => acc + Number(doc.amount), 0);

        // Sum of all linked memos
        const cm = linkedDocs
            .filter(doc => doc.type === "MEMO" && !(doc.memo_type_id === 2 || doc.balance_name === "DEBIT"))
            .reduce((acc, doc) => acc + Number(doc.amount), 0);

        const dm = linkedDocs
            .filter(doc => doc.type === "MEMO" && (doc.memo_type_id === 2 || doc.balance_name === "DEBIT"))
            .reduce((acc, doc) => acc + Number(doc.amount), 0);

        const b = (isItemsModified ? net : initialNet) - r - cm + dm;

        return {
            computedGross: g,
            computedDiscount: d,
            computedVat: v,
            computedNet: net,
            returnAmount: r,
            creditMemoAmount: cm,
            debitMemoAmount: dm,
            balance: b,
            isVatApplicable
        };
    }, [details, linkedDocs, isItemsModified, initialNet, header?.invoice_type]);

    // Display values (Use initial if not modified)
    const displayGross = isItemsModified ? computedGross : initialGross;
    const displayDiscount = isItemsModified ? computedDiscount : initialDiscount;
    const displayVat = isItemsModified ? computedVat : initialVat;
    const displayTotal = isItemsModified ? computedNet : initialNet;

    // Add Product States
    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
    const [mainSupplierId, setMainSupplierId] = useState<number | null>(null);
    const [searchProducts, setSearchProducts] = useState<SearchProduct[]>([]);
    const [isSearchingProducts, setIsSearchingProducts] = useState(false);
    const [suppliers, setSuppliers] = useState<{ id: number; supplier_name: string; supplier_shortcut?: string }[]>([]);
    const [currentModalSupplierId, setCurrentModalSupplierId] = useState<number | string | null>(null);
    const [deletedDetailIds, setDeletedDetailIds] = useState<number[]>([]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await siteSalesPostingProvider.getInvoiceDetails(id);
            setHeader(data.header);
            setDetails(data.details);
            setLinkedDocs(data.linkedDocs || []);
            setMainSupplierId(data.main_supplier_id || null);

            // Set Initial Financials for Read-only/No-change scenarios
            setInitialVat(Number(data.header.vat_amount || 0));
            setInitialGross(Number(data.header.gross_amount || 0));
            setInitialDiscount(Number(data.header.discount_amount || 0));
            setInitialNet(Number(data.header.net_amount || data.header.total_amount || 0));
            setIsItemsModified(false);

            // Fetch Suppliers for modal
            const sData = await siteSalesPostingProvider.getSuppliers();
            setSuppliers(sData);
        } catch (error) {
            console.error("Failed to fetch invoice details:", error);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    const handleFinalize = async () => {
        if (!header) return;
        setIsSaving(true);
        try {
            // 1. Save Header & Details adjustments ONLY if modified
            if (isItemsModified) {
                console.log("[SiteSalesDetails] Saving items modification before finalize");
                await siteSalesPostingProvider.saveAdjustments(id, {
                    customer_code: header.customer_code,
                    order_id: header.invoice_no,
                    invoice_date: header.invoice_date,
                    due_date: header.due_date,
                    remarks: header.remarks,
                    gross_amount: displayGross,
                    discount_amount: displayDiscount,
                    vat_amount: displayVat,
                    total_amount: displayTotal,
                    net_amount: displayTotal,
                    details: details,
                    deletedDetailIds: deletedDetailIds
                });
            } else {
                console.log("[SiteSalesDetails] No item changes, proceeding to metadata finalize only");
                // Optional: We can still update header metadata (remarks, dates) if they changed
                // For now, following user's rule: only dispatch_date, status, modified_by, isDispatched
            }

            // 2. Finalize settlement (isDispatched = 1, dispatch_date = now)
            await siteSalesPostingProvider.finalizeSettlement([id]);

            toast.success("Invoice finalized successfully!");
            // Reset deleted IDs after success
            setDeletedDetailIds([]);
            router.push('/crm/site-sales-management/site-sales-posting');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to finalize invoice";
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenLinkModal = async () => {
        if (!header?.customer_code) return;
        setIsLinkModalOpen(true);
        setIsFetchingReturns(true);
        try {
            const data = await siteSalesPostingProvider.getAvailableReturns(header.customer_code);
            setAvailableReturns(data);
        } catch {
            toast.error("Failed to fetch available returns");
        } finally {
            setIsFetchingReturns(false);
        }
    };

    const handleOpenMemoLinkModal = async () => {
        if (!header?.customer_code) return;
        setIsMemoLinkModalOpen(true);
        setIsFetchingMemos(true);
        try {
            const data = await siteSalesPostingProvider.getAvailableMemos(header.customer_code, id);
            setAvailableMemos(data);
        } catch {
            toast.error("Failed to fetch available memos");
        } finally {
            setIsFetchingMemos(false);
        }
    };

    const handleLinkMemo = async (memo: CustomerMemo) => {
        const availableAmount = Number(memo.amount) - Number(memo.applied_amount);
        const memoType = (memo.type && typeof memo.type === 'object') ? (memo.type as { id: number }).id : memo.type;
        const isCredit = memoType === 1 || memo.balance_name === "CREDIT";
        const isDebit = memoType === 2 || memo.balance_name === "DEBIT";

        // USER RULE: CREDIT memo cannot exceed current summary balance
        // DEBIT memos (Type 2) are exempt since they add to the balance
        if (isCredit && availableAmount > balance) {
            toast.error("Linking failed: This credit memo exceeds the remaining invoice balance.");
            return;
        }

        setIsLinking(true);
        try {
            await siteSalesPostingProvider.linkMemo(id, memo.id, availableAmount, balance);
            toast.success(`${isDebit ? 'Debit' : 'Credit'} Memo ${memo.memo_number} linked successfully!`);
            setIsMemoLinkModalOpen(false);
            fetchData(); // Refresh list
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to link memo";
            toast.error(message);
        } finally {
            setIsLinking(false);
        }
    };


    const handleOpenAddProductModal = async () => {
        const salesman = header?.salesman_id as Salesman | undefined;
        const priceTypeId = salesman?.price_type_id;
        if (!priceTypeId) {
            toast.error("Salesman price type not found");
            return;
        }

        // Extract branch ID properly with type safety
        let branchId: number | string | null = null;
        const rawBranch = header?.branch_id;
        if (rawBranch) {
            if (typeof rawBranch === 'object') {
                branchId = (rawBranch as { id: number | string }).id;
            } else {
                branchId = rawBranch as number | string;
            }
        }

        console.log(`[SiteSalesDebug] Opening Modal - BranchID: ${branchId}, PriceTypeID: ${priceTypeId}, SupplierID: ${mainSupplierId}`);

        setIsAddProductModalOpen(true);
        setCurrentModalSupplierId(mainSupplierId || "");
        setIsSearchingProducts(true);
        try {
            const data = await siteSalesPostingProvider.searchProducts({
                search: "",
                priceTypeId,
                priceType: header?.price_type,
                supplierId: mainSupplierId as unknown as number,
                branchId,
                customerCode: header?.customer_code
            });
            console.log(`[SiteSalesDebug] Search Results Count: ${data.length}`);
            setSearchProducts(data);
        } catch {
            toast.error("Failed to fetch available products");
        } finally {
            setIsSearchingProducts(false);
        }
    };

    const handleSupplierChange = async (supplierId: string | number) => {
        const salesman = header?.salesman_id as Salesman | undefined;
        const priceTypeId = salesman?.price_type_id;
        if (!priceTypeId) return;

        let branchId: number | string | null = null;
        const rawBranch = header?.branch_id;
        if (rawBranch) {
            branchId = typeof rawBranch === 'object' ? (rawBranch as { id: number | string }).id : rawBranch;
        }

        setCurrentModalSupplierId(supplierId);
        setIsSearchingProducts(true);
        try {
            const data = await siteSalesPostingProvider.searchProducts({
                search: "",
                priceTypeId,
                priceType: header?.price_type,
                supplierId: supplierId === "all" ? ("all" as unknown as number) : Number(supplierId),
                branchId,
                customerCode: header?.customer_code
            });
            setSearchProducts(data);
        } catch {
            toast.error("Failed to refresh products for this supplier");
        } finally {
            setIsSearchingProducts(false);
        }
    };

    const handleAddProducts = (newItems: SalesInvoiceDetail[]) => {
        // Track items removed via the modal
        const removed = details.filter(old =>
            old.detail_id && !newItems.find(n => n.detail_id === old.detail_id)
        );

        if (removed.length > 0) {
            const removedIds = removed.map(r => Number(r.detail_id)).filter(id => !isNaN(id));
            setDeletedDetailIds(prev => [...prev, ...removedIds]);
        }

        setDetails(newItems); // Entire list replaced
        setIsItemsModified(true);
        toast.success(`Items updated successfully`);
    };

    // Delete a line item and store its ID for backend removal
    const handleDeleteItem = (detailId?: number) => {
        // Always remove from UI
        setDetails(prev => prev.filter(d => d.detail_id !== detailId));
        // If it exists in DB, track for backend deletion
        if (detailId) {
            setDeletedDetailIds(prev => [...prev, detailId]);
        }
        setIsItemsModified(true);
        toast.success('Item removed');
    };

    const handleLinkReturn = async (ret: SalesReturn) => {
        setIsLinking(true);
        try {
            await siteSalesPostingProvider.linkReturn(id, ret.return_id, ret.total_amount);
            toast.success(`Return ${ret.return_number} linked successfully!`);
            setIsLinkModalOpen(false);
            fetchData(); // Refresh list
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to link return";
            toast.error(message);
        } finally {
            setIsLinking(false);
        }
    };

    const handleUnlinkReturn = async (junctionId: number) => {
        setIsLinking(true);
        try {
            await siteSalesPostingProvider.unlinkReturn(junctionId);
            toast.success(`Return unlinked successfully!`);
            fetchData(); // Refresh list
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to unlink return";
            toast.error(message);
        } finally {
            setIsLinking(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-64 col-span-2" />
                    <Skeleton className="h-64" />
                </div>
            </div>
        );
    }

    if (!header) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold">Invoice Not Found</h2>
                <Button variant="link" onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }


    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 bg-slate-50/50 dark:bg-[#020617] dark:bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] dark:from-slate-900/20 dark:via-slate-950 dark:to-slate-950 min-h-screen transition-colors duration-300 relative overflow-hidden">
            {/* Subtle background glow for premium feel */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-6">
                {/* Header Section */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary rounded-xl shadow-lg shadow-primary/20">
                                <FileText className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Invoice #{header.invoice_no}</h1>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border shadow-sm">
                        <div className="px-3 py-1 border-r last:border-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Date</p>
                            <div className="flex items-center">
                                <Input
                                    type="date"
                                    className="h-6 w-28 p-0 border-none bg-transparent font-bold text-slate-700 dark:text-slate-300 text-[11px] focus-visible:ring-0"
                                    value={header.invoice_date ? format(parseISO(header.invoice_date), 'yyyy-MM-dd') : ''}
                                    onChange={(e) => header && setHeader({ ...header, invoice_date: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="px-3 py-1 border-r last:border-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Due</p>
                            <div className="flex items-center">
                                <Input
                                    type="date"
                                    className="h-6 w-28 p-0 border-none bg-transparent font-bold text-slate-700 dark:text-slate-300 text-[11px] focus-visible:ring-0"
                                    value={header.due_date ? format(parseISO(header.due_date), 'yyyy-MM-dd') : ''}
                                    onChange={(e) => header && setHeader({ ...header, due_date: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Section - Info Grid (Full Width) */}
                <Card className="border-none shadow-sm dark:bg-slate-900">
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-6">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Store</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input readOnly value={header.customer_name || header.customer_code || ''} className="h-10 bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-700 dark:text-slate-200" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Code</label>
                                <Input readOnly value={header.customer_code || ''} className="h-10 bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-400" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salesman</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input readOnly value={header.salesman_id?.salesman_name || header.salesman_name || ''} className="h-10 pl-10 bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-700 dark:text-slate-200" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Branch</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input readOnly value={header.branch_id?.branch_name || ''} className="h-10 pl-10 bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-400" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sales Type</label>
                                <Input readOnly value={header.sales_type === 3 ? 'SITE SALES' : 'OTHERS'} className="h-10 bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-700 dark:text-slate-200" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Price Type</label>
                                <Input readOnly value={header.price_type || 'B'} className="h-10 bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-700 dark:text-slate-200" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt Type</label>
                                <Input
                                    readOnly
                                    value={(header.invoice_type && typeof header.invoice_type === 'object') ? (header.invoice_type as unknown as { type?: string }).type : 'DIRECT SALES'}
                                    className="h-10 bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-700 dark:text-slate-200"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dispatch Date</label>
                                <div className="relative">
                                    <Input readOnly value={header.dispatch_date ? format(parseISO(header.dispatch_date), 'MM/dd/yyyy') : ''} className="h-10 bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-700 dark:text-slate-200" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Column - Tabs & Table */}
                    <div className="lg:col-span-3 space-y-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <div className="flex items-center justify-between mb-2">
                                <TabsList className="bg-transparent h-10 p-0 gap-8">
                                    <TabsTrigger value="items" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-1 font-black text-xs uppercase tracking-widest text-slate-400 data-[state=active]:text-primary transition-all">Items</TabsTrigger>
                                    <TabsTrigger value="returns" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-1 font-black text-xs uppercase tracking-widest text-slate-400 data-[state=active]:text-primary transition-all">Returns</TabsTrigger>
                                    <TabsTrigger value="memo" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-1 font-black text-xs uppercase tracking-widest text-slate-400 data-[state=active]:text-primary transition-all">Memo</TabsTrigger>
                                </TabsList>

                                {activeTab === 'items' && (
                                    <Button
                                        onClick={handleOpenAddProductModal}
                                        variant="ghost"
                                        size="sm"
                                        className="gap-2 text-[10px] font-black uppercase tracking-widest text-primary animate-in fade-in slide-in-from-right-4 duration-300"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add Products
                                    </Button>
                                )}

                                {activeTab === 'returns' && (
                                    <Button
                                        onClick={handleOpenLinkModal}
                                        variant="ghost"
                                        size="sm"
                                        className="gap-2 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 animate-in fade-in slide-in-from-right-4 duration-300"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Link a Return
                                    </Button>
                                )}

                                {activeTab === 'memo' && (
                                    <Button
                                        onClick={handleOpenMemoLinkModal}
                                        variant="ghost"
                                        size="sm"
                                        className="gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/90 hover:bg-primary/5 animate-in fade-in slide-in-from-right-4 duration-300"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Link A Memo
                                    </Button>
                                )}
                            </div>

                            <Card className="border-none shadow-sm overflow-hidden dark:bg-slate-900">
                                <TabsContent value="items" className="m-0">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                                            <TableRow className="border-none">
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10">Brand</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10">Category</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10">Description</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10">Unit</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10 text-center">Qty</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10 text-right">Price</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10 text-right">Gross</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10">Disc Type</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10 text-right">Disc Amt</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10 text-right">Net Total</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10 text-center">Delete</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {details.map((item: SalesInvoiceDetail, idx: number) => {
                                                const product = item.product_id && typeof item.product_id === 'object' ? item.product_id : null;
                                                return (
                                                    <TableRow key={item.detail_id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border-slate-100 dark:border-slate-800">
                                                        <TableCell>
                                                            {item.brand_name && (
                                                                <Badge variant="outline" className="text-[7px] font-black uppercase px-1 py-0 border-blue-100 bg-blue-50/50 text-blue-500 leading-none h-3.5 whitespace-nowrap">
                                                                    {item.brand_name}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.category_name && (
                                                                <Badge variant="outline" className="text-[7px] font-black uppercase px-1 py-0 border-slate-100 bg-slate-50/50 text-slate-400 leading-none h-3.5 whitespace-nowrap">
                                                                    {item.category_name}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="max-w-[300px]">
                                                                <p className="font-black text-xs text-slate-700 dark:text-slate-200 uppercase">{product?.product_name || 'Unnamed Product'}</p>
                                                                <p className="text-[10px] text-slate-400 truncate">{product?.description || ''}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-[10px] font-black text-slate-500 uppercase">{item.unit_name || item.unit || 'BOX'}</TableCell>
                                                        <TableCell className="text-center font-black text-primary">{item.quantity}</TableCell>
                                                        <TableCell className="text-right font-bold text-slate-600">₱{Number(item.unit_price).toLocaleString()}</TableCell>
                                                        <TableCell className="text-right font-bold text-slate-600">₱{Number(item.gross_amount || (item.quantity * item.unit_price)).toLocaleString()}</TableCell>
                                                        <TableCell className="text-[10px] font-bold text-slate-400 uppercase">{item.discount_type_name || item.discount_type || 'No Discount'}</TableCell>
                                                        <TableCell className="text-right font-bold text-slate-600">₱{Number(item.discount_amount || 0).toLocaleString()}</TableCell>
                                                        <TableCell className="text-right font-black text-slate-900 dark:text-white">₱{Number(item.total_amount).toLocaleString()}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.detail_id)}>
                                                                <Trash className="h-4 w-4 text-rose-500" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            {details.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={10} className="h-32 text-center text-slate-400 font-medium">No items found in this invoice.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                                <TabsContent value="returns" className="m-0 p-4">
                                    {linkedDocs.filter(d => d.type === "RETURN").length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">
                                            No linked returns found for this invoice.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {linkedDocs.filter(d => d.type === "RETURN").map((doc: LinkedDocument) => (
                                                <div key={doc.id} className="flex flex-col p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all group shadow-sm">
                                                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                                                        <div className="flex items-center gap-4">
                                                            <div>
                                                                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{doc.type}</p>
                                                                <p className="text-sm font-black text-slate-800 dark:text-slate-200">{doc.reference_no}</p>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{doc.date ? format(parseISO(doc.date), 'MMM dd, yyyy') : '--'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-right">
                                                                <p className="text-lg font-black text-slate-900 dark:text-white">₱{doc.amount.toLocaleString()}</p>
                                                                <Badge variant="outline" className="text-[9px] font-black bg-white dark:bg-slate-900">{doc.status || 'LINKED'}</Badge>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                                                                onClick={() => handleUnlinkReturn(doc.id)}
                                                            >
                                                                <Trash className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* Items List */}
                                                    <div className="space-y-2">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Return Items</p>
                                                        {doc.items && doc.items.length > 0 ? (
                                                            <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-white/50 dark:bg-slate-900/50">
                                                                <Table>
                                                                    <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                                                                        <TableRow className="border-none hover:bg-transparent">
                                                                            <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 h-9">Product Name</TableHead>
                                                                            <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 h-9 text-center">Qty</TableHead>
                                                                            <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 h-9 text-right">Unit Price</TableHead>
                                                                            <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 h-9 text-center">Discount Type</TableHead>
                                                                            <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 h-9 text-right">Discount</TableHead>
                                                                            <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 h-9 text-right">Total Amount</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {doc.items?.map((item) => (
                                                                            <TableRow key={item.id} className="hover:bg-white dark:hover:bg-slate-900 border-slate-100 dark:border-slate-800/50">
                                                                                <TableCell className="py-3">
                                                                                    <div className="max-w-[250px] lg:max-w-[350px]">
                                                                                        <p className="font-black text-slate-800 dark:text-slate-200 text-[11px] uppercase line-clamp-2 tracking-tight leading-tight">{item.product_name}</p>
                                                                                        {item.reason && <p className="text-[9px] text-slate-400 italic mt-1 font-medium truncate">Reason: {item.reason}</p>}
                                                                                    </div>
                                                                                </TableCell>
                                                                                <TableCell className="text-center font-black text-rose-500 text-[12px]">
                                                                                    {item.quantity}
                                                                                </TableCell>
                                                                                <TableCell className="text-right font-bold text-slate-500 dark:text-slate-400 text-[10px]">
                                                                                    ₱{Number(item.unit_price).toLocaleString()}
                                                                                </TableCell>
                                                                                <TableCell className="text-center">
                                                                                    {item.discount_type_name ? (
                                                                                        <span className="inline-block text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase leading-none bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-md border border-amber-100/50 dark:border-amber-900/30">
                                                                                            {item.discount_type_name}
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">NONE</span>
                                                                                    )}
                                                                                </TableCell>
                                                                                <TableCell className="text-right font-black text-rose-500 text-[11px]">
                                                                                    ₱{Number(item.discount_amount || 0).toLocaleString()}
                                                                                </TableCell>
                                                                                <TableCell className="text-right font-black text-slate-900 dark:text-white text-[13px] tracking-tighter">
                                                                                    ₱{Number(item.total_amount).toLocaleString()}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        ) : (
                                                            <p className="text-[10px] text-slate-400 italic py-2">No items listed for this return.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                                <TabsContent value="memo" className="m-0 p-4">
                                    {linkedDocs.filter(d => d.type === "MEMO").length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">
                                            No linked memos found for this invoice.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {linkedDocs.filter(d => d.type === "MEMO").map((doc) => (
                                                <div key={doc.id} className="flex flex-col p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all group shadow-sm">
                                                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                                                        <div className="flex items-center gap-4">
                                                            <div>
                                                                <p className={cn(
                                                                    "text-[10px] font-black uppercase tracking-widest",
                                                                    doc.balance_name === "DEBIT" ? "text-blue-500" : "text-amber-500"
                                                                )}>
                                                                    {doc.balance_name || "MEMO"}
                                                                </p>
                                                                <p className="text-sm font-black text-slate-800 dark:text-slate-200">{doc.reference_no}</p>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{doc.date ? format(parseISO(doc.date), 'MMM dd, yyyy') : '--'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={cn(
                                                                "text-lg font-black",
                                                                doc.balance_name === "DEBIT" ? "text-blue-600" : "text-amber-600"
                                                            )}>
                                                                ₱{doc.amount.toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Account</span>
                                                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                                                {doc.account_title || 'N/A'} ({doc.gl_code || 'N/A'})
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                                                            <span className={cn(
                                                                "text-[10px] font-bold",
                                                                doc.status === "APPROVED" ? "text-emerald-500" :
                                                                    doc.status === "FOR APPROVAL" ? "text-amber-500" :
                                                                        "text-indigo-500"
                                                            )}>
                                                                {doc.status || 'LINKED'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                            </Card>
                        </Tabs>
                    </div>

                    {/* Right Column - Summary */}
                    <div className="space-y-6">
                        <Card className="border-none shadow-lg shadow-primary/5 dark:bg-slate-900">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="space-y-2.5">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-400 uppercase tracking-wider">Gross Amount</span>
                                        <span className="text-slate-700 dark:text-slate-200 font-black">₱{displayGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-400 uppercase tracking-wider">Discount</span>
                                        <span className="text-rose-500 font-black">-₱{displayDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    {isVatApplicable && (
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-slate-400 uppercase tracking-wider">Vat (12%)</span>
                                            <span className={cn(
                                                "font-black transition-colors",
                                                isItemsModified ? "text-primary animate-pulse" : "text-slate-700 dark:text-slate-200"
                                            )}>
                                                ₱{displayVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm font-black pt-1">
                                        <span className="text-slate-900 dark:text-white uppercase tracking-wider">Total Amount</span>
                                        <span className="text-slate-900 dark:text-white">₱{displayTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                <Separator className="bg-slate-100 dark:bg-slate-800" />

                                <div className="space-y-2.5">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-rose-500 uppercase tracking-wider">Returns</span>
                                        <span className="text-rose-600 font-black">₱{returnAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-amber-500 uppercase tracking-wider">Credit Memo</span>
                                        <span className="text-amber-600 font-black">₱{creditMemoAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-blue-500 uppercase tracking-wider">Debit Memo</span>
                                        <span className="text-blue-600 font-black">₱{debitMemoAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                <Separator className="bg-slate-200 dark:bg-slate-700 h-0.5" />

                                <div className="flex justify-between items-baseline py-2 bg-primary/5 dark:bg-primary/10 px-4 rounded-2xl border border-primary/10">
                                    <span className="text-xs font-black uppercase tracking-[0.1em] text-primary">Balance</span>
                                    <span className="text-3xl font-black text-primary drop-shadow-sm">₱{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>

                                <div className="pt-2 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Audit Status</label>
                                        <div className="flex gap-2">
                                            <Badge variant="outline" className={cn(
                                                "uppercase text-[9px] font-black px-3 py-1 rounded-full",
                                                header.transaction_status === 'COMPLETED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                            )}>
                                                {header.transaction_status || 'PENDING'}
                                            </Badge>
                                            <Badge variant="outline" className={cn(
                                                "uppercase text-[9px] font-black px-3 py-1 rounded-full",
                                                header.payment_status === 'Paid' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                                            )}>
                                                {header.payment_status || 'UNPAID'}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Remarks</label>
                                        <textarea
                                            value={header.remarks || ''}
                                            onChange={(e) => header && setHeader({ ...header, remarks: e.target.value })}
                                            className="w-full min-h-[80px] p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 font-medium focus:ring-1 focus:ring-primary focus:outline-none transition-all resize-none"
                                            placeholder="Add notes or remarks for this invoice..."
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-auto pt-6 flex justify-end items-center">
                    <div className="flex gap-3">
                        <Button variant="outline" className="rounded-xl font-black text-xs uppercase tracking-widest">Print Invoice</Button>
                        <Button
                            disabled={isSaving}
                            onClick={handleFinalize}
                            className="bg-primary hover:bg-primary/90 rounded-xl px-8 font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 gap-2"
                        >
                            {isSaving ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4" />
                            )}
Dispatch
                        </Button>
                    </div>
                </div>
            </div>

            {/* Link Return Modal */}
            <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl dark:bg-slate-950">
                    <DialogHeader className="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-rose-500 rounded-lg shadow-lg shadow-rose-500/20">
                                <Link2 className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Available Returns</DialogTitle>
                                <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    Customer: {header?.customer_name || header?.customer_code || '...'}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Search return number or salesman..." 
                                className="pl-10 h-10 bg-slate-50 dark:bg-slate-900 border-none font-bold text-xs uppercase tracking-widest"
                                value={returnSearch}
                                onChange={(e) => setReturnSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="p-6 max-h-[60vh] overflow-y-auto">
                        {isFetchingReturns ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <RotateCw className="h-8 w-8 text-primary animate-spin" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Fetching available returns...</p>
                            </div>
                        ) : availableReturns.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full mb-4">
                                    <Search className="h-8 w-8 text-slate-300" />
                                </div>
                                <p className="text-sm font-black text-slate-500 uppercase tracking-widest">No available returns found</p>
                                <p className="text-[10px] text-slate-400 mt-1 font-medium">This customer has no unlinked returns in the system.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {availableReturns
                                    .filter(ret =>
                                        ret.return_number.toLowerCase().includes(returnSearch.toLowerCase()) ||
                                        (ret.salesman_id?.salesman_name || '').toLowerCase().includes(returnSearch.toLowerCase())
                                    )
                                    .map((ret) => (
                                        <div key={ret.return_id} className="group flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-rose-500/30 transition-all shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <FileText className="h-5 w-5 text-rose-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">#{ret.return_number}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{ret.return_date ? format(parseISO(ret.return_date), 'MMM dd, yyyy') : '--'}</p>
                                                        <span className="text-[8px] text-slate-300">•</span>
                                                        <p className="text-[10px] font-black text-primary uppercase tracking-tighter">{ret.salesman_id?.salesman_name || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-base font-black text-slate-900 dark:text-white">₱{Number(ret.total_amount).toLocaleString()}</p>
                                                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest opacity-70">Total Amount</p>
                                                </div>
                                                <Button
                                                    disabled={isLinking}
                                                    onClick={() => handleLinkReturn(ret)}
                                                    className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg px-4 h-9 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-500/20 gap-2"
                                                >
                                                    {isLinking ? <RotateCw className="h-3 w-3 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
                                                    Add
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Add Product Modal */}
            <SiteSalesAddProductModal
                isOpen={isAddProductModalOpen}
                onClose={() => setIsAddProductModalOpen(false)}
                onConfirm={handleAddProducts}
                products={searchProducts}
                isLoading={isSearchingProducts}
                initialDetails={details}
                suppliers={suppliers}
                onSupplierChange={handleSupplierChange}
                currentSupplierId={currentModalSupplierId}
            />

            {/* Link Memo Modal */}
            <Dialog open={isMemoLinkModalOpen} onOpenChange={setIsMemoLinkModalOpen}>
                <DialogContent className="sm:max-w-[1100px] w-[95vw] p-0 overflow-hidden border-none shadow-2xl dark:bg-slate-950">
                    <DialogHeader className="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary rounded-lg shadow-lg shadow-primary/20">
                                <Link2 className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Available Customer Memos</DialogTitle>
                                <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    Customer: {header?.customer_name || header?.customer_code || '...'}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6 max-h-[60vh] overflow-y-auto">
                        {isFetchingMemos ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <RotateCw className="h-8 w-8 text-primary animate-spin" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Fetching available memos...</p>
                            </div>
                        ) : availableMemos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full mb-4">
                                    <Search className="h-8 w-8 text-slate-300" />
                                </div>
                                <p className="text-sm font-black text-slate-500 uppercase tracking-widest">No available memos found</p>
                                <p className="text-[10px] text-slate-400 mt-1 font-medium">This customer has no unapplied memos in the system.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {availableMemos.map((memo) => {
                                    const isDebit = memo.balance_name === "DEBIT";
                                    const remaining = Number(memo.amount) - Number(memo.applied_amount);

                                    return (
                                        <div key={memo.id} className="group flex flex-col p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all shadow-sm">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "h-10 w-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform",
                                                        isDebit ? "bg-blue-50 dark:bg-blue-950/30" : "bg-amber-50 dark:bg-amber-950/30"
                                                    )}>
                                                        <FileText className={cn("h-5 w-5", isDebit ? "text-blue-500" : "text-amber-500")} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-black text-slate-800 dark:text-slate-200">#{memo.memo_number}</p>
                                                            <Badge variant="outline" className={cn(
                                                                "text-[8px] font-black uppercase px-2 py-0 h-4",
                                                                isDebit ? "border-blue-100 bg-blue-50 text-blue-500" : "border-amber-100 bg-amber-50 text-amber-500"
                                                            )}>
                                                                {memo.balance_name}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                                                            {memo.created_at ? format(parseISO(memo.created_at), 'MMM dd, yyyy') : '--'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-base font-black text-slate-900 dark:text-white">₱{remaining.toLocaleString()}</p>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-70">Balance Remaining</p>
                                                    </div>
                                                    <Button
                                                        disabled={isLinking}
                                                        onClick={() => handleLinkMemo(memo)}
                                                        className="bg-primary hover:bg-primary/90 text-white rounded-lg px-4 h-9 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 gap-2"
                                                    >
                                                        {isLinking ? <RotateCw className="h-3 w-3 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
                                                        Link Memo
                                                    </Button>
                                                </div>
                                            </div>

                                            <Separator className="my-2 bg-slate-50 dark:bg-slate-800" />

                                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Amount</span>
                                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">₱{Number(memo.amount).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Applied Amount</span>
                                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">₱{Number(memo.applied_amount).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Account</span>
                                                    <span className="text-[10px] font-bold text-indigo-500">
                                                        {memo.account_title || 'N/A'} ({memo.gl_code || 'N/A'})
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                                                    <span className={cn(
                                                        "text-[10px] font-black",
                                                        memo.status === "APPROVED" ? "text-emerald-500" :
                                                            memo.status === "FOR APPROVAL" ? "text-amber-500" :
                                                                "text-slate-700 dark:text-slate-200"
                                                    )}>
                                                        {memo.status}
                                                    </span>
                                                </div>
                                            </div>

                                            {memo.reason && (
                                                <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Reason</p>
                                                    <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 italic">&quot;{memo.reason}&quot;</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
