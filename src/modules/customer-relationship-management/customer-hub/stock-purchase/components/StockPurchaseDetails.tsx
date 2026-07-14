"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { StockPurchaseHeader, StockPurchaseDetail, SearchProduct, Supplier } from '../types';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { stockPurchaseProvider } from '../providers/fetchProvider';

const formatSafeDate = (dateStr?: string | null, formatStr: string = 'MM/dd/yyyy') => {
    if (!dateStr) return '';
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, formatStr) : dateStr;
};

import {
    ChevronLeft,
    FileText,
    User,
    MapPin,
    Plus,
    Trash,
    RotateCw,
    Printer,
    X
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";

import { StockPurchaseAddProductModal } from './StockPurchaseAddProductModal';
import { StockPurchasePrintPreviewModal } from './StockPurchasePrintPreviewModal';

interface StockPurchaseDetailsProps {
    id: string;
}

export const StockPurchaseDetails: React.FC<StockPurchaseDetailsProps> = ({ id }) => {
    const router = useRouter();
    const [header, setHeader] = useState<StockPurchaseHeader | null>(null);
    const [details, setDetails] = useState<StockPurchaseDetail[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [searchProducts, setSearchProducts] = useState<SearchProduct[]>([]);
    const [isSearchingProducts, setIsSearchingProducts] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [mainSupplierId, setMainSupplierId] = useState<number | null>(null);
    const [currentModalSupplierId, setCurrentModalSupplierId] = useState<number | string | null>(null);
    const [deletedDetailIds, setDeletedDetailIds] = useState<number[]>([]);

    const [pdfFileId, setPdfFileId] = useState<string | null>(null);
    const [pdfWidthMm, setPdfWidthMm] = useState<number | null>(null);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [isLoadingPdf, setIsLoadingPdf] = useState(false);

    const checkBit = useCallback((val: unknown) => {
        if (typeof val === 'boolean') return val;
        if (typeof val === 'number') return val === 1;
        if (val && typeof val === 'object' && val !== null && 'data' in val && Array.isArray((val as { data: unknown }).data)) return (val as { data: number[] }).data[0] === 1;
        return false;
    }, []);

    const isReadOnly = header ? (checkBit(header.isDispatched) || checkBit(header.isPosted) || header.transaction_status === 'Dispatched' || header.transaction_status === 'Posted' || header.transaction_status === 'Completed') : false;
    const [isItemsModified, setIsItemsModified] = useState(false);
    const [isHeaderModified, setIsHeaderModified] = useState(false);
    const isFirstLoad = React.useRef(true);

    const [initialVat, setInitialVat] = useState(0);
    const [initialGross, setInitialGross] = useState(0);
    const [initialDiscount, setInitialDiscount] = useState(0);
    const [initialNet, setInitialNet] = useState(0);

    const { computedGross, computedDiscount, computedVat, computedNet, balance, isVatApplicable } = React.useMemo(() => {
        const g = details.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unit_price)), 0);
        const d = details.reduce((acc, item) => acc + Number(item.discount_amount || 0), 0);
        const net = g - d;
        const invoiceTypeId = (header?.invoice_type as { id?: number })?.id || header?.invoice_type;
        const invoiceTypeName = (header?.invoice_type as { type?: string })?.type || "";

        const isVatApplicable = Number(invoiceTypeId) !== 3 && invoiceTypeName !== "Delivery Receipt";
        const v = isVatApplicable ? (net / 1.12) * 0.12 : 0;

        const b = isItemsModified ? net : initialNet;
        return {
            computedGross: g,
            computedDiscount: d,
            computedVat: v,
            computedNet: net,
            balance: b,
            isVatApplicable
        };
    }, [details, isItemsModified, initialNet, header?.invoice_type]);

    const maxLength = React.useMemo(() => {
        if (!header?.invoice_type) return Infinity;
        if (typeof header.invoice_type === 'object') {
            return (header.invoice_type as { max_length?: number }).max_length || Infinity;
        }
        return Infinity;
    }, [header?.invoice_type]);

    const displayGross = isItemsModified ? computedGross : initialGross;
    const displayDiscount = isItemsModified ? computedDiscount : initialDiscount;
    const displayVat = isItemsModified ? computedVat : initialVat;
    const displayTotal = isItemsModified ? computedNet : initialNet;

    const fetchData = useCallback(async () => {
        if (isFirstLoad.current) setIsLoading(true);

        try {
            const data = await stockPurchaseProvider.getInvoiceDetails(id);
            
            setHeader(data.header);
            setDetails(data.details);
            setMainSupplierId(data.main_supplier_id || null);

            setInitialVat(Number(data.header.vat_amount || 0));
            setInitialGross(Number(data.header.gross_amount || 0));
            setInitialDiscount(Number(data.header.discount_amount || 0));
            setInitialNet(Number(data.header.net_amount || data.header.total_amount || 0));

            setIsLoadingPdf(true);
            try {
                const pdfRes = await stockPurchaseProvider.getInvoicePdf(id);
                setPdfFileId(pdfRes.pdfFileId);
                setPdfWidthMm(pdfRes.widthMm);
            } catch (pdfErr) {
                console.error("Failed to fetch invoice PDF:", pdfErr);
            } finally {
                setIsLoadingPdf(false);
            }
        } catch (error) {
            console.error("Failed to fetch stock purchase details:", error);
        } finally {
            setIsLoading(false);
            isFirstLoad.current = false;
        }
    }, [id]);

    const handleOpenAddProductModal = useCallback(async () => {
        setIsAddProductModalOpen(true);
        setCurrentModalSupplierId(mainSupplierId || 'all');
        setIsSearchingProducts(true);

        try {
            let currentSuppliers = suppliers;
            if (suppliers.length === 0) {
                currentSuppliers = await stockPurchaseProvider.getSuppliers();
                setSuppliers(currentSuppliers);
            }

            const targetSupplierId = mainSupplierId || 'all';
            
            const results = await stockPurchaseProvider.searchProducts({
                search: "",
                priceTypeId: Number(header?.salesman_id?.price_type_id || header?.price_type),
                priceType: header?.price_type_name || header?.price_type,
                supplierId: targetSupplierId,
                branchId: header?.branch_id?.id || header?.branch_id,
                customerCode: header?.customer_code
            });
            setSearchProducts(results);
        } catch (error) {
            console.error("Failed to prepare product modal:", error);
            toast.error("Failed to load products");
        } finally {
            setIsSearchingProducts(false);
        }
    }, [suppliers, mainSupplierId, header]);

    const handleSupplierChange = useCallback(async (supplierId: string | number) => {
        const sId = typeof supplierId === 'string' ? parseInt(supplierId) : supplierId;
        setCurrentModalSupplierId(sId);
        if (!header) return;

        setIsSearchingProducts(true);
        try {
            const results = await stockPurchaseProvider.searchProducts({
                search: "",
                priceTypeId: Number(header.salesman_id?.price_type_id || header.price_type),
                priceType: header.price_type_name || header.price_type,
                supplierId: sId,
                branchId: header.branch_id?.id || header.branch_id,
                customerCode: header.customer_code
            });
            setSearchProducts(results);
        } catch (error) {
            console.error("Failed to search products:", error);
            toast.error("Failed to load products for this supplier");
        } finally {
            setIsSearchingProducts(false);
        }
    }, [header]);

    const handleAddProducts = (newItems: StockPurchaseDetail[]) => {
        const removed = details.filter(old => 
            old.detail_id && !newItems.find(n => n.detail_id === old.detail_id)
        );

        if (removed.length > 0) {
            const removedIds = removed.map(r => Number(r.detail_id)).filter(id => !isNaN(id));
            setDeletedDetailIds(prev => [...prev, ...removedIds]);
        }

        setDetails(newItems);
        setIsItemsModified(true);
        setIsAddProductModalOpen(false);
        toast.success(`Items updated successfully`);
    };

    const handleDeleteItem = (detailId?: number, idx?: number) => {
        if (detailId) {
            setDeletedDetailIds(prev => [...prev, detailId]);
        }
        setDetails(prev => prev.filter((_, i) => i !== idx));
        setIsItemsModified(true);
    };

    const handleUpdateOrder = async () => {
        if (!header) return;
        setIsSaving(true);
        try {
            await stockPurchaseProvider.saveAdjustments(id, {
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

            toast.success("Order updated successfully!");
            setIsItemsModified(false);
            setIsHeaderModified(false);
            fetchData();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to update order";
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
                <h2 className="text-xl font-bold">Transaction Not Found</h2>
                <Button variant="link" onClick={() => router.push('/crm/customer-hub/stock-purchase')}>Go Back</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 bg-slate-50/50 dark:bg-[#020617] dark:bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] dark:from-slate-900/20 dark:via-slate-950 dark:to-slate-950 min-h-screen transition-colors duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-6">
                {/* Header Section */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/crm/customer-hub/stock-purchase')} className="rounded-full">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary rounded-xl shadow-lg shadow-primary/20">
                                <FileText className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Stock Purchase #{header.invoice_no}</h1>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border shadow-sm">
                        <div className="px-3 py-1 border-r last:border-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Date</p>
                            <div className="flex items-center">
                                <Input
                                    type="text"
                                    readOnly
                                    className="h-6 w-24 p-0 border-none bg-transparent font-bold text-slate-700 dark:text-slate-300 text-[11px] focus-visible:ring-0 cursor-default"
                                    value={formatSafeDate(header.invoice_date)}
                                />
                            </div>
                        </div>
                        <div className="px-3 py-1 border-r last:border-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Due</p>
                            <div className="flex items-center">
                                <Input
                                    type="text"
                                    readOnly
                                    className="h-6 w-24 p-0 border-none bg-transparent font-bold text-slate-700 dark:text-slate-300 text-[11px] focus-visible:ring-0 cursor-default"
                                    value={formatSafeDate(header.due_date)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Section - Info Grid */}
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
                                <Input readOnly value={(typeof header.sales_type === 'object' ? header.sales_type?.operation_name : (header.sales_type === 3 ? 'SITE SALES' : 'OTHERS')) || 'OTHERS'} className="h-10 bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-700 dark:text-slate-200" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Price Type</label>
                                <Input readOnly value={header.price_type_name || header.price_type || 'B'} className="h-10 bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-700 dark:text-slate-200" />
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
                    {/* Left Column - Table */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Items</h3>

                            {!isReadOnly && (
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
                        </div>

                        <Card className="border-none shadow-sm overflow-hidden dark:bg-slate-900 bg-white">
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
                                        {!isReadOnly && <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10 text-center">Delete</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {details.map((item: StockPurchaseDetail, idx: number) => {
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
                                                <TableCell className="text-center">
                                                    {item.discount_type_name ? (
                                                        <Badge className="text-[8px] font-black bg-amber-50 text-amber-600 border-amber-100 px-1.5 py-0.5 uppercase">
                                                            {item.discount_type_name}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-[9px] font-black text-slate-300 uppercase italic">NONE</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge className={cn(
                                                        "text-[9px] font-black h-5 uppercase px-2",
                                                        Number(item.discount_amount) > 0 ? "bg-rose-500 hover:bg-rose-600 text-white" : "bg-emerald-500 hover:bg-emerald-600 text-white"
                                                    )}>
                                                        {Number(item.discount_amount) > 0 ? `₱${Number(item.discount_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '0.0'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-black text-slate-900 dark:text-white">₱{Number(item.total_amount).toLocaleString()}</TableCell>
                                                {!isReadOnly && (
                                                    <TableCell className="text-center">
                                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.detail_id, idx)}>
                                                            <Trash className="h-4 w-4 text-rose-500" />
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })}
                                    {details.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={11} className="h-32 text-center text-slate-400 font-medium">No items found in this transaction.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>

                    {/* Right Column - Summary */}
                    <div className="space-y-6">
                        <Card className="border-none shadow-lg shadow-primary/5 dark:bg-slate-900 bg-white">
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
                                            onChange={(e) => {
                                                if (header) {
                                                    setHeader({ ...header, remarks: e.target.value });
                                                    setIsHeaderModified(true);
                                                }
                                            }}
                                            disabled={isReadOnly}
                                            className={cn(
                                                "w-full min-h-[80px] p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 font-medium focus:ring-1 focus:ring-primary focus:outline-none transition-all resize-none",
                                                isReadOnly && "opacity-70 cursor-not-allowed bg-slate-100 dark:bg-slate-900"
                                            )}
                                            placeholder="Add notes or remarks for this transaction..."
                                        />
                                    </div>

                                    <div className="pt-2 space-y-3">
                                        <Button
                                            onClick={() => setIsReceiptModalOpen(true)}
                                            variant="outline"
                                            className="w-full border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl px-4 h-12 font-black text-xs uppercase tracking-widest gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center bg-white"
                                        >
                                            <FileText className="h-4 w-4" />
                                            View Receipt
                                        </Button>
                                        {(() => {
                                            const checkBit = (val: unknown) => {
                                                if (typeof val === 'boolean') return val;
                                                if (typeof val === 'number') return val === 1;
                                                if (val && typeof val === 'object' && val !== null && 'data' in val && Array.isArray((val as { data: unknown }).data)) return (val as { data: number[] }).data[0] === 1;
                                                return false;
                                            };

                                            const isPosted = checkBit(header.isPosted) || header.transaction_status === 'Completed' || header.transaction_status === 'Posted';
                                            const isDispatched = checkBit(header.isDispatched) || header.transaction_status === 'Dispatched';

                                            if (isPosted) {
                                                return null;
                                            }

                                            if (isDispatched) {
                                                return null;
                                            }

                                            return (
                                                <div className="space-y-3">
                                                    {(isItemsModified || isHeaderModified) && (
                                                        <Button
                                                            disabled={isSaving}
                                                            onClick={handleUpdateOrder}
                                                            variant="outline"
                                                            className="w-full border-primary text-primary hover:bg-primary/5 rounded-xl px-6 font-black text-xs uppercase tracking-widest gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-95 bg-white"
                                                        >
                                                            {isSaving ? (
                                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                                            ) : (
                                                                <RotateCw className="h-4 w-4" />
                                                            )}
                                                            Update Order
                                                        </Button>
                                                    )}
                                                    <Button
                                                        onClick={() => setIsPreviewModalOpen(true)}
                                                        variant="outline"
                                                        className="w-full border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl px-4 h-12 font-black text-xs uppercase tracking-widest gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-95 bg-white"
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                        Print Preview
                                                    </Button>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <StockPurchaseAddProductModal
                isOpen={isAddProductModalOpen}
                onClose={() => setIsAddProductModalOpen(false)}
                onConfirm={handleAddProducts}
                products={searchProducts}
                isLoading={isSearchingProducts}
                initialDetails={details}
                suppliers={suppliers}
                onSupplierChange={handleSupplierChange}
                currentSupplierId={currentModalSupplierId}
                maxLength={maxLength}
            />

            {header && (
                <StockPurchasePrintPreviewModal
                    isOpen={isPreviewModalOpen}
                    onClose={() => setIsPreviewModalOpen(false)}
                    header={header}
                    details={details}
                />
            )}

            {/* View Receipt PDF Modal */}
            <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
                <DialogContent className={cn(
                    "h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 border-none shadow-2xl rounded-3xl",
                    pdfWidthMm && Number(pdfWidthMm) === 80
                        ? "!w-[min(450px,calc(100vw-1rem))] !max-w-[min(450px,calc(100vw-1rem))]"
                        : "!w-[min(calc(210mm+3rem),calc(100vw-1rem))] !max-w-[min(calc(210mm+3rem),calc(100vw-1rem))]"
                )}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 bg-white border-b shadow-sm z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-indigo-100 shadow-lg">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black tracking-tighter text-slate-900 uppercase">
                                    View Receipt
                                </DialogTitle>
                                <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">
                                    Stock Purchase #{header.invoice_no}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setIsReceiptModalOpen(false)}
                            className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* PDF Viewer */}
                    <div className="flex-1 bg-slate-200/50 p-6 flex justify-center items-center">
                        {isLoadingPdf ? (
                            <div className="flex flex-col items-center justify-center p-8 bg-white shadow-xl rounded-2xl border border-slate-200 w-full max-w-md text-center">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mb-4" />
                                <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Loading PDF Info</h3>
                            </div>
                        ) : pdfFileId ? (
                            <div className="w-full h-full bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-200">
                                <iframe
                                    src={`/api/crm/customer-hub/stock-purchase?type=asset&id=${pdfFileId}#toolbar=0&navpanes=0&scrollbar=0`}
                                    className="w-full h-full border-none"
                                    title="View Receipt PDF"
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 bg-white shadow-xl rounded-2xl border border-slate-200 w-full max-w-md text-center">
                                <div className="p-4 bg-rose-50 rounded-full text-rose-500 mb-4">
                                    <FileText className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">No Receipt PDF Available</h3>
                                <p className="text-xs font-medium text-slate-500 mt-2">
                                    This transaction does not have an archived PDF receipt file yet. Please print it to generate the archive.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-white border-t flex items-center justify-end shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                        <Button
                            onClick={() => setIsReceiptModalOpen(false)}
                            variant="outline"
                            className="rounded-2xl h-11 px-6 border-slate-200 text-slate-600 hover:bg-slate-50 font-black tracking-tighter active:scale-95 transition-all bg-white"
                        >
                            CLOSE
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
