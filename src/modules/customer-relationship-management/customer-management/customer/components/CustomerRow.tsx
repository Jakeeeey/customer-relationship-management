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
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    MoreHorizontal,
    Pencil,
    Building2,
    Mail,
    Phone,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { CustomerWithRelations } from "../types";

interface CustomerRowProps {
    customer: CustomerWithRelations;
    onEdit: (customer: CustomerWithRelations) => void;
}

export const CustomerRow = memo(function CustomerRow({
                                                         customer,
                                                         onEdit,
                                                     }: CustomerRowProps) {
    // 🚀 Extract the newly attached salesman data from the API response
    const salesmanName = (customer as CustomerWithRelations & { salesman_name?: string; salesman_code?: string }).salesman_name || "N/A";
    const salesmanCode = (customer as CustomerWithRelations & { salesman_name?: string; salesman_code?: string }).salesman_code;

    return (
        <TableRow className="hover:bg-muted/40 transition-colors group">
            <TableCell className="font-semibold text-xs text-primary px-4 py-3">
                {customer.customer_code}
            </TableCell>
            <TableCell className="px-4 py-3">
                <div className="flex flex-col">
                    <span className="font-semibold text-sm leading-tight text-foreground">{customer.customer_name}</span>
                    {customer.customer_tin && (
                        <span className="text-[11px] text-muted-foreground mt-0.5">TIN: {customer.customer_tin}</span>
                    )}
                </div>
            </TableCell>
            <TableCell className="px-4 py-3">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex flex-col gap-0.5 cursor-help">
                            <div className="flex items-center text-xs font-medium text-foreground">
                                <Building2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate max-w-[140px]">{customer.store_name}</span>
                            </div>
                            {customer.store_signage && (
                                <span className="text-[11px] text-muted-foreground italic truncate max-w-[140px] pl-5">
                                    {customer.store_signage}
                                </span>
                            )}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                        <div className="flex flex-col gap-1">
                            <p className="font-semibold">{customer.store_name}</p>
                            {customer.store_signage && <p className="italic text-muted-foreground text-xs">{customer.store_signage}</p>}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TableCell>
            <TableCell className="px-4 py-3">
                <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 ${customer.type === 'Employee' ? 'bg-amber-100/50 text-amber-700 border-amber-200' : 'bg-blue-100/50 text-blue-700 border-blue-200'}`}>
                    {customer.type}
                </Badge>
            </TableCell>

            {/* 🚀 Render the new Salesman Name and Code */}
            <TableCell className="px-4 py-3">
                <div className="flex flex-col">
                    <span className="font-semibold text-xs text-foreground truncate max-w-[140px]">
                        {salesmanName}
                    </span>
                    {salesmanCode && (
                        <span className="text-[10px] text-muted-foreground mt-0.5">Code: {salesmanCode}</span>
                    )}
                </div>
            </TableCell>

            <TableCell className="px-4 py-3">
                <div className="flex flex-col gap-1 text-xs">
                    {customer.customer_email && (
                        <div className="flex items-center text-muted-foreground">
                            <Mail className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                            <span className="truncate max-w-[140px]">{customer.customer_email}</span>
                        </div>
                    )}
                    {customer.contact_number && (
                        <div className="flex items-center text-muted-foreground">
                            <Phone className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                            <span className="truncate max-w-[140px]">{customer.contact_number}</span>
                        </div>
                    )}
                </div>
            </TableCell>
            <TableCell className="px-4 py-3">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="text-xs text-muted-foreground max-w-[120px] truncate cursor-help">
                            {[customer.brgy, customer.city, customer.province].filter(Boolean).join(", ")}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        {[customer.brgy, customer.city, customer.province].filter(Boolean).join(", ")}
                    </TooltipContent>
                </Tooltip>
            </TableCell>
            <TableCell className="px-4 py-3">
                <Badge variant={customer.isActive ? "default" : "secondary"} className="text-[10px] px-2 py-0.5">
                    {customer.isActive ? "Active" : "Inactive"}
                </Badge>
            </TableCell>
            <TableCell className="text-right px-4 py-3">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity data-[state=open]:opacity-100">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onEdit(customer)}>
                            <Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
                            Edit Details
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
});