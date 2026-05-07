"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { SalesInvoiceHeader, SalesInvoiceDetail, LinkedDocument } from '../types';
import { siteSalesSummaryProvider } from '../providers/fetchProvider';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

import {
    FileText,
    User,
    MapPin,
    X,
    Loader2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

interface SiteSalesSummaryDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoiceId: string | null;
}

export const SiteSalesSummaryDetailsModal: React.FC<SiteSalesSummaryDetailsModalProps> = ({
    isOpen,
    onClose,
    invoiceId
}) => {
    const [header, setHeader] = useState<SalesInvoiceHeader | null>(null);
    const [details, setDetails] = useState<SalesInvoiceDetail[]>([]);
    const [linkedDocs, setLinkedDocs] = useState<LinkedDocument[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('items');

    const { returnAmount, creditMemoAmount, debitMemoAmount, balance, isVatApplicable } = React.useMemo(() => {
        const net = Number(header?.net_amount || header?.total_amount || 0);
        const invoiceTypeId = (header?.invoice_type as { id?: number })?.id || header?.invoice_type;
        const invoiceTypeName = (header?.invoice_type as { type?: string })?.type || "";

        const isVatApplicable = Number(invoiceTypeId) !== 3 && invoiceTypeName !== "Delivery Receipt";

        const r = linkedDocs
            .filter(doc => doc.type === "RETURN")
            .reduce((acc, doc) => acc + Number(doc.amount), 0);

        const cm = linkedDocs
            .filter(doc => doc.type === "MEMO" && !(doc.memo_type_id === 2 || doc.balance_name === "DEBIT"))
            .reduce((acc, doc) => acc + Number(doc.amount), 0);

        const dm = linkedDocs
            .filter(doc => doc.type === "MEMO" && (doc.memo_type_id === 2 || doc.balance_name === "DEBIT"))
            .reduce((acc, doc) => acc + Number(doc.amount), 0);

        const b = net - r - cm + dm;

        return {
            returnAmount: r,
            creditMemoAmount: cm,
            debitMemoAmount: dm,
            balance: b,
            isVatApplicable
        };
    }, [header, linkedDocs]);

    const fetchData = useCallback(async () => {
        if (!invoiceId) return;
        setIsLoading(true);
        try {
            const data = await siteSalesSummaryProvider.getInvoiceDetails(invoiceId);
            setHeader(data.header);
            setDetails(data.details);
            setLinkedDocs(data.linkedDocs || []);
        } catch (error) {
            console.error("Failed to fetch invoice details:", error);
        } finally {
            setIsLoading(false);
        }
    }, [invoiceId]);

    useEffect(() => {
        if (isOpen && invoiceId) {
            fetchData();
        } else {
            setHeader(null);
            setDetails([]);
            setLinkedDocs([]);
            setActiveTab('items');
        }
    }, [isOpen, invoiceId, fetchData]);

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent
                showCloseButton={false}
                className="
                flex flex-col p-0 gap-0 overflow-hidden
                bg-white dark:bg-slate-950
                border-0 sm:border sm:border-slate-200/80 dark:sm:border-slate-800
                shadow-none sm:shadow-[0_32px_80px_-12px_rgba(0,0,0,0.18)]
                rounded-none sm:rounded-2xl
                fixed inset-0
                sm:inset-auto sm:top-1/2 sm:left-1/2
                sm:-translate-x-1/2 sm:-translate-y-1/2
                w-full
                h-[100dvh] sm:h-[90dvh]
                sm:w-[calc(100vw-4rem)] sm:max-w-7xl lg:max-w-[95vw]
                translate-x-0 translate-y-0
            ">
                {/* Accessibility Requirement */}
                <div className="sr-only">
                    <DialogTitle>
                        {header ? `Invoice Details - ${header.invoice_no}` : "Loading Transaction..."}
                    </DialogTitle>
                    <DialogDescription>
                        Detailed view of site sales transaction summary with financial breakdowns.
                    </DialogDescription>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">
                            Fetching Transaction Details...
                        </p>
                    </div>
                ) : !header ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <FileText className="h-12 w-12 text-slate-200" />
                        <p className="text-base font-bold text-slate-400">Transaction Not Found</p>
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    </div>
                ) : (
                    <>
                        {/* ── HEADER ─────────────────────────────────────────── */}
                        <div className="px-6 sm:px-10 pt-6 sm:pt-8 pb-6 shrink-0 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-6 min-w-0">
                                    <div className="p-4 bg-primary rounded-2xl shadow-lg shadow-primary/20 shrink-0">
                                        <FileText className="h-8 w-8 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className={cn(
                                                    "text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest",
                                                    (Number((header.invoice_type as { id?: number })?.id || header.invoice_type) === 3)
                                                        ? "bg-slate-100 text-slate-600 border-slate-200"
                                                        : "bg-blue-100 text-blue-600 border-blue-200"
                                                )}>
                                                    {(Number((header.invoice_type as { id?: number })?.id || header.invoice_type) === 3) ? "Delivery Receipt" : "Sales Invoice"}
                                                </Badge>
                                            </div>
                                            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                                                {(Number((header.invoice_type as { id?: number })?.id || header.invoice_type) === 3) ? "DR" : "SI"} # {header.invoice_no}
                                            </h2>
                                        </div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            Transaction Summary View
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="hidden sm:flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border dark:border-slate-800 shadow-sm">
                                        <div className="px-4 py-1 border-r dark:border-slate-800 last:border-0">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Date</p>
                                            <p className="font-black text-slate-700 dark:text-slate-300 text-sm">
                                                {header.invoice_date ? format(parseISO(header.invoice_date), 'MMM dd, yyyy') : '--'}
                                            </p>
                                        </div>
                                        <div className="px-4 py-1 border-r dark:border-slate-800 last:border-0">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Due Date</p>
                                            <p className="font-black text-slate-700 dark:text-slate-300 text-sm">
                                                {header.due_date ? format(parseISO(header.due_date), 'MMM dd, yyyy') : '--'}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onClose}
                                        className="h-10 w-10 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* ── CONTENT AREA ────────────────────────────────────── */}
                        <div className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-slate-950 p-6 sm:p-10 space-y-8">
                            {/* Summary Cards Row */}
                            <Card className="border-none shadow-sm bg-slate-50/50 dark:bg-slate-900/50">
                                <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-8">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer Store</label>
                                        <p className="font-black text-base text-slate-900 dark:text-slate-100 truncate">
                                            {header.customer_name || header.customer_code || ''}
                                        </p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Salesman</label>
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-primary" />
                                            <p className="font-black text-base text-slate-900 dark:text-slate-100 truncate">
                                                {header.salesman_id?.salesman_name || header.salesman_name || ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sales Type</label>
                                        <p className="font-black text-base text-slate-900 dark:text-slate-100 uppercase">
                                            {typeof header.sales_type === 'object' ? header.sales_type?.operation_name : 'SITE SALES'}
                                        </p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Receipt Type</label>
                                        <p className="font-black text-base text-slate-900 dark:text-slate-100 uppercase">
                                            {typeof header.invoice_type === 'object' ? header.invoice_type?.type : 'DR'}
                                        </p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer Code</label>
                                        <p className="font-black text-base text-slate-900 dark:text-slate-100">{header.customer_code || ''}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Branch Location</label>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-primary" />
                                            <p className="font-black text-base text-slate-900 dark:text-slate-100 truncate">
                                                {header.branch_id?.branch_name || ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pricing Tier</label>
                                        <p className="font-black text-base text-slate-900 dark:text-slate-100 uppercase tracking-tight">{header.price_type || ''}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Dispatch Date</label>
                                        <p className="font-black text-base text-slate-900 dark:text-slate-100 uppercase">
                                            {header.dispatch_date ? format(parseISO(header.dispatch_date), 'MM/dd/yyyy') : '--'}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                                <div className="lg:col-span-4 space-y-8">
                                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                        <TabsList className="bg-transparent h-12 p-0 gap-10 mb-4 border-b dark:border-slate-800 w-full justify-start rounded-none">
                                            <TabsTrigger value="items" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-1 font-black text-xs uppercase tracking-[0.2em] text-slate-400 data-[state=active]:text-primary transition-all">Items</TabsTrigger>
                                            <TabsTrigger value="returns" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-1 font-black text-xs uppercase tracking-[0.2em] text-slate-400 data-[state=active]:text-primary transition-all">Returns</TabsTrigger>
                                            <TabsTrigger value="memo" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-1 font-black text-xs uppercase tracking-[0.2em] text-slate-400 data-[state=active]:text-primary transition-all">Memo</TabsTrigger>
                                        </TabsList>

                                        <Card className="border shadow-none overflow-hidden dark:bg-slate-900/30 dark:border-slate-800">
                                            <TabsContent value="items" className="m-0">
                                                <div className="overflow-x-auto">
                                                    <Table>
                                                        <TableHeader className="bg-slate-100/80 dark:bg-slate-800/80 sticky top-0 z-10 backdrop-blur-sm">
                                                            <TableRow className="border-b dark:border-slate-800 hover:bg-transparent">
                                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12 px-6">Brand</TableHead>
                                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12 px-6">Category</TableHead>
                                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12 px-6">Description</TableHead>
                                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12 px-4 text-center">Unit</TableHead>
                                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12 px-4 text-center">Qty</TableHead>
                                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12 px-6 text-right">Price</TableHead>
                                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12 px-6 text-right">Discount</TableHead>
                                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12 px-6 text-center">Discount Type</TableHead>
                                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12 px-6 text-right">Net Total</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {details.map((item, idx) => {
                                                                const product = item.product_id && typeof item.product_id === 'object' ? item.product_id : null;
                                                                return (
                                                                    <TableRow key={item.detail_id || idx} className="hover:bg-primary/5 dark:hover:bg-primary/10 border-b dark:border-slate-800 last:border-0 transition-colors">
                                                                        <TableCell className="py-4 px-6">
                                                                            {item.brand_name && (
                                                                                <Badge variant="outline" className="text-[8px] font-black uppercase px-2 py-0.5 border-blue-200 bg-blue-50/50 text-blue-600 leading-none h-4 shadow-sm">
                                                                                    {item.brand_name}
                                                                                </Badge>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="py-4 px-6">
                                                                            {item.category_name && (
                                                                                <Badge variant="outline" className="text-[8px] font-black uppercase px-2 py-0.5 border-slate-200 bg-slate-50/50 text-slate-500 leading-none h-4 shadow-sm">
                                                                                    {item.category_name}
                                                                                </Badge>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="py-4 px-6 min-w-[200px]">
                                                                            <div className="max-w-[400px]">
                                                                                <p className="font-black text-[13px] text-slate-900 dark:text-slate-100 uppercase leading-snug">
                                                                                    {product?.product_name || 'Unnamed Product'}
                                                                                </p>
                                                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium italic truncate">{product?.description || ''}</p>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-[11px] font-black text-slate-600 uppercase py-4 px-4 text-center">
                                                                            {item.unit_name || item.unit || 'PCS'}
                                                                        </TableCell>
                                                                        <TableCell className="text-center font-black text-primary py-4 px-4 text-[14px] tabular-nums">{item.quantity}</TableCell>
                                                                        <TableCell className="text-right font-bold text-slate-600 dark:text-slate-400 py-4 px-6 text-[13px] tabular-nums whitespace-nowrap">
                                                                            ₱{Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                        </TableCell>
                                                                        <TableCell className="text-right py-4 px-6">
                                                                            <p className="font-black text-rose-500 text-[13px] tabular-nums">
                                                                                ₱{Number(item.discount_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                            </p>
                                                                        </TableCell>
                                                                        <TableCell className="text-center py-4 px-6">
                                                                            {item.discount_type_name && item.discount_type_name.toUpperCase() !== "DISCOUNT" ? (
                                                                                <Badge className="text-[10px] font-black bg-amber-50 text-amber-600 border-amber-100 px-2 py-0.5 uppercase tracking-tighter shadow-sm">
                                                                                    {item.discount_type_name}
                                                                                </Badge>
                                                                            ) : (
                                                                                <span className="text-[11px] font-black text-slate-300 uppercase italic">NONE</span>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-right font-black text-slate-900 dark:text-white py-4 px-6 text-[14px] tabular-nums whitespace-nowrap">
                                                                            ₱{Number(item.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                            {details.length === 0 && (
                                                                <TableRow>
                                                                    <TableCell colSpan={9} className="h-40 text-center text-slate-400 font-bold uppercase text-xs tracking-widest bg-slate-50/20">No items found.</TableCell>
                                                                </TableRow>
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </TabsContent>
                                            <TabsContent value="returns" className="m-0 p-8">
                                                {linkedDocs.filter(d => d.type === "RETURN").length === 0 ? (
                                                    <div className="p-12 text-center text-slate-400 text-xs font-black uppercase tracking-[0.3em] italic opacity-60">No linked returns.</div>
                                                ) : (
                                                    <Accordion type="single" collapsible className="w-full space-y-4">
                                                        {linkedDocs.filter(d => d.type === "RETURN").map((doc) => (
                                                            <AccordionItem key={doc.id} value={`return-${doc.id}`} className="border-2 border-rose-100 dark:border-rose-900/30 rounded-[24px] overflow-hidden bg-white dark:bg-slate-950 px-2 shadow-sm transition-all hover:border-rose-200 dark:hover:border-rose-800">
                                                                <AccordionTrigger className="hover:no-underline py-6 px-4">
                                                                    <div className="flex flex-1 justify-between items-center text-left">
                                                                        <div className="space-y-1">
                                                                            <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{doc.reference_no}</p>
                                                                            <p className="text-xs text-slate-500 font-black uppercase tracking-widest">
                                                                                {doc.date ? format(parseISO(doc.date), 'MMM dd, yyyy') : '--'}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-8 mr-4">
                                                                            <div className="text-right">
                                                                                <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                                                                                    ₱{doc.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                </p>
                                                                                <Badge className="bg-rose-500 text-white border-none text-[9px] font-black px-2 py-0 rounded-full uppercase tracking-wider">LINKED RETURN</Badge>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </AccordionTrigger>
                                                                <AccordionContent className="px-4 pb-6 pt-2">
                                                                    <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-inner bg-slate-50/50 dark:bg-slate-900/50">
                                                                        <ScrollArea className={cn("w-full", (doc.items?.length || 0) > 8 ? "h-[350px]" : "h-auto")}>
                                                                            <Table>
                                                                                <TableHeader className="bg-slate-100/80 dark:bg-slate-800/80 sticky top-0 z-10 backdrop-blur-md">
                                                                                    <TableRow className="hover:bg-transparent border-b dark:border-slate-800">
                                                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 px-6 text-slate-500">Brand</TableHead>
                                                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 px-6 text-slate-500">Category</TableHead>
                                                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 px-6 text-slate-500">Product</TableHead>
                                                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-center py-4 px-3 text-slate-500">UOM</TableHead>
                                                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-center py-4 px-3 text-slate-500">Qty</TableHead>
                                                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-right py-4 px-6 text-slate-500">Price</TableHead>
                                                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-right py-4 px-6 text-slate-500">Discount</TableHead>
                                                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-center py-4 px-3 text-slate-500">Discount Type</TableHead>
                                                                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-right py-4 px-6 text-slate-500">Total</TableHead>
                                                                                    </TableRow>
                                                                                </TableHeader>
                                                                                <TableBody>
                                                                                    {doc.items && doc.items.length > 0 ? (
                                                                                        doc.items.map((item, i) => (
                                                                                            <TableRow key={item.id || i} className="hover:bg-rose-50/50 dark:hover:bg-rose-950/20 border-b dark:border-slate-800 last:border-0 transition-colors">
                                                                                                <TableCell className="py-4 px-6">
                                                                                                    <Badge variant="outline" className="text-[9px] font-black uppercase px-2 py-0.5 border-blue-100 bg-blue-50 text-blue-500 whitespace-nowrap">
                                                                                                        {item.brand_name || 'N/A'}
                                                                                                    </Badge>
                                                                                                </TableCell>
                                                                                                <TableCell className="py-4 px-6">
                                                                                                    <Badge variant="outline" className="text-[9px] font-black uppercase px-2 py-0.5 border-slate-100 bg-slate-50 text-slate-400 whitespace-nowrap">
                                                                                                        {item.category_name || 'N/A'}
                                                                                                    </Badge>
                                                                                                </TableCell>
                                                                                                <TableCell className="py-4 px-6 font-black text-[12px] text-slate-800 dark:text-slate-200 uppercase leading-snug">
                                                                                                    {item.product_name}
                                                                                                </TableCell>
                                                                                                <TableCell className="text-center font-black text-slate-500 py-4 px-3 text-[11px] uppercase whitespace-nowrap">
                                                                                                    {item.unit_name || 'PCS'}
                                                                                                </TableCell>
                                                                                                <TableCell className="text-center font-black text-rose-500 py-4 px-3 text-[12px] tabular-nums">
                                                                                                    {item.quantity}
                                                                                                </TableCell>
                                                                                                <TableCell className="text-right font-black text-slate-600 dark:text-slate-400 py-4 px-6 text-[12px] tabular-nums">
                                                                                                    ₱{Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                                                                                </TableCell>
                                                                                                <TableCell className="text-right font-black text-rose-500 py-4 px-6 text-[12px] tabular-nums">
                                                                                                    ₱{Number(item.discount_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                                                                                </TableCell>
                                                                                                <TableCell className="text-center py-4 px-3">
                                                                                                    {item.discount_type_name ? (
                                                                                                        <Badge className="text-[10px] font-black bg-amber-500 text-white border-none px-2 py-0.5 uppercase shadow-sm">
                                                                                                            {item.discount_type_name}
                                                                                                        </Badge>
                                                                                                    ) : (
                                                                                                        <span className="text-[11px] font-black text-slate-300 uppercase italic">NONE</span>
                                                                                                    )}
                                                                                                </TableCell>
                                                                                                <TableCell className="text-right font-black text-slate-900 dark:text-white py-4 px-6 text-[14px] tabular-nums whitespace-nowrap">
                                                                                                    ₱{Number(item.total_amount).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                                                                                </TableCell>
                                                                                            </TableRow>
                                                                                        ))
                                                                                    ) : (
                                                                                        <TableRow>
                                                                                            <TableCell colSpan={9} className="py-16 text-center text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] italic opacity-60">No items listed in this return.</TableCell>
                                                                                        </TableRow>
                                                                                    )}
                                                                                </TableBody>
                                                                            </Table>
                                                                        </ScrollArea>
                                                                    </div>
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                        ))}
                                                    </Accordion>
                                                )}
                                            </TabsContent>
                                            <TabsContent value="memo" className="m-0 p-8">
                                                {linkedDocs.filter(d => d.type === "MEMO").length === 0 ? (
                                                    <div className="p-12 text-center text-slate-400 text-xs font-black uppercase tracking-[0.3em] italic opacity-60">No linked memos.</div>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        {linkedDocs.filter(d => d.type === "MEMO").map((doc) => (
                                                            <div key={doc.id} className="border-2 border-slate-100 dark:border-slate-800 rounded-[28px] overflow-hidden bg-white dark:bg-slate-950 p-6 shadow-sm transition-all hover:border-blue-100 dark:hover:border-blue-900/30 group">
                                                                <div className="flex justify-between items-start mb-6">
                                                                    <div className="space-y-1">
                                                                        <p className={cn("text-[10px] font-black uppercase tracking-[0.2em]", doc.balance_name === "DEBIT" ? "text-blue-500" : "text-amber-500")}>
                                                                            {doc.balance_name || "MEMO"}
                                                                        </p>
                                                                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{doc.reference_no}</h3>
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                            {doc.date ? format(parseISO(doc.date), 'MMM dd, yyyy') : '--'}
                                                                        </p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className={cn("text-2xl font-black tabular-nums tracking-tighter", doc.balance_name === "DEBIT" ? "text-blue-600" : "text-amber-600")}>
                                                                            ₱{doc.amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <Separator className="bg-slate-100 dark:bg-slate-800/50 mb-6" />

                                                                <div className="space-y-3">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account</span>
                                                                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight truncate max-w-[150px]">
                                                                            {doc.account_title || 'N/A'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                                                                        <span className={cn("text-[10px] font-black uppercase tracking-widest", doc.balance_name === "DEBIT" ? "text-blue-500" : "text-amber-500")}>
                                                                            {doc.status || "APPLIED"}
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

                                    <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border dark:border-slate-800">
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Transaction Remarks</h3>
                                        <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                            {header.remarks || '-- No additional remarks recorded for this transaction --'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <Card className="border shadow-lg shadow-primary/5 dark:bg-slate-900 dark:border-slate-800">
                                        <CardHeader className="pb-4 p-6 bg-slate-50/50 dark:bg-slate-800/50 border-b dark:border-slate-800">
                                            <CardTitle className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Financial Summary</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-6 p-6">
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-xs font-black">
                                                    <span className="text-slate-400 uppercase tracking-wider">Gross Total</span>
                                                    <span className="text-slate-800 dark:text-slate-100 tabular-nums">
                                                        ₱{Number(header.gross_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-xs font-black">
                                                    <span className="text-slate-400 uppercase tracking-wider">Total Discount</span>
                                                    <span className="text-rose-500 tabular-nums">
                                                        -₱{Number(header.discount_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                                {isVatApplicable && (
                                                    <div className="flex justify-between text-xs font-black">
                                                        <span className="text-slate-400 uppercase tracking-wider">VAT (12%)</span>
                                                        <span className="text-slate-800 dark:text-slate-100 tabular-nums">
                                                            ₱{Number(header.vat_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                )}
                                                <Separator className="bg-slate-200 dark:bg-slate-800 my-2" />
                                                <div className="flex justify-between text-sm font-black">
                                                    <span className="text-slate-950 dark:text-white uppercase tracking-[0.15em]">Net Amount</span>
                                                    <span className="text-primary tabular-nums text-lg">
                                                        ₱{Number(header.net_amount || header.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-2.5 pt-6 border-t border-dashed dark:border-slate-800">
                                                <div className="flex justify-between text-[11px] font-black">
                                                    <span className="text-slate-400 uppercase tracking-tight">Returns </span>
                                                    <span className="text-rose-500 tabular-nums">-₱{returnAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="flex justify-between text-[11px] font-black">
                                                    <span className="text-slate-400 uppercase tracking-tight">Credit Memo Applied</span>
                                                    <span className="text-amber-500 tabular-nums">-₱{creditMemoAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="flex justify-between text-[11px] font-black">
                                                    <span className="text-slate-400 uppercase tracking-tight">Debit Memo Applied</span>
                                                    <span className="text-blue-500 tabular-nums">+₱{debitMemoAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>

                                                {header.payment_status?.toLowerCase() !== 'paid' && (
                                                    <div className="pt-6 mt-6 border-t border-dashed dark:border-slate-800 flex justify-between items-center">
                                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Remaining Balance</p>
                                                        <p className="text-xl font-black text-primary tabular-nums">
                                                            ₱{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};
