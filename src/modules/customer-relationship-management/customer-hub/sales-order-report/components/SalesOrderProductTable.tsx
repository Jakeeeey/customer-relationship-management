"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { SalesOrderDetail } from "../types";

interface SalesOrderProductTableProps {
    details: SalesOrderDetail[];
}

export function SalesOrderProductTable({ details }: SalesOrderProductTableProps) {
    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="w-[100px]">Brand</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Ordered</TableHead>
                        <TableHead className="text-right">Allocated</TableHead>
                        <TableHead className="text-right">Served</TableHead>
                        <TableHead>Discount Type</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {details.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                                No items in table.
                            </TableCell>
                        </TableRow>
                    ) : (
                        details.map((detail) => (
                            <TableRow key={detail.detail_id}>
                                <TableCell className="font-medium">-</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell>{typeof detail.product_id === 'object' ? detail.product_id.product_code : detail.product_id}</TableCell>
                                <TableCell>{typeof detail.product_id === 'object' ? detail.product_id.product_name : '-'}</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell className="text-right">{detail.ordered_quantity}</TableCell>
                                <TableCell className="text-right">{detail.allocated_quantity}</TableCell>
                                <TableCell className="text-right">{detail.served_quantity}</TableCell>
                                <TableCell>{detail.discount_type || "-"}</TableCell>
                                <TableCell className="text-right">
                                    {new Intl.NumberFormat("en-PH", {
                                        style: "currency",
                                        currency: "PHP",
                                    }).format(detail.unit_price)}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
