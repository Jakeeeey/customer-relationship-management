"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SalesInvoiceHeader, SalesInvoiceDetail, LinkedDocument } from '../types';
import { siteSalesPostingProvider } from '../providers/fetchProvider';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';

import { 
    ChevronLeft, 
    FileText, 
    Calendar, 
    User, 
    MapPin, 
    Package, 
    ArrowLeftRight, 
    ClipboardList,
    Plus,
    Trash2,
    DollarSign,
    Percent,
    Save,
    CheckCircle2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

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

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await siteSalesPostingProvider.getInvoiceDetails(id);
            setHeader(data.header);
            setDetails(data.details);
            setLinkedDocs(data.linkedDocs || []);
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
            // 1. Save Header & Details adjustments first
            await siteSalesPostingProvider.saveAdjustments(id, {
                customer_code: header.customer_code,
                invoice_date: header.invoice_date,
                due_date: header.due_date,
                remarks: header.remarks,
                details: details,
                deletedDetailIds: [] // Track these if needed
            });

            // 2. Finalize settlement (isDispatched = 1)
            await siteSalesPostingProvider.finalizeSettlement([id]);
            
            toast.success("Invoice finalized successfully!");
            router.push('/crm/site-sales-management/site-sales-posting');
        } catch (error: any) {
            toast.error(error.message || "Failed to finalize invoice");
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
                <h2 className="text-xl font-bold">Invoice Not Found</h2>
                <Button variant="link" onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    const gross = header.gross_amount || 0;
    const discount = header.discount_amount || 0;
    const vat = header.vat_amount || 0;
    const net = header.net_amount || 0;
    const total = header.total_amount || 0;

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
                            <Input readOnly value="DIRECT SALES" className="h-10 bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-700 dark:text-slate-200" />
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
                    <Tabs defaultValue="items" className="w-full">
                        <div className="flex items-center justify-between mb-2">
                            <TabsList className="bg-transparent h-10 p-0 gap-8">
                                <TabsTrigger value="items" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-1 font-black text-xs uppercase tracking-widest text-slate-400 data-[state=active]:text-primary transition-all">Items</TabsTrigger>
                                <TabsTrigger value="returns" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-1 font-black text-xs uppercase tracking-widest text-slate-400 data-[state=active]:text-primary transition-all">Returns</TabsTrigger>
                                <TabsTrigger value="memo" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-1 font-black text-xs uppercase tracking-widest text-slate-400 data-[state=active]:text-primary transition-all">Memo</TabsTrigger>
                            </TabsList>
                            <Button variant="ghost" size="sm" className="gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                                <Plus className="h-3.5 w-3.5" />
                                Add Products
                            </Button>
                        </div>

                        <Card className="border-none shadow-sm overflow-hidden dark:bg-slate-900">
                            <TabsContent value="items" className="m-0">
                                <Table>
                                    <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                                        <TableRow className="border-none">
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10">Product ID</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10">Description</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10">Unit</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10 text-center">Qty</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10 text-right">Price</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10 text-right">Gross</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10">Disc Type</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10 text-right">Disc Amt</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-10 text-right">Net Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {details.map((item, idx) => {
                                            const product = item.product_id || {};
                                            return (
                                                <TableRow key={item.detail_id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border-slate-100 dark:border-slate-800">
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-mono text-[10px] font-black text-primary">{product.product_id || ''}</span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{item.detail_id || 'NEW'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="max-w-[300px]">
                                                            <p className="font-black text-xs text-slate-700 dark:text-slate-200 uppercase">{product.product_name || 'Unnamed Product'}</p>
                                                            <p className="text-[10px] text-slate-400 truncate">{product.description || ''}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-[10px] font-bold text-slate-500 uppercase">{item.unit || 'Box'}</TableCell>
                                                    <TableCell className="text-center font-black text-primary">{item.quantity}</TableCell>
                                                    <TableCell className="text-right font-bold text-slate-600">₱{Number(item.unit_price).toLocaleString()}</TableCell>
                                                    <TableCell className="text-right font-bold text-slate-600">₱{Number(item.gross_amount || (item.quantity * item.unit_price)).toLocaleString()}</TableCell>
                                                    <TableCell className="text-[10px] font-bold text-slate-400 uppercase">{item.discount_type || 'No Discount'}</TableCell>
                                                    <TableCell className="text-right font-bold text-slate-600">₱{Number(item.discount_amount || 0).toLocaleString()}</TableCell>
                                                    <TableCell className="text-right font-black text-slate-900 dark:text-white">₱{Number(item.total_amount).toLocaleString()}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {details.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-32 text-center text-slate-400 font-medium">No items found in this invoice.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TabsContent>
                            <TabsContent value="returns" className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No Returns Found</TabsContent>
                            <TabsContent value="memo" className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No Memos Found</TabsContent>
                        </Card>
                    </Tabs>
                </div>

                {/* Right Column - Summary */}
                <div className="space-y-6">
                    <Card className="border-none shadow-lg shadow-primary/5 dark:bg-slate-900">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-400 uppercase tracking-wider">Gross</span>
                                    <span className="text-slate-700 dark:text-slate-200">₱{gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-400 uppercase tracking-wider">Discount</span>
                                    <span className="text-slate-700 dark:text-slate-200">₱{discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-400 uppercase tracking-wider">VAT (12%)</span>
                                    <span className="text-slate-700 dark:text-slate-200">₱{vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            <Separator className="bg-slate-100 dark:bg-slate-800" />
                            <div className="flex justify-between items-baseline py-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Total</span>
                                <span className="text-2xl font-black text-primary">₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Balance</span>
                                <span className="text-lg font-black text-red-500">₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>

                            <div className="pt-4 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</label>
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
                        Finalize Posting
                    </Button>
                </div>
            </div>
        </div>
    </div>
    );
};
