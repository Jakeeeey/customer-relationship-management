"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SalesInvoiceHeader, SalesInvoiceDetail, LinkedDocument } from '../types';
import { siteSalesSummaryProvider } from '../providers/fetchProvider';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

import {
    ChevronLeft,
    FileText,
    User,
    MapPin,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

interface SiteSalesSummaryDetailsProps {
    id: string;
}

export const SiteSalesSummaryDetails: React.FC<SiteSalesSummaryDetailsProps> = ({ id }) => {
    const router = useRouter();
    const [header, setHeader] = useState<SalesInvoiceHeader | null>(null);
    const [details, setDetails] = useState<SalesInvoiceDetail[]>([]);
    const [linkedDocs, setLinkedDocs] = useState<LinkedDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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
        setIsLoading(true);
        try {
            const data = await siteSalesSummaryProvider.getInvoiceDetails(id);
            setHeader(data.header);
            setDetails(data.details);
            setLinkedDocs(data.linkedDocs || []);
        } catch (error) {
            console.error("Failed to fetch invoice details:", error);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

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
                <h2 className="text-xl font-bold">Invoice Not Found</h2>
                <Button variant="link" onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 bg-slate-50/50 dark:bg-[#020617] dark:bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] dark:from-slate-900/20 dark:via-slate-950 dark:to-slate-950 min-h-screen transition-colors duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-6">
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
                                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Invoice #{header.invoice_no}</h1>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Summary View</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border shadow-sm">
                        <div className="px-3 py-1 border-r last:border-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Date</p>
                            <p className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">{header.invoice_date ? format(parseISO(header.invoice_date), 'MMM dd, yyyy') : '--'}</p>
                        </div>
                        <div className="px-3 py-1 border-r last:border-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Due</p>
                            <p className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">{header.due_date ? format(parseISO(header.due_date), 'MMM dd, yyyy') : '--'}</p>
                        </div>
                    </div>
                </div>

                <Card className="border-none shadow-sm dark:bg-slate-900">
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-6">
                        {/* Row 1 */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Store</label>
                            <p className="font-bold text-slate-700 dark:text-slate-200">{header.customer_name || header.customer_code || ''}</p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salesman</label>
                            <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-slate-400" />
                                <p className="font-bold text-slate-700 dark:text-slate-200">{header.salesman_id?.salesman_name || header.salesman_name || ''}</p>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sales Type</label>
                            <p className="font-bold text-slate-700 dark:text-slate-200">
                                {typeof header.sales_type === 'object' ? header.sales_type?.operation_name : 'SITE SALES'}
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt Type</label>
                            <p className="font-bold text-slate-700 dark:text-slate-200">
                                {typeof header.invoice_type === 'object' ? header.invoice_type?.type : ''}
                            </p>
                        </div>

                        {/* Row 2 */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Code</label>
                            <p className="font-bold text-slate-700 dark:text-slate-200">{header.customer_code || ''}</p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Branch</label>
                            <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                <p className="font-bold text-slate-700 dark:text-slate-200">{header.branch_id?.branch_name || ''}</p>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Price Type</label>
                            <p className="font-bold text-slate-700 dark:text-slate-200">{header.price_type || ''}</p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dispatch Date</label>
                            <p className="font-bold text-slate-700 dark:text-slate-200">{header.dispatch_date ? format(parseISO(header.dispatch_date), 'MM/dd/yyyy') : '--'}</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3 space-y-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="bg-transparent h-10 p-0 gap-8 mb-2">
                                <TabsTrigger value="items" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-1 font-black text-xs uppercase tracking-widest text-slate-400 data-[state=active]:text-primary transition-all">Items</TabsTrigger>
                                <TabsTrigger value="returns" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-1 font-black text-xs uppercase tracking-widest text-slate-400 data-[state=active]:text-primary transition-all">Returns</TabsTrigger>
                                <TabsTrigger value="memo" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-1 font-black text-xs uppercase tracking-widest text-slate-400 data-[state=active]:text-primary transition-all">Memo</TabsTrigger>
                            </TabsList>

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
                                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10 text-right">Net Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {details.map((item, idx) => {
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
                                                        <TableCell className="text-[10px] font-black text-slate-500 uppercase">{item.unit_name || item.unit || 'PCS'}</TableCell>
                                                        <TableCell className="text-center font-black text-primary">{item.quantity}</TableCell>
                                                        <TableCell className="text-right font-bold text-slate-600">₱{Number(item.unit_price).toLocaleString()}</TableCell>
                                                        <TableCell className="text-right font-black text-slate-900 dark:text-white">₱{Number(item.total_amount).toLocaleString()}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            {details.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="h-32 text-center text-slate-400 font-medium">No items found.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                                <TabsContent value="returns" className="m-0 p-4">
                                    {linkedDocs.filter(d => d.type === "RETURN").length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">No linked returns.</div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {linkedDocs.filter(d => d.type === "RETURN").map((doc) => (
                                                <div key={doc.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <p className="text-sm font-black text-slate-800 dark:text-slate-200">{doc.reference_no}</p>
                                                        <p className="text-lg font-black text-rose-500">₱{doc.amount.toLocaleString()}</p>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{doc.date ? format(parseISO(doc.date), 'MMM dd, yyyy') : '--'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                                <TabsContent value="memo" className="m-0 p-4">
                                    {linkedDocs.filter(d => d.type === "MEMO").length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">No linked memos.</div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {linkedDocs.filter(d => d.type === "MEMO").map((doc) => (
                                                <div key={doc.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <p className="text-sm font-black text-slate-800 dark:text-slate-200">{doc.reference_no}</p>
                                                        <p className={cn("text-lg font-black", doc.balance_name === "DEBIT" ? "text-blue-600" : "text-amber-600")}>
                                                            ₱{doc.amount.toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className="flex justify-between text-[10px]">
                                                        <span className="text-slate-400 font-bold uppercase">{doc.balance_name || "MEMO"}</span>
                                                        <span className="text-slate-500">{doc.account_title || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                            </Card>
                        </Tabs>
                    </div>

                    <div className="space-y-6">
                        <Card className="border-none shadow-lg shadow-primary/5 dark:bg-slate-900">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="space-y-2.5">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-400 uppercase tracking-wider">Gross Amount</span>
                                        <span className="text-slate-700 dark:text-slate-200 font-black">₱{Number(header.gross_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-400 uppercase tracking-wider">Discount</span>
                                        <span className="text-rose-500 font-black">-₱{Number(header.discount_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    {isVatApplicable && (
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-slate-400 uppercase tracking-wider">Vat (12%)</span>
                                            <span className="text-slate-700 dark:text-slate-200 font-black">₱{Number(header.vat_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    <Separator className="bg-slate-100 dark:bg-slate-800" />
                                    <div className="flex justify-between text-sm font-black">
                                        <span className="text-slate-900 dark:text-white uppercase tracking-widest">Net Total</span>
                                        <span className="text-primary font-black">₱{Number(header.net_amount || header.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                <div className="space-y-2.5 pt-4 border-t border-dashed border-slate-200 dark:border-slate-800">
                                    <div className="flex justify-between text-[10px] font-bold">
                                        <span className="text-slate-400 uppercase">Returns</span>
                                        <span className="text-rose-500">₱{returnAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold">
                                        <span className="text-slate-400 uppercase">Credit Memos</span>
                                        <span className="text-amber-500">₱{creditMemoAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold">
                                        <span className="text-slate-400 uppercase">Debit Memos</span>
                                        <span className="text-blue-500">₱{debitMemoAmount.toLocaleString()}</span>
                                    </div>

                                    {header.payment_status?.toLowerCase() !== 'paid' && (
                                        <div className="p-4 bg-primary rounded-2xl mt-4 shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02]">
                                            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1 text-center">Remaining Balance</p>
                                            <p className="text-2xl font-black text-white text-center tracking-tighter">
                                                ₱{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Remarks</h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">{header.remarks || '-- No remarks recorded --'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
