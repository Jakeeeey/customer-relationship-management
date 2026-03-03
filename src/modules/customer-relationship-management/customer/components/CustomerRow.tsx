"use client";

import React, { memo } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    MoreHorizontal,
    Pencil,
    Building2,
    Mail,
    Phone,
    CreditCard,
} from "lucide-react";
import { CustomerWithRelations } from "../types";

interface CustomerRowProps {
    customer: CustomerWithRelations;
    onEdit: (customer: CustomerWithRelations) => void;
    onManageBanks: (customer: CustomerWithRelations) => void;
}

export const CustomerRow = memo(function CustomerRow({
    customer,
    onEdit,
    onManageBanks,
}: CustomerRowProps) {
    return (
        <TableRow className="hover:bg-muted/30 transition-colors">
            <TableCell className="font-medium text-blue-600 px-2 py-2">
                {customer.customer_code}
            </TableCell>
            <TableCell className="px-2 py-2">
                <div className="flex flex-col">
                    <span className="font-semibold text-sm leading-tight">{customer.customer_name}</span>
                    {customer.customer_tin && (
                        <span className="text-[10px] text-muted-foreground">TIN: {customer.customer_tin}</span>
                    )}
                </div>
            </TableCell>
            <TableCell className="px-2 py-2">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center text-xs font-medium">
                        <Building2 className="mr-1.5 h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[140px]">{customer.store_name}</span>
                    </div>
                    {customer.store_signage && (
                        <span className="text-[10px] text-muted-foreground italic truncate max-w-[140px] pl-4.5">
                            {customer.store_signage}
                        </span>
                    )}
                </div>
            </TableCell>
            <TableCell className="px-2 py-2">
                <div className="flex flex-col gap-0.5 text-xs">
                    {customer.customer_email && (
                        <div className="flex items-center">
                            <Mail className="mr-1.5 h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[140px]">{customer.customer_email}</span>
                        </div>
                    )}
                    {customer.contact_number && (
                        <div className="flex items-center">
                            <Phone className="mr-1.5 h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[140px]">{customer.contact_number}</span>
                        </div>
                    )}
                </div>
            </TableCell>
            <TableCell className="px-2 py-2">
                <div className="text-[11px] max-w-[140px] truncate" title={[customer.brgy, customer.city, customer.province].filter(Boolean).join(", ")}>
                    {[customer.brgy, customer.city, customer.province].filter(Boolean).join(", ")}
                </div>
            </TableCell>
            <TableCell className="px-2 py-2">
                <Badge variant={customer.isActive ? "default" : "secondary"} className="text-[10px] px-1.5 h-5">
                    {customer.isActive ? "Active" : "Inactive"}
                </Badge>
            </TableCell>
            <TableCell className="text-right px-2 py-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onEdit(customer)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onManageBanks(customer)}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Manage Bank Accounts
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
}, (prevProps, nextProps) => {
    // Custom comparison to optimize
    return (
        prevProps.customer.id === nextProps.customer.id &&
        prevProps.customer.customer_name === nextProps.customer.customer_name &&
        prevProps.customer.isActive === nextProps.customer.isActive &&
        prevProps.customer.customer_code === nextProps.customer.customer_code &&
        prevProps.customer.store_name === nextProps.customer.store_name
    );
});
