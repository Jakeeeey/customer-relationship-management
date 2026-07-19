"use client";

import React, { useEffect, useState } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Dialog, DialogContent, DialogDescription, DialogTitle
} from "@/components/ui/dialog";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Loader2, BriefcaseBusiness, Check } from "lucide-react";

import { EmployeeStockPurchaseFormValues, employeeStockPurchaseSchema } from "../types";

interface EmployeeStockPurchaseFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: EmployeeStockPurchaseFormValues) => Promise<boolean>;
}

export function EmployeeStockPurchaseFormModal({ open, onOpenChange, onSubmit }: EmployeeStockPurchaseFormModalProps) {
    const [companies, setCompanies] = useState<{ value: string; label: string }[]>([]);
    const [users, setUsers] = useState<{ value: string; label: string; data: Record<string, unknown> }[]>([]);
    const [invoices, setInvoices] = useState<{ value: string; label: string; data: Record<string, unknown> }[]>([]);
    
    const [isLoadingOptions, setIsLoadingOptions] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<EmployeeStockPurchaseFormValues>({
        resolver: zodResolver(employeeStockPurchaseSchema) as Resolver<EmployeeStockPurchaseFormValues>,
        defaultValues: {
            company_id: undefined,
            user_id: undefined,
            invoice_id: undefined,
            manual_invoice_no: "",
            amount: undefined,
            remarks: "",
        },
    });

    const selectedCompanyId = form.watch("company_id");
    const selectedUserId = form.watch("user_id");
    const selectedInvoiceId = form.watch("invoice_id");

    useEffect(() => {
        if (!open) return;
        const fetchCompanies = async () => {
            setIsLoadingOptions(true);
            try {
                const res = await fetch("/api/crm/employee-stock-purchase/options?type=companies");
                if (res.ok) {
                    const data = await res.json();
                    setCompanies(data.map((c: { company_id: string | number, company_name: string }) => ({ value: c.company_id.toString(), label: c.company_name })));
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoadingOptions(false);
            }
        };
        fetchCompanies();
        form.reset();
    }, [open, form]);

    useEffect(() => {
        const fetchUsers = async () => {
            if (!selectedCompanyId) {
                setUsers([]);
                return;
            }
            try {
                const res = await fetch(`/api/crm/employee-stock-purchase/options?type=users&companyId=${selectedCompanyId}`);
                if (res.ok) {
                    const data = await res.json();
                    setUsers(data.map((u: Record<string, unknown> & { user_id: string | number, user_fname: string, user_lname: string }) => ({
                        value: u.user_id.toString(),
                        label: `${u.user_fname} ${u.user_lname}`,
                        data: u
                    })));
                }
            } catch (error) {
                console.error(error);
            }
        };
        fetchUsers();
    }, [selectedCompanyId]);

    useEffect(() => {
        const fetchInvoices = async () => {
            if (!selectedUserId) {
                setInvoices([]);
                return;
            }
            try {
                const res = await fetch(`/api/crm/employee-stock-purchase/options?type=invoices`);
                if (res.ok) {
                    const data = await res.json();
                    setInvoices(data.map((i: Record<string, unknown> & { invoice_id: string | number, invoice_no: string, net_amount?: number, total_amount?: number, gross_amount?: number }) => {
                        const amount = i.net_amount ?? i.total_amount ?? i.gross_amount ?? 0;
                        return {
                            value: i.invoice_id.toString(),
                            label: `INV-${i.invoice_no} (${amount})`,
                            data: i
                        };
                    }));
                }
            } catch (error) {
                console.error(error);
            }
        };
        fetchInvoices();
    }, [selectedUserId]);
    
    // Auto populate amount from invoice if selected
    useEffect(() => {
        if (selectedInvoiceId) {
            const invoice = invoices.find(i => i.value === selectedInvoiceId.toString());
            if (invoice) {
                const amount = Number(invoice.data.net_amount ?? invoice.data.total_amount ?? invoice.data.gross_amount ?? 0);
                form.setValue("amount", amount, { shouldValidate: true });
                form.setValue("manual_invoice_no", "", { shouldValidate: true });
            }
        }
    }, [selectedInvoiceId, invoices, form]);

    const handleFormSubmit = async (values: EmployeeStockPurchaseFormValues) => {
        setIsSubmitting(true);
        try {
            // Find labels to append to payload
            const company = companies.find(c => c.value === values.company_id?.toString());
            const user = users.find(u => u.value === values.user_id?.toString());
            
            const payload = {
                ...values,
                company_name: company?.label,
                employee_name: user?.label,
                customer_code: (user?.data?.external_id as string) || "", // Adjust based on how customer code is linked
            };

            const success = await onSubmit(payload);
            if (success) {
                onOpenChange(false);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full sm:max-w-[600px] max-h-[85vh] p-0 shadow-2xl flex flex-col bg-background overflow-hidden border-border/40 sm:rounded-[2rem]">
                <div className="p-10 border-b border-border/40 bg-muted/5 relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -mr-32 -mt-32" />
                    
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="h-16 w-16 rounded-[2rem] bg-blue-50 flex items-center justify-center text-blue-600 shadow-xl shadow-blue-600/10 border border-blue-100/50">
                            <BriefcaseBusiness className="h-8 w-8" />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground italic">
                                Stock Purchase
                            </DialogTitle>
                            <DialogDescription className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 m-0">
                                New Employee Stock Purchase
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-10 pb-10 pt-8 space-y-8">
                            
                            <FormField
                                control={form.control}
                                name="company_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Company</FormLabel>
                                        <SearchableSelect
                                            options={companies}
                                            value={field.value?.toString()}
                                            onValueChange={(val) => {
                                                field.onChange((val && val !== "all") ? Number(val) : undefined);
                                                form.setValue("user_id", undefined as never);
                                            }}
                                            placeholder={isLoadingOptions ? "Loading companies..." : "Select Company"}
                                            className="h-14 bg-muted/20 border-border/40 rounded-2xl focus:ring-blue-500/20 text-sm font-bold shadow-sm px-6 hover:bg-muted/30 transition-all"
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="user_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Employee</FormLabel>
                                        <SearchableSelect
                                            options={users}
                                            value={field.value?.toString()}
                                            onValueChange={(val) => field.onChange((val && val !== "all") ? Number(val) : undefined)}
                                            placeholder={!selectedCompanyId ? "Select a company first" : "Select Employee"}
                                            className="h-14 bg-muted/20 border-border/40 rounded-2xl focus:ring-blue-500/20 text-sm font-bold shadow-sm px-6 hover:bg-muted/30 transition-all"
                                            disabled={!selectedCompanyId}
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="invoice_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Unpaid Invoice</FormLabel>
                                            <SearchableSelect
                                                options={invoices}
                                                value={field.value?.toString()}
                                                onValueChange={(val) => field.onChange((val && val !== "all") ? Number(val) : undefined)}
                                                placeholder="Select Invoice (Optional)"
                                                className="h-14 bg-muted/20 border-border/40 rounded-2xl focus:ring-blue-500/20 text-sm font-bold shadow-sm px-6 hover:bg-muted/30 transition-all"
                                                disabled={!selectedUserId}
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="manual_invoice_no"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Or Manual Invoice No</FormLabel>
                                            <FormControl>
                                                <Input {...field} disabled={!!selectedInvoiceId} className="h-14 bg-muted/20 border-border/40 rounded-2xl focus-visible:ring-blue-500/20 text-sm font-bold shadow-sm px-6" placeholder="Manual number..." />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Amount</FormLabel>
                                        <FormControl>
                                            <Input 
                                                {...field} 
                                                type="number" 
                                                step="0.01" 
                                                value={field.value || ""} 
                                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                                className="h-14 bg-muted/20 border-border/40 rounded-2xl focus-visible:ring-blue-500/20 text-sm font-bold shadow-sm px-6" 
                                                placeholder="0.00" 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="remarks"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Remarks</FormLabel>
                                        <FormControl>
                                            <textarea
                                                {...field}
                                                className="w-full min-h-[100px] p-4 bg-muted/20 border border-border/40 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-bold shadow-sm transition-all resize-none"
                                                placeholder="Additional remarks..."
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                        </div>

                        <div className="p-6 border-t border-border/40 bg-muted/10 shrink-0">
                            <Button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="w-full h-16 rounded-[2rem] bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/20 text-sm font-black uppercase tracking-widest transition-all hover:scale-[0.99] active:scale-[0.97]"
                            >
                                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Check className="h-5 w-5 mr-2" />}
                                Submit Purchase
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
