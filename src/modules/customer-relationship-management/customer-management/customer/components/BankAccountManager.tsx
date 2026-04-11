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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Pencil,
    Trash2,
    CreditCard,
    Building2,
    CheckCircle2,
    Check,
    ChevronsUpDown,
} from "lucide-react";
import { useForm, Resolver, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { BankAccount, ReferenceOption } from "../types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const bankAccountSchema = z.object({
    bank_name: z.coerce.number().min(1, "Bank selection is required"),
    account_name: z.string().min(1, "Account name is required"),
    account_number: z.string().min(1, "Account number is required"),
    account_type: z.enum(["Savings", "Checking", "Other"]),
    branch_of_account: z.string().default("").or(z.literal("")),
    is_primary: z.coerce.number().default(0),
    notes: z.string().default("").or(z.literal("")),
});

type BankAccountFormValues = z.infer<typeof bankAccountSchema>;


interface BankAccountManagerProps {
    accounts: BankAccount[];
    banks: ReferenceOption[];
    onAccountsChange: (accounts: BankAccount[]) => void;
    isLoading?: boolean;
}

export function BankAccountManager({ 
    accounts, 
    banks, 
    onAccountsChange, 
    isLoading = false 
}: BankAccountManagerProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
    const [isBankPickerOpen, setIsBankPickerOpen] = useState(false);

    const form = useForm<BankAccountFormValues>({
        resolver: zodResolver(bankAccountSchema) as Resolver<BankAccountFormValues>,
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

    useEffect(() => {
        if (isDialogOpen) {
            if (selectedAccount) {
                form.reset({
                    bank_name: selectedAccount.bank_name,
                    account_name: selectedAccount.account_name,
                    account_number: selectedAccount.account_number,
                    account_type: selectedAccount.account_type,
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
        setSelectedAccount(null);
        setIsDialogOpen(true);
    };

    const handleEditAccount = (account: BankAccount) => {
        setSelectedAccount(account);
        setIsDialogOpen(true);
    };

    const handleDeleteAccount = (accountToDelete: BankAccount) => {
        const updated = accounts.filter(acc => 
            acc.id ? acc.id !== accountToDelete.id : acc.account_number !== accountToDelete.account_number
        );
        onAccountsChange(updated);
        toast.success("Account removed from list");
    };

    const onSubmit: SubmitHandler<BankAccountFormValues> = (values) => {
        let updatedAccounts: BankAccount[];

        if (selectedAccount) {
            // Edit existing (might be in DB or just in local list)
            updatedAccounts = accounts.map(acc => {
                const isMatch = selectedAccount.id 
                    ? acc.id === selectedAccount.id 
                    : acc.account_number === selectedAccount.account_number;
                
                if (isMatch) {
                    return { ...acc, ...values };
                }
                return acc;
            });
        } else {
            // Add new
            const newAccount: BankAccount = {
                ...values,
                id: 0, // 0 indicates it's new and doesn't have a DB ID yet
                customer_id: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            updatedAccounts = [...accounts, newAccount];
        }

        // If this one is primary, unset other primaries
        if (values.is_primary === 1) {
            updatedAccounts = updatedAccounts.map(acc => {
                const isCurrent = selectedAccount 
                    ? (selectedAccount.id ? acc.id === selectedAccount.id : acc.account_number === selectedAccount.account_number)
                    : (acc.account_number === values.account_number);
                
                if (!isCurrent) {
                    return { ...acc, is_primary: 0 };
                }
                return acc;
            });
        }

        onAccountsChange(updatedAccounts);
        setIsDialogOpen(false);
        setSelectedAccount(null);
        toast.success(`Bank account ${selectedAccount ? "updated" : "added"} in list`);
    };

    const getBankName = (id: number) => {
        return banks.find(b => b.id === id)?.name || `Bank #${id}`;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-foreground">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-base font-semibold">Bank Accounts</h3>
                </div>
                <Button type="button" size="sm" onClick={handleAddAccount} className="h-8 shadow-sm">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Account
                </Button>
            </div>

            <div className="border rounded-lg bg-card shadow-sm overflow-hidden text-card-foreground">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="h-9 px-4 text-xs font-semibold">Bank</TableHead>
                            <TableHead className="h-9 px-4 text-xs font-semibold">Account Details</TableHead>
                            <TableHead className="h-9 px-4 text-xs font-semibold">Type</TableHead>
                            <TableHead className="h-9 px-4 text-xs font-semibold text-center">Primary</TableHead>
                            <TableHead className="h-9 px-4 text-right text-xs font-semibold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                                        <Plus className="h-4 w-4 animate-spin text-primary" />
                                        <span className="text-sm">Loading accounts...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : accounts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground italic">
                                    No bank accounts added yet. These will be saved when you save the customer.
                                </TableCell>
                            </TableRow>
                        ) : (
                            accounts.map((account, idx) => (
                                <TableRow key={account.id || `local-${idx}`} className="hover:bg-muted/40 transition-colors">
                                    <TableCell className="px-4 py-2 font-medium text-sm">
                                        <div className="flex items-center gap-2 text-foreground">
                                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span>{getBankName(account.bank_name)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-2">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-semibold text-xs text-foreground truncate">{account.account_name}</span>
                                            <span className="text-xs font-mono text-muted-foreground truncate">{account.account_number}</span>
                                            {account.branch_of_account && (
                                                <span className="text-[10px] text-muted-foreground italic truncate">
                                                    {account.branch_of_account}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-2">
                                        <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 bg-muted/50">
                                            {account.account_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-2 text-center">
                                        {account.is_primary === 1 && (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right px-4 py-2">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                                onClick={() => handleEditAccount(account)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDeleteAccount(account)}
                                            >
                                                <Trash2 className="h-4 w-4" />
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
                <DialogContent className="sm:max-w-[700px] rounded-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <DialogHeader>
                        <DialogTitle>{selectedAccount ? "Edit Bank Account" : "Add Bank Account"}</DialogTitle>
                        <DialogDescription>
                            Enter the financial details for this customer&#39;s account.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form 
                            onSubmit={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                form.handleSubmit(onSubmit)(e);
                            }} 
                            className="space-y-4 pt-2"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                <FormField control={form.control} name="bank_name" render={({ field }) => (
                                    <FormItem className="flex flex-col sm:col-span-9">
                                        <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Bank Name</FormLabel>
                                        <Popover open={isBankPickerOpen} onOpenChange={setIsBankPickerOpen} modal={false}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        className={cn(
                                                            "w-full h-11 justify-between bg-muted/30 border-border/50 rounded-xl px-4 transition-all hover:bg-muted/50",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <span className="truncate mr-2 text-left text-sm">
                                                            {field.value
                                                                ? banks.find((b) => b.id === field.value)?.name
                                                                : "Select bank..."}
                                                        </span>
                                                        <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent 
                                                className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl rounded-xl border-border/50 bg-background/95 backdrop-blur-md z-[100]" 
                                                align="start"
                                                onWheel={(e) => e.stopPropagation()}
                                                onWheelCapture={(e) => e.stopPropagation()}
                                            >
                                                <div onWheel={(e) => e.stopPropagation()} className="overflow-hidden rounded-xl">
                                                    <Command className="bg-transparent" onWheel={(e) => e.stopPropagation()}>
                                                        <CommandInput placeholder="Search bank..." className="h-11 border-none focus:ring-0" />
                                                        <CommandList 
                                                            className="max-h-[300px] overflow-y-auto custom-scrollbar p-1"
                                                            onWheel={(e) => e.stopPropagation()}
                                                            onWheelCapture={(e) => e.stopPropagation()}
                                                        >
                                                            <CommandEmpty className="py-6 text-center text-xs font-medium text-muted-foreground">No bank found.</CommandEmpty>
                                                            <CommandGroup>
                                                                {banks.map((bank) => (
                                                                    <CommandItem
                                                                        key={bank.id}
                                                                        value={bank.name}
                                                                        onSelect={() => {
                                                                            field.onChange(bank.id);
                                                                            setIsBankPickerOpen(false);
                                                                        }}
                                                                        className="rounded-lg h-10 px-3 cursor-pointer aria-selected:bg-primary aria-selected:text-primary-foreground"
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                bank.id === field.value ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        <span className="font-medium text-sm">{bank.name}</span>
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="account_type" render={({ field }) => (
                                    <FormItem className="sm:col-span-3">
                                        <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Account Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-11 bg-muted/30 border-border/50 rounded-xl px-4 transition-all hover:bg-muted/50">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="rounded-xl border-border/50 shadow-xl">
                                                <SelectItem value="Savings" className="rounded-lg">Savings</SelectItem>
                                                <SelectItem value="Checking" className="rounded-lg">Checking</SelectItem>
                                                <SelectItem value="Other" className="rounded-lg">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <FormField control={form.control} name="account_name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Account Name</FormLabel>
                                    <FormControl><Input className="h-11 bg-muted/30 border-border/50 rounded-xl px-4" placeholder="E.g., John Doe" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="account_number" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Account Number</FormLabel>
                                    <FormControl><Input className="h-11 bg-muted/30 border-border/50 rounded-xl px-4 font-mono" placeholder="000-000-000" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="branch_of_account" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Branch (Optional)</FormLabel>
                                    <FormControl><Input className="h-11 bg-muted/30 border-border/50 rounded-xl px-4" placeholder="Ayala Ave. Branch" {...field} value={field.value ?? ""} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="notes" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Notes (Optional)</FormLabel>
                                    <FormControl><Textarea placeholder="Additional instructions..." className="resize-none min-h-[100px] bg-muted/30 border-border/50 rounded-xl p-4 text-sm" {...field} value={field.value ?? ""} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="is_primary" render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border border-border/50 bg-muted/20 p-4 mt-2 transition-colors hover:bg-muted/30">
                                    <FormControl>
                                        <Checkbox checked={field.value === 1} onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)} />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel className="cursor-pointer text-xs font-bold uppercase tracking-widest text-foreground">Primary Account</FormLabel>
                                        <p className="text-[10px] text-muted-foreground uppercase font-medium">
                                            Set this as the default billing account for this customer.
                                        </p>
                                    </div>
                                </FormItem>
                            )} />

                            <DialogFooter className="pt-4 gap-2 sm:gap-0">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="h-11 px-8 rounded-xl font-bold uppercase tracking-widest text-xs">
                                    Cancel
                                </Button>
                                <Button type="submit" className="h-11 px-8 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg bg-primary hover:bg-primary/90 transition-all active:scale-95">
                                    {selectedAccount ? "Update in List" : "Add to List"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}