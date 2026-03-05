"use client";

import React, { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useForm, FieldErrors, Resolver, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerWithRelations, ReferenceItem } from "../types";
import { BankAccountManager } from "./BankAccountManager";
import { toast } from "sonner";

const customerSchema = z.object({
    customer_code: z.string().min(1, "Customer code is required"),
    customer_name: z.string().min(1, "Customer name is required"),
    store_name: z.string().min(1, "Store name is required"),
    store_signage: z.string(),
    contact_number: z.string().min(1, "Contact number is required"),
    customer_email: z.string().email().or(z.literal("")),
    brgy: z.string(),
    city: z.string(),
    province: z.string(),
    type: z.enum(["Regular", "Employee"]),
    user_id: z.coerce.number().nullable(),
    tel_number: z.string(),
    customer_tin: z.string(),
    payment_term: z.coerce.number(),
    store_type: z.coerce.number().nullable(),
    price_type: z.string(),
    isActive: z.coerce.number(),
    isVAT: z.coerce.number(),
    isEWT: z.coerce.number(),
    discount_type: z.coerce.number().nullable(),
    division_id: z.coerce.number().nullable(),
    department_id: z.coerce.number().nullable(),
    encoder_id: z.number(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: CustomerWithRelations | null;
    onSubmit: (data: CustomerFormValues) => Promise<void>;
    defaultTab?: string;
}

export function CustomerDialog({
    open,
    onOpenChange,
    customer,
    onSubmit,
    defaultTab = "basic",
}: CustomerDialogProps) {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [storeTypes, setStoreTypes] = useState<ReferenceItem[]>([]);
    const [discountTypes, setDiscountTypes] = useState<ReferenceItem[]>([]);
    const [users, setUsers] = useState<ReferenceItem[]>([]);

    // Reset tab when dialog opens - using the pattern for resetting state on prop change
    const [prevOpen, setPrevOpen] = useState(open);
    if (open !== prevOpen) {
        setPrevOpen(open);
        if (open) {
            setActiveTab(defaultTab);
        }
    }

    useEffect(() => {
        const fetchRefs = async () => {
            try {
                const [storeRes, discRes, userRes] = await Promise.all([
                    fetch("/api/crm/customer/references?type=store_type"),
                    fetch("/api/crm/customer/references?type=discount_type"),
                    fetch("/api/crm/customer/references?type=user"),
                ]);

                if (storeRes.ok) {
                    const data = await storeRes.json();
                    setStoreTypes(data.data || []);
                }
                if (discRes.ok) {
                    const data = await discRes.json();
                    setDiscountTypes(data.data || []);
                }
                if (userRes.ok) {
                    const data = await userRes.json();
                    setUsers(data.data || []);
                }
            } catch (err) {
                console.error("Failed to fetch references", err);
            }
        };
        if (open) fetchRefs();
    }, [open]);

    const form = useForm<CustomerFormValues>({
        resolver: zodResolver(customerSchema) as Resolver<CustomerFormValues>,
        defaultValues: {
            customer_code: "",
            customer_name: "",
            store_name: "",
            store_signage: "",
            contact_number: "",
            customer_email: "",
            brgy: "",
            city: "",
            province: "",
            tel_number: "",
            customer_tin: "",
            payment_term: 0,
            store_type: null,
            price_type: "",
            isActive: 1,
            isVAT: 0,
            isEWT: 0,
            discount_type: null,
            division_id: null,
            department_id: null,
            type: "Regular",
            user_id: null,
            encoder_id: 1,
        },
    });

    useEffect(() => {
        if (customer) {
            form.reset({
                customer_code: customer.customer_code,
                customer_name: customer.customer_name,
                store_name: customer.store_name,
                store_signage: customer.store_signage || "",
                contact_number: customer.contact_number,
                customer_email: customer.customer_email || "",
                brgy: customer.brgy || "",
                city: customer.city || "",
                province: customer.province || "",
                tel_number: customer.tel_number || "",
                customer_tin: customer.customer_tin || "",
                payment_term: customer.payment_term || 0,
                store_type: customer.store_type || null,
                price_type: customer.price_type || "",
                isActive: customer.isActive ?? 1,
                isVAT: customer.isVAT ?? 0,
                isEWT: customer.isEWT ?? 0,
                discount_type: customer.discount_type || null,
                division_id: customer.division_id || null,
                department_id: customer.department_id || null,
                type: customer.type || "Regular",
                user_id: customer.user_id || null,
                encoder_id: customer.encoder_id || 1,
            });
        } else if (open) {
            form.reset({
                customer_code: "",
                customer_name: "",
                store_name: "",
                store_signage: "",
                contact_number: "",
                customer_email: "",
                brgy: "",
                city: "",
                province: "",
                tel_number: "",
                customer_tin: "",
                payment_term: 0,
                store_type: null,
                price_type: "",
                isActive: 1,
                isVAT: 0,
                isEWT: 0,
                discount_type: null,
                division_id: null,
                department_id: null,
                type: "Regular",
                user_id: null,
                encoder_id: 1,
            });
        }
    }, [customer, form, open]);

    const handleFormSubmit: SubmitHandler<CustomerFormValues> = async (values) => {
        try {
            await onSubmit(values);
            toast.success(`Customer ${customer ? "updated" : "created"} successfully`);
            onOpenChange(false);
        } catch (error) {
            console.error("Submit failed:", error);
            toast.error("Failed to save customer. Please try again.");
        }
    };

    const onFormError = (errors: FieldErrors<CustomerFormValues>) => {
        console.log("Form Validation Errors:", errors);
        toast.error("Please fill in all required fields in Basic, Address, and Billing tabs.");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>{customer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
                    <DialogDescription>
                        Fill in the details below to {customer ? "update" : "create"} a customer record.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit, onFormError)} className="flex flex-col flex-1 overflow-hidden">
                        <ScrollArea className="flex-1 px-6">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-4 mb-6 gap-2 bg-transparent p-0">
                                    <TabsTrigger value="basic" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border text-xs">Basic</TabsTrigger>
                                    <TabsTrigger value="address" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border text-xs">Address</TabsTrigger>
                                    <TabsTrigger value="billing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border text-xs">Billing</TabsTrigger>
                                    <TabsTrigger value="bank" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border text-xs">Bank</TabsTrigger>
                                </TabsList>

                                <TabsContent value="basic" className="space-y-6 pb-6 mt-2">
                                    <div className="grid grid-cols-3 gap-6">
                                        <FormField
                                            name="customer_code"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Customer Code</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="CUST-001" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            name="customer_name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Customer Name</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="John Doe" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            name="type"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Customer Type</FormLabel>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select Type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Regular">Regular</SelectItem>
                                                            <SelectItem value="Employee">Employee</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <FormField
                                            name="store_type"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Store Type</FormLabel>
                                                    <Select
                                                        onValueChange={(val) => field.onChange(parseInt(val))}
                                                        value={field.value?.toString()}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select Store Type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {storeTypes.map((type) => (
                                                                type.id !== undefined && (
                                                                    <SelectItem key={type.id} value={type.id.toString()}>
                                                                        {type.store_type}
                                                                    </SelectItem>
                                                                )
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            name="user_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Linked User</FormLabel>
                                                    <Select
                                                        onValueChange={(val) => field.onChange(val === "null" ? null : parseInt(val))}
                                                        value={field.value === null ? "null" : field.value?.toString()}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select User" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="null">None</SelectItem>
                                                            {users.map((u: ReferenceItem) => {
                                                                const uid = u.id || u.user_id;
                                                                if (!uid) return null;
                                                                return (
                                                                    <SelectItem key={uid} value={uid.toString()}>
                                                                        {[u.user_fname, u.user_mname, u.user_lname].filter(Boolean).join(" ")}
                                                                    </SelectItem>
                                                                );
                                                            })}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <FormField
                                            name="store_name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Store Name</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Main Branch" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            name="store_signage"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Store Signage</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Doe's General Store" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        name="customer_tin"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>TIN Number</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="000-000-000-000" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </TabsContent>

                                <TabsContent value="address" className="space-y-6 pb-6 mt-2">
                                    <div className="grid grid-cols-3 gap-6">
                                        <FormField
                                            name="brgy"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Barangay</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            name="city"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>City</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            name="province"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Province</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <FormField
                                            name="contact_number"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Mobile Number</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="09123456789" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            name="tel_number"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Telephone Number</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        name="customer_email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email Address</FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="customer@example.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </TabsContent>

                                <TabsContent value="billing" className="space-y-6 pb-6 mt-2">
                                    <div className="grid grid-cols-2 gap-6">
                                        <FormField
                                            name="payment_term"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Payment Term (Days)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            name="price_type"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Price Type</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Retail/Wholesale" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <FormField
                                            name="discount_type"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Discount Type</FormLabel>
                                                    <Select
                                                        onValueChange={(val) => field.onChange(val === "null" ? null : parseInt(val))}
                                                        value={field.value === null ? "null" : field.value?.toString()}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select Discount Type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="null">None</SelectItem>
                                                            {discountTypes.map((item) => (
                                                                item.id !== undefined && (
                                                                    <SelectItem key={item.id} value={item.id.toString()}>
                                                                        {item.discount_type}
                                                                    </SelectItem>
                                                                )
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="flex flex-wrap gap-6 pt-2">
                                        <FormField
                                            name="isActive"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value === 1}
                                                            onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>Is Active</FormLabel>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            name="isVAT"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value === 1}
                                                            onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>VAT Registered</FormLabel>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            name="isEWT"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value === 1}
                                                            onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>Subject to EWT</FormLabel>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="bank" className="space-y-4 pb-4">
                                    {customer?.id ? (
                                        <BankAccountManager customerId={customer.id} />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-muted/20 text-center">
                                            <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                                            <h4 className="font-semibold mb-1">Customer ID Required</h4>
                                            <p className="text-sm text-muted-foreground max-w-[280px]">
                                                Please save the customer first before you can manage their bank accounts.
                                            </p>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>

                        </ScrollArea>

                        <DialogFooter className="p-6 pt-2 border-t">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {customer ? "Save Changes" : "Create Customer"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog >
    );
}
