"use client";

import React, { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Pencil,
    Trash2,
    Loader2,
    CreditCard,
    Building2,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { BankAccount, BankAccountFormData } from "../types";
import { toast } from "sonner";

const bankAccountSchema = z.object({
    bank_name: z.coerce.number().min(1, "Bank selection is required"),
    account_name: z.string().min(1, "Account name is required"),
    account_number: z.string().min(1, "Account number is required"),
    account_type: z.enum(["Savings", "Checking", "Other"]),
    branch_of_account: z.string().default(""),
    is_primary: z.coerce.number(),
    notes: z.string().default(""),
});

type BankAccountFormValues = z.infer<typeof bankAccountSchema>;

interface BankAccountManagerProps {
    customerId: number;
}

export function BankAccountManager({ customerId }: BankAccountManagerProps) {
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpening, setIsOpening] = useState(false);

    const form = useForm<BankAccountFormValues>({
        resolver: zodResolver(bankAccountSchema) as any,
        defaultValues: {
            bank_name: 0,
            account_name: "",
            account_number: "",
            account_type: "Savings",
            branch_of_account: "",
            is_primary: 0,
            notes: "",
        },
    });

    const fetchAccounts = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/crm/bank-account?customer_id=${customerId}`);
            if (res.ok) {
                const data = await res.json();
                setAccounts(data || []);
            }
        } catch (err) {
            console.error("Failed to fetch bank accounts", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (customerId) fetchAccounts();
    }, [customerId]);

    useEffect(() => {
        if (isDialogOpen) {
            if (selectedAccount) {
                form.reset({
                    bank_name: selectedAccount.bank_name,
                    account_name: selectedAccount.account_name,
                    account_number: selectedAccount.account_number,
                    account_type: selectedAccount.account_type as any,
                    branch_of_account: selectedAccount.branch_of_account || "",
                    is_primary: selectedAccount.is_primary,
                    notes: selectedAccount.notes || "",
                });
            } else {
                form.reset({
                    bank_name: 0,
                    account_name: "",
                    account_number: "",
                    account_type: "Savings",
                    branch_of_account: "",
                    is_primary: 0,
                    notes: "",
                });
            }
        }
    }, [selectedAccount, form, isDialogOpen]);

    const handleAddAccount = () => {
        setIsOpening(true);
        setTimeout(() => {
            setSelectedAccount(null);
            setIsDialogOpen(true);
            setIsOpening(false);
        }, 600);
    };

    const handleEditAccount = (account: BankAccount) => {
        setIsOpening(true);
        setTimeout(() => {
            setSelectedAccount(account);
            setIsDialogOpen(true);
            setIsOpening(false);
        }, 600);
    };

    const onFormError = (errors: any) => {
        console.error("Bank Account Form Errors:", errors);
        toast.error("Please fill in all required bank account details.");
    };

    const onSubmit = async (values: z.infer<typeof bankAccountSchema>) => {
        setIsSubmitting(true);
        try {
            const method = selectedAccount ? "PATCH" : "POST";
            const body = {
                ...values,
                customer_id: customerId,
                id: selectedAccount?.id,
            };

            const res = await fetch("/api/crm/bank-account", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                toast.success(`Bank account ${selectedAccount ? "updated" : "added"} successfully`);
                setIsDialogOpen(false);
                setSelectedAccount(null);
                fetchAccounts();
            } else {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to save bank account");
            }
        } catch (err: any) {
            console.error("Save failed:", err);
            toast.error(err.message || "Failed to save bank account detail.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this bank account?")) return;

        try {
            const res = await fetch(`/api/crm/bank-account?id=${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("Bank account deleted successfully");
                fetchAccounts();
            } else {
                throw new Error("Failed to delete");
            }
        } catch (err) {
            toast.error("Failed to delete bank account.");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Bank Accounts</h3>
                </div>
                <Button size="sm" onClick={handleAddAccount} disabled={isOpening}>
                    {isOpening ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                        <Plus className="mr-1 h-4 w-4" />
                    )}
                    Add Account
                </Button>
            </div>

            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[120px] px-2 text-xs">Bank</TableHead>
                            <TableHead className="px-2 text-xs">Account Details</TableHead>
                            <TableHead className="w-[80px] px-2 text-xs">Type</TableHead>
                            <TableHead className="w-[80px] px-2 text-xs text-center">Primary</TableHead>
                            <TableHead className="w-[90px] px-2 text-xs text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                        <span>Loading accounts...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : accounts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No bank accounts found for this customer.
                                </TableCell>
                            </TableRow>
                        ) : (
                            accounts.map((account) => (
                                <TableRow key={account.id} className="hover:bg-muted/30 transition-colors text-xs">
                                    <TableCell className="font-medium px-2 py-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            <span className="truncate">Bank {account.bank_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-2 py-2">
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <span className="font-semibold text-[11px] truncate">{account.account_name}</span>
                                            <span className="text-[10px] text-muted-foreground truncate">{account.account_number}</span>
                                            {account.branch_of_account && (
                                                <span className="text-[10px] text-muted-foreground italic truncate">
                                                    {account.branch_of_account}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-2 py-2">
                                        <Badge variant="outline" className="text-[9px] px-1 h-4">
                                            {account.account_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-2 py-2 text-center">
                                        {account.is_primary === 1 ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                                        ) : null}
                                    </TableCell>
                                    <TableCell className="text-right px-2 py-2">
                                        <div className="flex justify-end gap-0.5">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-blue-600"
                                                onClick={() => handleEditAccount(account)}
                                                disabled={isOpening}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(account.id)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[650px]">
                    <DialogHeader>
                        <DialogTitle>{selectedAccount ? "Edit Bank Account" : "Add Bank Account"}</DialogTitle>
                        <DialogDescription>
                            Enter the bank account details for this customer.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...(form as any)}>
                        <form onSubmit={form.handleSubmit(onSubmit, onFormError)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="bank_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bank Name (ID)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseInt(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="account_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Account Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Savings">Savings</SelectItem>
                                                    <SelectItem value="Checking">Checking</SelectItem>
                                                    <SelectItem value="Other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="account_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Account Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="account_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Account Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="000-000-000" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="branch_of_account"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Branch</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ayala Ave. Branch" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Optional notes about the account" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="is_primary"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value === 1}
                                                onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Primary Account</FormLabel>
                                            <p className="text-xs text-muted-foreground">
                                                Set this as the main account for this customer.
                                            </p>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsDialogOpen(false)}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {selectedAccount ? "Save Changes" : "Add Account"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
